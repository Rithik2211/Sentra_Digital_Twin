import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStore } from '../store';

export const Factory3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentTick = useStore((state) => state.getCurrentTick());
  const selectedScenario = useStore((state) => state.selectedScenario);
  
  // Track worker groups and target positions
  const workerGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const workerTargetsRef = useRef<Map<string, { x: number; z: number; status: string }>>(new Map());
  
  // Ref to zone pulsing warning rings
  const zonePulsersRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // References to animate rotating meshes
  const rotatingGearsRef = useRef<THREE.Mesh[]>([]);

  // Update target coordinates and risks on ticks
  useEffect(() => {
    if (!currentTick) return;

    currentTick.workers.forEach((w) => {
      workerTargetsRef.current.set(w.id, { x: w.x, z: w.z, status: w.status });
    });

    currentTick.zones.forEach((z) => {
      const pulseMesh = zonePulsersRef.current.get(z.id);
      if (pulseMesh) {
        const material = pulseMesh.material as THREE.MeshBasicMaterial;
        if (z.riskLevel === 'HIGH') {
          pulseMesh.visible = true;
          material.color.setHex(0xE8593C); // Coral
        } else if (z.riskLevel === 'MEDIUM') {
          pulseMesh.visible = true;
          material.color.setHex(0xF59E0B); // Amber/Yellow
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
    scene.background = new THREE.Color(0x0c0e12); // Deep premium gray
    scene.fog = new THREE.FogExp2(0x0c0e12, 0.015);

    // 2. CAMERA (Isometric perspective)
    const aspect = width / height;
    const d = 11; // Camera viewport scale
    const camera = new THREE.OrthographicCamera(
      -d * aspect, d * aspect,
      d, -d,
      1, 1000
    );
    camera.position.set(20, 20, 20);
    camera.lookAt(10, 0, 10);

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // 4. ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(10, 0, 10);
    controls.update();

    // 5. LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.18);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(25, 45, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -22;
    dirLight.shadow.camera.right = 22;
    dirLight.shadow.camera.top = 22;
    dirLight.shadow.camera.bottom = -22;
    dirLight.shadow.camera.far = 120;
    scene.add(dirLight);

    // Blast Furnace heat light source
    const furnaceSpot = new THREE.SpotLight(0xE8593C, 5, 18, Math.PI / 4, 0.6, 1);
    furnaceSpot.position.set(15, 9, 5);
    furnaceSpot.target.position.set(15, 0, 5);
    scene.add(furnaceSpot);
    scene.add(furnaceSpot.target);

    // Chemical depot warning gas light
    const chemSpot = new THREE.SpotLight(0x06B6D4, 3, 16, Math.PI / 3, 0.5, 1);
    chemSpot.position.set(15, 9, 15);
    chemSpot.target.position.set(15, 0, 15);
    scene.add(chemSpot);
    scene.add(chemSpot.target);

    // 6. DETAILED METALLIC FLOOR PLATFORM
    const floorGeo = new THREE.BoxGeometry(20, 0.5, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // Dark slate floor
      roughness: 0.85,
      metalness: 0.25,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(10, -0.25, 10);
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor grids
    const gridHelper = new THREE.GridHelper(20, 20, 0xE8593C, 0x374151);
    gridHelper.position.set(10, 0.01, 10);
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach(m => { m.transparent = true; m.opacity = 0.25; });
    } else {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.25;
    }
    scene.add(gridHelper);

    // Draw borders & yellow hazard warning zones
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

    drawBorder(0, 0, 10, 10);
    drawBorder(10, 0, 10, 10);
    drawBorder(0, 10, 10, 10);
    drawBorder(10, 10, 10, 10);

    // Add striped caution grids near Zone D & B boundary
    const createCautionZone = (x: number, z: number, w: number, d: number) => {
      const cautionGeo = new THREE.PlaneGeometry(w, d);
      cautionGeo.rotateX(-Math.PI / 2);
      // Canvas texture with striped pattern
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#F59E0B'; // Amber
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#111827'; // Dark Slate
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(32, 0);
      ctx.lineTo(0, 32);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(32, 64);
      ctx.lineTo(64, 64);
      ctx.lineTo(64, 32);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(64, 0);
      ctx.lineTo(64, 16);
      ctx.lineTo(16, 64);
      ctx.lineTo(0, 64);
      ctx.lineTo(0, 48);
      ctx.closePath();
      ctx.fill();

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);

      const cautionMat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0.35,
        roughness: 0.8
      });
      const cautionMesh = new THREE.Mesh(cautionGeo, cautionMat);
      cautionMesh.position.set(x + w/2, 0.015, z + d/2);
      scene.add(cautionMesh);
    };

    // Draw safety grids at boundary
    createCautionZone(9, 4, 2, 4);
    createCautionZone(14, 9, 4, 2);

    // 7. PULSING RISK ZONE OVERLAYS
    const zonesCenter = [
      { id: 'zone-a-uuid', x: 5, z: 5 },
      { id: 'zone-b-uuid', x: 15, z: 5 },
      { id: 'zone-c-uuid', x: 5, z: 15 },
      { id: 'zone-d-uuid', x: 15, z: 15 }
    ];

    zonesCenter.forEach((zc) => {
      const ringGeo = new THREE.RingGeometry(3.0, 3.3, 32);
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

    // 8. HIGH REALISM INDUSTRIAL MODELS
    
    // -- ZONE A: STORAGE SILOS & BLENDING UNIT
    const siloGroup = new THREE.Group();
    siloGroup.position.set(2.5, 0, 2.5);

    // Three interconnected storage cylinders
    const heights = [3.5, 4.2, 3.0];
    const offsets = [
      { x: -1, z: -1 },
      { x: 1, z: 0 },
      { x: -0.5, z: 1.2 }
    ];

    heights.forEach((h, idx) => {
      const off = offsets[idx];
      // Core cylinder
      const cylGeo = new THREE.CylinderGeometry(0.7, 0.7, h, 16);
      const cylMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      cyl.position.set(off.x, h/2, off.z);
      cyl.castShadow = true;
      cyl.receiveShadow = true;
      siloGroup.add(cyl);

      // Support metal rings
      const ringGeo = new THREE.CylinderGeometry(0.73, 0.73, 0.1, 16, 1, true);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
      for (let rh = 1; rh < h; rh += 1.2) {
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(off.x, rh, off.z);
        siloGroup.add(ring);
      }

      // Domed top cap
      const domeGeo = new THREE.SphereGeometry(0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const dome = new THREE.Mesh(domeGeo, cylMat);
      dome.position.set(off.x, h, off.z);
      siloGroup.add(dome);
    });

    // Pipe bridges connecting silos
    const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
    pipeGeo.rotateZ(Math.PI / 2);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.1 });
    
    const pipe1 = new THREE.Mesh(pipeGeo, pipeMat);
    pipe1.position.set(0, 2.5, -0.5);
    siloGroup.add(pipe1);

    const verticalPipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 8);
    const verticalPipe = new THREE.Mesh(verticalPipeGeo, pipeMat);
    verticalPipe.position.set(1.1, 1.5, 0.6);
    siloGroup.add(verticalPipe);

    scene.add(siloGroup);

    // -- ZONE B: HIGH-DETAIL BLAST FURNACE
    const furnaceGroup = new THREE.Group();
    furnaceGroup.position.set(15, 0, 4.5);

    // Sub-structure base columns
    const colGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    for (let theta = 0; theta < Math.PI * 2; theta += Math.PI / 2) {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(Math.cos(theta) * 1.5, 0.6, Math.sin(theta) * 1.5);
      col.castShadow = true;
      furnaceGroup.add(col);
    }

    // Furnace Main Chamber (Cone-cylinder stack)
    const lowerConeGeo = new THREE.CylinderGeometry(1.6, 1.4, 1.5, 24);
    const midCylGeo = new THREE.CylinderGeometry(1.4, 1.4, 2.2, 24);
    const upperConeGeo = new THREE.CylinderGeometry(1.0, 1.4, 1.2, 24);
    
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.35 });
    
    const lowerCone = new THREE.Mesh(lowerConeGeo, bodyMat);
    lowerCone.position.set(0, 1.95, 0);
    lowerCone.castShadow = true;
    furnaceGroup.add(lowerCone);

    const midCyl = new THREE.Mesh(midCylGeo, bodyMat);
    midCyl.position.set(0, 3.8, 0);
    midCyl.castShadow = true;
    furnaceGroup.add(midCyl);

    const upperCone = new THREE.Mesh(upperConeGeo, bodyMat);
    upperCone.position.set(0, 5.5, 0);
    upperCone.castShadow = true;
    furnaceGroup.add(upperCone);

    // Structural scaffolding scaffolding frame
    const cageGeo = new THREE.CylinderGeometry(1.8, 1.8, 5.5, 8, 4, true);
    const cageMat = new THREE.MeshStandardMaterial({ color: 0x475569, wireframe: true });
    const cage = new THREE.Mesh(cageGeo, cageMat);
    cage.position.set(0, 3.9, 0);
    furnaceGroup.add(cage);

    // Heat discharge exhaust duct
    const exhaustCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 6.1, 0),
      new THREE.Vector3(-1.0, 7.0, 0),
      new THREE.Vector3(-2.2, 5.5, 0.8),
      new THREE.Vector3(-2.2, 0.2, 0.8)
    ]);
    const exhaustGeo = new THREE.TubeGeometry(exhaustCurve, 32, 0.16, 8, false);
    const exhaust = new THREE.Mesh(exhaustGeo, colMat);
    exhaust.castShadow = true;
    furnaceGroup.add(exhaust);

    // Glowing core inside furnace base
    const furnaceCoreGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.8, 16);
    const furnaceCoreMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const furnaceCore = new THREE.Mesh(furnaceCoreGeo, furnaceCoreMat);
    furnaceCore.position.set(0, 0.8, 0);
    furnaceGroup.add(furnaceCore);

    scene.add(furnaceGroup);

    // -- ZONE C: EXTENSION ROLLING MILLS & MACHINING BAYS
    const millGroup = new THREE.Group();
    millGroup.position.set(4.5, 0, 15);

    // Heavy main chassis
    const baseGeo = new THREE.BoxGeometry(4, 0.8, 2.5);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 });
    const baseChassis = new THREE.Mesh(baseGeo, chassisMat);
    baseChassis.position.set(0, 0.4, 0);
    baseChassis.receiveShadow = true;
    baseChassis.castShadow = true;
    millGroup.add(baseChassis);

    // Moving roller cylinders
    const rollerGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.4, 16);
    rollerGeo.rotateX(Math.PI / 2);
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.15 });

    const roller1 = new THREE.Mesh(rollerGeo, rollerMat);
    roller1.position.set(-0.8, 1.1, 0);
    roller1.castShadow = true;
    millGroup.add(roller1);
    rotatingGearsRef.current.push(roller1);

    const roller2 = new THREE.Mesh(rollerGeo, rollerMat);
    roller2.position.set(0.8, 1.1, 0);
    roller2.castShadow = true;
    millGroup.add(roller2);
    rotatingGearsRef.current.push(roller2);

    // Roller support side panels
    const sidePanelGeo = new THREE.BoxGeometry(0.4, 1.8, 2.7);
    const sidePanel1 = new THREE.Mesh(sidePanelGeo, chassisMat);
    sidePanel1.position.set(-1.4, 0.9, 0);
    sidePanel1.castShadow = true;
    millGroup.add(sidePanel1);

    const sidePanel2 = new THREE.Mesh(sidePanelGeo, chassisMat);
    sidePanel2.position.set(1.4, 0.9, 0);
    sidePanel2.castShadow = true;
    millGroup.add(sidePanel2);

    // Floating steel sheet on bed
    const sheetGeo = new THREE.BoxGeometry(3.6, 0.05, 2.0);
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 });
    const sheet = new THREE.Mesh(sheetGeo, sheetMat);
    sheet.position.set(0, 0.82, 0);
    millGroup.add(sheet);

    // Exhaust duct stack on rolling mill
    const exhaustStackGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.5, 12);
    const exhaustStack = new THREE.Mesh(exhaustStackGeo, chassisMat);
    exhaustStack.position.set(-1.0, 2.0, -0.8);
    millGroup.add(exhaustStack);

    scene.add(millGroup);

    // -- ZONE D: PRESSURIZED CHEMICAL DEPOSITS & STATIONS
    const chemGroup = new THREE.Group();
    chemGroup.position.set(15, 0, 15);

    // Double pressure spheres
    const sphereGeo = new THREE.SphereGeometry(1.1, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, metalness: 0.65, roughness: 0.2 });

    const sphereOffsets = [
      { x: -1.2, z: -0.8 },
      { x: 1.2, z: 0.8 }
    ];

    sphereOffsets.forEach((soff, sIdx) => {
      // Sphere tank
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(soff.x, 1.7, soff.z);
      sphere.castShadow = true;
      chemGroup.add(sphere);

      // Support tripod legs
      const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
      for (let legAng = 0; legAng < Math.PI * 2; legAng += (Math.PI * 2) / 3) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(
          soff.x + Math.cos(legAng) * 0.8,
          0.8,
          soff.z + Math.sin(legAng) * 0.8
        );
        // Tilt leg slightly inwards
        leg.rotation.z = -Math.cos(legAng) * 0.15;
        leg.rotation.x = Math.sin(legAng) * 0.15;
        leg.castShadow = true;
        chemGroup.add(leg);
      }

      // Blinking safety indicator bulb on top
      const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: sIdx === 0 ? 0x00ff00 : 0x00ffff });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(soff.x, 2.9, soff.z);
      chemGroup.add(bulb);
    });

    // Chemical collection pipe loop
    const loopCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.2, 1.7, -0.8),
      new THREE.Vector3(0, 2.5, 0),
      new THREE.Vector3(1.2, 1.7, 0.8)
    ]);
    const loopGeo = new THREE.TubeGeometry(loopCurve, 24, 0.1, 8, false);
    const loop = new THREE.Mesh(loopGeo, colMat);
    chemGroup.add(loop);

    scene.add(chemGroup);

    // -- ANIMATED CONVEYOR TRUSS RAILS (Zone A to C)
    const beltPathPoints = [
      new THREE.Vector3(2.5, 0.05, 5),
      new THREE.Vector3(2.5, 0.05, 12),
      new THREE.Vector3(4.5, 0.05, 12)
    ];
    const beltCurve = new THREE.CatmullRomCurve3(beltPathPoints);
    const beltGeo = new THREE.TubeGeometry(beltCurve, 64, 0.18, 8, false);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    scene.add(belt);

    // Truss grid legs holding up the belt line
    const legGeo = new THREE.BoxGeometry(0.08, 0.4, 0.4);
    const trussPoints = [12, 28, 48];
    trussPoints.forEach((pct) => {
      const pos = beltCurve.getPointAt(pct / 64);
      const leg = new THREE.Mesh(legGeo, colMat);
      leg.position.copy(pos);
      leg.position.y = 0.2;
      scene.add(leg);
    });

    // Moving cargo assemblies
    const cargoGroup = new THREE.Group();
    scene.add(cargoGroup);

    const cargoGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0xE8593C, roughness: 0.5 });
    const cargoBoxes: { mesh: THREE.Mesh; progress: number }[] = [];
    const numBoxes = 4;
    for (let i = 0; i < numBoxes; i++) {
      const box = new THREE.Mesh(cargoGeo, cargoMat);
      box.castShadow = true;
      cargoGroup.add(box);
      cargoBoxes.push({
        mesh: box,
        progress: i / numBoxes
      });
    }

    // 9. UPGRADED WORKER AGENTS (WITH SAFETY HELMETS)
    const createWorkerGroup = () => {
      const group = new THREE.Group();

      // Lower body sphere (jacket)
      const bodyGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.3;
      body.castShadow = true;
      group.add(body);

      // Head sphere
      const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.7 }); // skin tone
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.65;
      group.add(head);

      // Yellow hard-hat helmet (half sphere)
      const hatGeo = new THREE.SphereGeometry(0.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const hatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.3, roughness: 0.2 }); // Yellow hat
      const hat = new THREE.Mesh(hatGeo, hatMat);
      hat.position.y = 0.68;
      hat.rotation.x = 0.08; // tilt helmet slightly forward
      group.add(hat);

      // Helmet visor brim (flat box)
      const brimGeo = new THREE.BoxGeometry(0.24, 0.02, 0.16);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.set(0, 0.72, 0.1);
      group.add(brim);

      return { group, bodyMat };
    };

    // Instantiate 8 workers
    for (let i = 0; i < 8; i++) {
      const { group } = createWorkerGroup();
      scene.add(group);
      workerGroupsRef.current.set(`worker-${i}`, group);

      // Default positioning based on zone
      const defaultZones = ['zone-a-uuid', 'zone-b-uuid', 'zone-c-uuid', 'zone-d-uuid'];
      const zId = defaultZones[i % defaultZones.length];
      const targetCoords = zonesCenter.find(zc => zc.id === zId)!;
      group.position.set(
        targetCoords.x + (Math.random() - 0.5) * 5,
        0,
        targetCoords.z + (Math.random() - 0.5) * 5
      );
    }

    // 10. ANIMATION TIMING
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const delta = clock.getDelta();

      controls.update();

      // Pulse circular hazard boundaries
      zonePulsersRef.current.forEach((mesh) => {
        if (mesh.visible) {
          const scale = 1.0 + Math.sin(elapsedTime * 5) * 0.12;
          mesh.scale.set(scale, 1, scale);
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.45 + Math.sin(elapsedTime * 5) * 0.2;
        }
      });

      // Animate machinery parts (gears spinning in rolling mill)
      rotatingGearsRef.current.forEach((gear) => {
        // Spin gears relative to simulation speed multiplier
        const gearSpeed = selectedScenario.includes('Night Shift') ? 6.0 : 3.0;
        gear.rotation.x += delta * gearSpeed;
      });

      // Conveyor belt box transport logic
      cargoBoxes.forEach((item) => {
        const speedFactor = selectedScenario.includes('Night Shift') ? 0.08 : 0.045;
        item.progress += delta * speedFactor;
        if (item.progress > 1) item.progress -= 1;

        const pos = beltCurve.getPointAt(item.progress);
        item.mesh.position.copy(pos);
        item.mesh.position.y += 0.22;
        item.mesh.rotation.y = elapsedTime * 1.5;
      });

      // Smooth worker movements (lerp) & bobbing bounce
      workerGroupsRef.current.forEach((group, id) => {
        const target = workerTargetsRef.current.get(id);
        const bodyMesh = group.children[0] as THREE.Mesh;
        const bodyMat = bodyMesh.material as THREE.MeshStandardMaterial;

        if (target) {
          // LERP coordinates
          group.position.x += (target.x - group.position.x) * 0.075;
          group.position.z += (target.z - group.position.z) * 0.075;

          const isMoving = Math.abs(target.x - group.position.x) > 0.04 || Math.abs(target.z - group.position.z) > 0.04;
          
          // Bobbing motion for walking
          group.position.y = isMoving ? Math.abs(Math.sin(elapsedTime * 9)) * 0.12 : 0;

          // Swap jacket color depending on risk state
          if (target.status === 'EVACUATING') {
            bodyMat.color.setHex(0xE8593C); // Coral evacuation vests
          } else if (target.status === 'AT_RISK') {
            bodyMat.color.setHex(0xF59E0B); // Amber warnings
          } else {
            bodyMat.color.setHex(0xffffff); // Standard white overalls
          }
        }
      });

      // Animate heat glowing pulse core in blast furnace
      const corePulse = 0.8 + Math.sin(elapsedTime * 8) * 0.15;
      furnaceCore.scale.set(corePulse, 1.0, corePulse);

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
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
      
      {/* 3D Dashboard Overlays */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-coral pulsing-overlay" />
          <span className="text-white text-xs font-bold uppercase tracking-widest bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
            Digital Twin Isometric Feed — 1080p Active
          </span>
        </div>
      </div>

      {/* Grid Zone overlay labels */}
      <div className="absolute bottom-6 left-6 pointer-events-none grid grid-cols-2 gap-x-12 gap-y-1 bg-slate-950/70 p-3 rounded border border-slate-800 backdrop-blur-sm">
        <div className="text-gray-400 text-xs font-semibold"><span className="text-coral">Zone A:</span> Blending Silos</div>
        <div className="text-gray-400 text-xs font-semibold"><span className="text-coral">Zone B:</span> Blast Furnace</div>
        <div className="text-gray-400 text-xs font-semibold"><span className="text-coral">Zone C:</span> Rolling Mill Extruders</div>
        <div className="text-gray-400 text-xs font-semibold"><span className="text-coral">Zone D:</span> Chemical Pressurized Sphere</div>
      </div>
    </div>
  );
};
