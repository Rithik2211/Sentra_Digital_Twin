import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStore } from '../store';

export const Factory3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentTick = useStore((state) => state.getCurrentTick());
  const selectedScenario = useStore((state) => state.selectedScenario);
  
  // Track worker meshes and target coordinates for interpolation
  const workerMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const workerTargetsRef = useRef<Map<string, { x: number; z: number; status: string }>>(new Map());
  
  // References to pulsing overlay meshes
  const zonePulsersRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Update target worker coordinates whenever tick updates
  useEffect(() => {
    if (!currentTick) return;

    // Update targets
    currentTick.workers.forEach((w) => {
      workerTargetsRef.current.set(w.id, { x: w.x, z: w.z, status: w.status });
    });

    // Update Zone risk overlay visibility and color based on current risk level
    currentTick.zones.forEach((z) => {
      const pulseMesh = zonePulsersRef.current.get(z.id);
      if (pulseMesh) {
        const material = pulseMesh.material as THREE.MeshBasicMaterial;
        if (z.riskLevel === 'HIGH') {
          pulseMesh.visible = true;
          material.color.setHex(0xE8593C); // Coral/Red
        } else if (z.riskLevel === 'MEDIUM') {
          pulseMesh.visible = true;
          material.color.setHex(0xF59E0B); // Amber
        } else {
          pulseMesh.visible = false;
        }
      }
    });
  }, [currentTick]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0e12); // Sleek dark gray
    scene.fog = new THREE.FogExp2(0x0c0e12, 0.015);

    // 2. ORTHOGRAPHIC CAMERA (Isometric)
    const aspect = width / height;
    const d = 12; // Camera scale factor
    const camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect,
      d, -d,
      1, 1000
    );
    // Isometric angle: 30 deg pitch, 45 deg yaw
    camera.position.set(20, 20, 20);
    camera.lookAt(10, 0, 10);

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // 4. ORBIT CONTROLS (Restricted to look-at center)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below floor level
    controls.target.set(10, 0, 10);
    controls.update();

    // 5. LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.camera.far = 100;
    scene.add(dirLight);

    // Spotlight for dramatic effect in Zone B (furnace)
    const furnaceSpot = new THREE.SpotLight(0xE8593C, 3, 15, Math.PI / 4, 0.5, 1);
    furnaceSpot.position.set(15, 8, 5);
    furnaceSpot.target.position.set(15, 0, 5);
    scene.add(furnaceSpot);
    scene.add(furnaceSpot.target);

    // Blue/cyan light for Zone D (Chemical area)
    const chemSpot = new THREE.SpotLight(0x06B6D4, 2, 15, Math.PI / 3, 0.5, 1);
    chemSpot.position.set(15, 8, 15);
    chemSpot.target.position.set(15, 0, 15);
    scene.add(chemSpot);
    scene.add(chemSpot.target);

    // 6. FLOOR PLATFORM
    const floorGeo = new THREE.BoxGeometry(20, 0.5, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937, // Slate gray floor
      roughness: 0.8,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(10, -0.25, 10);
    floor.receiveShadow = true;
    scene.add(floor);

    // Draw Grid Helper just above floor
    const gridHelper = new THREE.GridHelper(20, 20, 0xE8593C, 0x374151);
    gridHelper.position.set(10, 0.01, 10);
    // Cast transparent grid
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach(m => { m.transparent = true; m.opacity = 0.2; });
    } else {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.2;
    }
    scene.add(gridHelper);

    // Draw Zone Boundaries
    const drawBorder = (x: number, z: number, w: number, d: number) => {
      const points = [
        new THREE.Vector3(x, 0.02, z),
        new THREE.Vector3(x + w, 0.02, z),
        new THREE.Vector3(x + w, 0.02, z + d),
        new THREE.Vector3(x, 0.02, z + d),
        new THREE.Vector3(x, 0.02, z)
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x4b5563, linewidth: 2 });
      const border = new THREE.Line(lineGeo, lineMat);
      scene.add(border);
    };

    // Four Quadrant Boundaries
    drawBorder(0, 0, 10, 10);  // Zone A
    drawBorder(10, 0, 10, 10); // Zone B
    drawBorder(0, 10, 10, 10); // Zone C
    drawBorder(10, 10, 10, 10); // Zone D

    // 7. PULSING RISK ZONE OVERLAYS (One for each Zone center)
    const zonesCenter = [
      { id: 'zone-a-uuid', x: 5, z: 5 },
      { id: 'zone-b-uuid', x: 15, z: 5 },
      { id: 'zone-c-uuid', x: 5, z: 15 },
      { id: 'zone-d-uuid', x: 15, z: 15 }
    ];

    zonesCenter.forEach((zc) => {
      const ringGeo = new THREE.RingGeometry(2.5, 2.7, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xE8593C,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(zc.x, 0.03, zc.z);
      ring.visible = false;
      scene.add(ring);
      zonePulsersRef.current.set(zc.id, ring);
    });

    // 8. MACHINERY NODES & DECORATIVE MESHES
    // Zone A: Conveyor system feeder & Blender silos
    const siloGeo = new THREE.CylinderGeometry(1, 1, 3, 16);
    const siloMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.3 });
    const siloA = new THREE.Mesh(siloGeo, siloMat);
    siloA.position.set(2, 1.5, 2);
    siloA.castShadow = true;
    siloA.receiveShadow = true;
    scene.add(siloA);

    // Zone B: Blast Furnace
    const furnaceBaseGeo = new THREE.CylinderGeometry(1.5, 2, 4, 16);
    const furnaceMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const furnace = new THREE.Mesh(furnaceBaseGeo, furnaceMat);
    furnace.position.set(15, 2, 5);
    furnace.castShadow = true;
    furnace.receiveShadow = true;
    scene.add(furnace);

    // Glowing core inside furnace
    const furnaceCoreGeo = new THREE.CylinderGeometry(0.8, 0.8, 1, 16);
    const furnaceCoreMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const furnaceCore = new THREE.Mesh(furnaceCoreGeo, furnaceCoreMat);
    furnaceCore.position.set(15, 0.8, 5);
    scene.add(furnaceCore);

    // Zone C: Rolling Mills
    const millGeo = new THREE.BoxGeometry(2, 1.5, 4);
    const millMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });
    const mill = new THREE.Mesh(millGeo, millMat);
    mill.position.set(5, 0.75, 15);
    mill.castShadow = true;
    mill.receiveShadow = true;
    scene.add(mill);

    // Zone D: Chemical Tanks
    const tankGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, metalness: 0.5, roughness: 0.1 });
    const tank1 = new THREE.Mesh(tankGeo, tankMat);
    tank1.position.set(16, 1.8, 16);
    tank1.castShadow = true;
    tank1.receiveShadow = true;
    scene.add(tank1);

    // Stand for chemical tank
    const standGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const stand1 = new THREE.Mesh(standGeo, standMat);
    stand1.position.set(16, 0.6, 16);
    scene.add(stand1);

    // 9. ANIMATED CONVEYOR BELT
    // Line path from Zone A to Zone C
    const beltPathPoints = [
      new THREE.Vector3(2, 0.05, 4),
      new THREE.Vector3(2, 0.05, 12),
      new THREE.Vector3(8, 0.05, 12)
    ];
    const beltCurve = new THREE.CatmullRomCurve3(beltPathPoints);
    const beltGeo = new THREE.TubeGeometry(beltCurve, 64, 0.15, 8, false);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    scene.add(belt);

    // Animated cargo boxes on belt
    const boxGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xE8593C, roughness: 0.5 });
    const cargoBoxes: { mesh: THREE.Mesh; progress: number }[] = [];
    const numBoxes = 4;
    for (let i = 0; i < numBoxes; i++) {
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.castShadow = true;
      scene.add(box);
      cargoBoxes.push({
        mesh: box,
        progress: i / numBoxes
      });
    }

    // 10. WORKER AGENTS (SPHERES)
    const workerGeo = new THREE.SphereGeometry(0.35, 16, 16);
    // Create meshes for 8 workers
    for (let i = 0; i < 8; i++) {
      const color = 0xffffff;
      const workerMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.2
      });
      const mesh = new THREE.Mesh(workerGeo, workerMat);
      mesh.castShadow = true;
      scene.add(mesh);
      workerMeshesRef.current.set(`worker-${i}`, mesh);
      
      // Default coordinate targets
      const defaultZones = ['zone-a-uuid', 'zone-b-uuid', 'zone-c-uuid', 'zone-d-uuid'];
      const zId = defaultZones[i % defaultZones.length];
      const targetCoords = zonesCenter.find(zc => zc.id === zId)!;
      mesh.position.set(
        targetCoords.x + (Math.random() - 0.5) * 4,
        0.35,
        targetCoords.z + (Math.random() - 0.5) * 4
      );
    }

    // 11. ANIMATION LOOP
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      const elapsedTime = clock.getElapsedTime();

      // Controls damping
      controls.update();

      // Pulse risk zone ring meshes (glow scale/opacity)
      zonePulsersRef.current.forEach((mesh) => {
        if (mesh.visible) {
          const scale = 1.0 + Math.sin(elapsedTime * 6) * 0.15;
          mesh.scale.set(scale, 1, scale);
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.5 + Math.sin(elapsedTime * 6) * 0.25;
        }
      });

      // Animate conveyor belt boxes
      cargoBoxes.forEach((item) => {
        // Speed up belt in Night Shift scenario
        const speedMultiplier = selectedScenario.includes('Night Shift') ? 0.08 : 0.04;
        item.progress += clock.getDelta() * speedMultiplier;
        if (item.progress > 1) item.progress -= 1;

        const pos = beltCurve.getPointAt(item.progress);
        item.mesh.position.copy(pos);
        item.mesh.position.y += 0.2; // place box on top of tube
        item.mesh.rotation.y = elapsedTime * 2;
      });

      // Smoothly interpolate (lerp) worker spheres from current position to backend updates
      workerMeshesRef.current.forEach((mesh, id) => {
        const target = workerTargetsRef.current.get(id);
        const mat = mesh.material as THREE.MeshStandardMaterial;

        if (target) {
          // LERP worker position (X, Z)
          mesh.position.x += (target.x - mesh.position.x) * 0.08;
          mesh.position.z += (target.z - mesh.position.z) * 0.08;

          // Float worker up and down slightly (walking bounce)
          const isMoving = Math.abs(target.x - mesh.position.x) > 0.05 || Math.abs(target.z - mesh.position.z) > 0.05;
          mesh.position.y = 0.35 + (isMoving ? Math.abs(Math.sin(elapsedTime * 8)) * 0.15 : 0);

          // Change worker color based on warning status
          if (target.status === 'EVACUATING') {
            mat.color.setHex(0xE8593C); // red for evacuations
          } else if (target.status === 'AT_RISK') {
            mat.color.setHex(0xF59E0B); // yellow/orange for alert states
          } else {
            mat.color.setHex(0xffffff); // normal white
          }
        }
      });

      // Animate machinery nodes
      siloA.rotation.y = elapsedTime * 0.1;
      mill.scale.y = 0.75 + Math.sin(elapsedTime * 10) * 0.02; // vibration simulation

      renderer.render(scene, camera);
    };

    animate();

    // 12. RESIZE HANDLER
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      renderer.setSize(w, h);

      const aspect = w / h;
      camera.left = -d * aspect;
      camera.right = d * aspect;
      camera.top = d;
      camera.bottom = -d;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedScenario]);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-slate-950 overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      {/* 3D View Overlay Labels */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-coral pulsing-overlay" />
          <span className="text-white text-xs font-bold uppercase tracking-widest bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
            Digital Twin Feed — Active
          </span>
        </div>
      </div>

      {/* Grid Zone Labels on Overlay */}
      <div className="absolute bottom-6 left-6 pointer-events-none grid grid-cols-2 gap-x-12 gap-y-1 bg-slate-950/70 p-3 rounded border border-slate-800 backdrop-blur-sm">
        <div className="text-gray-400 text-xs font-semibold"><span className="text-coral">Zone A:</span> Raw Materials</div>
        <div className="text-gray-400 text-xs font-semibold"><span className="text-coral">Zone B:</span> Blast Furnace</div>
        <div className="text-gray-400 text-xs font-semibold"><span className="text-coral">Zone C:</span> Cooling & Rolling</div>
        <div className="text-gray-400 text-xs font-semibold"><span className="text-coral">Zone D:</span> Chemical Storage</div>
      </div>
    </div>
  );
};
