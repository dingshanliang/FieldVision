import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  Points,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import { visualConfig } from "../config/visual";
import { seededRandom } from "../utils/geometry";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { SafePhotographicHorizon } from "./PhotographicHorizon";

const sunDirection = new Vector3(...visualConfig.sunDirection).normalize();

const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  varying vec3 vDirection;
  uniform vec3 sunDirection;

  float fvHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fvNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(fvHash(i), fvHash(i + vec2(1.0, 0.0)), u.x),
               mix(fvHash(i + vec2(0.0, 1.0)), fvHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fvFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.52;
    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * fvNoise(p);
      p = p * 2.08 + 13.7;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float h = dir.y;
    float vertical = smoothstep(-0.08, 0.72, h);
    vec3 horizon = vec3(0.67, 0.72, 0.72);
    vec3 zenith = vec3(0.22, 0.36, 0.52);
    vec3 sky = mix(horizon, zenith, vertical);

    if (h > 0.015) {
      vec2 projected = dir.xz / (h + 0.24);
      float broad = fvFbm(projected * vec2(0.55, 0.9) + vec2(4.7, -2.1));
      float detail = fvFbm(projected * vec2(1.25, 1.65) - vec2(8.2, 3.6));
      float cloud = smoothstep(0.38, 0.58, broad * 0.72 + detail * 0.28);
      float cloudBand = smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.5, 0.83, h));
      float underside = smoothstep(0.48, 0.64, broad);
      vec3 cloudColor = mix(vec3(0.47, 0.52, 0.55), vec3(0.88, 0.88, 0.83), underside);
      sky = mix(sky, cloudColor, cloud * cloudBand * 0.64);
    }

    float sunAmount = max(dot(dir, sunDirection), 0.0);
    sky += vec3(1.0, 0.69, 0.38) * pow(sunAmount, 24.0) * 0.12;
    sky += vec3(1.0, 0.88, 0.66) * smoothstep(0.99984, 0.99995, sunAmount) * 1.0;
    sky = mix(sky, vec3(0.31, 0.35, 0.33), smoothstep(0.0, -0.14, h));
    gl_FragColor = vec4(sky, 1.0);
  }
`;

function MorningSky() {
  const mesh = useRef<Mesh>(null);
  const uniforms = useMemo(() => ({ sunDirection: { value: sunDirection.clone() } }), []);
  useFrame(({ camera }) => mesh.current?.position.copy(camera.position));
  return (
    <mesh ref={mesh} scale={1200} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[1, 64, 36]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={skyVertexShader}
        fragmentShader={skyFragmentShader}
      />
    </mesh>
  );
}

/** Real rural HDR lighting gives metal, water and leaf surfaces coherent reflections. */
function GoldenHourEnvironment() {
  return (
    <Environment files="/assets/environment/rural_landscape_1k.hdr" environmentIntensity={0.58} />
  );
}

interface TreeSpec { x: number; z: number; scale: number; rotation: number; tone: number }

function TreeLine() {
  const treeCount = 170;
  const poplarCount = 34;

  const trunkGeometry = useMemo(() => new CylinderGeometry(0.22, 0.4, 3.4, 6), []);
  const crownGeometry = useMemo(() => new PlaneGeometry(6.8, 6.4), []);
  const poplarGeometry = useMemo(() => new ConeGeometry(1, 4.4, 7), []);
  const crownTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (context) {
      const random = seededRandom(12017);
      for (let index = 0; index < 210; index += 1) {
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(random());
        const x = 128 + Math.cos(angle) * radius * 93 * (0.76 + random() * 0.24);
        const y = 126 + Math.sin(angle) * radius * 73 - radius * 10;
        const width = 8 + random() * 20;
        const height = width * (0.58 + random() * 0.42);
        const light = 36 + Math.round(random() * 38);
        const alpha = 0.42 + random() * 0.48;
        const gradient = context.createRadialGradient(x - width * 0.18, y - height * 0.2, 1, x, y, width);
        gradient.addColorStop(0, `rgba(${light + 12}, ${light + 35}, ${light + 3}, ${alpha})`);
        gradient.addColorStop(0.62, `rgba(${light - 4}, ${light + 19}, ${Math.max(18, light - 15)}, ${alpha * 0.9})`);
        gradient.addColorStop(1, `rgba(18, 34, 18, 0)`);
        context.save();
        context.translate(x, y);
        context.scale(1, height / width);
        context.translate(-x, -y);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, width, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);

  const trees = useMemo<TreeSpec[]>(() => {
    const random = seededRandom(9417);
    return Array.from({ length: treeCount }, (_, index) => {
      const edge = index % 4;
      const along = Math.min(1, Math.max(0, ((index / treeCount) * 4) % 1 + (random() - 0.5) * 0.018));
      let x = 0;
      let z = 0;
      if (edge === 0) { x = -262 + along * 524; z = -192 - random() * 26; }
      if (edge === 1) { x = 250 + random() * 24; z = -188 + along * 376; }
      if (edge === 2) { x = 262 - along * 524; z = 192 + random() * 26; }
      if (edge === 3) { x = -250 - random() * 24; z = 188 - along * 376; }
      return { x, z, scale: 0.75 + random() * 0.85, rotation: random() * Math.PI * 2, tone: random() };
    });
  }, []);

  // Poplars line the farm tracks (east road + south road) — previously they ran
  // in a straight file straight through the A03 and B03 fields.
  const poplars = useMemo<TreeSpec[]>(() => {
    const random = seededRandom(3351);
    const eastCount = 18;
    const southCount = 16;
    const list: TreeSpec[] = [];
    for (let index = 0; index < eastCount; index += 1) {
      const t = index / (eastCount - 1);
      list.push({
        x: 171 + random() * 2.6,
        z: 88 - t * 184 + (random() - 0.5) * 4,
        scale: 0.8 + random() * 0.55,
        rotation: random() * Math.PI * 2,
        tone: random(),
      });
    }
    for (let index = 0; index < southCount; index += 1) {
      const t = index / (southCount - 1);
      list.push({
        x: -148 + t * 296 + (random() - 0.5) * 4,
        z: -111 - random() * 2.6,
        scale: 0.8 + random() * 0.55,
        rotation: random() * Math.PI * 2,
        tone: random(),
      });
    }
    return list;
  }, []);

  const crownDark = useMemo(() => new Color("#22331f"), []);
  const crownLight = useMemo(() => new Color("#57683a"), []);
  const poplarDark = useMemo(() => new Color("#1d2c1e"), []);
  const poplarLight = useMemo(() => new Color("#3d5230"), []);

  const setInstances = (mesh: InstancedMesh | null, kind: "trunk" | "crown" | "crown-cross" | "poplar") => {
    if (!mesh) return;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const color = new Color();
    if (kind === "trunk") {
      trees.forEach((tree, index) => {
        quaternion.setFromAxisAngle(up, tree.rotation);
        matrix.compose(new Vector3(tree.x, 1.5 * tree.scale, tree.z), quaternion, new Vector3(tree.scale, tree.scale, tree.scale));
        mesh.setMatrixAt(index, matrix);
      });
    }
    if (kind === "crown" || kind === "crown-cross") {
      trees.forEach((tree, index) => {
        quaternion.setFromAxisAngle(up, tree.rotation + (kind === "crown-cross" ? Math.PI / 2 : 0));
        matrix.compose(
          new Vector3(tree.x, 5.0 * tree.scale, tree.z),
          quaternion,
          new Vector3(tree.scale * (0.9 + tree.tone * 0.25), tree.scale * (0.88 + tree.tone * 0.18), tree.scale),
        );
        mesh.setMatrixAt(index, matrix);
        color.copy(crownDark).lerp(crownLight, Math.min(1, tree.tone * 0.72 + 0.18));
        mesh.setColorAt(index, color);
      });
    }
    if (kind === "poplar") {
      poplars.forEach((tree, index) => {
        quaternion.setFromAxisAngle(up, tree.rotation);
        matrix.compose(
          new Vector3(tree.x, 2.1 * tree.scale, tree.z),
          quaternion,
          new Vector3(tree.scale * 0.85, tree.scale * 1.6, tree.scale * 0.85),
        );
        mesh.setMatrixAt(index, matrix);
        color.copy(poplarDark).lerp(poplarLight, tree.tone);
        mesh.setColorAt(index, color);
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  return (
    <group>
      <instancedMesh args={[trunkGeometry, undefined, treeCount]} receiveShadow ref={(mesh: InstancedMesh | null) => setInstances(mesh, "trunk")}>
        <meshStandardMaterial color="#4a3b28" roughness={1} />
      </instancedMesh>
      <instancedMesh args={[crownGeometry, undefined, treeCount]} receiveShadow ref={(mesh: InstancedMesh | null) => setInstances(mesh, "crown")}>
        <meshStandardMaterial map={crownTexture} color="#ffffff" roughness={0.94} side={DoubleSide} alphaTest={0.2} alphaToCoverage />
      </instancedMesh>
      <instancedMesh args={[crownGeometry, undefined, treeCount]} receiveShadow ref={(mesh: InstancedMesh | null) => setInstances(mesh, "crown-cross")}>
        <meshStandardMaterial map={crownTexture} color="#ffffff" roughness={0.94} side={DoubleSide} alphaTest={0.2} alphaToCoverage />
      </instancedMesh>
      <instancedMesh args={[poplarGeometry, undefined, poplarCount]} receiveShadow ref={(mesh: InstancedMesh | null) => setInstances(mesh, "poplar")}>
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** Backlit dust motes drifting over the farm — sells the golden-hour air. */
function DustMotes({ count }: { count: number }) {
  const pointsRef = useRef<Points>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 1, 16, 16, 15);
      gradient.addColorStop(0, "rgba(255, 232, 196, 0.85)");
      gradient.addColorStop(0.5, "rgba(255, 214, 160, 0.28)");
      gradient.addColorStop(1, "rgba(255, 206, 150, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  const seeds = useMemo(() => {
    const random = seededRandom(6101);
    return Array.from({ length: count }, () => ({
      x: (random() - 0.5) * 380,
      y: 0.6 + random() * 22,
      z: -150 + random() * 300,
      phase: random() * Math.PI * 2,
      speed: 0.14 + random() * 0.4,
    }));
  }, [count]);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return result;
  }, [count]);

  useFrame(({ clock }) => {
    const positions = pointsRef.current?.geometry.attributes.position;
    if (!positions) return;
    const time = clock.elapsedTime;
    seeds.forEach((mote, index) => {
      positions.setXYZ(
        index,
        mote.x + Math.sin(time * mote.speed + mote.phase) * 2.4,
        mote.y + Math.sin(time * mote.speed * 0.7 + mote.phase * 1.7) * 1.5,
        mote.z + Math.cos(time * mote.speed * 0.9 + mote.phase) * 2.4,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={texture}
        color="#ffd9a8"
        size={0.85}
        sizeAttenuation
        transparent
        opacity={0.34}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function Atmosphere() {
  const tier = usePerformanceTier();
  const shadowSize = tier === "high" ? 4096 : tier === "medium" ? 2048 : 1024;
  return (
    <>
      <fogExp2 attach="fog" args={[visualConfig.fogColor, visualConfig.fogDensity]} />
      <MorningSky />
      <GoldenHourEnvironment />
      <hemisphereLight args={[new Color("#b8cad4"), new Color("#4c4a3b"), 0.88]} />
      <directionalLight
        position={[sunDirection.x * 260, sunDirection.y * 260, sunDirection.z * 260]}
        intensity={visualConfig.sunIntensity}
        color={visualConfig.sunColor}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-210}
        shadow-camera-right={210}
        shadow-camera-top={190}
        shadow-camera-bottom={-190}
        shadow-camera-near={10}
        shadow-camera-far={720}
        shadow-bias={-0.00012}
        shadow-normalBias={0.6}
        shadow-radius={5}
      />
      <SafePhotographicHorizon fallback={<TreeLine />} />
      {tier !== "low" && <DustMotes count={tier === "high" ? 240 : 130} />}
    </>
  );
}
