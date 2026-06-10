import React from 'react';
import { useStore } from '../store';
import { Shield, AlertTriangle, AlertCircle, Radio } from 'lucide-react';

export const RiskZonesPanel: React.FC = () => {
  const currentTick = useStore((state) => state.getCurrentTick());
  const isRunning = useStore((state) => state.isRunning);

  // Default mock fallback when simulation hasn't started yet
  const defaultZones = [
    { name: 'Zone A — Raw Materials & Mixing', riskLevel: 'LOW', sensors: [{ name: 'Conveyor-Speed', Reading: '80.0 RPM', status: 'OK' }, { name: 'Mixer-Vibration', Reading: '40.0 Hz', status: 'OK' }] },
    { name: 'Zone B — Blast Furnace Area', riskLevel: 'LOW', sensors: [{ name: 'Furnace-Temp', Reading: '1100.0 °C', status: 'OK' }, { name: 'CO2-GasLevel', Reading: '200.0 ppm', status: 'OK' }] },
    { name: 'Zone C — Cooling & Rolling Mills', riskLevel: 'LOW', sensors: [{ name: 'Cooler-Pressure', Reading: '300.0 kPa', status: 'OK' }, { name: 'Noise-Level', Reading: '75.0 dB', status: 'OK' }] },
    { name: 'Zone D — Chemical Treatment & Storage', riskLevel: 'LOW', sensors: [{ name: 'Chemical-Temp', Reading: '35.0 °C', status: 'OK' }, { name: 'H2S-GasLevel', Reading: '1.5 ppm', status: 'OK' }] }
  ];

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'HIGH':
        return <AlertCircle className="w-4 h-4 text-coral shrink-0" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Shield className="w-4 h-4 text-green-500 shrink-0" />;
    }
  };

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-50 text-coral border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      default:
        return 'bg-green-50 text-green-600 border-green-200';
    }
  };

  const getSensorStatusClass = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-red-100 text-coral border-red-300';
      case 'WARNING':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const zones = currentTick
    ? currentTick.zones.map(z => ({
        ...z,
        sensors: currentTick.sensors.filter(s => s.zoneId === z.id)
      }))
    : defaultZones.map((z, idx) => ({
        id: `default-${idx}`,
        name: z.name,
        riskLevel: z.riskLevel,
        sensors: z.sensors.map((s, sIdx) => ({
          id: `sensor-${idx}-${sIdx}`,
          name: s.name,
          lastReading: parseFloat(s.Reading),
          status: s.status,
          unit: s.Reading.split(' ')[1] || ''
        }))
      }));

  return (
    <div className="bg-panel-bg border-b border-panel-border p-5 select-none h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-sm font-bold text-industrial-black uppercase tracking-wider mb-0.5">
            Operational Risk Zones
          </h2>
          <p className="text-xs text-gray-500">
            {isRunning ? 'Real-time telemetry and hazard assessment' : 'System idle — standard baselines displayed'}
          </p>
        </div>
        {isRunning && (
          <span className="flex items-center space-x-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 animate-pulse">
            <Radio className="w-3 h-3" />
            <span>LIVE STREAM</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {zones.map((z) => (
          <div
            key={z.id}
            className={`border rounded-lg p-4 transition-all duration-300 ${
              z.riskLevel === 'HIGH'
                ? 'border-coral/50 bg-red-50/10 shadow-sm shadow-red-100'
                : z.riskLevel === 'MEDIUM'
                ? 'border-amber-400/50 bg-amber-50/10'
                : 'border-panel-border hover:border-gray-300 bg-panel-surface'
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold text-gray-800 leading-snug max-w-[70%]">
                {z.name.split(' — ')[0]}
              </span>
              <span className={`flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded border ${getRiskBadgeClass(z.riskLevel)}`}>
                {getRiskIcon(z.riskLevel)}
                <span>{z.riskLevel}</span>
              </span>
            </div>

            {/* Sensor Items */}
            <div className="space-y-2">
              {z.sensors.map((s: any) => {
                const readingStr = s.unit !== undefined 
                  ? `${s.lastReading.toFixed(1)} ${s.unit}`
                  : `${s.lastReading.toFixed(1)} ${
                      s.type === 'TEMPERATURE' ? '°C' : s.type === 'GAS' ? 'ppm' : s.type === 'PRESSURE' ? 'RPM/kPa' : 'dB'
                    }`;

                return (
                  <div key={s.id} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-md shadow-2xs">
                    <span className="text-[11px] text-gray-500 font-medium">{s.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSensorStatusClass(s.status)}`}>
                      {readingStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
