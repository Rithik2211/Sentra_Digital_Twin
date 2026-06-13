const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/Factory3D.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add tenantContext to useStore
content = content.replace(
  'const selectedScenario = useStore((state) => state.selectedScenario);',
  'const selectedScenario = useStore((state) => state.selectedScenario);\n  const tenantContext = useStore((state) => state.tenantContext);'
);

// 2. Add dependencies to useEffect
content = content.replace(
  '}, [selectedScenario]);',
  '}, [selectedScenario, tenantContext]);'
);

// 3. Reset refs at the start of useEffect
content = content.replace(
  '// 1. SCENE',
  `rotatingGearsRef.current = [];\n    workerGroupsRef.current.clear();\n    zonePulsersRef.current.clear();\n\n    // 1. SCENE`
);

// 4. Update the Grid Zone overlay labels
const oldLabels = `{/* Grid Zone overlay labels */}
      <div className="absolute bottom-6 left-6 pointer-events-none grid grid-cols-2 gap-x-12 gap-y-1 bg-white/80 p-3 rounded border border-slate-200 backdrop-blur-sm shadow-sm">
        <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone A:</span> Blending Silos</div>
        <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone B:</span> Blast Furnace</div>
        <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone C:</span> Rolling Mill Extruders</div>
        <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone D:</span> Chemical Pressurized Sphere</div>
      </div>`;

const newLabels = `{/* Grid Zone overlay labels */}
      {tenantContext === 'tenant-tvs' ? (
        <div className="absolute bottom-6 left-6 pointer-events-none grid grid-cols-2 gap-x-12 gap-y-1 bg-white/80 p-3 rounded border border-slate-200 backdrop-blur-sm shadow-sm">
          <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone A:</span> Chassis Assembly</div>
          <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone B:</span> Robotic Welding</div>
          <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone C:</span> Engine Drop & Test</div>
          <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone D:</span> Final Dispatch</div>
        </div>
      ) : (
        <div className="absolute bottom-6 left-6 pointer-events-none grid grid-cols-2 gap-x-12 gap-y-1 bg-white/80 p-3 rounded border border-slate-200 backdrop-blur-sm shadow-sm">
          <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone A:</span> Blending Silos</div>
          <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone B:</span> Blast Furnace</div>
          <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone C:</span> Rolling Mill Extruders</div>
          <div className="text-slate-600 text-xs font-semibold"><span className="text-coral">Zone D:</span> Chemical Pressurized Sphere</div>
        </div>
      )}`;
content = content.replace(oldLabels, newLabels);

// 5. Update animation loops
const oldCargoLoop = `// Conveyor belt box transport logic
      cargoBoxes.forEach((item) => {
        const speedFactor = selectedScenario.includes('Night Shift') ? 0.08 : 0.045;
        item.progress += delta * speedFactor;
        if (item.progress > 1) item.progress -= 1;

        const pos = beltCurve.getPointAt(item.progress);
        item.mesh.position.copy(pos);
        item.mesh.position.y += 0.22;
        item.mesh.rotation.y = elapsedTime * 1.5;
      });`;

const newCargoLoop = `// Conveyor belt box transport logic
      cargoBoxes.forEach((item) => {
        const speedFactor = selectedScenario.includes('Night Shift') ? 0.08 : 0.045;
        item.progress += delta * speedFactor;
        if (item.progress > 1) item.progress -= 1;

        if (beltCurve) {
          const pos = beltCurve.getPointAt(item.progress);
          item.mesh.position.copy(pos);
          item.mesh.position.y += 0.22;
          item.mesh.rotation.y = elapsedTime * 1.5;
        }
      });`;
content = content.replace(oldCargoLoop, newCargoLoop);

const oldFurnaceLoop = `// Animate heat glowing pulse core in blast furnace
      const corePulse = 0.8 + Math.sin(elapsedTime * 8) * 0.15;
      furnaceCore.scale.set(corePulse, 1.0, corePulse);`;

const newFurnaceLoop = `// Animate heat glowing pulse core in blast furnace
      if (furnaceCore) {
        const corePulse = 0.8 + Math.sin(elapsedTime * 8) * 0.15;
        furnaceCore.scale.set(corePulse, 1.0, corePulse);
      }`;
content = content.replace(oldFurnaceLoop, newFurnaceLoop);

// 6. Replacing the High Realism Industrial Models
const startTag = '// 8. HIGH REALISM INDUSTRIAL MODELS';
const endTag = '// 9. UPGRADED WORKER AGENTS (WITH SAFETY HELMETS)';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
  const modelsCode = `// 8. HIGH REALISM INDUSTRIAL MODELS

    // Shared references for the animation loop
    let beltCurve: THREE.CatmullRomCurve3 | null = null;
    let cargoBoxes: { mesh: THREE.Group | THREE.Mesh; progress: number }[] = [];
    let furnaceCore: THREE.Mesh | null = null;

    if (tenantContext === 'tenant-tvs') {
      // -- TVS MOTORS BIKE MANUFACTURING PLANT
      
      // ZONE A: Chassis Assembly
      const chassisGroup = new THREE.Group();
      chassisGroup.position.set(2.5, 0, 5);
      const frameStandGeo = new THREE.BoxGeometry(3, 0.2, 1);
      const frameStandMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
      const frameStand = new THREE.Mesh(frameStandGeo, frameStandMat);
      frameStand.position.y = 0.1;
      chassisGroup.add(frameStand);
      scene.add(chassisGroup);

      // ZONE B: Robotic Welding
      const robotGroup = new THREE.Group();
      robotGroup.position.set(15, 0, 5);
      const rBaseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.5, 16);
      const rMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6 });
      const rBase = new THREE.Mesh(rBaseGeo, rMat);
      rBase.position.y = 0.25;
      robotGroup.add(rBase);
      const rArmGeo = new THREE.BoxGeometry(0.3, 1.8, 0.3);
      const rArm = new THREE.Mesh(rArmGeo, rMat);
      rArm.position.set(0, 1.2, 0);
      rArm.rotation.z = 0.3;
      robotGroup.add(rArm);
      // Welding Spark
      const sparkGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.position.set(0.3, 2.0, 0);
      robotGroup.add(spark);
      rotatingGearsRef.current.push(rArm);
      scene.add(robotGroup);

      // ZONE C: Engine Drop & Test
      const engineGroup = new THREE.Group();
      engineGroup.position.set(4.5, 0, 15);
      const testBedGeo = new THREE.BoxGeometry(2.5, 0.6, 2);
      const testBed = new THREE.Mesh(testBedGeo, frameStandMat);
      testBed.position.y = 0.3;
      engineGroup.add(testBed);
      const dynoGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 16);
      dynoGeo.rotateZ(Math.PI / 2);
      const dynoMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      const dyno = new THREE.Mesh(dynoGeo, dynoMat);
      dyno.position.set(0, 1.2, 0);
      engineGroup.add(dyno);
      rotatingGearsRef.current.push(dyno);
      scene.add(engineGroup);

      // ZONE D: Dispatch
      const dispatchGroup = new THREE.Group();
      dispatchGroup.position.set(15, 0, 15);
      const crateGeo = new THREE.BoxGeometry(1.5, 1.2, 0.8);
      const crateMat = new THREE.MeshStandardMaterial({ color: 0xca8a04 });
      for (let i = 0; i < 3; i++) {
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.set(-1 + i * 1, 0.6, i % 2 === 0 ? 0.5 : -0.5);
        dispatchGroup.add(crate);
      }
      scene.add(dispatchGroup);

      // TVS Assembly Conveyor Belt
      const beltPathPoints = [
        new THREE.Vector3(2.5, 0.05, 5),
        new THREE.Vector3(12.5, 0.05, 5),
        new THREE.Vector3(12.5, 0.05, 12)
      ];
      beltCurve = new THREE.CatmullRomCurve3(beltPathPoints);
      const beltGeo = new THREE.TubeGeometry(beltCurve, 64, 0.2, 8, false);
      const beltMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
      const belt = new THREE.Mesh(beltGeo, beltMat);
      scene.add(belt);

      // Moving Bikes on Conveyor
      const cargoGroup = new THREE.Group();
      scene.add(cargoGroup);
      const numBikes = 5;
      for (let i = 0; i < numBikes; i++) {
        const bikeBody = new THREE.Group();
        const bFrameGeo = new THREE.BoxGeometry(0.8, 0.2, 0.15);
        const bFrameMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5 });
        const bFrame = new THREE.Mesh(bFrameGeo, bFrameMat);
        bFrame.position.y = 0.3;
        bikeBody.add(bFrame);

        const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16);
        wheelGeo.rotateX(Math.PI/2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
        const w1 = new THREE.Mesh(wheelGeo, wheelMat);
        w1.position.set(-0.4, 0.2, 0);
        bikeBody.add(w1);
        const w2 = new THREE.Mesh(wheelGeo, wheelMat);
        w2.position.set(0.4, 0.2, 0);
        bikeBody.add(w2);

        bikeBody.castShadow = true;
        cargoGroup.add(bikeBody);
        cargoBoxes.push({ mesh: bikeBody, progress: i / numBikes });
      }

    } else {
      // -- TATA STEEL PLANT (Default)

      // -- ZONE A: STORAGE SILOS & BLENDING UNIT
      const siloGroup = new THREE.Group();
      siloGroup.position.set(2.5, 0, 2.5);

      const heights = [3.5, 4.2, 3.0];
      const offsets = [
        { x: -1, z: -1 },
        { x: 1, z: 0 },
        { x: -0.5, z: 1.2 }
      ];

      heights.forEach((h, idx) => {
        const off = offsets[idx];
        const cylGeo = new THREE.CylinderGeometry(0.7, 0.7, h, 16);
        const cylMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
        const cyl = new THREE.Mesh(cylGeo, cylMat);
        cyl.position.set(off.x, h/2, off.z);
        cyl.castShadow = true;
        cyl.receiveShadow = true;
        siloGroup.add(cyl);

        const ringGeo = new THREE.CylinderGeometry(0.73, 0.73, 0.1, 16, 1, true);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        for (let rh = 1; rh < h; rh += 1.2) {
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.set(off.x, rh, off.z);
          siloGroup.add(ring);
        }

        const domeGeo = new THREE.SphereGeometry(0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, cylMat);
        dome.position.set(off.x, h, off.z);
        siloGroup.add(dome);
      });

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

      // Intricate Detail: Control Console
      const consoleGeo = new THREE.BoxGeometry(0.6, 1.0, 0.4);
      const consoleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
      consoleMesh.position.set(1.5, 0.5, -2);
      siloGroup.add(consoleMesh);

      scene.add(siloGroup);

      // -- ZONE B: HIGH-DETAIL BLAST FURNACE
      const furnaceGroup = new THREE.Group();
      furnaceGroup.position.set(15, 0, 4.5);

      const colGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
      const colMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
      for (let theta = 0; theta < Math.PI * 2; theta += Math.PI / 2) {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(Math.cos(theta) * 1.5, 0.6, Math.sin(theta) * 1.5);
        col.castShadow = true;
        furnaceGroup.add(col);
      }

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

      const cageGeo = new THREE.CylinderGeometry(1.8, 1.8, 5.5, 8, 4, true);
      const cageMat = new THREE.MeshStandardMaterial({ color: 0x475569, wireframe: true });
      const cage = new THREE.Mesh(cageGeo, cageMat);
      cage.position.set(0, 3.9, 0);
      furnaceGroup.add(cage);

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

      // Intricate detail: Ventilation fans
      const fanGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
      fanGeo.rotateZ(Math.PI/2);
      const fanMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const fan1 = new THREE.Mesh(fanGeo, fanMat);
      fan1.position.set(-2, 2, 0);
      furnaceGroup.add(fan1);
      rotatingGearsRef.current.push(fan1);

      const furnaceCoreGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.8, 16);
      const furnaceCoreMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
      furnaceCore = new THREE.Mesh(furnaceCoreGeo, furnaceCoreMat);
      furnaceCore.position.set(0, 0.8, 0);
      furnaceGroup.add(furnaceCore);

      scene.add(furnaceGroup);

      // -- ZONE C: EXTENSION ROLLING MILLS & MACHINING BAYS
      const millGroup = new THREE.Group();
      millGroup.position.set(4.5, 0, 15);

      const baseGeo = new THREE.BoxGeometry(4, 0.8, 2.5);
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 });
      const baseChassis = new THREE.Mesh(baseGeo, chassisMat);
      baseChassis.position.set(0, 0.4, 0);
      baseChassis.receiveShadow = true;
      baseChassis.castShadow = true;
      millGroup.add(baseChassis);

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

      const sidePanelGeo = new THREE.BoxGeometry(0.4, 1.8, 2.7);
      const sidePanel1 = new THREE.Mesh(sidePanelGeo, chassisMat);
      sidePanel1.position.set(-1.4, 0.9, 0);
      sidePanel1.castShadow = true;
      millGroup.add(sidePanel1);

      const sidePanel2 = new THREE.Mesh(sidePanelGeo, chassisMat);
      sidePanel2.position.set(1.4, 0.9, 0);
      sidePanel2.castShadow = true;
      millGroup.add(sidePanel2);

      const sheetGeo = new THREE.BoxGeometry(3.6, 0.05, 2.0);
      const sheetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 });
      const sheet = new THREE.Mesh(sheetGeo, sheetMat);
      sheet.position.set(0, 0.82, 0);
      millGroup.add(sheet);

      const exhaustStackGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.5, 12);
      const exhaustStack = new THREE.Mesh(exhaustStackGeo, chassisMat);
      exhaustStack.position.set(-1.0, 2.0, -0.8);
      millGroup.add(exhaustStack);

      scene.add(millGroup);

      // Intricate Detail: Forklift
      const forkliftGroup = new THREE.Group();
      forkliftGroup.position.set(8, 0, 12);
      const flBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), new THREE.MeshStandardMaterial({color: 0xf59e0b}));
      flBody.position.y = 0.4;
      forkliftGroup.add(flBody);
      const flCab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), new THREE.MeshStandardMaterial({color: 0x111827}));
      flCab.position.set(-0.2, 1.0, 0);
      forkliftGroup.add(flCab);
      const flForks = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.6), new THREE.MeshStandardMaterial({color: 0x94a3b8}));
      flForks.position.set(0.8, 0.1, 0);
      forkliftGroup.add(flForks);
      scene.add(forkliftGroup);

      // -- ZONE D: PRESSURIZED CHEMICAL DEPOSITS & STATIONS
      const chemGroup = new THREE.Group();
      chemGroup.position.set(15, 0, 15);

      const sphereGeo = new THREE.SphereGeometry(1.1, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, metalness: 0.65, roughness: 0.2 });

      const sphereOffsets = [
        { x: -1.2, z: -0.8 },
        { x: 1.2, z: 0.8 }
      ];

      sphereOffsets.forEach((soff, sIdx) => {
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(soff.x, 1.7, soff.z);
        sphere.castShadow = true;
        chemGroup.add(sphere);

        const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
        for (let legAng = 0; legAng < Math.PI * 2; legAng += (Math.PI * 2) / 3) {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(
            soff.x + Math.cos(legAng) * 0.8,
            0.8,
            soff.z + Math.sin(legAng) * 0.8
          );
          leg.rotation.z = -Math.cos(legAng) * 0.15;
          leg.rotation.x = Math.sin(legAng) * 0.15;
          leg.castShadow = true;
          chemGroup.add(leg);
        }

        const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const bulbMat = new THREE.MeshBasicMaterial({ color: sIdx === 0 ? 0x00ff00 : 0x00ffff });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(soff.x, 2.9, soff.z);
        chemGroup.add(bulb);
      });

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
      beltCurve = new THREE.CatmullRomCurve3(beltPathPoints);
      const beltGeo = new THREE.TubeGeometry(beltCurve, 64, 0.18, 8, false);
      const beltMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
      const belt = new THREE.Mesh(beltGeo, beltMat);
      scene.add(belt);

      const legGeo = new THREE.BoxGeometry(0.08, 0.4, 0.4);
      const trussPoints = [12, 28, 48];
      trussPoints.forEach((pct) => {
        const pos = beltCurve.getPointAt(pct / 64);
        const leg = new THREE.Mesh(legGeo, colMat);
        leg.position.copy(pos);
        leg.position.y = 0.2;
        scene.add(leg);
      });

      const cargoGroup = new THREE.Group();
      scene.add(cargoGroup);
      const cargoGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      const cargoMat = new THREE.MeshStandardMaterial({ color: 0xE8593C, roughness: 0.5 });
      const numBoxes = 4;
      for (let i = 0; i < numBoxes; i++) {
        const box = new THREE.Mesh(cargoGeo, cargoMat);
        box.castShadow = true;
        cargoGroup.add(box);
        cargoBoxes.push({ mesh: box, progress: i / numBoxes });
      }
    }
    
    // 9. UPGRADED WORKER AGENTS (WITH SAFETY HELMETS)
`;
  content = content.substring(0, startIndex) + modelsCode + content.substring(endIndex + endTag.length);
}

fs.writeFileSync(filePath, content);
console.log('Patched Factory3D.tsx successfully!');
