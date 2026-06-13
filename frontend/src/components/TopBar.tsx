import React from 'react';
import { ShieldCheck, Server, Network, Users, ArrowLeft } from 'lucide-react';
import { useStore } from '../store';

export const TopBar: React.FC = () => {
  const setView = useStore((state) => state.setView);
  const tenantContext = useStore((state) => state.tenantContext);
  const setTenantContext = useStore((state) => state.setTenantContext);

  return (
    <header className="bg-industrial-black border-b border-zinc-900 h-16 flex items-center justify-between px-6 select-none shrink-0 text-white shadow-md">
      {/* Brand logo & back button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setView('landing')}
          className="flex items-center space-x-1.5 text-xs font-bold bg-zinc-900 border border-zinc-800 hover:text-coral hover:border-coral px-3 py-1.5 rounded transition-all cursor-pointer"
          title="Return to Portal Landing Page"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Portal Home</span>
        </button>

        <div className="hidden md:block w-px h-6 bg-zinc-800" />

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center font-extrabold text-white text-base shadow-sm">
            S
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider uppercase leading-none flex items-center">
              SENTRA <span className="text-[10px] text-coral ml-1 font-bold">DIGITAL TWIN</span>
            </h1>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none block mt-0.5">
              Enterprise Industrial Safety Framework
            </span>
          </div>
        </div>
      </div>

      {/* Tenant Context Selector */}
      <div className="flex items-center space-x-3 bg-zinc-900 border border-zinc-800 rounded-full py-1.5 px-4">
        <div className="w-1.5 h-1.5 rounded-full bg-coral animate-ping" />
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
          Tenant Context:
        </span>
        <select 
          className="bg-transparent text-xs font-bold text-zinc-200 focus:outline-hidden hover:text-white cursor-pointer"
          value={tenantContext}
          onChange={(e) => setTenantContext(e.target.value)}
        >
          <option value="tenant-default" className="bg-zinc-950 text-white font-bold">Tata Steel — Jamshedpur Complex</option>
          <option value="tenant-tvs" className="bg-zinc-950 text-white font-bold">TVS Motors — Hosur Plant</option>
          <option value="tenant-mahindra" className="bg-zinc-950 text-white font-bold">Mahindra Aerospace — Bengaluru</option>
        </select>
      </div>

      {/* Cluster/System Telemetry */}
      <div className="flex items-center space-x-5">
        <div className="hidden lg:flex items-center space-x-2 bg-zinc-900/40 px-3 py-1.5 rounded-md border border-zinc-800/60">
          <Server className="w-3.5 h-3.5 text-coral" />
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            Row Level Security (RLS) Active
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Network className="w-3.5 h-3.5 text-green-500" />
          <span className="text-[10px] text-zinc-300 font-bold tracking-wide">
            WS Socket Active
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Users className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[10px] text-zinc-300 font-bold">
            1.2k Viewers
          </span>
        </div>

        <div className="flex items-center space-x-1.5 bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded text-[10px] font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SECURE</span>
        </div>
      </div>
    </header>
  );
};
