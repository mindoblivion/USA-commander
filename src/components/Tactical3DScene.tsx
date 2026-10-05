import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import jeepModelUrl from '/models/desert_jeep.glb?url';
import {
  CombatTheater,
  DestructibleTarget,
  GameSettings,
  IntelDrop,
  VehicleModelType,
  VehicleUpgradeState,
  VisionMode,
  TacticalWeather,
  SAMMissile,
  EnemyPatrol
} from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { Shield, Zap, Car, Eye, Compass, Gauge, Flame, Crosshair, CloudRain, Radio } from 'lucide-react';
import { db, auth } from '../firebase/config';
import { setDoc, doc, onSnapshot, deleteDoc, collection } from 'firebase/firestore';

interface Tactical3DSceneProps {
  theater: CombatTheater;
  targets: DestructibleTarget[];
  activeStrikeRadius: number;
  strikeWeaponId: string;
  isNuclearStrikeActive: boolean;
  settings: GameSettings;
  vehicleUpgrades: VehicleUpgradeState;
  joystickVector?: { x: number; y: number; isBoosting?: boolean };
  onTargetClick: (worldX: number, worldZ: number) => void;
  onTargetRamDamage: (targetId: string, damage: number, isKill: boolean) => void;
  onIntelCollect: (intelId: string) => void;
  intelDrops: IntelDrop[];
  compassAngle: number;
  setCompassAngle: (angle: number) => void;
  onAddCombatLog: (text: string) => void;
  visionMode?: VisionMode;
  weather?: TacticalWeather;
  isFlightMode?: boolean;
  flaresActive?: boolean;
  onReticleMove?: (x: number, z: number) => void;
}

interface ExplosionInstance {
  group: THREE.Group;
  particles: THREE.Points;
  shockwave: THREE.Mesh;
  light: THREE.PointLight;
  maxAge: number;
  age: number;
  isNuke: boolean;
}

interface AircraftInstance {
  group: THREE.Group;
  model: string;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  progress: number;
  speed: number;
  onComplete?: () => void;
}

interface DebrisChunk {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  age: number;
  maxAge: number;
}

// Procedural Canvas Textures for realistic architectural siding, shingles, and brick
const textureCache = new Map<string, THREE.CanvasTexture>();

function getClapboardTexture(baseHex: string): THREE.CanvasTexture {
  const key = `clapboard_${baseHex}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  const plankHeight = 32;
  for (let y = 0; y < 256; y += plankHeight) {
    const grad = ctx.createLinearGradient(0, y, 0, y + plankHeight);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.85, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, 256, plankHeight);

    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + plankHeight);
    ctx.lineTo(256, y + plankHeight);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 1);
    ctx.lineTo(256, y + 1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  textureCache.set(key, texture);
  return texture;
}

function getShingleTexture(baseHex: string): THREE.CanvasTexture {
  const key = `shingle_${baseHex}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  const rowH = 24;
  const colW = 32;
  for (let r = 0; r < 256; r += rowH) {
    const isOdd = Math.floor(r / rowH) % 2 === 1;
    const xOffset = isOdd ? colW / 2 : 0;

    for (let c = -colW; c < 256 + colW; c += colW) {
      const x = c + xOffset;
      const grad = ctx.createLinearGradient(x, r, x, r + rowH);
      grad.addColorStop(0, 'rgba(255,255,255,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, r + 1, colW - 2, rowH - 2);

      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, r);
      ctx.lineTo(x, r + rowH);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, r + rowH);
    ctx.lineTo(256, r + rowH);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set(key, texture);
  return texture;
}

function getBrickTexture(): THREE.CanvasTexture {
  const key = 'brick_red';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#991b1b';
  ctx.fillRect(0, 0, 128, 128);

  const rowH = 16;
  const colW = 32;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;

  for (let r = 0; r < 128; r += rowH) {
    const isOdd = Math.floor(r / rowH) % 2 === 1;
    const xOffset = isOdd ? colW / 2 : 0;

    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.lineTo(128, r);
    ctx.stroke();

    for (let c = -colW; c < 128 + colW; c += colW) {
      const x = c + xOffset;
      ctx.beginPath();
      ctx.moveTo(x, r);
      ctx.lineTo(x, r + rowH);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set(key, texture);
  return texture;
}

export const Tactical3DScene: React.FC<Tactical3DSceneProps> = ({
  theater,
  targets,
  activeStrikeRadius,
  strikeWeaponId,
  isNuclearStrikeActive,
  settings,
  vehicleUpgrades,
  joystickVector,
  onTargetClick,
  onTargetRamDamage,
  onIntelCollect,
  intelDrops = [],
  compassAngle,
  setCompassAngle,
  onAddCombatLog,
  visionMode = 'normal',
  weather = 'clear',
  isFlightMode = false,
  flaresActive = false,
  onReticleMove
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to keep scene objects alive across renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const targetMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const intelBeamsRef = useRef<Map<string, THREE.Group>>(new Map());
  const explosionsRef = useRef<ExplosionInstance[]>([]);
  const aircraftsRef = useRef<AircraftInstance[]>([]);
  const debrisListRef = useRef<DebrisChunk[]>([]);
  const reticleRef = useRef<THREE.Group | null>(null);
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());

  // Player Vehicle Mesh & Parts Ref
  const vehicleGroupRef = useRef<THREE.Group | null>(null);
  const vehicleWheelsRef = useRef<THREE.Mesh[]>([]);
  const vehicleRotorRef = useRef<THREE.Mesh | null>(null);
  const loadedJeepModelRef = useRef<THREE.Group | null>(null);
  const [isJeepLoaded, setIsJeepLoaded] = useState<boolean>(false);

  // Next-Level Combat Gameplay Refs & States
  const flaresListRef = useRef<{ mesh: THREE.Mesh; velocity: THREE.Vector3; age: number; maxAge: number }[]>([]);
  const samLaunchersRef = useRef<{ mesh: THREE.Group; x: number; z: number; lastFireTime: number; hp: number; maxHp: number; isDestroyed: boolean }[]>([]);
  const samMissilesRef = useRef<{ mesh: THREE.Group; velocity: THREE.Vector3; age: number; maxAge: number; targetPos: THREE.Vector3; isTrackingDecoy: boolean }[]>([]);
  const hostilePatrolsRef = useRef<{ mesh: THREE.Group; id: string; x: number; z: number; speed: number; rotY: number; hp: number; maxHp: number; targetX: number; targetZ: number; lastFireTime: number; color: string }[]>([]);
  const tracersListRef = useRef<{ mesh: THREE.Line; velocity: THREE.Vector3; age: number; maxAge: number; isPlayerShot: boolean }[]>([]);
  const coopMeshesRef = useRef<Map<string, { group: THREE.Group; label: THREE.Sprite }>>(new Map());
  const [coopSessions, setCoopSessions] = useState<any[]>([]);

  // Lights & Day/Night simulation refs
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const timeOfDayRef = useRef<number>(12.0);

  // Outposts, weather particles, and residual fire pools
  const outpostsRef = useRef<{ x: number; z: number; progress: number; state: 'neutral' | 'capturing' | 'captured'; mesh: THREE.Group; ring: THREE.Mesh }[]>([]);
  const weatherParticlesRef = useRef<THREE.Points | null>(null);
  const weatherParticlesGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const firePoolsRef = useRef<{ mesh: THREE.Mesh; x: number; z: number; radius: number; age: number; maxAge: number }[]>([]);

  // Load custom GLB desert jeep model from public directory
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      jeepModelUrl,
      (gltf: any) => {
        const rawModel = gltf.scene;

        // 1. Force compute bounding boxes and spheres to guarantee correct dimension calculations
        rawModel.traverse((node: any) => {
          if (node.isMesh) {
            node.visible = true;
            if (node.geometry) {
              node.geometry.computeBoundingBox();
              node.geometry.computeBoundingSphere();
            }
          }
        });

        // 2. Measure bounding box size and center offsets safely
        const box = new THREE.Box3().setFromObject(rawModel);
        const size = new THREE.Vector3();
        box.getSize(size);

        const center = new THREE.Vector3();
        box.getCenter(center);

        // 3. Center raw model pivot inside a clean wrapper parent group
        const centeredGroup = new THREE.Group();
        rawModel.position.sub(center);
        centeredGroup.add(rawModel);

        // Slightly elevate the model so the tires sit precisely on the ground
        rawModel.position.y += size.y / 2;

        // 4. Auto-scale model based on valid dimensions (target scale matching 4.3 units)
        const maxDim = Math.max(size.x, size.z, size.y);
        const targetScale = maxDim > 0.01 ? 4.3 / maxDim : 1.5;
        centeredGroup.scale.set(targetScale, targetScale, targetScale);

        // Face forward along active trajectory
        centeredGroup.rotation.y = Math.PI;

        // 5. Traverse to enforce full visibility, cast shadows, and fix transparency glitches
        centeredGroup.traverse((node: any) => {
          if (node.isMesh) {
            node.visible = true;
            node.castShadow = true;
            node.receiveShadow = true;

            if (node.material) {
              node.material.visible = true;
              node.material.transparent = false;
              node.material.opacity = 1.0;
              node.material.side = THREE.DoubleSide;
              node.material.depthWrite = true;
              node.material.depthTest = true;

              // If materials are dark or unlit, ensure they receive maximum light reflection
              if (node.material.roughness !== undefined) node.material.roughness = 0.55;
              if (node.material.metalness !== undefined) node.material.metalness = 0.45;
            }
          }
        });

        loadedJeepModelRef.current = centeredGroup;
        setIsJeepLoaded(true);
        onAddCombatLog(`📦 Custom Desert Jeep GLB Auto-Scaled (Scale: ${targetScale.toFixed(2)}x) & Rendered Successfully!`);
      },
      undefined,
      (err: any) => {
        console.error('Error loading custom desert jeep GLB model:', err);
        onAddCombatLog(`⚠️ GLB Loader Info: Falling back to procedural high-detail Jeep. Error: ${err?.message || 'Unsupported asset compression format'}`);
      }
    );
  }, [onAddCombatLog]);

  // 1. Joint-Ops Co-op Presence: Periodic position transmission to Firestore
  useEffect(() => {
    let interval: any;
    
    const transmitPresence = () => {
      const user = auth.currentUser;
      if (!user) return;
      
      const sessionRef = doc(db, 'active_sessions', user.uid);
      setDoc(sessionRef, {
        id: user.uid,
        userId: user.uid,
        commanderName: user.displayName || user.email?.split('@')[0] || 'US Commander',
        activeTheaterId: theater.id,
        x: vehicleStateRef.current.x,
        z: vehicleStateRef.current.z,
        altitude: vehicleStateRef.current.altitude,
        rotationY: vehicleStateRef.current.rotationY,
        lastAction: isFlightMode ? 'Piloting Aerial Striker' : 'Driving Armored Recon',
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((err) => {
        console.warn("Presence broadcast issue:", err);
      });
    };

    // Broadcast presence immediately and then every 350ms
    transmitPresence();
    interval = setInterval(transmitPresence, 350);

    // Delete presence upon departure/unmount
    return () => {
      clearInterval(interval);
      const user = auth.currentUser;
      if (user) {
        const sessionRef = doc(db, 'active_sessions', user.uid);
        deleteDoc(sessionRef).catch(() => {});
      }
    };
  }, [theater.id, isFlightMode]);

  // 2. Joint-Ops Co-op: Real-time listener for other active players
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'active_sessions'), (snap) => {
      const activePlayers: any[] = [];
      const user = auth.currentUser;

      snap.forEach((doc) => {
        const data = doc.data();
        // Ignore self and only include players in the same active theater
        if (data.userId !== user?.uid && data.activeTheaterId === theater.id) {
          // Verify presence is active (within last 12 seconds)
          const isFresh = Date.now() - new Date(data.updatedAt).getTime() < 12000;
          if (isFresh) {
            activePlayers.push(data);
          }
        }
      });
      setCoopSessions(activePlayers);
    }, (err) => {
      console.warn("Active sessions sync failed:", err);
    });

    return () => unsub();
  }, [theater.id]);

  const vehicleStateRef = useRef({
    x: 0,
    z: 15,
    altitude: 0,
    rotationY: 0,
    speed: 0,
    maxSpeed: 24,
    acceleration: 40,
    braking: 45,
    reverseMaxSpeed: 10,
    turnSpeed: 3.2,
    ramPower: 7.5,
    boostMultiplier: 1.0,
    isBoosting: false,
    boostFuel: 100,
    steerAngle: 0
  });

  // Driving Input keys
  const keysRef = useRef<{
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    boost: boolean;
  }>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false
  });

  // Camera control drag state
  const isDraggingRef = useRef<boolean>(false);
  const previousPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraAngleRef = useRef<{ theta: number; phi: number; distance: number }>({
    theta: Math.PI / 4,
    phi: Math.PI / 3.4,
    distance: 40
  });

  const joystickVectorRef = useRef<{ x: number; y: number; isBoosting?: boolean }>({ x: 0, y: 0, isBoosting: false });
  const impactCooldownsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (joystickVector) {
      joystickVectorRef.current = joystickVector;
    } else {
      joystickVectorRef.current = { x: 0, y: 0, isBoosting: false };
    }
  }, [joystickVector]);

  const [hoveredTarget, setHoveredTarget] = useState<DestructibleTarget | null>(null);
  const [hudSpeed, setHudSpeed] = useState<number>(0);
  const [hudBoostPct, setHudBoostPct] = useState<number>(100);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theater.skyColor);
    scene.fog = new THREE.FogExp2(theater.fogColor, 0.015);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: settings.graphicsQuality !== 'low',
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.graphicsQuality === 'ultra' ? 2 : 1.5));
    renderer.shadowMap.enabled = settings.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Upgraded PBR Lighting & Atmosphere
    const hemiLight = new THREE.HemisphereLight(
      new THREE.Color(theater.skyColor || 0x38bdf8),
      new THREE.Color(theater.groundColor || 0xbc9d75),
      1.2
    );
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.5);
    sunLight.position.set(45, 65, 35);
    sunLight.castShadow = settings.shadows;
    sunLight.shadow.mapSize.width = settings.graphicsQuality === 'low' ? 1024 : 2048;
    sunLight.shadow.mapSize.height = settings.graphicsQuality === 'low' ? 1024 : 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 160;
    const shadowD = 55;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const rimLight = new THREE.DirectionalLight(new THREE.Color(theater.accentColor), 0.6);
    rimLight.position.set(-30, 20, -30);
    scene.add(rimLight);

    // Exponential Atmospheric Fog
    scene.fog = new THREE.FogExp2(theater.fogColor || '#0f172a', 0.012);

    // 5. Ground Plane with Realistic Desert Terrain & Procedural Sandy Roads
    const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xd2b48c, // Tan sand color
      roughness: 0.98,
      metalness: 0.02
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    groundPlaneRef.current = ground;

    // Heat Haze Shader
    const heatHazeMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          uv.y += sin(uv.x * 20.0 + time * 5.0) * 0.002;
          gl_FragColor = vec4(1.0, 1.0, 1.0, 0.05);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const heatHazePlane = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), heatHazeMat);
    heatHazePlane.rotation.x = -Math.PI / 2;
    heatHazePlane.position.y = 0.1;
    scene.add(heatHazePlane);

    // Sandy Dirt Road Network
    const sandRoadMat = new THREE.MeshStandardMaterial({ 
      color: 0xbc9d75, 
      roughness: 0.95, 
      metalness: 0 
    });

    // Generate a few random sandy paths
    const paths = [
      { start: new THREE.Vector2(-60, -20), end: new THREE.Vector2(60, 20) },
      { start: new THREE.Vector2(-20, 60), end: new THREE.Vector2(20, -60) }
    ];

    paths.forEach(path => {
      const dir = new THREE.Vector2().subVectors(path.end, path.start);
      const length = dir.length();
      const angle = Math.atan2(dir.y, dir.x);
      
      const road = new THREE.Mesh(new THREE.PlaneGeometry(length, 6), sandRoadMat);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = angle;
      road.position.set(
        (path.start.x + path.end.x) / 2,
        0.03,
        (path.start.y + path.end.y) / 2
      );
      road.receiveShadow = true;
      scene.add(road);
    });

    // Clean up old military assets upon reload
    samLaunchersRef.current.forEach((l) => scene.remove(l.mesh));
    samLaunchersRef.current = [];

    samMissilesRef.current.forEach((m) => scene.remove(m.mesh));
    samMissilesRef.current = [];

    hostilePatrolsRef.current.forEach((p) => scene.remove(p.mesh));
    hostilePatrolsRef.current = [];

    flaresListRef.current.forEach((f) => scene.remove(f.mesh));
    flaresListRef.current = [];

    tracersListRef.current.forEach((t) => scene.remove(t.mesh));
    tracersListRef.current = [];

    outpostsRef.current.forEach((o) => {
      scene.remove(o.mesh);
      scene.remove(o.ring);
    });
    outpostsRef.current = [];

    if (weatherParticlesRef.current) {
      scene.remove(weatherParticlesRef.current);
      weatherParticlesRef.current = null;
    }

    firePoolsRef.current.forEach((fp) => scene.remove(fp.mesh));
    firePoolsRef.current = [];

    // Create 3 capture Outposts
    const outpostPositions = [
      { x: -28, z: 22, name: 'OUTPOST ALPHA' },
      { x: 28, z: -22, name: 'OUTPOST BRAVO' },
      { x: 10, z: -38, name: 'OUTPOST CHARLIE' }
    ];

    outpostPositions.forEach((pos) => {
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      // Flag Pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 4.0, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 })
      );
      pole.position.y = 2.0;
      group.add(pole);

      // Flag mesh
      const flagMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
      const flag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.05), flagMat);
      flag.position.set(0.6, 3.6, 0);
      flag.name = 'flag';
      group.add(flag);

      // Label Sprite
      const lblCanvas = document.createElement('canvas');
      lblCanvas.width = 256;
      lblCanvas.height = 64;
      const ctx = lblCanvas.getContext('2d')!;
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(pos.name, 10, 32);
      const lblTex = new THREE.CanvasTexture(lblCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: lblTex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.y = 4.6;
      sprite.scale.set(3, 0.75, 1);
      group.add(sprite);

      scene.add(group);

      // Glowing outer capture ring on ground
      const ringGeo = new THREE.RingGeometry(4.8, 5.0, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.04, pos.z);
      scene.add(ring);

      outpostsRef.current.push({
        x: pos.x,
        z: pos.z,
        progress: 0,
        state: 'neutral',
        mesh: group,
        ring
      });
    });

    // Create Weather Particles System
    const pCount = 1000;
    const pGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const velocities = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 45 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;

      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = -15 - Math.random() * 15;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeom.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(pGeom, pMat);
    scene.add(points);
    weatherParticlesRef.current = points;
    weatherParticlesGeomRef.current = pGeom;

    // Create 2 stationary Hostile SAM Launcher Batteries
    const samPositions = [
      { x: 35, z: 35 },
      { x: -35, z: -35 }
    ];

    samPositions.forEach((pos) => {
      const samGroup = new THREE.Group();
      samGroup.position.set(pos.x, 0, pos.z);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(4.0, 1.2, 4.0),
        new THREE.MeshStandardMaterial({ color: 0x4d5d3e, roughness: 0.85 })
      );
      base.position.y = 0.6;
      base.castShadow = true;
      base.receiveShadow = true;
      samGroup.add(base);

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.2, 0);
      headGroup.name = 'headGroup';

      const headMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.0, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x3b4a2e, roughness: 0.8 })
      );
      headMesh.position.y = 0.5;
      headMesh.castShadow = true;
      headGroup.add(headMesh);

      const podMat = new THREE.MeshStandardMaterial({ color: 0x222c1b, roughness: 0.8 });
      [-0.8, 0.8].forEach((offset) => {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 3.2), podMat);
        pod.position.set(offset, 1.1, 0.2);
        pod.rotation.x = -Math.PI / 8;
        pod.castShadow = true;
        headGroup.add(pod);
      });

      samGroup.add(headGroup);
      scene.add(samGroup);

      samLaunchersRef.current.push({
        mesh: samGroup,
        x: pos.x,
        z: pos.z,
        lastFireTime: 0,
        hp: 300,
        maxHp: 300,
        isDestroyed: false
      });
    });

    // Create 3 active Hostile Patrol vehicles on grid intersections
    const patrolSpawnPoints = [
      { x: -28, z: 28 },
      { x: 28, z: -28 },
      { x: -42, z: -14 }
    ];

    patrolSpawnPoints.forEach((pos, idx) => {
      const patrolGroup = new THREE.Group();
      patrolGroup.position.set(pos.x, 0, pos.z);

      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.75, metalness: 0.3 });
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 4.0), bodyMat);
      chassis.position.y = 0.55;
      chassis.castShadow = true;
      patrolGroup.add(chassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 2.2), bodyMat);
      cabin.position.set(0, 1.25, -0.4);
      cabin.castShadow = true;
      patrolGroup.add(cabin);

      const gunStand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      gunStand.position.set(0, 1.85, -0.4);
      patrolGroup.add(gunStand);

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x09090b })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 2.15, 0.1);
      barrel.castShadow = true;
      patrolGroup.add(barrel);

      [
        { x: -1.2, z: 1.2 },
        { x: 1.2, z: 1.2 },
        { x: -1.2, z: -1.2 },
        { x: 1.2, z: -1.2 }
      ].forEach((wPos) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wPos.x, 0.55, wPos.z);
        wheel.castShadow = true;
        patrolGroup.add(wheel);
      });

      scene.add(patrolGroup);

      hostilePatrolsRef.current.push({
        mesh: patrolGroup,
        id: `patrol_${idx}_${Date.now()}`,
        x: pos.x,
        z: pos.z,
        speed: 10 + Math.random() * 5,
        rotY: Math.random() * Math.PI * 2,
        hp: 250,
        maxHp: 250,
        targetX: pos.x,
        targetZ: pos.z,
        lastFireTime: 0,
        color: '#991b1b'
      });
    });

    // 6. Build the Player's Active Vehicle (Jeep, Tank, Helicopter, Jet)
    const vehGroup = buildActivePlayerVehicle(vehicleUpgrades);
    vehGroup.position.set(vehicleStateRef.current.x, vehicleStateRef.current.altitude, vehicleStateRef.current.z);
    scene.add(vehGroup);
    vehicleGroupRef.current = vehGroup;

    // 7. Airstrike Targeting Reticle Group
    const reticleGroup = new THREE.Group();
    
    const radiusGeo = new THREE.RingGeometry(activeStrikeRadius - 0.25, activeStrikeRadius + 0.25, 48);
    const radiusMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const radiusRing = new THREE.Mesh(radiusGeo, radiusMat);
    radiusRing.rotation.x = -Math.PI / 2;
    radiusRing.name = 'radiusRing';
    reticleGroup.add(radiusRing);

    const bracketGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.4, 0.05, 2.4));
    const bracketMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const targetBracket = new THREE.LineSegments(bracketGeo, bracketMat);
    targetBracket.name = 'targetBracket';
    reticleGroup.add(targetBracket);

    const crossGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.5, 0.05, 0), new THREE.Vector3(2.5, 0.05, 0),
      new THREE.Vector3(0, 0.05, -2.5), new THREE.Vector3(0, 0.05, 2.5)
    ]);
    const crossMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    const crossHair = new THREE.LineSegments(crossGeo, crossMat);
    reticleGroup.add(crossHair);

    reticleGroup.position.set(0, 0.05, 0);
    scene.add(reticleGroup);
    reticleRef.current = reticleGroup;

    // Keyboard driving listener
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keysRef.current.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') keysRef.current.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') keysRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') keysRef.current.right = true;
      if (code === 'Space') {
        keysRef.current.boost = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keysRef.current.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') keysRef.current.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') keysRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') keysRef.current.right = false;
      if (code === 'Space') keysRef.current.boost = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // FIXED HUD WHEEL ZOOM: Prevent page zooming & scale 3D camera distance directly
    const handleWheelZoom = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.distance = Math.max(
        14,
        Math.min(85, cameraAngleRef.current.distance + e.deltaY * 0.04)
      );
      updateCameraPosition();
    };

    canvas.addEventListener('wheel', handleWheelZoom, { passive: false });

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Main Game & Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let lastHudUpdate = 0;

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // 1. UPDATE ACTIVE VEHICLE PHYSICS & CONTROLS
      updateVehiclePhysics(delta);

      // 2. CHECK VEHICLE RAMMING & CRUSH COLLISIONS
      checkVehicleCollisions();

      // 3. UPDATE CAMERA FOLLOW VEHICLE OR ORBIT
      if ((settings.overlays?.cameraFollowJeep ?? true) && vehicleGroupRef.current) {
        updateCameraFollowVehicle(delta);
      }

      // Update HUD speed gauge throttled
      if (currentTime - lastHudUpdate > 75) {
        lastHudUpdate = currentTime;
        setHudSpeed(Math.round(Math.abs(vehicleStateRef.current.speed) * 3.6));
        setHudBoostPct(Math.round(vehicleStateRef.current.boostFuel));
      }

      // Spin helicopter rotors if active
      if (vehicleRotorRef.current) {
        vehicleRotorRef.current.rotation.y += delta * 25;
      }

      // Pulse airstrike reticle
      if (reticleRef.current) {
        reticleRef.current.rotation.y += delta * 0.8;
      }

      // Animate active explosions
      for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
        const exp = explosionsRef.current[i];
        exp.age += delta;
        const progress = exp.age / exp.maxAge;

        if (progress >= 1) {
          scene.remove(exp.group);
          explosionsRef.current.splice(i, 1);
        } else {
          const scale = 1 + progress * (exp.isNuke ? 32 : 12);
          exp.shockwave.scale.set(scale, scale, 1);
          (exp.shockwave.material as THREE.Material).opacity = Math.max(0, (1 - progress) * 0.9);

          const geo = exp.particles.geometry;
          const pos = geo.attributes.position;
          for (let p = 0; p < pos.count; p++) {
            pos.setY(p, pos.getY(p) + delta * (exp.isNuke ? 16 : 7));
            pos.setX(p, pos.getX(p) + (pos.getX(p) > 0 ? 1 : -1) * delta * 5);
            pos.setZ(p, pos.getZ(p) + (pos.getZ(p) > 0 ? 1 : -1) * delta * 5);
          }
          pos.needsUpdate = true;
          (exp.particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - progress);
          exp.light.intensity = (1 - progress) * (exp.isNuke ? 16 : 4);
        }
      }

      // Animate Debris Chunks
      for (let i = debrisListRef.current.length - 1; i >= 0; i--) {
        const chunk = debrisListRef.current[i];
        chunk.age += delta;

        if (chunk.age >= chunk.maxAge) {
          scene.remove(chunk.mesh);
          debrisListRef.current.splice(i, 1);
        } else {
          chunk.velocity.y -= 18 * delta;
          chunk.mesh.position.addScaledVector(chunk.velocity, delta);
          chunk.mesh.rotation.x += chunk.rotVelocity.x * delta;
          chunk.mesh.rotation.y += chunk.rotVelocity.y * delta;
          chunk.mesh.rotation.z += chunk.rotVelocity.z * delta;

          if (chunk.mesh.position.y < 0.2) {
            chunk.mesh.position.y = 0.2;
            chunk.velocity.y *= -0.3;
            chunk.velocity.x *= 0.6;
            chunk.velocity.z *= 0.6;
          }
        }
      }

      // Animate Aircraft flyovers
      for (let i = aircraftsRef.current.length - 1; i >= 0; i--) {
        const craft = aircraftsRef.current[i];
        craft.progress += delta * craft.speed;

        if (craft.progress >= 1) {
          scene.remove(craft.group);
          aircraftsRef.current.splice(i, 1);
          if (craft.onComplete) craft.onComplete();
        } else {
          craft.group.position.lerpVectors(craft.startPos, craft.endPos, craft.progress);
        }
      }

      // Animate Recon Intel Packages (pulsing radar ping)
      intelBeamsRef.current.forEach((intelGroup) => {
        const ping = intelGroup.getObjectByName('radarPing') as THREE.Mesh | undefined;
        if (ping && ping.material) {
          const s = 1 + ((currentTime * 0.002) % 1) * 1.5;
          ping.scale.set(s, s, 1);
          (ping.material as THREE.Material).opacity = Math.max(0, 1 - ((currentTime * 0.002) % 1));
        }
      });

      // Animate walking pedestrians on sidewalks
      targets.forEach((target) => {
        if (target.isPedestrian && !target.isDestroyed) {
          const meshGroup = targetMeshesRef.current.get(target.id);
          if (meshGroup) {
            target.x += Math.cos(target.walkDir || 0) * (target.walkSpeed || 1) * delta;
            target.z += Math.sin(target.walkDir || 0) * (target.walkSpeed || 1) * delta;

            if (Math.abs(target.x) > 55 || Math.abs(target.z) > 55) {
              target.walkDir = (target.walkDir || 0) + Math.PI;
            }

            meshGroup.position.set(target.x, 0, target.z);
            meshGroup.rotation.y = -(target.walkDir || 0) + Math.PI / 2;

            const legs = meshGroup.getObjectByName('legs');
            if (legs) {
              legs.rotation.x = Math.sin(currentTime * 0.01) * 0.35;
            }
          }
        }
      });

      // Billboard building health bars towards active camera
      targetMeshesRef.current.forEach((meshGroup) => {
        const hpBar = meshGroup.getObjectByName('healthBarGroup');
        if (hpBar && hpBar.visible) {
          hpBar.quaternion.copy(camera.quaternion);
        }
      });

      // ==========================================
      // NEXT-LEVEL FEATURE 1: FLARES DECOY SYSTEM
      // ==========================================
      if (flaresActive && Math.random() < 0.22) {
        const flareGeo = new THREE.SphereGeometry(0.35, 8, 8);
        const flareMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const flareMesh = new THREE.Mesh(flareGeo, flareMat);
        
        // Launch from back of vehicle
        flareMesh.position.set(
          vehicleStateRef.current.x - Math.sin(vehicleStateRef.current.rotationY) * 2.5,
          vehicleStateRef.current.altitude + 1,
          vehicleStateRef.current.z - Math.cos(vehicleStateRef.current.rotationY) * 2.5
        );
        scene.add(flareMesh);

        const angle = vehicleStateRef.current.rotationY + Math.PI + (Math.random() - 0.5) * 0.5;
        const flareSpeed = 12 + Math.random() * 8;
        flaresListRef.current.push({
          mesh: flareMesh,
          velocity: new THREE.Vector3(Math.sin(angle) * flareSpeed, 4 + Math.random() * 6, Math.cos(angle) * flareSpeed),
          age: 0,
          maxAge: 2.2 + Math.random() * 0.8
        });
      }

      // Animate Magnesium Decoy Flares
      for (let i = flaresListRef.current.length - 1; i >= 0; i--) {
        const flare = flaresListRef.current[i];
        flare.age += delta;
        if (flare.age >= flare.maxAge) {
          scene.remove(flare.mesh);
          flaresListRef.current.splice(i, 1);
        } else {
          flare.velocity.y -= 9.8 * delta;
          flare.mesh.position.addScaledVector(flare.velocity, delta);
          
          if (flare.mesh.position.y < 0.25) {
            flare.mesh.position.y = 0.25;
            flare.velocity.y *= -0.4;
            flare.velocity.x *= 0.8;
            flare.velocity.z *= 0.8;
          }
        }
      }

      // ===============================================
      // NEXT-LEVEL FEATURE 2: HOSTILE SAM THREAT SYSTEM
      // ===============================================
      const isPlayerAirborne = vehicleStateRef.current.altitude > 6.0;
      samLaunchersRef.current.forEach((launcher) => {
        if (launcher.isDestroyed) return;

        const headGroup = launcher.mesh.getObjectByName('headGroup');
        const dx = vehicleStateRef.current.x - launcher.x;
        const dz = vehicleStateRef.current.z - launcher.z;
        const dist = Math.hypot(dx, dz);

        if (headGroup) {
          const targetRotY = Math.atan2(dx, dz);
          headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, targetRotY, delta * 3.5);
        }

        // Fire tracking SAM missile if airborne and within 55 units (5 second cooldown)
        if (isPlayerAirborne && dist < 55 && currentTime - launcher.lastFireTime > 5000) {
          launcher.lastFireTime = currentTime;
          onAddCombatLog("🚨 WARNING: Hostile Surface-to-Air Missile (SAM) locked onto aircraft!");
          soundEngine.playRadioClick();

          const mGroup = new THREE.Group();
          mGroup.position.set(launcher.x, 2.2, launcher.z);

          const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
          const mBody = new THREE.Mesh(bodyGeo, bodyMat);
          mBody.rotation.x = Math.PI / 2;
          mGroup.add(mBody);

          const fireGeo = new THREE.SphereGeometry(0.24, 6, 6);
          const fireMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
          const mFire = new THREE.Mesh(fireGeo, fireMat);
          mFire.position.z = -1.0;
          mGroup.add(mFire);

          scene.add(mGroup);

          samMissilesRef.current.push({
            mesh: mGroup,
            velocity: new THREE.Vector3(0, 5, 0),
            age: 0,
            maxAge: 7.5,
            targetPos: new THREE.Vector3(vehicleStateRef.current.x, vehicleStateRef.current.altitude, vehicleStateRef.current.z),
            isTrackingDecoy: false
          });
        }
      });

      // Animate and steer tracking SAM Missiles
      for (let i = samMissilesRef.current.length - 1; i >= 0; i--) {
        const missile = samMissilesRef.current[i];
        missile.age += delta;

        if (missile.age >= missile.maxAge) {
          scene.remove(missile.mesh);
          samMissilesRef.current.splice(i, 1);
        } else {
          // Guided Guidance: seek closest magnesium decoy flare first
          let activeTarget = new THREE.Vector3(vehicleStateRef.current.x, vehicleStateRef.current.altitude, vehicleStateRef.current.z);
          let closestDecoy: any = null;
          let minDecoyDist = 32.0;

          flaresListRef.current.forEach((flare) => {
            const d = missile.mesh.position.distanceTo(flare.mesh.position);
            if (d < minDecoyDist) {
              minDecoyDist = d;
              closestDecoy = flare;
            }
          });

          if (closestDecoy) {
            activeTarget.copy(closestDecoy.mesh.position);
            if (!missile.isTrackingDecoy) {
              missile.isTrackingDecoy = true;
              onAddCombatLog("✨ DECOY ACTIVE: SAM guidance radar locked onto flare decoy!");
            }
          }

          const dir = new THREE.Vector3().subVectors(activeTarget, missile.mesh.position).normalize();
          const missileSpeed = 25.0;
          missile.velocity.lerp(dir.multiplyScalar(missileSpeed), delta * 4.5);
          missile.mesh.position.addScaledVector(missile.velocity, delta);

          missile.mesh.lookAt(missile.mesh.position.clone().add(missile.velocity));

          const playerPos = new THREE.Vector3(vehicleStateRef.current.x, vehicleStateRef.current.altitude, vehicleStateRef.current.z);
          const distToPlayer = missile.mesh.position.distanceTo(playerPos);

          if (distToPlayer < 2.8 && !isPlayerAirborne) {
            // Safe on ground
          } else if (distToPlayer < 2.8) {
            scene.remove(missile.mesh);
            samMissilesRef.current.splice(i, 1);
            trigger3DExplosion(missile.mesh.position.x, missile.mesh.position.z, 5.0, false);
            onAddCombatLog("💥 DIRECT SAM IMPACT: Structural fuselage armor compromised!");
            soundEngine.playExplosion(2.5);
          } else if (closestDecoy && missile.mesh.position.distanceTo(closestDecoy.mesh.position) < 1.8) {
            scene.remove(missile.mesh);
            samMissilesRef.current.splice(i, 1);
            trigger3DExplosion(missile.mesh.position.x, missile.mesh.position.z, 2.5, false);
            onAddCombatLog("💥 SAM DECOY INTERCEPT: SAM Missile exploded on magnesium flare!");
            soundEngine.playExplosion(1.2);
          }
        }
      }

      // ==============================================
      // NEXT-LEVEL FEATURE 3: ACTIVE LAND CONVOYS
      // ==============================================
      hostilePatrolsRef.current.forEach((patrol) => {
        const dx = vehicleStateRef.current.x - patrol.x;
        const dz = vehicleStateRef.current.z - patrol.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 8.0) {
          patrol.rotY = Math.atan2(dx, dz);
          patrol.x += Math.sin(patrol.rotY) * patrol.speed * delta;
          patrol.z += Math.cos(patrol.rotY) * patrol.speed * delta;
          patrol.mesh.position.set(patrol.x, 0, patrol.z);
          patrol.mesh.rotation.y = patrol.rotY;
        }

        // Fire red ballistic tracers if within range (28 units)
        if (dist < 28 && currentTime - patrol.lastFireTime > 1800) {
          patrol.lastFireTime = currentTime;

          const pPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, dist)];
          const tracerGeo = new THREE.BufferGeometry().setFromPoints(pPoints);
          const tracerMat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
          const tracer = new THREE.Line(tracerGeo, tracerMat);

          tracer.position.set(patrol.x, 1.8, patrol.z);
          tracer.lookAt(vehicleStateRef.current.x, vehicleStateRef.current.altitude + 0.5, vehicleStateRef.current.z);
          scene.add(tracer);

          tracersListRef.current.push({
            mesh: tracer,
            velocity: new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(45),
            age: 0,
            maxAge: 0.6,
            isPlayerShot: false
          });

          onAddCombatLog("🔫 CONTACT: Hostile land convoys engaged! Bullet tracers detected!");
          soundEngine.playRadioClick();
        }
      });

      // ====================================================
      // NEXT-LEVEL FEATURE 4: .50 CAL MANUAL TURRET DEFENSE
      // ====================================================
      let closestPatrol: any = null;
      let minPatrolDist = 36.0;

      hostilePatrolsRef.current.forEach((p) => {
        const d = Math.hypot(vehicleStateRef.current.x - p.x, vehicleStateRef.current.z - p.z);
        if (d < minPatrolDist) {
          minPatrolDist = d;
          closestPatrol = p;
        }
      });

      if (closestPatrol && vehicleGroupRef.current) {
        const playerTurret = vehicleGroupRef.current.getObjectByName('turretGroup');
        if (playerTurret) {
          const pdx = closestPatrol.x - vehicleStateRef.current.x;
          const pdz = closestPatrol.z - vehicleStateRef.current.z;
          playerTurret.rotation.y = Math.atan2(pdx, pdz) - vehicleStateRef.current.rotationY;
        }

        const isShooting = keysRef.current.forward || keysRef.current.left || keysRef.current.right || (joystickVectorRef.current && Math.hypot(joystickVectorRef.current.x, joystickVectorRef.current.y) > 0.1);
        if (isShooting && Math.random() < 0.08) {
          const pPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, minPatrolDist)];
          const tracerGeo = new THREE.BufferGeometry().setFromPoints(pPoints);
          const tracerMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3 });
          const tracer = new THREE.Line(tracerGeo, tracerMat);

          tracer.position.set(vehicleStateRef.current.x, vehicleStateRef.current.altitude + 1.6, vehicleStateRef.current.z);
          tracer.lookAt(closestPatrol.x, 0.8, closestPatrol.z);
          scene.add(tracer);

          tracersListRef.current.push({
            mesh: tracer,
            velocity: new THREE.Vector3(closestPatrol.x - vehicleStateRef.current.x, 0, closestPatrol.z - vehicleStateRef.current.z).normalize().multiplyScalar(65),
            age: 0,
            maxAge: 0.5,
            isPlayerShot: true
          });

          closestPatrol.hp -= 45;
          if (closestPatrol.hp <= 0) {
            scene.remove(closestPatrol.mesh);
            const index = hostilePatrolsRef.current.indexOf(closestPatrol);
            if (index > -1) hostilePatrolsRef.current.splice(index, 1);
            trigger3DExplosion(closestPatrol.x, closestPatrol.z, 3.5, false);
            onAddCombatLog("💥 TARGET ELIMINATED: Hostile patrol convoy destroyed! (+$45,000 War Chest)");
            soundEngine.playExplosion(1.8);
          }
        }
      }

      // Animate and move bullet tracers
      for (let i = tracersListRef.current.length - 1; i >= 0; i--) {
        const tracer = tracersListRef.current[i];
        tracer.age += delta;

        if (tracer.age >= tracer.maxAge) {
          scene.remove(tracer.mesh);
          tracersListRef.current.splice(i, 1);
        } else {
          tracer.mesh.position.addScaledVector(tracer.velocity, delta);
        }
      }

      // ====================================================
      // NEXT-LEVEL FEATURE 5: JOINT-OPS REAL-TIME PRESENCE
      // ====================================================
      coopSessions.forEach((player) => {
        let playerMesh = coopMeshesRef.current.get(player.userId);
        if (!playerMesh) {
          const group = new THREE.Group();
          
          const boxGeo = new THREE.BoxGeometry(2.2, 1.1, 4.3);
          const holoMat = new THREE.MeshBasicMaterial({
            color: 0x00d2ff,
            wireframe: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
          });
          const mesh = new THREE.Mesh(boxGeo, holoMat);
          group.add(mesh);

          const labelCanvas = document.createElement('canvas');
          labelCanvas.width = 256;
          labelCanvas.height = 64;
          const ctx = labelCanvas.getContext('2d')!;
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Cdr: ${player.commanderName}`, 128, 32);
          
          const labelTex = new THREE.CanvasTexture(labelCanvas);
          const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
          const labelSprite = new THREE.Sprite(labelMat);
          labelSprite.position.y = 3.2;
          labelSprite.scale.set(7, 1.85, 1);
          group.add(labelSprite);

          scene.add(group);
          playerMesh = { group, label: labelSprite };
          coopMeshesRef.current.set(player.userId, playerMesh);
        }

        playerMesh.group.position.lerp(new THREE.Vector3(player.x, player.altitude, player.z), delta * 8);
        playerMesh.group.rotation.y = player.rotationY;
      });

      coopMeshesRef.current.forEach((meshObj, userId) => {
        if (!coopSessions.some((p) => p.userId === userId)) {
          scene.remove(meshObj.group);
          coopMeshesRef.current.delete(userId);
        }
      });

      // ===============================================
      // TACTICAL SANDBOX: OUTPOST CAPTURE CHECKS
      // ===============================================
      outpostsRef.current.forEach((outpost) => {
        const dist = Math.hypot(vehicleStateRef.current.x - outpost.x, vehicleStateRef.current.z - outpost.z);
        const flag = outpost.mesh.getObjectByName('flag') as THREE.Mesh;
        const flagMat = flag ? (flag.material as THREE.MeshStandardMaterial) : null;
        const ringMat = outpost.ring.material as THREE.MeshBasicMaterial;

        if (dist < 5.0) {
          if (outpost.state !== 'captured') {
            outpost.state = 'capturing';
            outpost.progress = Math.min(100.0, outpost.progress + delta * 24.0);

            if (flagMat) {
              flagMat.color.setHex(0xfacc15); // Yellow while capturing
            }
            if (ringMat) {
              ringMat.color.setHex(0xfacc15);
            }

            if (outpost.progress >= 100.0) {
              outpost.state = 'captured';
              onAddCombatLog("🚩 SECURED: Outpost captured! Passive dividend online, radar intelligence uplink established!");
              soundEngine.playLootChime('rare');

              if (flagMat) {
                flagMat.color.setHex(0x22c55e); // Green flag when secured
              }
              if (ringMat) {
                ringMat.color.setHex(0x22c55e); // Green ring
              }
            }
          }
        } else {
          if (outpost.state === 'capturing') {
            outpost.progress = Math.max(0.0, outpost.progress - delta * 15.0);
            if (outpost.progress === 0.0) {
              outpost.state = 'neutral';
              if (flagMat) {
                flagMat.color.setHex(0xf97316); // back to greyish-orange
              }
              if (ringMat) {
                ringMat.color.setHex(0xf97316);
              }
            }
          }
        }
      });

      // Award continuous passive dividend from captured outposts every 5 seconds
      if (Math.random() < 0.003) {
        const capturedCount = outpostsRef.current.filter((o) => o.state === 'captured').length;
        if (capturedCount > 0) {
          onAddCombatLog(`💰 OUTPOST DIVIDEND RECEIVED: +$${(capturedCount * 2500).toLocaleString()} War Chest fund matching!`);
          soundEngine.playCashEarned();
        }
      }

      // ===============================================
      // TACTICAL WEATHER PARTICLE PHYSICS
      // ===============================================
      if (weatherParticlesRef.current && weatherParticlesGeomRef.current) {
        const posAttr = weatherParticlesGeomRef.current.getAttribute('position') as THREE.BufferAttribute;
        const velAttr = weatherParticlesGeomRef.current.getAttribute('velocity') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const vArr = velAttr.array as Float32Array;
        const wpMat = weatherParticlesRef.current.material as THREE.PointsMaterial;

        // Clear view mode
        if (weather === 'clear') {
          wpMat.opacity = 0;
        } else {
          wpMat.opacity = 0.65;

          // Adjust velocity and styling according to specific weather types
          for (let i = 0; i < pCount; i++) {
            if (weather === 'thunderstorm') {
              wpMat.color.setHex(0x38bdf8);
              vArr[i * 3] = (Math.random() - 0.5) * 1.5;
              vArr[i * 3 + 1] = -32 - Math.random() * 15;
            } else if (weather === 'night_assault') {
              wpMat.color.setHex(0xffffff);
              vArr[i * 3] = Math.sin(currentTime * 0.001 + i) * 1.2;
              vArr[i * 3 + 1] = -4 - Math.random() * 3;
            } else if (weather === 'sandstorm') {
              // Sandstorm blowing horizontally from left to right
              wpMat.color.setHex(0xf59e0b);
              vArr[i * 3] = 35 + Math.random() * 15;
              vArr[i * 3 + 1] = -3 - Math.random() * 5;
            }

            arr[i * 3] += vArr[i * 3] * delta;
            arr[i * 3 + 1] += vArr[i * 3 + 1] * delta;
            arr[i * 3 + 2] += vArr[i * 3 + 2] * delta;

            // Reset boundary wrap
            if (arr[i * 3 + 1] < 0.1 || arr[i * 3] > 80 || arr[i * 3] < -80) {
              arr[i * 3] = weather === 'sandstorm' ? -80 : (Math.random() - 0.5) * 160;
              arr[i * 3 + 1] = Math.random() * 45 + 5;
              arr[i * 3 + 2] = (Math.random() - 0.5) * 160;
            }
          }
          posAttr.needsUpdate = true;
        }

        // Apply dynamic sandstorm fog density
        if (weather === 'sandstorm' && scene.fog && scene.fog instanceof THREE.FogExp2) {
          scene.fog.density = 0.026;
          scene.fog.color.setHex(0x78350f); // Amber sandstorm fog
        } else if (scene.fog && scene.fog instanceof THREE.FogExp2) {
          scene.fog.density = 0.012;
          scene.fog.color.setHex(0x0f172a);
        }
      }

      // ===============================================
      // TACTICAL FIRE POOLS BURNING CHECKS
      // ===============================================
      for (let i = firePoolsRef.current.length - 1; i >= 0; i--) {
        const fp = firePoolsRef.current[i];
        fp.age += delta;

        // Damage hostile patrols within fire pools
        hostilePatrolsRef.current.forEach((patrol) => {
          const d = Math.hypot(patrol.x - fp.x, patrol.z - fp.z);
          if (d < fp.radius + 1.2) {
            patrol.hp -= delta * 120.0; // Rapid burning damage
            if (patrol.hp <= 0) {
              scene.remove(patrol.mesh);
              const index = hostilePatrolsRef.current.indexOf(patrol);
              if (index > -1) hostilePatrolsRef.current.splice(index, 1);
              trigger3DExplosion(patrol.x, patrol.z, 3.0, false);
              onAddCombatLog("💥 BURN INFLICTED: Hostile patrol convoy incinerated in firestorm pool!");
              soundEngine.playExplosion(1.5);
            }
          }
        });

        // Damage SAM Launchers inside fire pools
        samLaunchersRef.current.forEach((launcher) => {
          if (launcher.isDestroyed) return;
          const d = Math.hypot(launcher.x - fp.x, launcher.z - fp.z);
          if (d < fp.radius + 1.5) {
            launcher.hp -= delta * 90.0;
            if (launcher.hp <= 0) {
              launcher.isDestroyed = true;
              launcher.mesh.visible = false;
              onAddCombatLog("💥 SEAD RESIDUAL DIRECT: SAM launcher melted in active residual fire pool!");
              soundEngine.playExplosion(2.2);
            }
          }
        });

        if (fp.age >= fp.maxAge) {
          scene.remove(fp.mesh);
          firePoolsRef.current.splice(i, 1);
        }
      }

      // ===============================================
      // NEXT-LEVEL FEATURE 3: DYNAMIC DAY/NIGHT CYCLE
      // ===============================================
      // Smoothly advance time of day: 1 hour takes 15 seconds real-time
      timeOfDayRef.current = (timeOfDayRef.current + delta * 0.08) % 24.0;
      const hour = timeOfDayRef.current;

      if (hemiLightRef.current && sunLightRef.current) {
        // Night-time (19h to 5h)
        if (hour >= 19.0 || hour < 5.0) {
          hemiLightRef.current.color.setHex(0x0f172a);
          hemiLightRef.current.groundColor.setHex(0x020617);
          hemiLightRef.current.intensity = 0.12;

          sunLightRef.current.color.setHex(0x1e1b4b);
          sunLightRef.current.intensity = 0.15;
        } 
        // Golden Dawn (5h to 7h)
        else if (hour >= 5.0 && hour < 7.0) {
          const ratio = (hour - 5.0) / 2.0;
          hemiLightRef.current.color.lerpColors(new THREE.Color(0x0f172a), new THREE.Color(0xfdba74), ratio);
          hemiLightRef.current.intensity = THREE.MathUtils.lerp(0.12, 0.65, ratio);

          sunLightRef.current.color.lerpColors(new THREE.Color(0x1e1b4b), new THREE.Color(0xfacc15), ratio);
          sunLightRef.current.intensity = THREE.MathUtils.lerp(0.15, 1.2, ratio);
        }
        // Bright Day (7h to 17h)
        else if (hour >= 7.0 && hour < 17.0) {
          hemiLightRef.current.color.copy(new THREE.Color(theater.skyColor || 0x38bdf8));
          hemiLightRef.current.groundColor.copy(new THREE.Color(theater.groundColor || 0x1e293b));
          hemiLightRef.current.intensity = 0.65;

          sunLightRef.current.color.setHex(0xfffaed);
          sunLightRef.current.intensity = 1.5;
        }
        // Golden Dusk / Sunset (17h to 19h)
        else {
          const ratio = (hour - 17.0) / 2.0;
          hemiLightRef.current.color.lerpColors(new THREE.Color(theater.skyColor || 0x38bdf8), new THREE.Color(0xf97316), ratio);
          hemiLightRef.current.intensity = THREE.MathUtils.lerp(0.65, 0.12, ratio);

          sunLightRef.current.color.lerpColors(new THREE.Color(0xfffaed), new THREE.Color(0x7f1d1d), ratio);
          sunLightRef.current.intensity = THREE.MathUtils.lerp(1.5, 0.15, ratio);
        }

        // Apply high-contrast Vision Overrides
        if (visionMode === 'nvg') {
          hemiLightRef.current.color.setHex(0x22c55e);
          hemiLightRef.current.intensity = 1.6;
          sunLightRef.current.color.setHex(0x4ade80);
          sunLightRef.current.intensity = 1.8;
        } else if (visionMode === 'flir_thermal') {
          hemiLightRef.current.color.setHex(0x38bdf8);
          hemiLightRef.current.intensity = 1.5;
          sunLightRef.current.color.setHex(0xffffff);
          sunLightRef.current.intensity = 2.0;
        }
      }

      heatHazeMat.uniforms.time.value += 0.01;
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('wheel', handleWheelZoom);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
    };
  }, [theater]);

  // Rebuild 3D Vehicle when active vehicle, upgrades, or jeep model loads change
  useEffect(() => {
    if (!sceneRef.current) return;
    if (vehicleGroupRef.current) {
      sceneRef.current.remove(vehicleGroupRef.current);
    }

    const newVeh = buildActivePlayerVehicle(vehicleUpgrades);
    newVeh.position.set(vehicleStateRef.current.x, vehicleStateRef.current.altitude, vehicleStateRef.current.z);
    sceneRef.current.add(newVeh);
    vehicleGroupRef.current = newVeh;
  }, [vehicleUpgrades, isJeepLoaded]);

  // BUILD PLAYER VEHICLE BASED ON TYPE & MODIFICATIONS
  const buildActivePlayerVehicle = (upgrades: VehicleUpgradeState): THREE.Group => {
    const vType = upgrades.activeVehicleId;
    vehicleWheelsRef.current = [];
    vehicleRotorRef.current = null;

    if (vType === 'tank') {
      // 1. M1A2 ABRAMS MAIN BATTLE TANK
      const tank = new THREE.Group();
      const tanMat = new THREE.MeshStandardMaterial({ color: 0xc2a67e, roughness: 0.65, metalness: 0.35 }); // Desert Tan
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.7 });

      // Heavy Tank Chassis
      const hull = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 5.8), tanMat);
      hull.position.y = 0.8;
      hull.castShadow = true;
      hull.receiveShadow = true;
      tank.add(hull);

      // Side Skirt Armor
      [-1.9, 1.9].forEach((sx) => {
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 5.6), darkMat);
        skirt.position.set(sx, 0.7, 0);
        skirt.castShadow = true;
        tank.add(skirt);
      });

      // Rotating Turret
      const turretGroup = new THREE.Group();
      turretGroup.position.set(0, 1.55, -0.4);

      const turretMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 3.2), tanMat);
      turretMesh.castShadow = true;
      turretGroup.add(turretMesh);

      // 120mm Smoothbore Cannon Barrel
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.2, 12), darkMat);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(0, 0.15, 2.8);
      cannon.castShadow = true;
      turretGroup.add(cannon);

      // Muzzle Brake
      const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 12), darkMat);
      brake.rotation.x = Math.PI / 2;
      brake.position.set(0, 0.15, 4.9);
      turretGroup.add(brake);

      // Commander Hatch & Machine Gun
      const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12), darkMat);
      hatch.position.set(0.6, 0.45, -0.4);
      turretGroup.add(hatch);

      tank.add(turretGroup);

      // Heavy Caterpillar Tread Road Wheels (5 per side)
      [-1.8, 1.8].forEach((wx) => {
        for (let i = -2; i <= 2; i++) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16), darkMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(wx, 0.4, i * 1.1);
          tank.add(w);
          vehicleWheelsRef.current.push(w);
        }
      });

      vehicleStateRef.current.maxSpeed = 16 + upgrades.engineLevel * 2;
      vehicleStateRef.current.ramPower = 28 + upgrades.ramPlowLevel * 8;
      vehicleStateRef.current.turnSpeed = 2.0;
      vehicleStateRef.current.altitude = 0;
      return tank;

    } else if (vType === 'humvee') {
      // 2. HUMVEE M1151 ARMORED TECHNICAL
      const humvee = new THREE.Group();
      const tanMat = new THREE.MeshStandardMaterial({ color: 0x8b7d6b, roughness: 0.6, metalness: 0.3 }); // Camo Tan
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.5 });
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.85 });

      // Chassis & Body
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 4.8), darkMat);
      chassis.position.y = 0.7;
      chassis.castShadow = true;
      humvee.add(chassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.9, 3.2), tanMat);
      cabin.position.set(0, 1.35, -0.4);
      cabin.castShadow = true;
      humvee.add(cabin);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 1.8), tanMat);
      hood.position.set(0, 1.15, 1.5);
      hood.castShadow = true;
      humvee.add(hood);

      // Heavy Front Bull-Bar or Plow
      const bullBar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 0.25), steelMat);
      bullBar.position.set(0, 0.85, 2.5);
      bullBar.castShadow = true;
      humvee.add(bullBar);

      // Roof Gunner Shield & M2 HMG
      const gunRing = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12), darkMat);
      gunRing.position.set(0, 1.95, -0.2);
      humvee.add(gunRing);

      const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), darkMat);
      gunBarrel.rotation.x = Math.PI / 2;
      gunBarrel.position.set(0, 2.15, 0.6);
      humvee.add(gunBarrel);

      // 4 Heavy Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
      [
        { x: -1.3, z: 1.5 },
        { x: 1.3, z: 1.5 },
        { x: -1.3, z: -1.4 },
        { x: 1.3, z: -1.4 }
      ].forEach((pos) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.42, 16), wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(pos.x, 0.58, pos.z);
        w.castShadow = true;
        humvee.add(w);
        vehicleWheelsRef.current.push(w);
      });

      vehicleStateRef.current.maxSpeed = 24 + upgrades.engineLevel * 4;
      vehicleStateRef.current.ramPower = 14 + upgrades.ramPlowLevel * 4.5;
      vehicleStateRef.current.turnSpeed = 3.0;
      vehicleStateRef.current.altitude = 0;
      return humvee;

    } else if (vType === 'stryker') {
      // 3. STRYKER 8x8 MOBILE GUN SYSTEM
      const stryker = new THREE.Group();
      const greenMat = new THREE.MeshStandardMaterial({ color: 0x3b4d32, roughness: 0.6, metalness: 0.4 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.6 });

      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 6.2), greenMat);
      hull.position.y = 1.0;
      hull.castShadow = true;
      stryker.add(hull);

      const turret = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), darkMat);
      turret.position.set(0, 1.85, -0.6);
      stryker.add(turret);

      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.6, 12), darkMat);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(0, 1.85, 2.0);
      stryker.add(cannon);

      // 8 All-Terrain Wheels (4 per side)
      const wMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 });
      [-1.5, 1.5].forEach((wx) => {
        [-2.1, -0.7, 0.7, 2.1].forEach((wz) => {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), wMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(wx, 0.55, wz);
          stryker.add(w);
          vehicleWheelsRef.current.push(w);
        });
      });

      vehicleStateRef.current.maxSpeed = 26 + upgrades.engineLevel * 4;
      vehicleStateRef.current.ramPower = 20 + upgrades.ramPlowLevel * 6;
      vehicleStateRef.current.turnSpeed = 2.4;
      vehicleStateRef.current.altitude = 0;
      return stryker;

    } else if (vType === 'helicopter') {
      // 4. AH-64 APACHE ATTACK HELICOPTER
      const chopper = new THREE.Group();
      const gunshipMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.6 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.75 });

      // Fuselage
      const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 5.4), gunshipMat);
      fuselage.position.y = 1.6;
      fuselage.castShadow = true;
      chopper.add(fuselage);

      // Cockpit Canopy
      const cockpit = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 6), glassMat);
      cockpit.rotation.x = Math.PI / 2;
      cockpit.position.set(0, 1.8, 2.6);
      chopper.add(cockpit);

      // Tail Boom & Fin
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 4.8, 8), gunshipMat);
      tail.rotation.x = Math.PI / 2;
      tail.position.set(0, 2.0, -3.8);
      chopper.add(tail);

      // Main Rotor Blades (Top)
      const rotorGroup = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.06, 0.5), gunshipMat);
      rotorGroup.position.set(0, 2.7, 0.2);
      chopper.add(rotorGroup);
      vehicleRotorRef.current = rotorGroup;

      // Stub Wings with Hellfire Missiles
      [-1.6, 1.6].forEach((wx) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.8), gunshipMat);
        wing.position.set(wx, 1.5, 0.4);
        chopper.add(wing);

        // Rocket Pod
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8), gunshipMat);
        pod.rotation.x = Math.PI / 2;
        pod.position.set(wx, 1.25, 0.4);
        chopper.add(pod);
      });

      // Landing Skids
      [-0.8, 0.8].forEach((sx) => {
        const skid = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.2), gunshipMat);
        skid.position.set(sx, 0.3, 0.2);
        chopper.add(skid);
      });

      vehicleStateRef.current.maxSpeed = 30 + upgrades.engineLevel * 4;
      vehicleStateRef.current.ramPower = 15 + upgrades.ramPlowLevel * 4;
      vehicleStateRef.current.turnSpeed = 2.8;
      vehicleStateRef.current.altitude = 3.5;
      return chopper;

    } else if (vType === 'a10_jet') {
      // 5. A-10 WARTHOG CLOSE AIR SUPPORT JET
      const jet = new THREE.Group();
      const grayMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.55 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

      const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 6.4), grayMat);
      fuselage.position.y = 1.4;
      fuselage.castShadow = true;
      jet.add(fuselage);

      const gatling = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.2, 10), darkMat);
      gatling.rotation.x = Math.PI / 2;
      gatling.position.set(0, 1.1, 3.4);
      jet.add(gatling);

      const wings = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 2.2), grayMat);
      wings.position.set(0, 1.4, 0.2);
      wings.castShadow = true;
      jet.add(wings);

      [-1.2, 1.2].forEach((ex) => {
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 12), darkMat);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(ex, 2.1, -1.8);
        engine.castShadow = true;
        jet.add(engine);
      });

      vehicleStateRef.current.maxSpeed = 40 + upgrades.engineLevel * 6;
      vehicleStateRef.current.ramPower = 35;
      vehicleStateRef.current.turnSpeed = 2.4;
      vehicleStateRef.current.altitude = 4.0;
      return jet;

    } else if (vType === 'b2_bomber') {
      // 6. B-2 SPIRIT STEALTH STRATEGIC BOMBER
      const b2 = new THREE.Group();
      const stealthMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.7 });

      // Flying Wing Delta Silhouette
      const wingGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0.3, 4.0,   // Nose tip
        -7.0, 0.1, -3.5, // Left wingtip
        0, 0.2, -1.5,   // Center trailing edge
        0, 0.3, 4.0,   // Nose tip
        0, 0.2, -1.5,   // Center trailing edge
        7.0, 0.1, -3.5   // Right wingtip
      ]);
      wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      wingGeo.computeVertexNormals();

      const wing = new THREE.Mesh(wingGeo, stealthMat);
      wing.position.y = 1.6;
      wing.castShadow = true;
      b2.add(wing);

      // Cockpit Ridge
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 2.2), stealthMat);
      canopy.position.set(0, 1.85, 1.2);
      b2.add(canopy);

      vehicleStateRef.current.maxSpeed = 44 + upgrades.engineLevel * 6;
      vehicleStateRef.current.ramPower = 45;
      vehicleStateRef.current.turnSpeed = 2.0;
      vehicleStateRef.current.altitude = 5.0;
      return b2;

    } else if (vType === 'ac130') {
      // 7. AC-130 GHOSTRIDER GUNSHIP
      const gunship = new THREE.Group();
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.5 });
      const cannonMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });

      // Huge Cargo Fuselage
      const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 8.4, 12), darkMat);
      fuselage.rotation.x = Math.PI / 2;
      fuselage.position.y = 2.2;
      gunship.add(fuselage);

      // High Wings
      const wings = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.2, 2.2), darkMat);
      wings.position.set(0, 3.2, 0.2);
      gunship.add(wings);

      // 4 Turboprop Engine Pods
      [-4.5, -2.2, 2.2, 4.5].forEach((px) => {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.8, 10), darkMat);
        pod.rotation.x = Math.PI / 2;
        pod.position.set(px, 3.0, 0.4);
        gunship.add(pod);
      });

      // 105mm Howitzer Port (Side Mounted)
      const howitzer = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8), cannonMat);
      howitzer.rotation.z = Math.PI / 2;
      howitzer.position.set(-1.8, 1.8, -1.2);
      gunship.add(howitzer);

      vehicleStateRef.current.maxSpeed = 35 + upgrades.engineLevel * 5;
      vehicleStateRef.current.ramPower = 40;
      vehicleStateRef.current.turnSpeed = 2.2;
      vehicleStateRef.current.altitude = 4.8;
      return gunship;

    } else if (vType === 'sr72_orbital') {
      // 8. SR-72 DARKSTAR HYPERSONIC STRIKER
      const darkstar = new THREE.Group();
      const matteBlack = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2, metalness: 0.85 });
      const plasmaGlow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      // Sharp Scramjet Fuselage
      const fuselage = new THREE.Mesh(new THREE.ConeGeometry(1.6, 9.2, 4), matteBlack);
      fuselage.rotation.x = Math.PI / 2;
      fuselage.position.set(0, 1.5, 0.5);
      darkstar.add(fuselage);

      // Delta Wings with Down-Turned Wingtips
      const wings = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.1, 3.5), matteBlack);
      wings.position.set(0, 1.4, -1.2);
      darkstar.add(wings);

      // Twin Scramjet Plasma Burner Exhausts
      [-1.1, 1.1].forEach((ex) => {
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.6, 12), plasmaGlow);
        exhaust.rotation.x = Math.PI / 2;
        exhaust.position.set(ex, 1.5, -4.6);
        darkstar.add(exhaust);
      });

      vehicleStateRef.current.maxSpeed = 55 + upgrades.engineLevel * 8;
      vehicleStateRef.current.ramPower = 60;
      vehicleStateRef.current.turnSpeed = 2.6;
      vehicleStateRef.current.altitude = 5.5;
      return darkstar;

    } else {
      // 9. MILITARY GRADE 4x4 JEEP (DEFAULT SCOUT VEHICLE)
      if (loadedJeepModelRef.current) {
        const customJeep = loadedJeepModelRef.current.clone();

        // Populate wheels for physics updates if matching meshes are found
        customJeep.traverse((node) => {
          if ((node as THREE.Mesh).isMesh && node.name.toLowerCase().includes('wheel')) {
            vehicleWheelsRef.current.push(node as THREE.Mesh);
          }
        });

        // Add plow and turret mods dynamically to custom model
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.5 });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.85 });

        if (upgrades.ramPlowLevel > 0) {
          const plowGroup = new THREE.Group();
          plowGroup.position.set(0, 0.5, 2.1);
          const plowBlade = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.1, 3), steelMat);
          plowBlade.rotation.x = Math.PI / 2;
          plowBlade.rotation.y = Math.PI;
          plowBlade.castShadow = true;
          plowGroup.add(plowBlade);
          customJeep.add(plowGroup);
        }

        if (upgrades.turretGunLevel > 0) {
          const turretGroup = new THREE.Group();
          turretGroup.position.set(0, 1.9, -0.6);
          const turretStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), darkMat);
          turretStand.position.y = 0.25;
          turretGroup.add(turretStand);
          const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.85), darkMat);
          gunBody.position.set(0, 0.55, 0);
          turretGroup.add(gunBody);
          const barrelLen = 1.0 + upgrades.turretGunLevel * 0.25;
          const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, barrelLen, 8), darkMat);
          gunBarrel.rotation.x = Math.PI / 2;
          gunBarrel.position.set(0, 0.58, barrelLen / 2 + 0.3);
          turretGroup.add(gunBarrel);
          customJeep.add(turretGroup);
        }

        vehicleStateRef.current.maxSpeed = 22 + upgrades.engineLevel * 4;
        vehicleStateRef.current.ramPower = 7.5 + upgrades.ramPlowLevel * 3.5;
        vehicleStateRef.current.turnSpeed = 3.2;
        vehicleStateRef.current.altitude = 0;
        return customJeep;
      }

      const jeep = new THREE.Group();
      const camoMat = new THREE.MeshStandardMaterial({ color: 0x4d5d3e, roughness: 0.6, metalness: 0.3 }); // NATO Olive Drab
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.5 });
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.85 });

      // Lower Chassis & Body
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 4.3), darkMat);
      chassis.position.y = 0.65;
      chassis.castShadow = true;
      jeep.add(chassis);

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.7, 2.5), camoMat);
      body.position.set(0, 1.15, -0.6);
      body.castShadow = true;
      jeep.add(body);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.5, 1.8), camoMat);
      hood.position.set(0, 1.05, 1.2);
      hood.castShadow = true;
      jeep.add(hood);

      // Front Bumper / Optional Heavy Wedge Ram Plow
      if (upgrades.ramPlowLevel > 0) {
        // Heavy Bulldozer V-Wedge Plow Bumper
        const plowGroup = new THREE.Group();
        plowGroup.position.set(0, 0.7, 2.4);

        const plowBlade = new THREE.Mesh(
          new THREE.ConeGeometry(1.6, 1.1, 3), // Triangular wedge
          steelMat
        );
        plowBlade.rotation.x = Math.PI / 2;
        plowBlade.rotation.y = Math.PI;
        plowBlade.castShadow = true;
        plowGroup.add(plowBlade);

        // Steel crash reinforcement spikes
        [-0.9, 0, 0.9].forEach((px) => {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 6), steelMat);
          spike.rotation.x = Math.PI / 2;
          spike.position.set(px, 0.1, 0.4);
          plowGroup.add(spike);
        });

        jeep.add(plowGroup);
      } else {
        // Standard Bull-Bar
        const bullBar = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.25, 0.2), steelMat);
        bullBar.position.set(0, 0.8, 2.3);
        bullBar.castShadow = true;
        jeep.add(bullBar);
      }

      // Emissive LED Headlights with forward beams
      const headlightMat = new THREE.MeshStandardMaterial({
        color: 0xfff176,
        emissive: 0xfff176,
        emissiveIntensity: 3.8,
        roughness: 0.1
      });
      [-0.75, 0.75].forEach((hx) => {
        const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), headlightMat);
        headlight.rotation.x = Math.PI / 2;
        headlight.position.set(hx, 1.05, 2.12);
        jeep.add(headlight);
      });

      // Allied Star Decal Insignia on Hood
      const starGeo = new THREE.PlaneGeometry(0.8, 0.8);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const starDecal = new THREE.Mesh(starGeo, starMat);
      starDecal.rotation.x = -Math.PI / 2;
      starDecal.position.set(0, 1.31, 1.2);
      jeep.add(starDecal);

      // Windshield Frame & Armored Glass
      const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 0.08), darkMat);
      wsFrame.position.set(0, 1.7, 0.3);
      wsFrame.rotation.x = -0.2;
      jeep.add(wsFrame);

      // Optional Roof-Mounted Heavy Turret Gun
      if (upgrades.turretGunLevel > 0) {
        const turretGroup = new THREE.Group();
        turretGroup.position.set(0, 2.15, -0.6);

        const turretStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), darkMat);
        turretStand.position.y = 0.25;
        turretGroup.add(turretStand);

        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.85), darkMat);
        gunBody.position.set(0, 0.55, 0);
        turretGroup.add(gunBody);

        // Barrel length scales with upgrade tier
        const barrelLen = 1.0 + upgrades.turretGunLevel * 0.25;
        const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, barrelLen, 8), darkMat);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.set(0, 0.58, barrelLen / 2 + 0.3);
        turretGroup.add(gunBarrel);

        jeep.add(turretGroup);
      }

      // 4 Multi-part Wheels with Rims & Spokes
      const wheelRubber = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.85 });

      [
        { x: -1.2, z: 1.3 },
        { x: 1.2, z: 1.3 },
        { x: -1.2, z: -1.3 },
        { x: 1.2, z: -1.3 }
      ].forEach((pos) => {
        const wGroup = new THREE.Group();
        wGroup.position.set(pos.x, 0.55, pos.z);

        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 18), wheelRubber);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        wGroup.add(tire);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.48, 12), rimMat);
        hub.rotation.z = Math.PI / 2;
        wGroup.add(hub);

        // Alloy Spoke Blades
        for (let s = 0; s < 5; s++) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), rimMat);
          spoke.rotation.x = (s * Math.PI) / 2.5;
          wGroup.add(spoke);
        }

        jeep.add(wGroup);
        vehicleWheelsRef.current.push(tire);
      });

      vehicleStateRef.current.maxSpeed = 22 + upgrades.engineLevel * 4;
      vehicleStateRef.current.ramPower = 7.5 + upgrades.ramPlowLevel * 3.5;
      vehicleStateRef.current.turnSpeed = 3.2;
      vehicleStateRef.current.altitude = 0;
      return jeep;
    }
  };

  // Update Vehicle Physics Every Frame
  const updateVehiclePhysics = (delta: number) => {
    const keys = keysRef.current;
    const veh = vehicleStateRef.current;
    const group = vehicleGroupRef.current;
    if (!group) return;

    // Read Joystick Inputs directly from ref for real-time responsiveness
    const joyX = joystickVectorRef.current?.x ?? 0;
    const joyY = joystickVectorRef.current?.y ?? 0;
    const joyActive = Math.hypot(joyX, joyY) > 0.04;

    const isForward = keys.forward || joyY < -0.15;
    const isBackward = keys.backward || joyY > 0.15;
    const isLeft = keys.left || joyX < -0.15;
    const isRight = keys.right || joyX > 0.15;
    const isBoostInput = keys.boost || !!joystickVectorRef.current?.isBoosting;

    const throttleIntensity = joyActive ? Math.min(1.0, Math.abs(joyY)) : 1.0;
    const steerIntensity = joyActive ? Math.min(1.0, Math.abs(joyX)) : 1.0;

    // Nitro Boost
    const nitroBoostPower = 1.5 + (vehicleUpgrades.nitroLevel || 1) * 0.25;

    if (isBoostInput && veh.boostFuel > 0 && isForward) {
      veh.isBoosting = true;
      veh.boostMultiplier = nitroBoostPower;
      veh.boostFuel = Math.max(0, veh.boostFuel - delta * 35);
    } else {
      veh.isBoosting = false;
      veh.boostMultiplier = 1.0;
      veh.boostFuel = Math.min(100, veh.boostFuel + delta * 12);
    }

    // Check Aerial Flight Mode
    const isAerial = ['helicopter', 'a10_jet', 'b2_bomber', 'ac130', 'sr72_orbital'].includes(vehicleUpgrades.activeVehicleId);
    if (isFlightMode || isAerial) {
      veh.altitude = THREE.MathUtils.lerp(veh.altitude, 18, delta * 3.5);
      veh.maxSpeed = 48;
    } else {
      veh.altitude = THREE.MathUtils.lerp(veh.altitude, 0, delta * 4);
    }

    // Acceleration & Braking
    const targetMaxSpeed = veh.maxSpeed * veh.boostMultiplier;

    if (isForward) {
      veh.speed = Math.min(targetMaxSpeed * throttleIntensity, veh.speed + veh.acceleration * throttleIntensity * delta);
    } else if (isBackward) {
      if (veh.speed > 0.5) {
        veh.speed = Math.max(0, veh.speed - veh.braking * throttleIntensity * delta);
      } else {
        veh.speed = Math.max(-veh.reverseMaxSpeed * throttleIntensity, veh.speed - veh.acceleration * 0.6 * throttleIntensity * delta);
      }
    } else {
      if (veh.speed > 0) {
        veh.speed = Math.max(0, veh.speed - 14 * delta);
      } else if (veh.speed < 0) {
        veh.speed = Math.min(0, veh.speed + 14 * delta);
      }
    }

    // Steering
    if (Math.abs(veh.speed) > 0.2) {
      const dirSign = veh.speed >= 0 ? 1 : -1;
      if (isLeft) {
        veh.rotationY += veh.turnSpeed * steerIntensity * delta * dirSign;
        veh.steerAngle = Math.max(-0.45, veh.steerAngle - delta * 4 * steerIntensity);
      } else if (isRight) {
        veh.rotationY -= veh.turnSpeed * steerIntensity * delta * dirSign;
        veh.steerAngle = Math.min(0.45, veh.steerAngle + delta * 4 * steerIntensity);
      } else {
        veh.steerAngle *= 0.8;
      }
    } else {
      veh.steerAngle *= 0.8;
    }

    // Movement
    veh.x += Math.sin(veh.rotationY) * veh.speed * delta;
    veh.z += Math.cos(veh.rotationY) * veh.speed * delta;

    // World Boundary constraint
    const bound = 62;
    if (Math.abs(veh.x) > bound) {
      veh.x = Math.sign(veh.x) * bound;
      veh.speed *= -0.3;
    }
    if (Math.abs(veh.z) > bound) {
      veh.z = Math.sign(veh.z) * bound;
      veh.speed *= -0.3;
    }

    // Transform 3D mesh
    group.position.set(veh.x, veh.altitude, veh.z);
    group.rotation.y = veh.rotationY;

    // Wheels rotation
    vehicleWheelsRef.current.forEach((wheel) => {
      wheel.rotation.x += veh.speed * delta * 2.5;
    });

    group.rotation.z = -veh.steerAngle * (veh.speed / veh.maxSpeed) * 0.12;
  };

  // Check Collisions and Kinetic Smashing
  const checkVehicleCollisions = () => {
    const veh = vehicleStateRef.current;
    const group = vehicleGroupRef.current;
    if (!group) return;

    // Airborne aircraft fly cleanly over ground structures
    if (veh.altitude > 5.0) return;

    const vehBox = {
      x: veh.x,
      z: veh.z,
      radius: vehicleUpgrades.activeVehicleId === 'tank' ? 2.6 : 2.0
    };

    const now = performance.now();

    targets.forEach((target) => {
      if (target.isDestroyed) return;

      const targetRadius = Math.max(target.width, target.depth) / 2;
      const minDist = vehBox.radius + targetRadius;
      let dx = veh.x - target.x;
      let dz = veh.z - target.z;
      let dist = Math.hypot(dx, dz);

      if (dist < minDist) {
        // Prevent getting stuck inside: push vehicle back outside the boundary immediately
        if (dist < 0.001) { dx = 1; dz = 0; dist = 1; }
        const nx = dx / dist;
        const nz = dz / dist;

        if (!target.isPedestrian && !target.isTownProp) {
          veh.x = target.x + nx * (minDist + 0.2);
          veh.z = target.z + nz * (minDist + 0.2);
          group.position.set(veh.x, veh.altitude, veh.z);
        }

        // Check impact debounce cooldown (300ms per target) to prevent multi-hit spam
        const lastHit = impactCooldownsRef.current.get(target.id) || 0;
        if (now - lastHit < 300) return;
        impactCooldownsRef.current.set(target.id, now);

        const impactSpeed = Math.max(10.0, Math.abs(veh.speed));
        const plowFlatBonus = (vehicleUpgrades.ramPlowLevel || 0) * 25;
        const ramDamage = Math.max(80, Math.round((impactSpeed * veh.ramPower + plowFlatBonus) * (veh.isBoosting ? 1.6 : 1.0)));

        // Directly apply damage
        const newHp = Math.max(0, target.hp - ramDamage);
        target.hp = newHp;
        const isKill = newHp === 0;

        if (isKill) {
          target.isDestroyed = true;
          const targetMesh = targetMeshesRef.current.get(target.id);
          if (targetMesh) {
            targetMesh.visible = false;
          }
        }

        onTargetRamDamage(target.id, ramDamage, isKill);

        if (target.isPedestrian) {
          soundEngine.playRadioClick();
          onAddCombatLog(`CRUNCH! Neutralized ${target.name} for ${ramDamage} DMG (+$${target.value.toLocaleString()})`);
          spawnDebris(target.x, target.y + 0.5, target.z, target.color, '#0f172a', 1.5);
        } else if (target.isTownProp) {
          soundEngine.playExplosion(0.8);
          onAddCombatLog(`CRUSHED ${target.name}! +$${target.value.toLocaleString()}`);
          spawnDebris(target.x, target.y + 0.5, target.z, target.color, '#1e293b', 2.0);
        } else {
          if (isKill) {
            soundEngine.playExplosion(2.2);
            onAddCombatLog(`💥 DEMOLISHED ${target.name}! +$${target.value.toLocaleString()}`);
            spawnDebris(target.x, target.y + 1.2, target.z, target.color, target.roofColor || '#1e293b', target.height * 1.5);
          } else {
            soundEngine.playExplosion(1.2);
            onAddCombatLog(`RAMMED ${target.name} with ${vehicleUpgrades.activeVehicleId.toUpperCase()}! -${ramDamage} HP [${newHp}/${target.maxHp}]`);
            spawnDebris(target.x, target.y + 0.5, target.z, target.color, target.roofColor || '#1e293b', 2.0);
          }
        }

        // Recoil
        if (vehicleUpgrades.activeVehicleId === 'tank' || vehicleUpgrades.ramPlowLevel >= 3) {
          veh.speed *= 0.8;
        } else if (!target.isPedestrian && !target.isTownProp) {
          veh.speed = -Math.sign(veh.speed || 1) * Math.max(3.5, Math.abs(veh.speed) * 0.4);
        } else {
          veh.speed *= 0.85;
        }
      }
    });
  };

  // Follow-Cam smooth tracking
  const updateCameraFollowVehicle = (delta: number) => {
    if (!cameraRef.current || !vehicleGroupRef.current) return;
    const camera = cameraRef.current;
    const veh = vehicleStateRef.current;

    const followDist = 26;
    const followHeight = 18;

    const targetCamX = veh.x - Math.sin(veh.rotationY) * followDist;
    const targetCamZ = veh.z - Math.cos(veh.rotationY) * followDist;
    const targetCamY = followHeight + veh.altitude;

    camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), delta * 4);
    camera.lookAt(veh.x, 1.2 + veh.altitude, veh.z);

    const angleDeg = (veh.rotationY * 180) / Math.PI;
    setCompassAngle(Math.round(angleDeg % 360));
  };

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, distance } = cameraAngleRef.current;
    const x = distance * Math.sin(phi) * Math.sin(theta);
    const y = distance * Math.cos(phi);
    const z = distance * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);

    const angleDeg = (theta * 180) / Math.PI;
    setCompassAngle(angleDeg % 360);
  };

  // Realistic House Generator
  const buildRealisticHouseGroup = (target: DestructibleTarget): THREE.Group => {
    const group = new THREE.Group();
    const wallColor = target.color;
    const roofColor = target.roofColor || '#1e293b';
    const shutterColor = target.shutterColor || '#0f172a';

    const houseW = target.width;
    const houseD = target.depth;
    const wallH = target.height * 0.65;
    const roofH = target.height * 0.45;

    // 1. Yard
    if (target.hasYard !== false) {
      const lawnW = houseW + 3.8;
      const lawnD = houseD + 3.8;

      const lawnGeo = new THREE.BoxGeometry(lawnW, 0.12, lawnD);
      const lawnMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.95 });
      const lawn = new THREE.Mesh(lawnGeo, lawnMat);
      lawn.position.y = 0.06;
      lawn.receiveShadow = true;
      group.add(lawn);

      const walkGeo = new THREE.BoxGeometry(1.0, 0.14, 2.2);
      const walkMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.8 });
      const walkway = new THREE.Mesh(walkGeo, walkMat);
      walkway.position.set(0, 0.07, houseD / 2 + 1.1);
      walkway.receiveShadow = true;
      group.add(walkway);

      if (target.hasGarage || target.hasCar) {
        const driveW = 2.4;
        const driveD = 4.2;
        const driveGeo = new THREE.BoxGeometry(driveW, 0.14, driveD);
        const driveMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
        const drive = new THREE.Mesh(driveGeo, driveMat);
        drive.position.set(-houseW / 2 - 0.4, 0.07, houseD / 2 + 0.6);
        drive.receiveShadow = true;
        group.add(drive);

        if (target.hasCar) {
          const carGroup = new THREE.Group();
          carGroup.position.set(-houseW / 2 - 0.4, 0.35, houseD / 2 + 0.8);

          const carBody = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.65, 3.2),
            new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.6 })
          );
          carBody.position.y = 0.4;
          carBody.castShadow = true;
          carGroup.add(carBody);

          const carCabin = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.55, 1.8),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 })
          );
          carCabin.position.set(0, 0.95, -0.2);
          carGroup.add(carCabin);

          group.add(carGroup);
        }
      }

      const treeTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 1.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
      );
      treeTrunk.position.set(houseW / 2 + 1.1, 0.7, houseD / 2 + 0.8);
      treeTrunk.castShadow = true;
      group.add(treeTrunk);

      const treeCrown = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 2.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 })
      );
      treeCrown.position.set(houseW / 2 + 1.1, 2.2, houseD / 2 + 0.8);
      treeCrown.castShadow = true;
      group.add(treeCrown);

      if (target.hasFence) {
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        [-lawnW / 2, lawnW / 2].forEach((fx) => {
          const sideFence = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, lawnD * 0.9), fenceMat);
          sideFence.position.set(fx, 0.4, 0);
          sideFence.castShadow = true;
          group.add(sideFence);
        });
      }
    }

    // 2. Foundation
    const foundGeo = new THREE.BoxGeometry(houseW * 1.02, 0.25, houseD * 1.02);
    const foundMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
    const foundation = new THREE.Mesh(foundGeo, foundMat);
    foundation.position.y = 0.25 / 2 + 0.12;
    foundation.receiveShadow = true;
    group.add(foundation);

    // 3. Walls
    const sidingTex = getClapboardTexture(wallColor);
    const wallGeo = new THREE.BoxGeometry(houseW, wallH, houseD);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: sidingTex, roughness: 0.65 });
    const mainBody = new THREE.Mesh(wallGeo, wallMat);
    mainBody.position.y = 0.25 + wallH / 2;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    mainBody.name = 'mainBody';
    group.add(mainBody);

    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const cornerSize = 0.16;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([cx, cz]) => {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(cornerSize, wallH, cornerSize), trimMat);
      corner.position.set(cx * (houseW / 2), 0.25 + wallH / 2, cz * (houseD / 2));
      corner.castShadow = true;
      group.add(corner);
    });

    // 4. Roof
    const shingleTex = getShingleTexture(roofColor);
    const roofEavesW = houseW + 0.7;
    const roofEavesD = houseD + 0.7;

    const rGeo = new THREE.ConeGeometry(Math.hypot(roofEavesW, roofEavesD) * 0.5, roofH, 4);
    const rMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: shingleTex, roughness: 0.6 });
    const roofMesh = new THREE.Mesh(rGeo, rMat);
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.position.y = 0.25 + wallH + roofH / 2;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    roofMesh.name = 'roofMesh';
    group.add(roofMesh);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(roofEavesW * 1.01, 0.14, roofEavesD * 1.01), trimMat);
    fascia.position.y = 0.25 + wallH + 0.07;
    fascia.castShadow = true;
    group.add(fascia);

    // 5. Front Porch
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3f2212, roughness: 0.6 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.6, 0.08), doorMat);
    door.position.set(0, 0.25 + 0.8, houseD / 2 + 0.04);
    group.add(door);

    const porchRoof = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.16, 0.9),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(roofColor), roughness: 0.7 })
    );
    porchRoof.position.set(0, 0.25 + 1.85, houseD / 2 + 0.45);
    porchRoof.castShadow = true;
    group.add(porchRoof);

    [-0.7, 0.7].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8), trimMat);
      pillar.position.set(px, 0.25 + 0.85, houseD / 2 + 0.8);
      pillar.castShadow = true;
      group.add(pillar);
    });

    // 6. Windows & Shutters (Night-Lit Window Grids)
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfcb316,
      emissiveIntensity: 0.95,
      roughness: 0.15
    });
    const shutterMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(shutterColor), roughness: 0.6 });

    const addWindowWithShutters = (x: number, y: number, z: number, rotY: number = 0) => {
      const winGroup = new THREE.Group();
      winGroup.position.set(x, y, z);
      winGroup.rotation.y = rotY;

      const wFrame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.08), trimMat);
      winGroup.add(wFrame);

      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.1), windowGlassMat);
      winGroup.add(pane);

      [-0.55, 0.55].forEach((sx) => {
        const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.05, 0.06), shutterMat);
        shutter.position.set(sx, 0, 0.02);
        winGroup.add(shutter);
      });

      group.add(winGroup);
    };

    addWindowWithShutters(-houseW * 0.3, 0.25 + 0.9, houseD / 2 + 0.04);
    addWindowWithShutters(houseW * 0.3, 0.25 + 0.9, houseD / 2 + 0.04);

    if (wallH > 2.6) {
      addWindowWithShutters(-houseW * 0.3, 0.25 + wallH * 0.75, houseD / 2 + 0.04);
      addWindowWithShutters(0, 0.25 + wallH * 0.75, houseD / 2 + 0.04);
      addWindowWithShutters(houseW * 0.3, 0.25 + wallH * 0.75, houseD / 2 + 0.04);
    }

    // 7. Rooftop Props (HVAC Unit, Satellite Dish, Red Radio Beacon)
    const roofY = 0.25 + wallH + roofH;

    // HVAC Air Unit
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.8 });
    const hvac = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), hvacMat);
    hvac.position.set(-houseW * 0.25, roofY - 0.2, -houseD * 0.2);
    hvac.castShadow = true;
    group.add(hvac);

    // Satellite Dish
    const dishMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.7 });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), dishMat);
    dish.rotation.x = -Math.PI / 3;
    dish.position.set(houseW * 0.22, roofY - 0.1, houseD * 0.2);
    group.add(dish);

    // Blinking Red Obstacle Light Beacon
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 2.5
    });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), beaconMat);
    beacon.position.set(0, roofY + 0.2, 0);
    group.add(beacon);

    // 7. Brick Chimney
    if (target.hasChimney) {
      const brickTex = getBrickTexture();
      const chimMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.85 });
      const chimH = wallH + roofH * 0.85;
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.7, chimH, 0.7), chimMat);
      chim.position.set(houseW * 0.32, 0.25 + chimH / 2, -houseD * 0.15);
      chim.castShadow = true;
      group.add(chim);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.85), trimMat);
      cap.position.set(houseW * 0.32, 0.25 + chimH + 0.07, -houseD * 0.15);
      group.add(cap);
    }

    // 8. 3D Floating Health & Damage Status Bar
    const healthBarGroup = new THREE.Group();
    healthBarGroup.name = 'healthBarGroup';
    healthBarGroup.position.set(0, target.height + 1.2, 0);

    const bgBar = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.45),
      new THREE.MeshBasicMaterial({ color: 0x020617, side: THREE.DoubleSide })
    );
    healthBarGroup.add(bgBar);

    const fillBar = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.32),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide })
    );
    fillBar.name = 'healthFillBar';
    fillBar.position.z = 0.02;
    healthBarGroup.add(fillBar);

    healthBarGroup.visible = false;
    group.add(healthBarGroup);

    return group;
  };

  // Build / Update 3D Targets
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    targets.forEach((target) => {
      let group = targetMeshesRef.current.get(target.id);

      if (!group) {
        if (target.isPedestrian) {
          group = new THREE.Group();
          group.position.set(target.x, 0, target.z);
          group.userData = { targetId: target.id };

          const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
          );
          head.position.y = 1.6;
          head.castShadow = true;
          group.add(head);

          const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.7, 0.25),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(target.color) })
          );
          torso.position.y = 1.15;
          torso.castShadow = true;
          group.add(torso);

          const legsGroup = new THREE.Group();
          legsGroup.name = 'legs';
          legsGroup.position.set(0, 0.8, 0);

          [-0.12, 0.12].forEach((lx) => {
            const leg = new THREE.Mesh(
              new THREE.BoxGeometry(0.14, 0.8, 0.16),
              new THREE.MeshStandardMaterial({ color: 0x1e293b })
            );
            leg.position.set(lx, -0.4, 0);
            leg.castShadow = true;
            legsGroup.add(leg);
          });
          group.add(legsGroup);

        } else if (target.type === 'parked_car') {
          group = new THREE.Group();
          group.position.set(target.x, 0, target.z);
          group.userData = { targetId: target.id };

          const carBody = new THREE.Mesh(
            new THREE.BoxGeometry(target.width, target.height * 0.6, target.depth),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(target.color), roughness: 0.3, metalness: 0.6 })
          );
          carBody.position.y = target.height * 0.3 + 0.2;
          carBody.castShadow = true;
          carBody.name = 'mainBody';
          group.add(carBody);

          const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(target.width * 0.85, target.height * 0.5, target.depth * 0.55),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 })
          );
          cabin.position.set(0, target.height * 0.75 + 0.15, -0.2);
          cabin.castShadow = true;
          group.add(cabin);

        } else if (target.type === 'street_light') {
          group = new THREE.Group();
          group.position.set(target.x, 0, target.z);
          group.userData = { targetId: target.id };

          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, target.height, 8),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
          );
          pole.position.y = target.height / 2;
          pole.castShadow = true;
          group.add(pole);

          const lamp = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.15, 0.6),
            new THREE.MeshBasicMaterial({ color: 0xfef08a })
          );
          lamp.position.set(0, target.height, 0.3);
          group.add(lamp);

        } else if (target.type === 'refinery') {
          group = new THREE.Group();
          group.position.set(target.x, 0, target.z);
          group.userData = { targetId: target.id };

          const tankMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.7 });
          const tank1 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.2, 16), tankMat);
          tank1.position.set(-1.2, 1.6, 0);
          tank1.castShadow = true;
          group.add(tank1);

          const tank2 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.8, 16), tankMat);
          tank2.position.set(1.4, 1.9, 0);
          tank2.castShadow = true;
          group.add(tank2);

          const hpGroup = new THREE.Group();
          hpGroup.name = 'healthBarGroup';
          hpGroup.position.set(0, target.height + 1.2, 0);
          const bg = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.45), new THREE.MeshBasicMaterial({ color: 0x020617, side: THREE.DoubleSide }));
          hpGroup.add(bg);
          const fill = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.32), new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide }));
          fill.name = 'healthFillBar';
          fill.position.z = 0.02;
          hpGroup.add(fill);
          hpGroup.visible = false;
          group.add(hpGroup);

        } else if (target.type === 'bunker') {
          group = new THREE.Group();
          group.position.set(target.x, 0, target.z);
          group.userData = { targetId: target.id };

          const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.2 });
          const bunkerMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3.2, 1.8, 6), bunkerMat);
          bunkerMesh.position.y = 0.9;
          bunkerMesh.castShadow = true;
          group.add(bunkerMesh);

          const hpGroup = new THREE.Group();
          hpGroup.name = 'healthBarGroup';
          hpGroup.position.set(0, target.height + 1.2, 0);
          const bg = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.45), new THREE.MeshBasicMaterial({ color: 0x020617, side: THREE.DoubleSide }));
          hpGroup.add(bg);
          const fill = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.32), new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide }));
          fill.name = 'healthFillBar';
          fill.position.z = 0.02;
          hpGroup.add(fill);
          hpGroup.visible = false;
          group.add(hpGroup);

        } else {
          group = buildRealisticHouseGroup(target);
          group.position.set(target.x, 0, target.z);
          group.userData = { targetId: target.id };
        }

        scene.add(group);
        targetMeshesRef.current.set(target.id, group);
      }

      if (target.isDestroyed) {
        if (group.visible) {
          group.visible = false;
          if (!settings.overlays?.entityHider) {
            spawnDebris(target.x, target.y, target.z, target.color, target.roofColor || '#1e293b', target.height);
          }
        }
      } else {
        group.visible = true;
        const hpRatio = Math.max(0, target.hp / target.maxHp);

        // Update 3D Health Bar
        const healthBar = group.getObjectByName('healthBarGroup');
        const healthFill = group.getObjectByName('healthFillBar') as THREE.Mesh | undefined;

        if (healthBar && healthFill) {
          if (hpRatio < 0.999) {
            healthBar.visible = true;
            healthFill.scale.x = Math.max(0.01, hpRatio);
            healthFill.position.x = -((1 - hpRatio) * 3.4) / 2;

            const fillMat = healthFill.material as THREE.MeshBasicMaterial;
            if (hpRatio > 0.6) fillMat.color.setHex(0x22c55e); // Green
            else if (hpRatio > 0.3) fillMat.color.setHex(0xf59e0b); // Amber
            else fillMat.color.setHex(0xef4444); // Red
          } else {
            healthBar.visible = false;
          }
        }

        // Structural Deformation & Sagging as building takes hits
        if (hpRatio < 0.999 && !target.isPedestrian && !target.isTownProp) {
          group.rotation.z = (1 - hpRatio) * 0.06;
          group.rotation.x = (1 - hpRatio) * 0.03;
          group.position.y = -(1 - hpRatio) * 0.2;
        }

        // Darkened Scorch Marks / Charred walls
        if (hpRatio < 0.6) {
          const body = group.getObjectByName('mainBody') as THREE.Mesh | undefined;
          if (body && body.material && 'color' in body.material) {
            (body.material as THREE.MeshStandardMaterial).color.set(hpRatio < 0.3 ? 0x1c1917 : 0x451a03);
          }
        }
      }
    });
  }, [targets, settings.overlays?.entityHider]);

  // Render Intel drops
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    intelBeamsRef.current.forEach((obj) => scene.remove(obj));
    intelBeamsRef.current.clear();

    intelDrops.forEach((intel) => {
      if (intel.collected) return;

      const group = new THREE.Group();
      group.position.set(intel.x, 0, intel.z);

      const ringGeo = new THREE.RingGeometry(0.3, 1.2, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
      });
      const pingRing = new THREE.Mesh(ringGeo, ringMat);
      pingRing.rotation.x = -Math.PI / 2;
      pingRing.position.y = 0.04;
      pingRing.name = 'radarPing';
      group.add(pingRing);

      const caseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.45, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
      );
      caseMesh.position.y = 0.23;
      caseMesh.castShadow = true;
      group.add(caseMesh);

      scene.add(group);
      intelBeamsRef.current.set(intel.id, group);
    });
  }, [intelDrops]);

  const spawnDebris = (x: number, _y: number, z: number, color: string, roofColor: string, height: number) => {
    if (!sceneRef.current) return;
    const count = settings.graphicsQuality === 'low' ? 6 : 14;

    for (let i = 0; i < count; i++) {
      const size = 0.3 + Math.random() * 0.6;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? new THREE.Color(color) : new THREE.Color(roofColor),
        roughness: 0.85
      });
      const chunk = new THREE.Mesh(geo, mat);
      chunk.position.set(x + (Math.random() - 0.5) * 2, 0.5 + Math.random() * (height * 0.6), z + (Math.random() - 0.5) * 2);
      chunk.castShadow = true;
      sceneRef.current.add(chunk);

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      debrisListRef.current.push({
        mesh: chunk,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 5 + Math.random() * 10, Math.sin(angle) * speed),
        rotVelocity: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        age: 0,
        maxAge: 4.5 + Math.random() * 2
      });
    }
  };

  const trigger3DExplosion = (x: number, z: number, radius: number, isNuke: boolean) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const group = new THREE.Group();
    group.position.set(x, 0.1, z);

    const shockGeo = new THREE.RingGeometry(0.2, radius, 36);
    const shockMat = new THREE.MeshBasicMaterial({
      color: isNuke ? 0xffffff : 0xf97316,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const shockwave = new THREE.Mesh(shockGeo, shockMat);
    shockwave.rotation.x = -Math.PI / 2;
    group.add(shockwave);

    const pCount = isNuke ? 350 : 120;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const pAngle = Math.random() * Math.PI * 2;
      const pR = Math.random() * (radius * 0.7);
      pPos[i * 3] = Math.cos(pAngle) * pR;
      pPos[i * 3 + 1] = Math.random() * (isNuke ? 12 : 4);
      pPos[i * 3 + 2] = Math.sin(pAngle) * pR;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: isNuke ? 0xfef08a : 0xf97316,
      size: isNuke ? 1.8 : 0.9,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(pGeo, pMat);
    group.add(particles);

    const light = new THREE.PointLight(isNuke ? 0xffffff : 0xf97316, isNuke ? 25 : 8, radius * 3.5);
    light.position.y = 3;
    group.add(light);

    scene.add(group);
    explosionsRef.current.push({
      group,
      particles,
      shockwave,
      light,
      maxAge: isNuke ? 3.5 : 1.2,
      age: 0,
      isNuke
    });

    // Spawn residual tactical fire pool that melts enemies
    const fpGeo = new THREE.CylinderGeometry(radius * 0.75, radius * 0.75, 0.15, 16);
    const fpMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const fpMesh = new THREE.Mesh(fpGeo, fpMat);
    fpMesh.position.set(x, 0.08, z);
    scene.add(fpMesh);

    firePoolsRef.current.push({
      mesh: fpMesh,
      x,
      z,
      radius: radius * 0.75,
      age: 0,
      maxAge: 8.5
    });

    // Check proximity damage on stationary Hostile SAM Launcher Batteries
    samLaunchersRef.current.forEach((launcher) => {
      if (launcher.isDestroyed) return;
      const d = Math.hypot(launcher.x - x, launcher.z - z);
      if (d < radius + 3.0) {
        const dmg = isNuke ? 350 : 150;
        launcher.hp -= dmg;
        if (launcher.hp <= 0) {
          launcher.isDestroyed = true;
          launcher.mesh.visible = false;
          onAddCombatLog("💥 SEAD MISSION DIRECT SUCCESS: Hostile Air-Defense SAM site neutralized! Airspace cleared!");
          soundEngine.playExplosion(2.2);
        } else {
          onAddCombatLog(`🎯 HIT: Air-Defense SAM Battery compromised! HP: [${launcher.hp}/300]`);
          soundEngine.playExplosion(1.0);
        }
      }
    });

    // Check proximity damage on Hostile Patrol convoys
    for (let i = hostilePatrolsRef.current.length - 1; i >= 0; i--) {
      const patrol = hostilePatrolsRef.current[i];
      const d = Math.hypot(patrol.x - x, patrol.z - z);
      if (d < radius + 2.5) {
        const dmg = isNuke ? 300 : 130;
        patrol.hp -= dmg;
        if (patrol.hp <= 0) {
          scene.remove(patrol.mesh);
          hostilePatrolsRef.current.splice(i, 1);
          onAddCombatLog("💥 SECTOR SECURED: Hostile patrol convoy destroyed by combat blast!");
          soundEngine.playExplosion(1.8);
        } else {
          onAddCombatLog(`🎯 CONTACT HIT: Patrol vehicle armored plate damaged! HP: [${patrol.hp}/250]`);
          soundEngine.playExplosion(0.9);
        }
      }
    }
  };

  const spawnAircraftFlyer = (
    model: 'f16' | 'f35' | 'ac130' | 'b2' | 'moab' | 'orbital' | 'nuke',
    targetX: number,
    targetZ: number,
    onBombImpact: () => void
  ) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const craftGroup = new THREE.Group();

    const jetMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const jetBody = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4.5, 6), jetMat);
    jetBody.rotation.x = Math.PI / 2;
    craftGroup.add(jetBody);

    const wings = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 1.8), jetMat);
    wings.position.set(0, 0, -0.4);
    craftGroup.add(wings);

    const altitude = model === 'orbital' || model === 'nuke' ? 36 : 18;
    const startPos = new THREE.Vector3(targetX - 45, altitude, targetZ - 35);
    const endPos = new THREE.Vector3(targetX + 45, altitude, targetZ + 35);

    craftGroup.position.copy(startPos);
    craftGroup.lookAt(endPos);
    scene.add(craftGroup);

    let impactTriggered = false;
    aircraftsRef.current.push({
      group: craftGroup,
      model,
      startPos,
      endPos,
      progress: 0,
      speed: 0.9,
      onComplete: () => {
        if (!impactTriggered) {
          impactTriggered = true;
          onBombImpact();
        }
      }
    });

    setTimeout(() => {
      if (!impactTriggered) {
        impactTriggered = true;
        onBombImpact();
      }
    }, 550);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      previousPointerPosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current && !(settings.overlays?.cameraFollowJeep ?? true)) {
      const deltaX = e.clientX - previousPointerPosRef.current.x;
      const deltaY = e.clientY - previousPointerPosRef.current.y;
      previousPointerPosRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta -= deltaX * 0.008;
      cameraAngleRef.current.phi = Math.max(
        0.2,
        Math.min(Math.PI / 2.1, cameraAngleRef.current.phi - deltaY * 0.008)
      );
      updateCameraPosition();
      return;
    }

    if (!containerRef.current || !cameraRef.current || !groundPlaneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(groundPlaneRef.current);

    if (intersects.length > 0 && reticleRef.current) {
      const pt = intersects[0].point;
      reticleRef.current.position.set(pt.x, 0.05, pt.z);

      if (onReticleMove) {
        onReticleMove(pt.x, pt.z);
      }

      const hovered = targets.find(
        (t) => !t.isDestroyed && Math.hypot(t.x - pt.x, t.z - pt.z) < Math.max(t.width, t.depth) / 2 + 1
      );
      setHoveredTarget(hovered || null);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current || !cameraRef.current || !groundPlaneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(groundPlaneRef.current);

    if (intersects.length > 0) {
      const pt = intersects[0].point;

      const clickedIntel = intelDrops.find(
        (intel) => !intel.collected && Math.hypot(intel.x - pt.x, intel.z - pt.z) < 2.5
      );

      if (clickedIntel) {
        onIntelCollect(clickedIntel.id);
        return;
      }
    }
  };

  const getVehicleName = (id: string) => {
    switch (id) {
      case 'tank': return 'M1A2 ABRAMS TANK';
      case 'humvee': return 'HUMVEE M1151';
      case 'stryker': return 'STRYKER 8x8 MGS';
      case 'helicopter': return 'AH-64 APACHE GUNSHIP';
      case 'a10_jet': return 'A-10 WARTHOG JET';
      case 'b2_bomber': return 'B-2 SPIRIT STEALTH';
      case 'ac130': return 'AC-130 GHOSTRIDER';
      case 'sr72_orbital': return 'SR-72 DARKSTAR';
      default: return 'WILLYS TACTICAL JEEP';
    }
  };

  const activeVehInfo = {
    name: getVehicleName(vehicleUpgrades.activeVehicleId),
    hasPlow: vehicleUpgrades.ramPlowLevel > 0,
    hasGun: vehicleUpgrades.turretGunLevel > 0
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleCanvasClick}
        className={`w-full h-full block cursor-crosshair touch-none transition-all ${
          settings.postProcessing !== false
            ? 'filter drop-shadow-[0_0_15px_rgba(245,158,11,0.2)] contrast-[108%] brightness-[104%]'
            : ''
        }`}
      />

      {/* TACTICAL VISION OVERLAY FILTERS */}
      {visionMode === 'nvg' && (
        <div className="absolute inset-0 pointer-events-none border-[16px] border-emerald-950/80 bg-emerald-500/15 mix-blend-screen backdrop-brightness-125 shadow-[inset_0_0_80px_rgba(16,185,129,0.8)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(6,78,59,0.7)_100%)]" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/90 px-3 py-1 rounded-full border border-emerald-500/50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            NIGHT VISION GOGGLES [AN/PVS-31A] :: GREEN PHOSPHOR
          </div>
        </div>
      )}

      {visionMode === 'flir_thermal' && (
        <div className="absolute inset-0 pointer-events-none border-[16px] border-sky-950/90 grayscale invert contrast-150 brightness-110 mix-blend-difference">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold text-sky-300 bg-slate-950/90 px-3 py-1 rounded-full border border-sky-400/60 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            AC-130 FLIR INFRARED THERMAL TARGETING :: HEAT SIGNATURES
          </div>
        </div>
      )}

      {/* Target Diagnostic Tooltip */}
      {(settings.overlays?.targetHealthBars ?? true) && hoveredTarget && (
        <div className="fixed top-16 right-4 pointer-events-none z-30 bg-slate-950/90 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md max-w-xs animate-fade-in font-mono text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-amber-400">{hoveredTarget.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {hoveredTarget.type.toUpperCase()}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>HP Integrity:</span>
              <span className="font-bold">
                {hoveredTarget.hp.toLocaleString()} / {hoveredTarget.maxHp.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-150"
                style={{ width: `${(hoveredTarget.hp / hoveredTarget.maxHp) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Devastation Bounty:</span>
              <span className="text-amber-300 font-bold">+${hoveredTarget.value.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* FIXED VEHICLE DRIVING TELEMETRY HUD */}
      <div className="fixed bottom-24 left-4 z-30 pointer-events-none flex flex-col gap-2">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 shadow-2xl flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-600/40 text-emerald-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] uppercase font-bold text-amber-400 flex items-center gap-1.5">
                <span>{activeVehInfo.name}</span>
                {activeVehInfo.hasPlow && <span className="text-[8px] bg-red-950 text-red-400 px-1 rounded border border-red-700/50">PLOW</span>}
                {activeVehInfo.hasGun && <span className="text-[8px] bg-sky-950 text-sky-400 px-1 rounded border border-sky-700/50">GUN</span>}
              </div>
              <div className="text-lg font-black text-white">{hudSpeed} <span className="text-[10px] text-slate-400">KM/H</span></div>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-800" />

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-sky-400"><Zap className="w-3 h-3" /> NITRO BOOST</span>
              <span>{hudBoostPct}%</span>
            </div>
            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all"
                style={{ width: `${hudBoostPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
