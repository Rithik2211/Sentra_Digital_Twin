"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.typeDefs = void 0;
const db_1 = require("./db");
const memoryStore_1 = require("./memoryStore");
const simulation_1 = require("./simulation");
const groq_1 = require("./groq");
const redis_1 = require("./redis");
exports.typeDefs = `#graphql
  type Factory {
    id: ID!
    tenantId: String!
    name: String!
    location: String!
    zones: [Zone!]!
  }

  type Zone {
    id: ID!
    factoryId: ID!
    name: String!
    riskLevel: String!
    coordinates: String!
    sensors: [Sensor!]!
  }

  type Sensor {
    id: ID!
    zoneId: ID!
    name: String!
    type: String!
    status: String!
    lastReading: Float!
  }

  type SimulationRun {
    id: ID!
    tenantId: String!
    scenario: String!
    status: String!
    startedAt: String!
    endedAt: String
    speed: Int!
  }

  type RiskEvent {
    id: ID!
    simulationRunId: ID!
    zoneId: ID!
    zoneName: String!
    severity: String!
    message: String!
    timestamp: String!
  }

  type WorkerAgent {
    id: ID!
    name: String!
    x: Float!
    y: Float!
    z: Float!
    status: String!
    zoneId: ID!
  }

  type SimulationTick {
    runId: ID!
    timestamp: String!
    minuteOffset: Int!
    workers: [WorkerAgent!]!
    sensors: [Sensor!]!
    riskEvents: [RiskEvent!]!
    zones: [Zone!]!
  }

  type SupervisorBriefing {
    runId: ID!
    scenario: String!
    briefing: String!
    cached: Boolean!
  }

  type Query {
    factories: [Factory!]!
    latestSimulationRun: SimulationRun
    supervisorBriefing(runId: ID!, scenario: String!): SupervisorBriefing!
    simulationHistory(runId: ID!): [SimulationTick!]!
  }

  type Mutation {
    initializeFactoryData(tenantId: String!): Factory!
    startSimulation(tenantId: String!, scenario: String!, speed: Int!): SimulationRun!
    stopSimulation(runId: ID!): SimulationRun!
  }

  type Subscription {
    simulationTicks(runId: ID!): SimulationTick!
  }
`;
function getSimulationTicksIterator(runId) {
    const queue = [];
    let resolver = null;
    let closed = false;
    let unsubscribeFn = null;
    // Subscribe to Redis / Event Emitter channel
    (0, redis_1.subscribeChannel)(`simulation:${runId}`, (message) => {
        const data = JSON.parse(message);
        const tick = { simulationTicks: data };
        if (resolver) {
            resolver({ value: tick, done: false });
            resolver = null;
        }
        else {
            queue.push(tick);
        }
    }).then(unsub => {
        unsubscribeFn = unsub;
    });
    return {
        async next() {
            if (queue.length > 0) {
                return { value: queue.shift(), done: false };
            }
            if (closed) {
                return { value: undefined, done: true };
            }
            return new Promise((resolve) => {
                resolver = resolve;
            });
        },
        async return() {
            closed = true;
            if (unsubscribeFn)
                unsubscribeFn();
            if (resolver) {
                resolver({ value: undefined, done: true });
                resolver = null;
            }
            return { value: undefined, done: true };
        },
        async throw(err) {
            closed = true;
            if (unsubscribeFn)
                unsubscribeFn();
            if (resolver) {
                resolver = null;
            }
            throw err;
        }
    };
}
exports.resolvers = {
    Query: {
        factories: async () => {
            if (db_1.isDbConnected) {
                return await db_1.prisma.factory.findMany({ include: { zones: true } });
            }
            // Return memory fallback
            return memoryStore_1.memoryStore.factories;
        },
        latestSimulationRun: async () => {
            if (db_1.isDbConnected) {
                return await db_1.prisma.simulationRun.findFirst({
                    orderBy: { startedAt: 'desc' }
                });
            }
            if (memoryStore_1.memoryStore.simulationRuns.length === 0)
                return null;
            return memoryStore_1.memoryStore.simulationRuns[memoryStore_1.memoryStore.simulationRuns.length - 1];
        },
        supervisorBriefing: async (_parent, { runId, scenario }) => {
            let activeAlarms = [];
            // Query active warnings/critical errors to pass into LLM context
            if (db_1.isDbConnected) {
                const sensors = await db_1.prisma.sensor.findMany({
                    where: { status: { in: ['WARNING', 'CRITICAL'] } }
                });
                activeAlarms = sensors.map(s => `${s.name}: ${s.status}`);
            }
            else {
                activeAlarms = memoryStore_1.memoryStore.sensors
                    .filter(s => s.status === 'WARNING' || s.status === 'CRITICAL')
                    .map(s => `${s.name}: ${s.status}`);
            }
            const briefingData = await (0, groq_1.generateSupervisorBriefing)(runId, scenario, activeAlarms);
            return {
                runId,
                scenario,
                briefing: briefingData.briefing,
                cached: briefingData.cached
            };
        },
        simulationHistory: (_parent, { runId }) => {
            return simulation_1.SimulationEngine.getRunHistory(runId);
        }
    },
    Mutation: {
        initializeFactoryData: async (_parent, { tenantId }) => {
            if (db_1.isDbConnected) {
                // Seed database
                let factory = await db_1.prisma.factory.findFirst({ where: { tenantId } });
                if (!factory) {
                    factory = await db_1.prisma.factory.create({
                        data: {
                            tenantId,
                            name: 'SENTRA Industrial Steel Complex',
                            location: 'Jamshedpur, IN',
                            zones: {
                                create: [
                                    {
                                        name: 'Zone A — Raw Materials & Mixing',
                                        riskLevel: 'LOW',
                                        coordinates: JSON.stringify({ x: 0, z: 0, w: 10, d: 10 }),
                                        sensors: {
                                            create: [
                                                { name: 'Conveyor-Speed', type: 'PRESSURE', status: 'OK', lastReading: 85.2 },
                                                { name: 'Mixer-Vibration', type: 'NOISE', status: 'OK', lastReading: 42.1 }
                                            ]
                                        }
                                    },
                                    {
                                        name: 'Zone B — Blast Furnace Area',
                                        riskLevel: 'LOW',
                                        coordinates: JSON.stringify({ x: 12, z: 0, w: 12, d: 10 }),
                                        sensors: {
                                            create: [
                                                { name: 'Furnace-Temp', type: 'TEMPERATURE', status: 'OK', lastReading: 1100.0 },
                                                { name: 'CO2-GasLevel', type: 'GAS', status: 'OK', lastReading: 200.0 }
                                            ]
                                        }
                                    },
                                    {
                                        name: 'Zone C — Cooling & Rolling Mills',
                                        riskLevel: 'LOW',
                                        coordinates: JSON.stringify({ x: 0, z: 12, w: 10, d: 12 }),
                                        sensors: {
                                            create: [
                                                { name: 'Cooler-Pressure', type: 'PRESSURE', status: 'OK', lastReading: 300.0 },
                                                { name: 'Noise-Level', type: 'NOISE', status: 'OK', lastReading: 75.0 }
                                            ]
                                        }
                                    },
                                    {
                                        name: 'Zone D — Chemical Treatment & Storage',
                                        riskLevel: 'LOW',
                                        coordinates: JSON.stringify({ x: 12, z: 12, w: 12, d: 12 }),
                                        sensors: {
                                            create: [
                                                { name: 'Chemical-Temp', type: 'TEMPERATURE', status: 'OK', lastReading: 35.0 },
                                                { name: 'H2S-GasLevel', type: 'GAS', status: 'OK', lastReading: 1.5 }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    });
                }
                return db_1.prisma.factory.findUnique({
                    where: { id: factory.id },
                    include: { zones: true }
                });
            }
            else {
                // Return memory default
                if (memoryStore_1.memoryStore.factories.length === 0) {
                    const factoryId = "fact-default-uuid";
                    memoryStore_1.memoryStore.factories.push({
                        id: factoryId,
                        tenantId,
                        name: 'SENTRA Industrial Steel Complex',
                        location: 'Jamshedpur, IN',
                        createdAt: new Date()
                    });
                }
                return memoryStore_1.memoryStore.factories[0];
            }
        },
        startSimulation: async (_parent, { tenantId, scenario, speed }) => {
            return await simulation_1.SimulationEngine.start(tenantId, scenario, speed);
        },
        stopSimulation: async (_parent, { runId }) => {
            return await simulation_1.SimulationEngine.stop(runId);
        }
    },
    Subscription: {
        simulationTicks: {
            subscribe: (_parent, { runId }) => {
                return getSimulationTicksIterator(runId);
            }
        }
    },
    Factory: {
        zones: async (parent) => {
            if (db_1.isDbConnected) {
                return await db_1.prisma.zone.findMany({ where: { factoryId: parent.id } });
            }
            return memoryStore_1.memoryStore.zones.filter(z => z.factoryId === parent.id);
        }
    },
    Zone: {
        coordinates: (parent) => {
            return typeof parent.coordinates === 'string'
                ? parent.coordinates
                : JSON.stringify(parent.coordinates);
        },
        sensors: async (parent) => {
            if (db_1.isDbConnected) {
                return await db_1.prisma.sensor.findMany({ where: { zoneId: parent.id } });
            }
            return memoryStore_1.memoryStore.sensors.filter(s => s.zoneId === parent.id);
        }
    }
};
