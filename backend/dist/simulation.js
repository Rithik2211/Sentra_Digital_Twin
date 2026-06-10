"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationEngine = void 0;
const db_1 = require("./db");
const memoryStore_1 = require("./memoryStore");
const redis_1 = require("./redis");
class SimulationEngine {
    static activeRuns = new Map();
    static getActiveRun(runId) {
        return this.activeRuns.get(runId);
    }
    static async start(tenantId, scenario, speed) {
        // Terminate any active simulation runs for this tenant to avoid conflicts
        for (const [id, run] of this.activeRuns.entries()) {
            if (run.tenantId === tenantId) {
                this.stop(id);
            }
        }
        const runId = `run-${Date.now()}`;
        const startedAt = new Date();
        const runData = {
            id: runId,
            tenantId,
            scenario,
            status: 'RUNNING',
            startedAt,
            speed
        };
        if (db_1.isDbConnected) {
            await db_1.prisma.simulationRun.create({
                data: {
                    id: runId,
                    tenantId,
                    scenario,
                    speed,
                    status: 'RUNNING',
                    startedAt
                }
            });
        }
        else {
            memoryStore_1.memoryStore.simulationRuns.push({
                ...runData,
                endedAt: null
            });
        }
        const history = [];
        const workers = this.initWorkers();
        const sensors = this.initSensors();
        const zones = this.initZones();
        let minuteOffset = 0; // Starts at T-2h (minute index 0)
        const interval = setInterval(async () => {
            // Advance timeline relative to speed multiplier
            minuteOffset += 1 * speed;
            if (minuteOffset > 180) { // Limit to T+1h (180 minutes)
                minuteOffset = 180;
                this.stop(runId);
                return;
            }
            const state = this.computeNextState(runId, scenario, minuteOffset, workers, sensors, zones);
            // Map offset: T-2h to T+1h. 0 means -120 mins. 180 means +60 mins.
            const simTime = new Date(startedAt.getTime() + (minuteOffset - 120) * 60 * 1000);
            const tick = {
                runId,
                timestamp: simTime.toISOString(),
                minuteOffset,
                workers: JSON.parse(JSON.stringify(state.workers)),
                sensors: JSON.parse(JSON.stringify(state.sensors)),
                riskEvents: JSON.parse(JSON.stringify(state.riskEvents)),
                zones: JSON.parse(JSON.stringify(state.zones)),
            };
            history.push(tick);
            // Write tick events to store
            if (db_1.isDbConnected) {
                try {
                    // Update database worker coordinates
                    for (const w of state.workers) {
                        await db_1.prisma.workerAgent.upsert({
                            where: { id: w.id },
                            update: { x: w.x, y: w.y, z: w.z, status: w.status, zoneId: w.zoneId },
                            create: {
                                id: w.id,
                                simulationRunId: runId,
                                name: w.name,
                                x: w.x,
                                y: w.y,
                                z: w.z,
                                status: w.status,
                                zoneId: w.zoneId
                            }
                        });
                    }
                    for (const s of state.sensors) {
                        await db_1.prisma.sensor.update({
                            where: { id: s.id },
                            data: { lastReading: s.lastReading, status: s.status }
                        });
                    }
                    for (const z of state.zones) {
                        await db_1.prisma.zone.update({
                            where: { id: z.id },
                            data: { riskLevel: z.riskLevel }
                        });
                    }
                    for (const ev of state.riskEvents) {
                        const exists = await db_1.prisma.riskEvent.findFirst({ where: { id: ev.id } });
                        if (!exists) {
                            await db_1.prisma.riskEvent.create({
                                data: {
                                    id: ev.id,
                                    simulationRunId: runId,
                                    zoneId: ev.zoneId,
                                    severity: ev.severity,
                                    message: ev.message,
                                    timestamp: new Date(ev.timestamp)
                                }
                            });
                        }
                    }
                }
                catch (dbErr) {
                    // Silent DB logging error
                }
            }
            else {
                // Sync memory store
                for (const w of state.workers) {
                    const idx = memoryStore_1.memoryStore.workerAgents.findIndex(mw => mw.id === w.id);
                    if (idx >= 0) {
                        memoryStore_1.memoryStore.workerAgents[idx] = { ...w, simulationRunId: runId };
                    }
                    else {
                        memoryStore_1.memoryStore.workerAgents.push({ ...w, simulationRunId: runId });
                    }
                }
                for (const s of state.sensors) {
                    const idx = memoryStore_1.memoryStore.sensors.findIndex(ms => ms.id === s.id);
                    if (idx >= 0) {
                        memoryStore_1.memoryStore.sensors[idx].lastReading = s.lastReading;
                        memoryStore_1.memoryStore.sensors[idx].status = s.status;
                        memoryStore_1.memoryStore.sensors[idx].updatedAt = new Date();
                    }
                }
                for (const z of state.zones) {
                    const idx = memoryStore_1.memoryStore.zones.findIndex(mz => mz.id === z.id);
                    if (idx >= 0) {
                        memoryStore_1.memoryStore.zones[idx].riskLevel = z.riskLevel;
                    }
                }
                for (const ev of state.riskEvents) {
                    const exists = memoryStore_1.memoryStore.riskEvents.some(mre => mre.id === ev.id);
                    if (!exists) {
                        memoryStore_1.memoryStore.riskEvents.push({
                            id: ev.id,
                            simulationRunId: runId,
                            zoneId: ev.zoneId,
                            severity: ev.severity,
                            message: ev.message,
                            timestamp: new Date(ev.timestamp)
                        });
                    }
                }
            }
            // Publish the active state to the Redis channel
            await (0, redis_1.publishMessage)(`simulation:${runId}`, JSON.stringify(tick));
        }, 1000);
        this.activeRuns.set(runId, {
            interval,
            scenario,
            speed,
            minuteOffset,
            tenantId,
            history,
            startedAt
        });
        return runData;
    }
    static async stop(runId) {
        const run = this.activeRuns.get(runId);
        if (!run)
            return null;
        clearInterval(run.interval);
        this.activeRuns.delete(runId);
        const endedAt = new Date();
        if (db_1.isDbConnected) {
            return await db_1.prisma.simulationRun.update({
                where: { id: runId },
                data: { status: 'COMPLETED', endedAt }
            });
        }
        else {
            const idx = memoryStore_1.memoryStore.simulationRuns.findIndex(sr => sr.id === runId);
            if (idx >= 0) {
                memoryStore_1.memoryStore.simulationRuns[idx].status = 'COMPLETED';
                memoryStore_1.memoryStore.simulationRuns[idx].endedAt = endedAt;
                return memoryStore_1.memoryStore.simulationRuns[idx];
            }
        }
        return null;
    }
    static getRunHistory(runId) {
        const run = this.activeRuns.get(runId);
        return run ? run.history : [];
    }
    static initWorkers() {
        const names = [
            'Agent Carter', 'Agent Davis', 'Agent Bennett', 'Agent Miller',
            'Agent Flores', 'Agent Baker', 'Agent Hall', 'Agent Adams'
        ];
        const zones = ['zone-a-uuid', 'zone-b-uuid', 'zone-c-uuid', 'zone-d-uuid'];
        return names.map((name, i) => {
            const zoneId = zones[i % zones.length];
            const coords = this.getZoneDefaultCoords(zoneId);
            return {
                id: `worker-${i}`,
                name,
                x: coords.x + (Math.random() - 0.5) * 4,
                y: 0,
                z: coords.z + (Math.random() - 0.5) * 4,
                status: 'SAFE',
                zoneId,
            };
        });
    }
    static initSensors() {
        return [
            { id: 'sensor-a1', name: 'Conveyor-Speed', type: 'PRESSURE', status: 'OK', lastReading: 80.0, zoneId: 'zone-a-uuid' },
            { id: 'sensor-a2', name: 'Mixer-Vibration', type: 'NOISE', status: 'OK', lastReading: 40.0, zoneId: 'zone-a-uuid' },
            { id: 'sensor-b1', name: 'Furnace-Temp', type: 'TEMPERATURE', status: 'OK', lastReading: 1100.0, zoneId: 'zone-b-uuid' },
            { id: 'sensor-b2', name: 'CO2-GasLevel', type: 'GAS', status: 'OK', lastReading: 200.0, zoneId: 'zone-b-uuid' },
            { id: 'sensor-c1', name: 'Cooler-Pressure', type: 'PRESSURE', status: 'OK', lastReading: 300.0, zoneId: 'zone-c-uuid' },
            { id: 'sensor-c2', name: 'Noise-Level', type: 'NOISE', status: 'OK', lastReading: 75.0, zoneId: 'zone-c-uuid' },
            { id: 'sensor-d1', name: 'Chemical-Temp', type: 'TEMPERATURE', status: 'OK', lastReading: 35.0, zoneId: 'zone-d-uuid' },
            { id: 'sensor-d2', name: 'H2S-GasLevel', type: 'GAS', status: 'OK', lastReading: 1.5, zoneId: 'zone-d-uuid' },
        ];
    }
    static initZones() {
        return [
            { id: 'zone-a-uuid', name: 'Zone A — Raw Materials & Mixing', riskLevel: 'LOW' },
            { id: 'zone-b-uuid', name: 'Zone B — Blast Furnace Area', riskLevel: 'LOW' },
            { id: 'zone-c-uuid', name: 'Zone C — Cooling & Rolling Mills', riskLevel: 'LOW' },
            { id: 'zone-d-uuid', name: 'Zone D — Chemical Treatment & Storage', riskLevel: 'LOW' },
        ];
    }
    static getZoneDefaultCoords(zoneId) {
        switch (zoneId) {
            case 'zone-a-uuid': return { x: 5, z: 5 }; // Center of Zone A (Bottom-Left quadrant)
            case 'zone-b-uuid': return { x: 15, z: 5 }; // Center of Zone B (Bottom-Right quadrant)
            case 'zone-c-uuid': return { x: 5, z: 15 }; // Center of Zone C (Top-Left quadrant)
            case 'zone-d-uuid': return { x: 15, z: 15 }; // Center of Zone D (Top-Right quadrant)
            default: return { x: 0, z: 0 };
        }
    }
    static computeNextState(runId, scenario, minuteOffset, workers, sensors, zones) {
        const riskEvents = [];
        const moveWorker = (w, targetZoneId, speedFactor = 0.4) => {
            w.zoneId = targetZoneId;
            const target = this.getZoneDefaultCoords(targetZoneId);
            const seedVal = parseInt(w.id.replace('worker-', '')) || 0;
            const offsetX = Math.sin(seedVal * 45 + minuteOffset * 0.15) * 3;
            const offsetZ = Math.cos(seedVal * 45 + minuteOffset * 0.15) * 3;
            const destX = target.x + offsetX;
            const destZ = target.z + offsetZ;
            w.x += (destX - w.x) * speedFactor;
            w.z += (destZ - w.z) * speedFactor;
        };
        // SCENARIO 1: Night Shift · High Load
        if (scenario.includes('Night Shift')) {
            if (minuteOffset > 60) {
                const factor = Math.min((minuteOffset - 60) / 60, 1.0); // full ramp by minute 120
                const sA1 = sensors.find(s => s.id === 'sensor-a1');
                if (sA1) {
                    sA1.lastReading = 80.0 + factor * 22; // 80 -> 102
                    sA1.status = sA1.lastReading > 95.0 ? 'WARNING' : 'OK';
                }
                const sB1 = sensors.find(s => s.id === 'sensor-b1');
                if (sB1) {
                    sB1.lastReading = 1100.0 + factor * 210; // 1100 -> 1310
                    sB1.status = sB1.lastReading > 1250.0 ? 'CRITICAL' : (sB1.lastReading > 1180.0 ? 'WARNING' : 'OK');
                }
                if (minuteOffset >= 80) {
                    zones.find(z => z.id === 'zone-b-uuid').riskLevel = 'MEDIUM';
                    riskEvents.push({
                        id: `ev-${runId}-80`,
                        zoneId: 'zone-b-uuid',
                        zoneName: 'Zone B — Blast Furnace Area',
                        severity: 'LOW',
                        message: 'NOTICE: Furnace thermal load rising. Outer insulation sensor indicates 1180°C.',
                        timestamp: new Date().toISOString()
                    });
                }
                if (minuteOffset >= 120) {
                    zones.find(z => z.id === 'zone-b-uuid').riskLevel = 'HIGH';
                    riskEvents.push({
                        id: `ev-${runId}-120`,
                        zoneId: 'zone-b-uuid',
                        zoneName: 'Zone B — Blast Furnace Area',
                        severity: 'HIGH',
                        message: 'CRITICAL: Furnace Core temperature breached safety limit (1300°C). Overload condition.',
                        timestamp: new Date().toISOString()
                    });
                }
            }
            for (const w of workers) {
                moveWorker(w, w.zoneId, 0.3);
            }
        }
        // SCENARIO 2: Chemical Spill · Zone 4
        else if (scenario.includes('Chemical Spill')) {
            if (minuteOffset > 70) {
                const factor = Math.min((minuteOffset - 70) / 50, 1.0); // full spike by minute 120
                const sD2 = sensors.find(s => s.id === 'sensor-d2');
                if (sD2) {
                    sD2.lastReading = 1.5 + factor * 14.5; // 1.5 -> 16.0
                    sD2.status = sD2.lastReading > 10.0 ? 'CRITICAL' : (sD2.lastReading > 5.0 ? 'WARNING' : 'OK');
                }
                const sD1 = sensors.find(s => s.id === 'sensor-d1');
                if (sD1) {
                    sD1.lastReading = 35.0 + factor * 20; // 35 -> 55
                    sD1.status = sD1.lastReading > 50.0 ? 'WARNING' : 'OK';
                }
                if (minuteOffset >= 80) {
                    zones.find(z => z.id === 'zone-d-uuid').riskLevel = 'HIGH';
                    riskEvents.push({
                        id: `ev-${runId}-80`,
                        zoneId: 'zone-d-uuid',
                        zoneName: 'Zone D — Chemical Treatment & Storage',
                        severity: 'CRITICAL',
                        message: 'HAZARD ALARM: Acid containment breach in Tank-D4. H2S concentration high.',
                        timestamp: new Date().toISOString()
                    });
                }
                if (minuteOffset >= 110) {
                    zones.find(z => z.id === 'zone-b-uuid').riskLevel = 'MEDIUM';
                    const sB2 = sensors.find(s => s.id === 'sensor-b2');
                    if (sB2) {
                        sB2.lastReading = 200.0 + factor * 120; // 200 -> 320
                        sB2.status = 'WARNING';
                    }
                    riskEvents.push({
                        id: `ev-${runId}-110`,
                        zoneId: 'zone-b-uuid',
                        zoneName: 'Zone B — Blast Furnace Area',
                        severity: 'MEDIUM',
                        message: 'WARNING: Trace toxic vapor detected at Zone B boundary. Scrubbers engaged.',
                        timestamp: new Date().toISOString()
                    });
                }
            }
            for (const w of workers) {
                // Workers originally stationed in Zone D evacuate to Zone C muster point
                if (minuteOffset >= 80 && w.zoneId === 'zone-d-uuid') {
                    w.status = 'EVACUATING';
                    moveWorker(w, 'zone-c-uuid', 0.15);
                }
                else if (w.zoneId === 'zone-c-uuid' && w.status === 'EVACUATING') {
                    // Arrived at Zone C, mark safe
                    w.status = 'SAFE';
                    moveWorker(w, 'zone-c-uuid', 0.2);
                }
                else {
                    moveWorker(w, w.zoneId, 0.25);
                }
            }
        }
        // SCENARIO 3: Power Outage · Emergency
        else if (scenario.includes('Power Outage')) {
            if (minuteOffset > 75) {
                // Sensors flatline
                for (const s of sensors) {
                    s.lastReading = s.type === 'TEMPERATURE' ? 22.0 : 0.0;
                    s.status = 'CRITICAL';
                }
                for (const z of zones) {
                    z.riskLevel = z.id === 'zone-c-uuid' ? 'MEDIUM' : 'HIGH';
                }
                if (minuteOffset >= 80 && minuteOffset < 90) {
                    riskEvents.push({
                        id: `ev-${runId}-80`,
                        zoneId: 'zone-b-uuid',
                        zoneName: 'Zone B — Blast Furnace Area',
                        severity: 'CRITICAL',
                        message: 'POWER LOST: Sudden grid detachment. Running on Auxiliary Backup Battery.',
                        timestamp: new Date().toISOString()
                    });
                }
                if (minuteOffset >= 100) {
                    riskEvents.push({
                        id: `ev-${runId}-100`,
                        zoneId: 'zone-c-uuid',
                        zoneName: 'Zone C — Cooling & Rolling Mills',
                        severity: 'MEDIUM',
                        message: 'Diesel Generator Group A initialized. Limited baseline telemetry restored.',
                        timestamp: new Date().toISOString()
                    });
                }
            }
            for (const w of workers) {
                if (minuteOffset >= 80) {
                    w.status = 'EVACUATING';
                    // All workers crawl to Zone C safe station
                    moveWorker(w, 'zone-c-uuid', 0.08);
                }
                else {
                    moveWorker(w, w.zoneId, 0.3);
                }
            }
        }
        // Default monitoring state
        else {
            for (const w of workers) {
                moveWorker(w, w.zoneId, 0.1);
            }
        }
        return { workers, sensors, riskEvents, zones };
    }
}
exports.SimulationEngine = SimulationEngine;
