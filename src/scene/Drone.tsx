import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  DoubleSide,
  Euler,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from "three";
import { visualConfig } from "../config/visual";
import { droneWorldPosition } from "./dronePosition";
import { povCutEngaged } from "./dronePov";
import { useFarmStore } from "../state/useFarmStore";
import { droneDockingState } from "./droneDockingState";
import {
  DRONE_DOCK_WORLD_POSITION,
  droneFlightTelemetry,
  type DroneFlightPhase,
} from "./droneFlightTelemetry";

const rotorNames = ["Rotor_FL", "Rotor_FR", "Rotor_RL", "Rotor_RR"];
const ROTOR_RADIUS = 1.78;
/** rad/s per rotor; direction alternates like a real X-quad (FL/RR vs FR/RL). */
const ROTOR_SPEED = 52;

const scanVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const scanFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uStrength;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float angle = atan(p.y, p.x);
    // Rotating radar sweep with a soft trailing edge.
    float sweep = pow(max(0.0, cos(angle + uTime * 1.4)), 24.0);
    // Expanding pulse rings.
    float rings = smoothstep(0.05, 0.0, abs(fract(r * 1.8 - uTime * 0.5) - 0.5) - 0.42);
    float gridFade = 1.0 - smoothstep(0.55, 1.0, r);
    float alpha = (sweep * 0.6 + rings * 0.22) * gridFade * uStrength;
    vec3 color = mix(vec3(0.36, 0.85, 0.78), vec3(0.72, 0.98, 0.92), sweep);
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Soft radial disc with arc streaks — reads as a blurred prop at speed. */
function makeRotorBlurTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const center = size / 2;
    const gradient = context.createRadialGradient(center, center, size * 0.06, center, center, center);
    gradient.addColorStop(0, "rgba(30, 36, 34, 0)");
    gradient.addColorStop(0.45, "rgba(30, 36, 34, 0.10)");
    gradient.addColorStop(0.78, "rgba(34, 40, 38, 0.34)");
    gradient.addColorStop(0.96, "rgba(40, 46, 44, 0.5)");
    gradient.addColorStop(1, "rgba(30, 36, 34, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    // Arc streaks at several radii break the perfectly smooth ring.
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let index = 0; index < 70; index += 1) {
      const radius = size * (0.3 + random() * 0.19);
      const start = random() * Math.PI * 2;
      const span = 0.25 + random() * 0.9;
      context.beginPath();
      context.arc(center, center, radius, start, start + span);
      context.strokeStyle = `rgba(52, 58, 56, ${0.05 + random() * 0.12})`;
      context.lineWidth = 1.5 + random() * 3.5;
      context.stroke();
    }
  }
  return new CanvasTexture(canvas);
}

export function Drone() {
  const group = useRef<Group>(null);
  const scanMesh = useRef<Mesh>(null);
  const bellyLight = useRef<PointLight>(null);
  const modelRef = useRef<Group>(null);
  const scanCone = useRef<Mesh>(null);
  const demoStep = useFarmStore((state) => state.demoStep);
  const smartFarmChapter = useFarmStore((state) => state.smartFarmChapter);
  const scanProgress = useFarmStore((state) => state.scanProgress);
  const following = useFarmStore((state) => state.droneFollowing);
  const demoPlaying = useFarmStore((state) => state.demoPlaying);
  const paused = useFarmStore((state) => state.paused);
  const setFollowing = useFarmStore((state) => state.setDroneFollowing);
  const { scene } = useGLTF("/assets/models/fieldvision-drone.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material instanceof MeshStandardMaterial) child.material = child.material.clone();
      }
    });
    // Rotor blur discs: faint streaked discs just above each propeller so the
    // spin reads as speed instead of strobing geometry.
    const blurTexture = makeRotorBlurTexture();
    const discGeometry = new CircleGeometry(ROTOR_RADIUS, 48);
    rotorNames.forEach((name) => {
      const rotor = clone.getObjectByName(name);
      if (!rotor) return;
      const disc = new Mesh(
        discGeometry,
        new MeshBasicMaterial({
          map: blurTexture,
          color: new Color("#b9c4bd"),
          transparent: true,
          opacity: 0.6,
          side: DoubleSide,
          depthWrite: false,
        }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.06;
      rotor.add(disc);
    });
    return clone;
  }, [scene]);
  const curve = useMemo(() => new CatmullRomCurve3([
    new Vector3(-118, 32, 84), new Vector3(-42, 38, -4), new Vector3(18, 23, -61), new Vector3(106, 34, -42), new Vector3(127, 42, 66), new Vector3(24, 34, 111),
  ], true, "catmullrom", 0.22), []);
  const scanMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: scanVertex,
        fragmentShader: scanFragment,
        uniforms: { uTime: { value: 0 }, uStrength: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  const scratch = useMemo(() => ({
    targetPosition: new Vector3(),
    ahead: new Vector3(),
    further: new Vector3(),
    targetQuaternion: new Quaternion(),
    targetEuler: new Euler(0, 0, 0, "YXZ"),
  }), []);
  // Cruise progress along the patrol path — advanced with curvature-based
  // speed so the drone slows into turns and stretches out on straights.
  const pathT = useRef(0.15);
  const chapterElapsed = useRef(0);
  const previousChapter = useRef(smartFarmChapter);
  const returnStart = useRef(DRONE_DOCK_WORLD_POSITION.clone());
  const qaTelemetryEnabled = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("qa") || params.has("qaRun");
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (paused) return;
    const time = clock.elapsedTime;
    const scanning = demoStep === "drone-scan";
    // Gimbal first-person cut (fv-66y.6): 镜头切入云台期间隐藏机体与机载灯——
    // 相机嵌在机腹，不隐藏会看到机身内壁和过曝光源；第三人称的扫描锥/地面
    // 扫描盘同样只服务于外部视角，窗口内一并隐藏。
    const fpvActive = scanning && povCutEngaged(scanProgress);
    if (modelRef.current) modelRef.current.visible = !fpvActive;
    if (bellyLight.current) bellyLight.current.visible = !fpvActive;
    // FPV 时第三人称的扫描锥/地面扫描盘会糊满镜头，一并隐藏。
    if (scanCone.current) scanCone.current.visible = scanning && !fpvActive;
    if (scanMesh.current) scanMesh.current.visible = scanning && !fpvActive;
    if (previousChapter.current !== smartFarmChapter) {
      chapterElapsed.current = 0;
      if (smartFarmChapter === "coordinated-patrol") pathT.current = 0;
      if (smartFarmChapter === "return-overview") returnStart.current.copy(group.current.position);
      previousChapter.current = smartFarmChapter;
    }
    if (demoPlaying && !paused) chapterElapsed.current += delta;
    const completedReturn = smartFarmChapter === "return-overview" && !demoPlaying;
    const docked = smartFarmChapter === "base-online" || smartFarmChapter === "daily-plan" || smartFarmChapter === "autonomous-operations" || completedReturn;
    const takeoffSequence = smartFarmChapter === "coordinated-patrol" && demoPlaying && chapterElapsed.current < 5;
    const returning = smartFarmChapter === "return-overview" && demoPlaying;
    let phase: DroneFlightPhase = "airborne";
    let yaw: number;
    let pitch: number;
    let roll: number;
    if (docked) {
      scratch.targetPosition.copy(DRONE_DOCK_WORLD_POSITION);
      group.current.position.lerp(scratch.targetPosition, Math.min(1, delta * 2.4));
      phase = completedReturn ? "charging" : "ready";
      yaw = -0.35;
      pitch = 0;
      roll = 0;
    } else if (takeoffSequence) {
      const elapsed = chapterElapsed.current;
      const selfChecking = elapsed < 1.2;
      const takeoffProgress = Math.max(0, Math.min(1, (elapsed - 1.2) / 3.8));
      const liftProgress = Math.min(1, takeoffProgress / 0.42);
      const transferProgress = Math.max(0, (takeoffProgress - 0.42) / 0.58);
      scratch.ahead.set(
        DRONE_DOCK_WORLD_POSITION.x,
        DRONE_DOCK_WORLD_POSITION.y + 11,
        DRONE_DOCK_WORLD_POSITION.z,
      );
      const routeEntry = curve.getPointAt(0, scratch.further);
      scratch.targetPosition.copy(DRONE_DOCK_WORLD_POSITION).lerp(scratch.ahead, liftProgress);
      if (transferProgress > 0) scratch.targetPosition.lerp(routeEntry, transferProgress * transferProgress * (3 - 2 * transferProgress));
      group.current.position.lerp(scratch.targetPosition, Math.min(1, delta * 5));
      phase = selfChecking ? "self-check" : "taking-off";
      yaw = -0.35;
      pitch = takeoffProgress > 0.45 ? 0.08 : 0;
      roll = 0;
    } else if (returning) {
      const progress = Math.min(1, chapterElapsed.current / 7);
      const eased = progress * progress * (3 - 2 * progress);
      scratch.ahead.set(
        DRONE_DOCK_WORLD_POSITION.x,
        DRONE_DOCK_WORLD_POSITION.y + 7,
        DRONE_DOCK_WORLD_POSITION.z,
      );
      if (eased < 0.72) {
        scratch.targetPosition.copy(returnStart.current).lerp(scratch.ahead, eased / 0.72);
      } else {
        scratch.targetPosition.copy(scratch.ahead).lerp(DRONE_DOCK_WORLD_POSITION, (eased - 0.72) / 0.28);
      }
      group.current.position.copy(scratch.targetPosition);
      const distanceToDock = group.current.position.distanceTo(DRONE_DOCK_WORLD_POSITION);
      phase = progress >= 1 ? "charging" : distanceToDock < 5.5 ? "landing" : "returning";
      yaw = Math.atan2(DRONE_DOCK_WORLD_POSITION.x - group.current.position.x, DRONE_DOCK_WORLD_POSITION.z - group.current.position.z);
      pitch = phase === "landing" ? -0.04 : 0.05;
      roll = 0;
    } else if (scanning) {
      // A real acquisition pass crosses the parcel; direct timeline jumps use
      // scanProgress=1 and settle at the final sampling position.
      scratch.targetPosition.set(
        -8 + scanProgress * 39,
        24 + Math.sin(time * 0.85) * 0.28,
        -43 - scanProgress * 38,
      );
      yaw = Math.sin(time * 0.25) * 0.2;
      pitch = Math.sin(time * 0.6) * 0.02;
      roll = Math.sin(time * 0.45 + 1.3) * 0.025;
      group.current.position.lerp(scratch.targetPosition, Math.min(1, delta * 1.8));
    } else {
      const t = pathT.current;
      const point = curve.getPointAt(t, scratch.targetPosition);
      const ahead = curve.getPointAt((t + 0.012) % 1, scratch.ahead);
      const further = curve.getPointAt((t + 0.035) % 1, scratch.further);
      group.current.position.copy(point);
      phase = "airborne";
      // Heading now vs. slightly ahead → bank (roll) into the turn.
      const headingNow = Math.atan2(ahead.x - point.x, ahead.z - point.z);
      const headingNext = Math.atan2(further.x - ahead.x, further.z - ahead.z);
      let headingDelta = headingNext - headingNow;
      if (headingDelta > Math.PI) headingDelta -= Math.PI * 2;
      if (headingDelta < -Math.PI) headingDelta += Math.PI * 2;
      // Ease off before turns, pick up speed on straights.
      const speedFactor = Math.max(0.45, Math.min(1.3, 1.18 - Math.abs(headingDelta) * 11));
      pathT.current = (t + delta * visualConfig.droneSpeed * speedFactor) % 1;
      yaw = headingNow;
      roll = Math.max(-0.38, Math.min(0.38, -headingDelta * 7));
      // Pitch with vertical speed plus a slight nose-down cruise attitude.
      pitch = Math.max(-0.22, Math.min(0.22, (ahead.y - point.y) * -2.2)) + 0.07;
    }
    // Publish the live world position so the camera follow shot (drone-scan
    // beat) can track the drone without going through the store each frame.
    droneWorldPosition.copy(group.current.position);
    droneFlightTelemetry.position.copy(group.current.position);
    droneFlightTelemetry.distanceToDock = group.current.position.distanceTo(DRONE_DOCK_WORLD_POSITION);
    droneFlightTelemetry.phase = phase;
    if (qaTelemetryEnabled) {
      (window as unknown as { __droneTelemetry?: unknown }).__droneTelemetry = {
        phase: droneFlightTelemetry.phase,
        position: droneFlightTelemetry.position.toArray(),
        dock: DRONE_DOCK_WORLD_POSITION.toArray(),
        distanceToDock: droneFlightTelemetry.distanceToDock,
      };
    }
    scratch.targetEuler.set(pitch, yaw, roll);
    scratch.targetQuaternion.setFromEuler(scratch.targetEuler);
    group.current.quaternion.slerp(scratch.targetQuaternion, Math.min(1, delta * (scanning ? 2.2 : 4.5)));

    const dockState = droneDockingState(droneFlightTelemetry.phase);
    rotorNames.forEach((name, index) => {
      const rotor = model.getObjectByName(name);
      // GLB is Y-up: the prop spin axis is the local +Y of each rotor mesh.
      if (rotor) rotor.rotation.y += delta * (index % 2 ? -ROTOR_SPEED : ROTOR_SPEED) * dockState.rotorScale;
    });
    const material = scanMesh.current?.material as ShaderMaterial | undefined;
    const uTime = material?.uniforms.uTime as { value: number } | undefined;
    const uStrength = material?.uniforms.uStrength as { value: number } | undefined;
    if (uTime) uTime.value = time;
    const target = scanning ? 1 : 0;
    if (uStrength) uStrength.value += (target - uStrength.value) * Math.min(1, delta * 3.5);
  });

  const scanning = demoStep === "drone-scan";
  return (
    <group ref={group} position={DRONE_DOCK_WORLD_POSITION} onClick={(event) => { event.stopPropagation(); setFollowing(!following); }}>
      <primitive object={model} ref={modelRef} scale={0.92} rotation={[0, Math.PI, 0]} />
      <pointLight ref={bellyLight} position={[0, -0.7, 0]} color="#6ce5d8" intensity={8} distance={11} />
      <mesh ref={scanCone} position={[0, -9.3, 0]} visible={scanning}>
        <coneGeometry args={[7.5, 18, 40, 1, true]} />
        <meshBasicMaterial color="#65d9cb" transparent opacity={0.06} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={scanMesh} position={[0, -22.1, 0]} rotation={[-Math.PI / 2, 0, 0]} material={scanMaterial}>
        <circleGeometry args={[14, 48]} />
      </mesh>
    </group>
  );
}

useGLTF.preload("/assets/models/fieldvision-drone.glb");
