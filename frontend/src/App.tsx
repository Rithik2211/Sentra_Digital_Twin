import React, { useEffect } from 'react';
import { useMutation, useSubscription, gql } from '@apollo/client';
import { useStore } from './store';
import { TopBar } from './components/TopBar';
import { ScenarioPanel } from './components/ScenarioPanel';
import { ActionsPanel } from './components/ActionsPanel';
import { RiskZonesPanel } from './components/RiskZonesPanel';
import { BriefingPanel } from './components/BriefingPanel';
import { TimelineScrubber } from './components/TimelineScrubber';
import { Factory3D } from './components/Factory3D';
import { AlertCircle } from 'lucide-react';

const INITIALIZE_FACTORY = gql`
  mutation InitializeFactoryData($tenantId: String!) {
    initializeFactoryData(tenantId: $tenantId) {
      id
      name
      location
    }
  }
`;

const SIMULATION_TICKS_SUBSCRIPTION = gql`
  subscription OnSimulationTick($runId: ID!) {
    simulationTicks(runId: $runId) {
      runId
      timestamp
      minuteOffset
      workers {
        id
        name
        x
        y
        z
        status
        zoneId
      }
      sensors {
        id
        name
        type
        status
        lastReading
        zoneId
      }
      riskEvents {
        id
        zoneId
        zoneName
        severity
        message
        timestamp
      }
      zones {
        id
        name
        riskLevel
      }
    }
  }
`;

function App() {
  const activeRunId = useStore((state) => state.activeRunId);
  const isRunning = useStore((state) => state.isRunning);
  const addTick = useStore((state) => state.addTick);
  const setRunning = useStore((state) => state.setRunning);
  const setActiveRunId = useStore((state) => state.setActiveRunId);

  const [initFactory] = useMutation(INITIALIZE_FACTORY);

  // Initialize data on component mount
  useEffect(() => {
    initFactory({ variables: { tenantId: 'tenant-default' } }).catch(() => {});
  }, [initFactory]);

  // Subscribe to real-time simulation tick updates
  const { data, error } = useSubscription(SIMULATION_TICKS_SUBSCRIPTION, {
    variables: { runId: activeRunId || '' },
    skip: !activeRunId || !isRunning,
  });

  useEffect(() => {
    if (data?.simulationTicks) {
      addTick(data.simulationTicks);
      
      // Auto complete simulation if timeline limit is met (T+1h, 180 minutes)
      if (data.simulationTicks.minuteOffset >= 180) {
        setRunning(false);
        setActiveRunId(null);
      }
    }
  }, [data, addTick, setRunning, setActiveRunId]);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden font-sans">
      {/* Black Top Header */}
      <TopBar />

      {/* Main Dashboard Layout Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Config Panel & Recommended Actions */}
        <div className="w-[360px] shrink-0 flex flex-col border-r border-panel-border bg-white h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <ScenarioPanel />
          </div>
          <div className="h-[250px] border-t border-panel-border">
            <ActionsPanel />
          </div>
        </div>

        {/* Center Column: Isometric 3D Canvas & Timeline Controls */}
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
          {error && (
            <div className="absolute top-16 left-4 right-4 z-50 bg-red-900/90 text-white p-3 rounded-lg border border-red-700 flex items-center space-x-2 text-xs shadow-md">
              <AlertCircle className="w-4 h-4 text-red-300" />
              <span>WebSocket Subscription Link Disconnected. Retrying Connection...</span>
            </div>
          )}
          
          <div className="flex-1 relative">
            <Factory3D />
          </div>
          <div className="h-[120px] shrink-0 border-t border-panel-border">
            <TimelineScrubber />
          </div>
        </div>

        {/* Right Column: Risk Analytics Panel & Supervisor Briefing Log */}
        <div className="w-[450px] shrink-0 flex flex-col border-l border-panel-border bg-white h-full overflow-hidden">
          <div className="flex-1 overflow-hidden border-b border-panel-border">
            <RiskZonesPanel />
          </div>
          <div className="h-[360px] shrink-0 overflow-hidden">
            <BriefingPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
