import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Play, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import * as THREE from 'three';

export const LandingPage: React.FC = () => {
  const setView = useStore((state) => state.setView);
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  // Spin up a simple rotating grid with particles inside the card preview
  useEffect(() => {
    if (!previewCanvasRef.current) return;

    const width = previewCanvasRef.current.clientWidth;
    const height = previewCanvasRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfcfcfd); // clean light background matching landing card

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 100);
    camera.position.set(8, 6, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    previewCanvasRef.current.appendChild(renderer.domElement);

    // Light grid lines on the floor
    const grid = new THREE.GridHelper(6, 12, 0xe8593c, 0xe2e8f0);
    grid.position.y = -0.5;
    scene.add(grid);

    // Draw a small abstract factory ring
    const ringGeo = new THREE.RingGeometry(1.8, 2.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    scene.add(ring);

    // Central core node
    const coreGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xe8593c });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0, 0);
    scene.add(core);

    // Simulated worker agents as colorful small spheres
    const agentGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const colors = [0x0ea5e9, 0x10b981, 0xf59e0b, 0xef4444];
    const agents: THREE.Mesh[] = [];

    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length] });
      const agent = new THREE.Mesh(agentGeo, mat);
      
      const angle = (i / 6) * Math.PI * 2;
      agent.position.set(Math.cos(angle) * 1.8, 0, Math.sin(angle) * 1.8);
      scene.add(agent);
      agents.push(agent);
    }

    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Rotate camera around center
      camera.position.x = Math.sin(time * 0.2) * 8;
      camera.position.z = Math.cos(time * 0.2) * 8;
      camera.lookAt(0, 0, 0);

      // Pulse core
      const scale = 1.0 + Math.sin(time * 3) * 0.1;
      core.scale.set(scale, scale, scale);
      core.rotation.y = time * 0.5;

      // Animate particles along ring path
      agents.forEach((agent, i) => {
        const speed = 0.5 + i * 0.1;
        const angle = (i / 6) * Math.PI * 2 + time * speed;
        agent.position.set(Math.cos(angle) * 1.8, Math.sin(time * 2 + i) * 0.1, Math.sin(angle) * 1.8);
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!previewCanvasRef.current) return;
      const w = previewCanvasRef.current.clientWidth;
      const h = previewCanvasRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (previewCanvasRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        previewCanvasRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FCFCFD] text-[#0A0A0A] font-sans flex flex-col justify-between overflow-x-hidden">
      {/* Top Header */}
      <nav className="h-20 max-w-7xl w-full mx-auto px-6 flex items-center justify-between border-b border-gray-100 select-none">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center font-extrabold text-white text-base">
            S
          </div>
          <span className="text-sm font-black uppercase tracking-widest text-[#0A0A0A]">
            SENTRA <span className="text-gray-400 font-medium">Safety</span>
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <a href="#works" className="hover:text-coral transition-colors">How It Works</a>
          <a href="#engine" className="hover:text-coral transition-colors">Core Engine</a>
          <a href="#stats" className="hover:text-coral transition-colors">Safety R&D</a>
        </div>

        <button
          onClick={() => setView('twin')}
          className="flex items-center space-x-1 bg-coral hover:bg-coral-hover text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all shadow-sm shadow-red-100 cursor-pointer"
        >
          <span>Launch Digital Twin</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12">
        {/* Left Content */}
        <div className="flex flex-col text-left select-none">
          <div className="inline-flex items-center space-x-2 bg-coral-light/30 border border-coral/15 px-3 py-1 rounded-full w-fit mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
            <span className="text-[10px] text-coral font-bold uppercase tracking-widest">
              AI-Driven Predictive Safety Twins
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-6 max-w-[500px]">
            See the incident <br />
            <span className="text-coral">before it happens.</span>
          </h2>

          <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed mb-8 max-w-[460px]">
            SENTRA simulates 12,000+ industrial parameters, chemical releases, and heat anomalies 3 hours before shifts change. Pre-position safety details, predict bottleneck zones, and neutralize hazards.
          </p>

          <div className="flex items-center space-x-4 mb-14">
            <button
              onClick={() => setView('twin')}
              className="flex items-center space-x-1 bg-coral hover:bg-coral-hover text-white text-xs font-bold px-6 py-3.5 rounded-lg transition-all shadow-md shadow-red-200 cursor-pointer"
            >
              <span>Launch Live Twin</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button className="flex items-center space-x-1.5 text-gray-600 hover:text-gray-900 text-xs font-bold transition-all px-4 py-2.5 cursor-pointer">
              <Play className="w-3.5 h-3.5 text-gray-400 fill-gray-100" />
              <span>Watch 60-Second Video</span>
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-6 border-t border-gray-100 pt-8">
            <div>
              <span className="text-xl md:text-2xl font-black text-gray-900 block leading-none mb-1">
                120K+
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                SIM/S PERFORMANCE
              </span>
            </div>
            <div>
              <span className="text-xl md:text-2xl font-black text-gray-900 block leading-none mb-1">
                TATA STEEL
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-sans">
                ACTIVE TWIN PILOT
              </span>
            </div>
            <div>
              <span className="text-xl md:text-2xl font-black text-gray-900 block leading-none mb-1">
                99.8%
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                RISK PREDICTION ACC.
              </span>
            </div>
          </div>
        </div>

        {/* Right Preview Card */}
        <div className="flex justify-center select-none">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-[480px] overflow-hidden flex flex-col p-6 relative">
            {/* Top Badge Indicators */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 py-1 px-3 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Jamshedpur Complex Active
                </span>
              </div>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                T-45: routine safety layout
              </span>
            </div>

            {/* Render Three.js spinning mini-mesh */}
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden min-h-[260px] relative">
              <div ref={previewCanvasRef} className="w-full h-full" />
              {/* Overlay graphics */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[180px] h-[180px] border border-coral/5 rounded-full animate-ping opacity-15" />
              </div>
            </div>

            {/* Bottom Card call to action */}
            <div className="mt-4 flex items-center justify-between bg-[#FDF2F0] border border-red-50 p-4 rounded-xl">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-9 h-9 rounded-lg bg-coral/10 border border-coral/10 flex items-center justify-center text-coral shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-900 leading-tight">Live Agent Simulation</h4>
                  <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">Modeling 1,200 worker parameters</p>
                </div>
              </div>
              
              <button
                onClick={() => setView('twin')}
                className="bg-coral hover:bg-coral-hover text-white text-[10px] font-bold py-2 px-4 rounded-md shadow-sm transition-colors cursor-pointer"
              >
                Access Demo
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="h-14 border-t border-gray-100 flex items-center justify-center px-6 shrink-0 bg-white">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-coral" />
          <span>ISO 27001 Certified &bull; Enterprise Class Data Encryption</span>
        </p>
      </footer>
    </div>
  );
};
