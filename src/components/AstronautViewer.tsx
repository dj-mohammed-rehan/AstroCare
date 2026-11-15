import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Box, RotateCcw, RotateCw } from 'lucide-react';
import type { HotspotZone, MetricStatus, TelemetryReading } from '../types';

interface AstronautViewerProps {
  selectedHotspot: HotspotZone;
  onSelectHotspot: (zone: HotspotZone) => void;
  reading: TelemetryReading;
  overallStatus: MetricStatus;
}

interface HotspotDef {
  id: HotspotZone;
  label: string;
  system: string;
  anchor: [number, number, number];
  fallbackPos: { top: string; left: string };
}

const HOTSPOTS: HotspotDef[] = [
  {
    id: 'head',
    label: 'Head',
    system: 'Neurological & Sleep',
    anchor: [0, 1.56, 0.22],
    fallbackPos: { top: '16%', left: '50%' },
  },
  {
    id: 'chest',
    label: 'Chest',
    system: 'Cardiac & Respiratory',
    anchor: [0, 1.02, 0.27],
    fallbackPos: { top: '34%', left: '50%' },
  },
  {
    id: 'arms',
    label: 'Arms',
    system: 'Activity & Mobility',
    anchor: [-0.46, 0.88, 0.08],
    fallbackPos: { top: '42%', left: '30%' },
  },
  {
    id: 'torso',
    label: 'Torso',
    system: 'Thermal & Core',
    anchor: [0.16, 0.64, 0.23],
    fallbackPos: { top: '50%', left: '56%' },
  },
];

const _projVec = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function AstronautViewer({
  selectedHotspot,
  onSelectHotspot,
  reading,
  overallStatus,
}: AstronautViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);

  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hotspotCoords, setHotspotCoords] = useState<
    Record<HotspotZone, { x: number; y: number; visible: boolean }>
  >({
    head: { x: 50, y: 16, visible: true },
    chest: { x: 50, y: 34, visible: true },
    arms: { x: 30, y: 42, visible: true },
    torso: { x: 56, y: 50, visible: true },
  });

  const wireframeRef = useRef(wireframeMode);
  wireframeRef.current = wireframeMode;
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const selectedRef = useRef(selectedHotspot);
  selectedRef.current = selectedHotspot;
  const resetFnRef = useRef<(() => void) | null>(null);
  const wireframeGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (wireframeGroupRef.current) {
      wireframeGroupRef.current.visible = wireframeMode;
    }
  }, [wireframeMode]);

  useEffect(() => {
    const host = canvasHostRef.current;
    const outer = containerRef.current;
    if (!host || !outer) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = Math.max(host.clientWidth, 320);
    const height = Math.max(host.clientHeight, 380);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070b);
    scene.fog = new THREE.FogExp2(0x05070b, 0.065);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0.55, 1.05, 4.15);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.62, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.4;
    controls.maxDistance = 6.2;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
    controls.autoRotateSpeed = 0.7;
    controls.update();

    resetFnRef.current = () => {
      camera.position.set(0.55, 1.05, 4.15);
      controls.target.set(0, 0.62, 0);
      controls.update();
    };

    // Lighting rig: cool silver/blue key + warm/neutral rim + hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xb9ddf5, 0x0a111b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf4f7fa, 2.2);
    keyLight.position.set(3.2, 4.5, 3.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8ab9e8, 2.4);
    rimLight.position.set(-3.5, 2.2, -3.2);
    scene.add(rimLight);

    const chestFill = new THREE.PointLight(0xb9ddf5, 0.9, 5);
    chestFill.position.set(0, 1.1, 1.8);
    scene.add(chestFill);

    // Instanced subtle orbital starfield
    const starCount = 180;
    const starGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xc8d1db });
    const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i += 1) {
      const r = 6 + (i % 9) * 1.4;
      const theta = i * 2.39996;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + 0.5,
        r * Math.sin(phi) * Math.sin(theta)
      );
      const s = 0.5 + (i % 4) * 0.35;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      stars.setMatrixAt(i, dummy.matrix);
    }
    stars.computeBoundingSphere();
    scene.add(stars);

    // Subtle calibration floor ring below astronaut
    const ringGeo = new THREE.RingGeometry(0.68, 0.71, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x8ab9e8,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const baseRing = new THREE.Mesh(ringGeo, ringMat);
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = -0.45;
    scene.add(baseRing);

    const innerRingGeo = new THREE.RingGeometry(0.42, 0.435, 48);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xc8d1db,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = -0.45;
    scene.add(innerRing);

    // Composite 3D Astronaut Spacesuit Assembly (12+ distinct anatomical/EVA sub-assemblies)
    const astronaut = new THREE.Group();
    const wireOverlayGroup = new THREE.Group();
    wireOverlayGroup.visible = wireframeRef.current;
    wireframeGroupRef.current = wireOverlayGroup;

    const suitWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xe6edf5,
      roughness: 0.52,
      metalness: 0.08,
    });
    const suitSlateMat = new THREE.MeshStandardMaterial({
      color: 0x263547,
      roughness: 0.65,
      metalness: 0.18,
    });
    const metalTrimMat = new THREE.MeshStandardMaterial({
      color: 0xc8d1db,
      roughness: 0.22,
      metalness: 0.88,
    });
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x16293f,
      metalness: 0.92,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const accentGlowMat = new THREE.MeshStandardMaterial({
      color: 0x8ab9e8,
      emissive: 0x8ab9e8,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x8ab9e8,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
    });

    const addPart = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      pos: [number, number, number],
      rot: [number, number, number] = [0, 0, 0],
      scale: [number, number, number] = [1, 1, 1],
      withWire = true
    ) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.scale.set(...scale);
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;
      astronaut.add(mesh);

      if (withWire) {
        const w = new THREE.Mesh(geo, wireMat);
        w.position.set(...pos);
        w.rotation.set(...rot);
        w.scale.set(scale[0] * 1.015, scale[1] * 1.015, scale[2] * 1.015);
        wireOverlayGroup.add(w);
      }
      return mesh;
    };

    // 1. Helmet shell + Visor + Neck bearing ring
    addPart(new THREE.SphereGeometry(0.24, 32, 24), suitWhiteMat, [0, 1.56, 0], [0, 0, 0], [1, 1.05, 1.04]);
    addPart(new THREE.SphereGeometry(0.205, 28, 20), visorMat, [0, 1.56, 0.075], [0, 0, 0], [0.95, 0.88, 0.92], false);
    addPart(new THREE.TorusGeometry(0.185, 0.025, 14, 32), metalTrimMat, [0, 1.34, 0], [Math.PI / 2, 0, 0]);

    // 2. Hard Upper Torso (HUT) + Waist ring + Lower Torso
    addPart(new THREE.CapsuleGeometry(0.24, 0.36, 12, 24), suitWhiteMat, [0, 0.98, 0], [0, 0, 0], [1.14, 1, 0.82]);
    addPart(new THREE.TorusGeometry(0.225, 0.024, 12, 32), metalTrimMat, [0, 0.65, 0], [Math.PI / 2, 0, 0], [1.08, 0.86, 1]);
    addPart(new THREE.CylinderGeometry(0.22, 0.2, 0.28, 24), suitWhiteMat, [0, 0.49, 0], [0, 0, 0], [1.06, 1, 0.84]);

    // 3. Chest Display & Control Module (DCM)
    addPart(new THREE.BoxGeometry(0.26, 0.22, 0.1), suitSlateMat, [0, 1.02, 0.22]);
    addPart(new THREE.BoxGeometry(0.16, 0.04, 0.02), accentGlowMat, [0, 1.06, 0.275], [0, 0, 0], [1, 1, 1], false);
    addPart(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 16), metalTrimMat, [-0.07, 0.96, 0.275], [Math.PI / 2, 0, 0]);
    addPart(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 16), metalTrimMat, [0.07, 0.96, 0.275], [Math.PI / 2, 0, 0]);

    // 4. PLSS Life-Support Backpack + Telemetry Antenna
    addPart(new THREE.BoxGeometry(0.42, 0.62, 0.22), suitWhiteMat, [0, 1.0, -0.25]);
    addPart(new THREE.BoxGeometry(0.32, 0.42, 0.05), suitSlateMat, [0, 1.02, -0.35]);
    addPart(new THREE.CylinderGeometry(0.01, 0.014, 0.34, 12), metalTrimMat, [0.15, 1.46, -0.26]);

    // 5. Articulated Shoulders, Arms, Wrist Rings & Gloves (Left & Right)
    ([-1, 1] as const).forEach((side) => {
      // Shoulder bearing
      addPart(new THREE.SphereGeometry(0.115, 20, 16), suitSlateMat, [side * 0.33, 1.17, 0]);
      // Upper arm
      addPart(
        new THREE.CapsuleGeometry(0.088, 0.22, 10, 18),
        suitWhiteMat,
        [side * 0.41, 0.96, 0.02],
        [0.08, 0, side * -0.2]
      );
      // Forearm
      addPart(
        new THREE.CapsuleGeometry(0.078, 0.22, 10, 18),
        suitWhiteMat,
        [side * 0.47, 0.69, 0.09],
        [-0.36, 0, side * -0.08]
      );
      // Wrist ring & Glove
      addPart(
        new THREE.TorusGeometry(0.072, 0.014, 10, 24),
        metalTrimMat,
        [side * 0.49, 0.54, 0.16],
        [Math.PI / 2 - 0.36, 0, 0]
      );
      addPart(
        new THREE.SphereGeometry(0.074, 16, 14),
        suitSlateMat,
        [side * 0.49, 0.46, 0.19],
        [0, 0, 0],
        [0.9, 1.25, 0.85]
      );
    });

    // 6. Legs, Knee Joints, Shins & Lunar Boots (Left & Right)
    ([-1, 1] as const).forEach((side) => {
      // Thigh
      addPart(
        new THREE.CapsuleGeometry(0.105, 0.28, 10, 18),
        suitWhiteMat,
        [side * 0.145, 0.22, 0],
        [0, 0, side * 0.05]
      );
      // Knee pad
      addPart(new THREE.SphereGeometry(0.098, 16, 14), suitSlateMat, [side * 0.155, 0.02, 0.03]);
      // Shin
      addPart(
        new THREE.CapsuleGeometry(0.092, 0.28, 10, 18),
        suitWhiteMat,
        [side * 0.16, -0.18, -0.01],
        [0, 0, 0]
      );
      // Boot
      addPart(
        new THREE.BoxGeometry(0.16, 0.11, 0.26),
        suitSlateMat,
        [side * 0.16, -0.39, 0.04]
      );
    });

    astronaut.add(wireOverlayGroup);
    scene.add(astronaut);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    const updateHotspotProjections = () => {
      const rect = outer.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const nextCoords = {} as Record<HotspotZone, { x: number; y: number; visible: boolean }>;
      for (const hs of HOTSPOTS) {
        _projVec.set(hs.anchor[0], hs.anchor[1], hs.anchor[2]);
        astronaut.localToWorld(_projVec);
        _projVec.project(camera);
        const xPct = ((_projVec.x + 1) / 2) * 100;
        const yPct = ((-_projVec.y + 1) / 2) * 100;
        const visible = _projVec.z < 1 && xPct > 5 && xPct < 95 && yPct > 5 && yPct < 95;
        nextCoords[hs.id] = {
          x: Math.min(92, Math.max(8, xPct)),
          y: Math.min(90, Math.max(10, yPct)),
          visible,
        };
      }
      setHotspotCoords(nextCoords);
    };

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // Subtle microgravity float & breathing posture
      const t = now * 0.001;
      astronaut.position.y = Math.sin(t * 1.1) * 0.035;
      if (!isSoftwareGl && autoRotateRef.current) {
        astronaut.rotation.y += dt * 0.16;
      }

      controls.autoRotate = false;
      controls.update();
      renderer.render(scene, camera);
      updateHotspotProjections();

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const handleResize = () => {
      if (!host) return;
      const w = Math.max(host.clientWidth, 280);
      const h = Math.max(host.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(host);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  const statusRingColor =
    overallStatus === 'critical'
      ? 'border-[#E77C82]/60 text-[#E77C82]'
      : overallStatus === 'warning'
        ? 'border-[#E8B86D]/60 text-[#E8B86D]'
        : 'border-[#8AB9E8]/50 text-[#B9DDF5]';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[420px] sm:h-[480px] lg:h-[520px] rounded-xl border border-[var(--astra-border)] bg-[#05070B] overflow-hidden select-none"
    >
      {/* Subtle radial studio glow behind astronaut */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(138, 185, 232, 0.14) 0%, rgba(10, 17, 27, 0.35) 45%, rgba(5, 7, 11, 0.95) 85%)',
        }}
      />

      {!webglUnavailable ? (
        <div ref={canvasHostRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
      ) : (
        /* High-precision 2D SVG Fallback if WebGL is unavailable */
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <svg
            viewBox="0 0 240 360"
            className="h-full max-h-[380px] w-auto"
            aria-label="Astronaut spacesuit physiological schematic"
          >
            <g fill="none" stroke="#8AB9E8" strokeWidth="1.5" strokeOpacity="0.85">
              <circle cx="120" cy="62" r="32" fill="rgba(18,29,43,0.75)" />
              <ellipse cx="120" cy="64" rx="22" ry="16" fill="#0E1B2B" stroke="#B9DDF5" />
              <rect x="78" y="102" width="84" height="106" rx="18" fill="rgba(18,29,43,0.7)" />
              <rect x="96" y="122" width="48" height="36" rx="6" fill="#0A111B" stroke="#B9DDF5" />
              <path d="M78 116 L46 168 L56 208" strokeWidth="14" strokeLinecap="round" stroke="#1E2D3E" />
              <path d="M162 116 L194 168 L184 208" strokeWidth="14" strokeLinecap="round" stroke="#1E2D3E" />
              <path d="M98 208 L92 315" strokeWidth="18" strokeLinecap="round" stroke="#1E2D3E" />
              <path d="M142 208 L148 315" strokeWidth="18" strokeLinecap="round" stroke="#1E2D3E" />
            </g>
          </svg>
        </div>
      )}

      {/* Top-left Telemetry Tag */}
      <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-1">
        <div className="text-[11px] font-medium tracking-wider uppercase text-[#A5B3C3]">
          Biometric Suit Telemetry · Interactive 3D
        </div>
        <div className="text-xs text-[#F4F7FA] font-mono-tabular">
          Drag to orbit · Scroll to zoom · Select anatomical zone
        </div>
      </div>

      {/* Interactive Anatomical Hotspots (Solid surface, zero backdrop-blur over WebGL) */}
      {HOTSPOTS.map((hs) => {
        const coords = webglUnavailable
          ? { x: parseFloat(hs.fallbackPos.left), y: parseFloat(hs.fallbackPos.top), visible: true }
          : hotspotCoords[hs.id];
        if (!coords.visible) return null;
        const isSelected = selectedHotspot === hs.id;

        return (
          <button
            key={hs.id}
            type="button"
            onClick={() => onSelectHotspot(hs.id)}
            style={{
              left: `${coords.x}%`,
              top: `${coords.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute z-10 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors shadow-lg ${
              isSelected
                ? 'border-[#B9DDF5] bg-[#121D2B] text-[#F4F7FA]'
                : 'border-[rgba(190,215,240,0.28)] bg-[#0A111B]/92 text-[#C8D1DB] hover:border-[#8AB9E8] hover:text-[#F4F7FA]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isSelected ? 'bg-[#8AB9E8]' : 'bg-[#C8D1DB]/70'
              }`}
              aria-hidden="true"
            />
            <span>{hs.label}</span>
          </button>
        );
      })}

      {/* Bottom Compact Controls Bar (Zero Viewport Occlusion) */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
        <div className={`rounded-lg border bg-[#0A111B]/95 px-3 py-1.5 text-xs ${statusRingColor}`}>
          Suit Readout · HR <span className="font-mono-tabular font-semibold">{reading.heartRate}</span> · SpO2{' '}
          <span className="font-mono-tabular font-semibold">{reading.spo2}%</span> · Temp{' '}
          <span className="font-mono-tabular font-semibold">{reading.bodyTemperature.toFixed(1)}°C</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(190,215,240,0.22)] bg-[#0A111B]/95 p-1">
          <button
            type="button"
            onClick={() => setWireframeMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              wireframeMode
                ? 'bg-[#8AB9E8]/20 text-[#B9DDF5]'
                : 'text-[#A5B3C3] hover:text-[#F4F7FA]'
            }`}
          >
            <Box className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Wireframe</span>
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              autoRotate
                ? 'bg-[#8AB9E8]/20 text-[#B9DDF5]'
                : 'text-[#A5B3C3] hover:text-[#F4F7FA]'
            }`}
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Orbit</span>
          </button>
          <button
            type="button"
            onClick={() => resetFnRef.current?.()}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-[#A5B3C3] hover:text-[#F4F7FA] transition-colors"
            title="Reset camera angle"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
