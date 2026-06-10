import React from 'react';
import { useStore } from '../store';
import { RefreshCw, Clock } from 'lucide-react';

export const TimelineScrubber: React.FC = () => {
  const {
    currentTickIndex,
    playbackMode,
    tickHistory,
    isRunning,
    setTickIndex,
    setPlaybackMode
  } = useStore();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setTickIndex(value);
  };

  // Format minute offset index to T-2h style
  // Index ranges 0 to 180.
  // 0 -> T-2h 00m
  // 120 -> T-00h 00m
  // 180 -> T+1h 00m
  const formatTimeOffset = (offset: number) => {
    const relativeMins = offset - 120; // relative to T-0
    const sign = relativeMins >= 0 ? '+' : '-';
    const absMins = Math.abs(relativeMins);
    const hrs = Math.floor(absMins / 60);
    const mins = absMins % 60;
    return `T${sign}${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  };

  const currentTick = useStore(state => state.getCurrentTick());
  const formattedTimestamp = currentTick 
    ? new Date(currentTick.timestamp).toLocaleTimeString() 
    : '10:00:00 PM';

  // Gather unique minutes when risk events occurred
  const alertMarkers = tickHistory.reduce((acc: number[], t) => {
    if (t.riskEvents.length > 0 && !acc.includes(t.minuteOffset)) {
      acc.push(t.minuteOffset);
    }
    return acc;
  }, []);

  return (
    <div className="bg-panel-bg border-t border-panel-border p-5 select-none w-full h-full flex flex-col justify-center">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-slate-500" />
          <div>
            <span className="text-sm font-bold text-industrial-black tracking-wide mr-2">
              Simulation Timeline
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold border border-slate-200">
              {formatTimeOffset(currentTickIndex)} ({formattedTimestamp})
            </span>
          </div>
        </div>

        {/* Playback Mode Control */}
        <div className="flex items-center space-x-3">
          {playbackMode === 'history' && (
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-bold border border-amber-200 animate-pulse">
              PAUSED · HISTORICAL ANALYSIS
            </span>
          )}
          {playbackMode === 'history' && isRunning && (
            <button
              onClick={() => setPlaybackMode('live')}
              className="flex items-center space-x-1.5 bg-coral hover:bg-coral-hover text-white text-[11px] font-bold px-3 py-1 rounded transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Snap to Live Telemetry</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrubber slider */}
      <div className="relative w-full px-1">
        {/* Scrubber Track markers for risk events */}
        <div className="absolute top-[9px] left-0 right-0 h-1.5 pointer-events-none">
          {alertMarkers.map((markerIdx) => {
            const percentage = (markerIdx / 180) * 100;
            return (
              <div
                key={markerIdx}
                className="absolute w-2.5 h-2.5 bg-coral border border-white rounded-full -translate-x-1/2 -translate-y-1/12 shadow-sm pulsing-overlay"
                style={{ left: `${percentage}%` }}
                title="Critical Hazard Alert Logged"
              />
            );
          })}
        </div>

        <input
          type="range"
          min="0"
          max={tickHistory.length > 0 ? tickHistory[tickHistory.length - 1].minuteOffset : 180}
          value={currentTickIndex}
          onChange={handleSliderChange}
          disabled={tickHistory.length === 0}
          className="w-full accent-coral h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Axis Scale Labels */}
      <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-bold px-1">
        <span>T - 2h (Start)</span>
        <span>T - 1.5h</span>
        <span>T - 1h</span>
        <span>T - 0.5h</span>
        <span className="text-gray-600">T - 0 (Shift Shift)</span>
        <span>T + 0.5h</span>
        <span>T + 1h (End)</span>
      </div>
    </div>
  );
};
