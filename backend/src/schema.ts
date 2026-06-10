import { isDbConnected, prisma } from './db';
import { memoryStore } from './memoryStore';
import { SimulationEngine } from './simulation';
import { generateSupervisorBriefing } from './groq';
import { subscribeChannel } from './redis';

export const typeDefs = `#graphql
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

function getSimulationTicksIterator(runId: string): AsyncIterator<any> {
  const queue: any[] = [];
  let resolver: ((value: IteratorResult<any>) => void) | null = null;
  let closed = false;
  let unsubscribeFn: (() => void) | null = null;

  // Subscribe to Redis / Event Emitter channel
  subscribeChannel(`simulation:${runId}`, (message: string) => {
    const data = JSON.parse(message);
    const tick = { simulationTicks: data };
    if (resolver) {
      resolver({ value: tick, done: false });
      resolver = null;
    } else {
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
      return new Promise<IteratorResult<any>>((resolve) => {
        resolver = resolve;
      });
    },
    async return() {
      closed = true;
      if (unsubscribeFn) unsubscribeFn();
      if (resolver) {
        resolver({ value: undefined, done: true });
        resolver = null;
      }
      return { value: undefined, done: true };
    },
    async throw(err) {
      closed = true;
      if (unsubscribeFn) unsubscribeFn();
      if (resolver) {
        resolver = null;
      }
      throw err;
    }
  };
}

export const resolvers = {
  Query: {
    factories: async () => {
      if (isDbConnected) {
        return await prisma.factory.findMany({ include: { zones: true } });
      }
      // Return memory fallback
      return memoryStore.factories;
    },
    latestSimulationRun: async () => {
      if (isDbConnected) {
        return await prisma.simulationRun.findFirst({
          orderBy: { startedAt: 'desc' }
        });
      }
      if (memoryStore.simulationRuns.length === 0) return null;
      return memoryStore.simulationRuns[memoryStore.simulationRuns.length - 1];
    },
    supervisorBriefing: async (_parent: any, { runId, scenario }: { runId: string; scenario: string }) => {
      let activeAlarms: string[] = [];

      // Query active warnings/critical errors to pass into LLM context
      if (isDbConnected) {
        const sensors = await prisma.sensor.findMany({
          where: { status: { in: ['WARNING', 'CRITICAL'] } }
        });
        activeAlarms = sensors.map(s => `${s.name}: ${s.status}`);
      } else {
        activeAlarms = memoryStore.sensors
          .filter(s => s.status === 'WARNING' || s.status === 'CRITICAL')
          .map(s => `${s.name}: ${s.status}`);
      }

      const briefingData = await generateSupervisorBriefing(runId, scenario, activeAlarms);
      return {
        runId,
        scenario,
        briefing: briefingData.briefing,
        cached: briefingData.cached
      };
    },
    simulationHistory: (_parent: any, { runId }: { runId: string }) => {
      return SimulationEngine.getRunHistory(runId);
    }
  },

  Mutation: {
    initializeFactoryData: async (_parent: any, { tenantId }: { tenantId: string }) => {
      if (isDbConnected) {
        // Seed database
        let factory = await prisma.factory.findFirst({ where: { tenantId } });
        if (!factory) {
          factory = await prisma.factory.create({
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
        return prisma.factory.findUnique({
          where: { id: factory.id },
          include: { zones: true }
        });
      } else {
        // Return memory default
        if (memoryStore.factories.length === 0) {
          const factoryId = "fact-default-uuid";
          memoryStore.factories.push({
            id: factoryId,
            tenantId,
            name: 'SENTRA Industrial Steel Complex',
            location: 'Jamshedpur, IN',
            createdAt: new Date()
          });
        }
        return memoryStore.factories[0];
      }
    },
    startSimulation: async (_parent: any, { tenantId, scenario, speed }: { tenantId: string; scenario: string; speed: number }) => {
      return await SimulationEngine.start(tenantId, scenario, speed);
    },
    stopSimulation: async (_parent: any, { runId }: { runId: string }) => {
      return await SimulationEngine.stop(runId);
    }
  },

  Subscription: {
    simulationTicks: {
      subscribe: (_parent: any, { runId }: { runId: string }) => {
        return getSimulationTicksIterator(runId);
      }
    }
  },

  Factory: {
    zones: async (parent: any) => {
      if (isDbConnected) {
        return await prisma.zone.findMany({ where: { factoryId: parent.id } });
      }
      return memoryStore.zones.filter(z => z.factoryId === parent.id);
    }
  },

  Zone: {
    coordinates: (parent: any) => {
      return typeof parent.coordinates === 'string'
        ? parent.coordinates
        : JSON.stringify(parent.coordinates);
    },
    sensors: async (parent: any) => {
      if (isDbConnected) {
        return await prisma.sensor.findMany({ where: { zoneId: parent.id } });
      }
      return memoryStore.sensors.filter(s => s.zoneId === parent.id);
    }
  }
};
