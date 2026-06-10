import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { CheckSquare, Square, ShieldAlert } from 'lucide-react';

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export const ActionsPanel: React.FC = () => {
  const selectedScenario = useStore((state) => state.selectedScenario);
  const isRunning = useStore((state) => state.isRunning);
  
  const [actions, setActions] = useState<ActionItem[]>([]);

  // Update recommendations based on selected drill scenario
  useEffect(() => {
    let list: string[] = [];
    if (selectedScenario.includes('Night Shift')) {
      list = [
        'Audit ventilation filter states in Blast Furnace Zone B',
        'Check cooling water loops pressure settings (Target: 320 kPa)',
        'Rotate floor crew to avoid heat-fatigue (2-hour limit)',
        'Verify conveyor belt motor thermal reading sensors'
      ];
    } else if (selectedScenario.includes('Chemical Spill')) {
      list = [
        'Seal Zone D automatic magnetic fire doors to contain acidic vapor',
        'Initiate HVAC negative pressure draw on Zone D ducts',
        'Evacuate all personnel to Zone C Muster Station',
        'Prepare Chemical Containment Squads with soda ash neutralizers'
      ];
    } else if (selectedScenario.includes('Power Outage')) {
      list = [
        'Trigger electromagnetic stops on heavy rolling mill machinery',
        'Confirm automatic startup of diesel fire pumps in Zone D',
        'Guide workers along low-light emergency pathways to Zone C',
        'Check generator fuel indicators (Target: >80% backup volume)'
      ];
    } else {
      list = [
        'Monitor standard thermal profiles of all equipment',
        'Verify emergency escape corridors are free and clear',
        'Confirm secondary battery reserves are at 100% capacity',
        'Log standard sensor calibration markers'
      ];
    }

    setActions(list.map((act, idx) => ({ id: `act-${idx}`, text: act, completed: false })));
  }, [selectedScenario, isRunning]);

  const toggleAction = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  return (
    <div className="bg-panel-bg flex flex-col h-full overflow-hidden select-none p-5">
      <div className="flex items-center space-x-2 mb-3 shrink-0">
        <ShieldAlert className="w-5 h-5 text-coral shrink-0" />
        <h2 className="text-sm font-bold text-industrial-black uppercase tracking-wider">
          Recommended Safety Actions
        </h2>
      </div>

      <div className="flex-1 bg-panel-surface border border-panel-border rounded-lg p-4 overflow-y-auto">
        <div className="space-y-3">
          {actions.map((act) => (
            <button
              key={act.id}
              onClick={() => toggleAction(act.id)}
              className={`w-full flex items-start space-x-3 text-left p-3 rounded-md border transition-all ${
                act.completed
                  ? 'bg-green-50/50 border-green-200 text-green-700'
                  : 'bg-white border-gray-100 hover:border-gray-300 text-gray-700 shadow-2xs'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {act.completed ? (
                  <CheckSquare className="w-4 h-4 text-green-600 fill-green-100" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <span className={`text-[11px] font-medium leading-relaxed ${act.completed ? 'line-through opacity-85' : ''}`}>
                {act.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
