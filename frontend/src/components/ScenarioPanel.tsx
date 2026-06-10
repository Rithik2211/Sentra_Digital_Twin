import React from 'react';
import { useMutation, gql } from '@apollo/client';
import { useStore } from '../store';
import { Play, Square, Loader } from 'lucide-react';

const START_SIMULATION = gql`
  mutation StartSimulation($tenantId: String!, $scenario: String!, $speed: Int!) {
    startSimulation(tenantId: $tenantId, scenario: $scenario, speed: $speed) {
      id
      scenario
      status
      speed
    }
  }
`;

const STOP_SIMULATION = gql`
  mutation StopSimulation($runId: ID!) {
    stopSimulation(runId: $runId) {
      id
      status
    }
  }
`;

export const ScenarioPanel: React.FC = () => {
  const {
    selectedScenario,
    speedMultiplier,
    isRunning,
    activeRunId,
    setScenario,
    setSpeed,
    setRunning,
    setActiveRunId,
    clearHistory
  } = useStore();

  const [startSim, { loading: startLoading }] = useMutation(START_SIMULATION);
  const [stopSim, { loading: stopLoading }] = useMutation(STOP_SIMULATION);

  const scenarios = [
    {
      id: 'Night Shift · High Load',
      title: 'Night Shift · High Load',
      desc: 'Plant operating at 115% throughput capacity with minimal night staff. Higher grid thermal draw.',
      badge: 'Operational Drill'
    },
    {
      id: 'Chemical Spill · Zone 4',
      title: 'Chemical Spill · Zone 4',
      desc: 'Zone D chemical containment feed line failure. Migration of toxic vapors towards Zone B.',
      badge: 'Critical Hazard'
    },
    {
      id: 'Power Outage · Emergency',
      title: 'Power Outage · Emergency',
      desc: 'Primary grid substation failure. Secondary generators active. Evacuation of non-essential sectors.',
      badge: 'Emergency Stop'
    }
  ];

  const handleStart = async () => {
    try {
      clearHistory();
      const { data } = await startSim({
        variables: {
          tenantId: 'tenant-default',
          scenario: selectedScenario,
          speed: speedMultiplier
        }
      });
      if (data?.startSimulation) {
        setActiveRunId(data.startSimulation.id);
        setRunning(true);
      }
    } catch (e) {
      console.error("Mutation failed to start:", e);
    }
  };

  const handleStop = async () => {
    if (!activeRunId) return;
    try {
      await stopSim({
        variables: {
          runId: activeRunId
        }
      });
      setRunning(false);
      setActiveRunId(null);
    } catch (e) {
      console.error("Mutation failed to stop:", e);
    }
  };

  return (
    <div className="flex flex-col bg-panel-bg border-r border-panel-border h-full w-full p-6 select-none justify-between">
      <div>
        <div className="mb-6">
          <h2 className="text-sm font-bold text-industrial-black uppercase tracking-wider mb-1">
            Simulation Scenario
          </h2>
          <p className="text-xs text-gray-500">Select industrial drill to load into the twin</p>
        </div>

        {/* Scenario Selectors */}
        <div className="space-y-4 mb-8">
          {scenarios.map((sc) => {
            const isSelected = selectedScenario === sc.id;
            return (
              <button
                key={sc.id}
                disabled={isRunning}
                onClick={() => setScenario(sc.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-coral bg-coral-light/20 shadow-sm'
                    : 'border-panel-border hover:border-gray-300 bg-panel-surface'
                } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-coral' : 'text-gray-800'}`}>
                    {sc.title}
                  </span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${
                    sc.badge === 'Operational Drill' 
                      ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                      : 'bg-red-50 text-coral border border-red-100'
                  }`}>
                    {sc.badge}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{sc.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Speed Controls */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Time Scale Speed
          </h3>
          <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-lg">
            {[1, 6, 30, 60].map((s) => {
              const isSelected = speedMultiplier === s;
              return (
                <button
                  key={s}
                  disabled={isRunning}
                  onClick={() => setSpeed(s)}
                  className={`py-1.5 text-xs font-bold rounded ${
                    isSelected
                      ? 'bg-white text-coral shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  } ${isRunning ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  {s}x
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trigger Buttons */}
      <div>
        {isRunning ? (
          <button
            onClick={handleStop}
            disabled={stopLoading}
            className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3 px-4 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            {stopLoading ? <Loader className="animate-spin w-4 h-4" /> : <Square className="w-4 h-4 fill-white" />}
            <span>Abrupt Stop Simulation</span>
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={startLoading}
            className="w-full flex items-center justify-center space-x-2 bg-coral hover:bg-coral-hover text-white font-bold text-sm py-3 px-4 rounded-lg transition-colors cursor-pointer shadow-md"
          >
            {startLoading ? <Loader className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>Run Safety Simulation</span>
          </button>
        )}
      </div>
    </div>
  );
};
