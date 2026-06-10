export interface MemoryFactory {
  id: string;
  tenantId: string;
  name: string;
  location: string;
  createdAt: Date;
}

export interface MemoryZone {
  id: string;
  factoryId: string;
  name: string;
  riskLevel: string;
  coordinates: any;
}

export interface MemorySensor {
  id: string;
  zoneId: string;
  name: string;
  type: string;
  status: string;
  lastReading: number;
  updatedAt: Date;
}

export interface MemorySimulationRun {
  id: string;
  tenantId: string;
  scenario: string;
  status: string;
  startedAt: Date;
  endedAt?: Date | null;
  speed: number;
}

export interface MemoryRiskEvent {
  id: string;
  simulationRunId: string;
  zoneId: string;
  severity: string;
  message: string;
  timestamp: Date;
}

export interface MemoryWorkerAgent {
  id: string;
  simulationRunId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  status: string;
  zoneId: string;
}

export const memoryStore = {
  factories: [] as MemoryFactory[],
  zones: [] as MemoryZone[],
  sensors: [] as MemorySensor[],
  simulationRuns: [] as MemorySimulationRun[],
  riskEvents: [] as MemoryRiskEvent[],
  workerAgents: [] as MemoryWorkerAgent[],
};

export function seedMemoryDb() {
  if (memoryStore.factories.length > 0) return;

  const factoryId = "fact-default-uuid";
  const tenantId = "tenant-default";

  memoryStore.factories.push({
    id: factoryId,
    tenantId,
    name: "SENTRA Industrial Steel Complex",
    location: "Jamshedpur, IN",
    createdAt: new Date(),
  });

  const zonesData = [
    { id: "zone-a-uuid", name: "Zone A — Raw Materials & Mixing", coords: { x: 0, z: 0, w: 10, d: 10 } },
    { id: "zone-b-uuid", name: "Zone B — Blast Furnace Area", coords: { x: 12, z: 0, w: 12, d: 10 } },
    { id: "zone-c-uuid", name: "Zone C — Cooling & Rolling Mills", coords: { x: 0, z: 12, w: 10, d: 12 } },
    { id: "zone-d-uuid", name: "Zone D — Chemical Treatment & Storage", coords: { x: 12, z: 12, w: 12, d: 12 } },
  ];

  for (const z of zonesData) {
    memoryStore.zones.push({
      id: z.id,
      factoryId,
      name: z.name,
      riskLevel: "LOW",
      coordinates: z.coords,
    });

    if (z.id === "zone-a-uuid") {
      memoryStore.sensors.push(
        { id: "sensor-a1", zoneId: z.id, name: "Conveyor-Speed", type: "PRESSURE", status: "OK", lastReading: 85.2, updatedAt: new Date() },
        { id: "sensor-a2", zoneId: z.id, name: "Mixer-Vibration", type: "NOISE", status: "OK", lastReading: 42.1, updatedAt: new Date() }
      );
    } else if (z.id === "zone-b-uuid") {
      memoryStore.sensors.push(
        { id: "sensor-b1", zoneId: z.id, name: "Furnace-Temp", type: "TEMPERATURE", status: "OK", lastReading: 1150.0, updatedAt: new Date() },
        { id: "sensor-b2", zoneId: z.id, name: "CO2-GasLevel", type: "GAS", status: "OK", lastReading: 240.5, updatedAt: new Date() }
      );
    } else if (z.id === "zone-c-uuid") {
      memoryStore.sensors.push(
        { id: "sensor-c1", zoneId: z.id, name: "Cooler-Pressure", type: "PRESSURE", status: "OK", lastReading: 320.0, updatedAt: new Date() },
        { id: "sensor-c2", zoneId: z.id, name: "Noise-Level", type: "NOISE", status: "OK", lastReading: 78.4, updatedAt: new Date() }
      );
    } else if (z.id === "zone-d-uuid") {
      memoryStore.sensors.push(
        { id: "sensor-d1", zoneId: z.id, name: "Chemical-Temp", type: "TEMPERATURE", status: "OK", lastReading: 36.5, updatedAt: new Date() },
        { id: "sensor-d2", zoneId: z.id, name: "H2S-GasLevel", type: "GAS", status: "OK", lastReading: 2.1, updatedAt: new Date() }
      );
    }
  }
}
