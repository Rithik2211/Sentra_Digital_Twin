import { create } from 'zustand';

export interface WorkerAgent {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  status: string;
  zoneId: string;
}

export interface Sensor {
  id: string;
  name: string;
  type: string;
  status: string;
  lastReading: number;
  zoneId: string;
}

export interface Zone {
  id: string;
  name: string;
  riskLevel: string;
}

export interface RiskEvent {
  id: string;
  zoneId: string;
  zoneName: string;
  severity: string;
  message: string;
  timestamp: string;
}

export interface SimTick {
  runId: string;
  timestamp: string;
  minuteOffset: number;
  workers: WorkerAgent[];
  sensors: Sensor[];
  riskEvents: RiskEvent[];
  zones: Zone[];
}

interface SentraState {
  selectedScenario: string;
  speedMultiplier: number;
  isRunning: boolean;
  activeRunId: string | null;
  currentTickIndex: number; // 0 to 180 (representing T-2h to T+1h)
  tickHistory: SimTick[];
  playbackMode: 'live' | 'history';
  briefing: string;
  isBriefingLoading: boolean;
  currentView: 'landing' | 'twin';
  
  // Actions
  setScenario: (scenario: string) => void;
  setSpeed: (speed: number) => void;
  setRunning: (isRunning: boolean) => void;
  setActiveRunId: (runId: string | null) => void;
  setTickIndex: (index: number) => void;
  addTick: (tick: SimTick) => void;
  setPlaybackMode: (mode: 'live' | 'history') => void;
  setBriefing: (briefing: string) => void;
  setBriefingLoading: (loading: boolean) => void;
  setView: (view: 'landing' | 'twin') => void;
  clearHistory: () => void;
  getCurrentTick: () => SimTick | null;
}

export const useStore = create<SentraState>((set, get) => ({
  selectedScenario: 'Night Shift · High Load',
  speedMultiplier: 1,
  isRunning: false,
  activeRunId: null,
  currentTickIndex: 0,
  tickHistory: [],
  playbackMode: 'live',
  briefing: '',
  isBriefingLoading: false,
  currentView: 'landing',

  setScenario: (scenario) => set({ selectedScenario: scenario }),
  setSpeed: (speed) => set({ speedMultiplier: speed }),
  setRunning: (isRunning) => set({ isRunning }),
  setActiveRunId: (runId) => set({ activeRunId: runId }),
  setTickIndex: (index) => set({ currentTickIndex: index, playbackMode: 'history' }),
  addTick: (tick) => set((state) => {
    // Upsert tick by offset
    const existingIdx = state.tickHistory.findIndex(t => t.minuteOffset === tick.minuteOffset);
    const newHistory = [...state.tickHistory];
    if (existingIdx >= 0) {
      newHistory[existingIdx] = tick;
    } else {
      newHistory.push(tick);
      newHistory.sort((a, b) => a.minuteOffset - b.minuteOffset);
    }
    
    return {
      tickHistory: newHistory,
      currentTickIndex: state.playbackMode === 'live' ? tick.minuteOffset : state.currentTickIndex
    };
  }),
  setPlaybackMode: (mode) => set((state) => ({
    playbackMode: mode,
    currentTickIndex: mode === 'live' && state.tickHistory.length > 0
      ? state.tickHistory[state.tickHistory.length - 1].minuteOffset
      : state.currentTickIndex
  })),
  setBriefing: (briefing) => set({ briefing }),
  setBriefingLoading: (loading) => set({ isBriefingLoading: loading }),
  setView: (view) => set({ currentView: view }),
  clearHistory: () => set({ 
    tickHistory: [], 
    currentTickIndex: 0, 
    playbackMode: 'live', 
    briefing: '', 
    activeRunId: null, 
    isRunning: false 
  }),
  getCurrentTick: () => {
    const { tickHistory, currentTickIndex } = get();
    if (tickHistory.length === 0) return null;
    
    // Find closest recorded offset
    const closest = tickHistory.reduce((prev, curr) => 
      Math.abs(curr.minuteOffset - currentTickIndex) < Math.abs(prev.minuteOffset - currentTickIndex) ? curr : prev
    );
    return closest;
  }
}));
