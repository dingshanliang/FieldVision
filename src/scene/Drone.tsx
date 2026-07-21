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
  Quaternion,
  ShaderMaterial,
  Vector3,
} from "three";
import { visualConfig } from "../config/visual";
import { useFarmStore } from "../state/useFarmStore";

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
  const demoStep = useFarmStore((state) => state.demoStep);
  const following = useFarmStore((state) => state.droneFollowing);
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

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const time = clock.elapsedTime;
    const scanning = demoStep === "drone-scan";
    let yaw: number;
    let pitch: number;
    let roll: number;
    if (scanning) {
      // Hover: gentle bob + slow yaw wander, like station-keeping in a breeze.
      scratch.targetPosition.set(23, 24 + Math.sin(time * 0.85) * 0.28, -66);
      yaw = Math.sin(time * 0.25) * 0.2;
      pitch = Math.sin(time * 0.6) * 0.02;
      roll = Math.sin(time * 0.45 + 1.3) * 0.025;
      group.current.position.lerp(scratch.targetPosition, Math.min(1, delta * 1.8));
    } else {
      const t = (time * visualConfig.droneSpeed) % 1;
      const point = curve.getPointAt(t);
      const ahead = curve.getPointAt((t + 0.012) % 1);
      const further = curve.getPointAt((t + 0.035) % 1);
      group.current.position.copy(point);
      // Heading now vs. slightly ahead → bank (roll) into the turn.
      const headingNow = Math.atan2(ahead.x - point.x, ahead.z - point.z);
      const headingNext = Math.atan2(further.x - ahead.x, further.z - ahead.z);
      let headingDelta = headingNext - headingNow;
      if (headingDelta > Math.PI) headingDelta -= Math.PI * 2;
      if (headingDelta < -Math.PI) headingDelta += Math.PI * 2;
      yaw = headingNow;
      roll = Math.max(-0.38, Math.min(0.38, -headingDelta * 7));
      // Pitch with vertical speed plus a slight nose-down cruise attitude.
      pitch = Math.max(-0.22, Math.min(0.22, (ahead.y - point.y) * -2.2)) + 0.07;
    }
    scratch.targetEuler.set(pitch, yaw, roll);
    scratch.targetQuaternion.setFromEuler(scratch.targetEuler);
    group.current.quaternion.slerp(scratch.targetQuaternion, Math.min(1, delta * (scanning ? 2.2 : 4.5)));

    rotorNames.forEach((name, index) => {
      const rotor = model.getObjectByName(name);
      // GLB is Y-up: the prop spin axis is the local +Y of each rotor mesh.
      if (rotor) rotor.rotation.y += delta * (index % 2 ? -ROTOR_SPEED : ROTOR_SPEED);
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
    <group ref={group} onClick={(event) => { event.stopPropagation(); setFollowing(!following); }}>
      <primitive object={model} scale={0.92} rotation={[0, Math.PI, 0]} />
      <pointLight position={[0, -0.7, 0]} color="#6ce5d8" intensity={8} distance={11} />
      <mesh position={[0, -9.3, 0]} visible={scanning}>
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
