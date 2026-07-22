import { Environment, Lightformer } from "@react-three/drei";
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
  InstancedMesh,
  Matrix4,
  Mesh,
  Points,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { visualConfig } from "../config/visual";
import { seededRandom } from "../utils/geometry";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

const sunDirection = new Vector3(...visualConfig.sunDirection).normalize();

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
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
    float amplitude = 0.5;
    for (int octave = 0; octave < 4; octave++) {
      value += amplitude * fvNoise(p);
      p = p * 2.13 + 17.7;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float h = dir.y;
    float sunAmount = max(dot(dir, sunDirection), 0.0);

    vec3 zenith = vec3(0.12, 0.19, 0.34);
    vec3 mid = vec3(0.52, 0.4, 0.44);
    vec3 horizon = vec3(0.99, 0.56, 0.24);
    vec3 sky = mix(horizon, mid, smoothstep(0.0, 0.24, h));
    sky = mix(sky, zenith, smoothstep(0.18, 0.62, h));

    // Warm the horizon around the sun azimuth.
    sky += vec3(0.5, 0.22, 0.05) * pow(sunAmount, 5.0) * (1.0 - smoothstep(0.0, 0.5, h));

    // Streaky high cirrus catching the sunset, stretched along the horizon.
    if (h > 0.02) {
      vec2 cuv = dir.xz / (h + 0.18);
      float cirrus = fvFbm(vec2(cuv.x * 0.55 + cuv.y * 0.2, cuv.y * 1.9) * 1.6);
      cirrus = smoothstep(0.52, 0.78, cirrus);
      float band = smoothstep(0.05, 0.16, h) * (1.0 - smoothstep(0.28, 0.5, h));
      vec3 cirrusColor = mix(vec3(0.96, 0.58, 0.42), vec3(1.0, 0.82, 0.6), pow(sunAmount, 3.0));
      sky = mix(sky, cirrusColor, cirrus * band * 0.5);
    }

    // Sun disc + layered halo (hot enough to feed bloom only at the core).
    float halo = pow(sunAmount, 90.0) * 0.5 + pow(sunAmount, 16.0) * 0.16;
    float disc = smoothstep(0.99955, 0.99985, sunAmount);
    sky += vec3(1.0, 0.72, 0.42) * halo;
    sky += vec3(1.0, 0.9, 0.72) * disc * 2.4;

    // Below horizon: fade to warm ground haze.
    sky = mix(sky, vec3(0.34, 0.24, 0.16), smoothstep(0.0, -0.14, h));

    gl_FragColor = vec4(sky, 1.0);
  }
`;

function GoldenSky() {
  const mesh = useRef<Mesh>(null);
  const uniforms = useMemo(() => ({ sunDirection: { value: sunDirection.clone() } }), []);
  // Keep the dome centred on the camera: every direction stays exactly one
  // radius away, so the sphere can never cross the far plane (which used to
  // clip a polygonal black cap out of the sky near the anti-origin azimuth).
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={mesh} scale={1200} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[1, 48, 28]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

/** Procedural warm gradient environment for coherent IBL — no external HDR needed. */
function GoldenHourEnvironment() {
  const gradient = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (context) {
      const gradientFill = context.createLinearGradient(0, 0, 0, 256);
      gradientFill.addColorStop(0, "#2c3d5c");
      gradientFill.addColorStop(0.42, "#7e6a78");
      gradientFill.addColorStop(0.55, "#e8975c");
      gradientFill.addColorStop(0.62, "#7a5638");
      gradientFill.addColorStop(1, "#241a12");
      context.fillStyle = gradientFill;
      context.fillRect(0, 0, 4, 256);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);
  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.85}>
      <mesh scale={90}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial map={gradient} side={BackSide} />
      </mesh>
      <Lightformer
        form="circle"
        intensity={14}
        color="#ffdfae"
        position={sunDirection.clone().multiplyScalar(60)}
        scale={[7, 7, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer form="rect" intensity={1.6} color="#ff9e56" position={[-40, 6, -44]} scale={[50, 9, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.35} color="#40567a" position={[30, 34, 30]} scale={[60, 20, 1]} target={[0, 0, 0]} />
    </Environment>
  );
}

interface TreeSpec { x: number; z: number; scale: number; rotation: number; tone: number }

function TreeLine() {
  const treeCount = 170;
  const crownsPerTree = 3;
  const poplarCount = 34;

  const trunkGeometry = useMemo(() => new CylinderGeometry(0.22, 0.4, 3.4, 6), []);
  const crownGeometry = useMemo(() => new SphereGeometry(1, 8, 6), []);
  const poplarGeometry = useMemo(() => new ConeGeometry(1, 4.4, 7), []);

  const trees = useMemo<TreeSpec[]>(() => {
    const random = seededRandom(9417);
    return Array.from({ length: treeCount }, (_, index) => {
      const edge = index % 4;
      const along = ((index / treeCount) * 4) % 1;
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

  const setInstances = (mesh: InstancedMesh | null, kind: "trunk" | "crown" | "poplar") => {
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
    if (kind === "crown") {
      let cursor = 0;
      const random = seededRandom(7703);
      trees.forEach((tree) => {
        for (let lobe = 0; lobe < crownsPerTree; lobe += 1) {
          const angle = random() * Math.PI * 2;
          const radius = lobe === 0 ? 0 : (0.9 + random() * 0.9) * tree.scale;
          const size = (lobe === 0 ? 2.5 : 1.5 + random() * 0.8) * tree.scale;
          const height = (lobe === 0 ? 5.1 : 3.9 + random() * 1.2) * tree.scale;
          quaternion.setFromAxisAngle(up, random() * Math.PI);
          matrix.compose(
            new Vector3(tree.x + Math.cos(angle) * radius, height, tree.z + Math.sin(angle) * radius),
            quaternion,
            new Vector3(size * (1.05 + random() * 0.25), size * (0.72 + random() * 0.18), size),
          );
          mesh.setMatrixAt(cursor, matrix);
          color.copy(crownDark).lerp(crownLight, Math.min(1, tree.tone * 0.75 + random() * 0.35));
          mesh.setColorAt(cursor, color);
          cursor += 1;
        }
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
      <instancedMesh args={[crownGeometry, undefined, treeCount * crownsPerTree]} receiveShadow ref={(mesh: InstancedMesh | null) => setInstances(mesh, "crown")}>
        <meshStandardMaterial color="#ffffff" roughness={0.92} />
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
      <GoldenSky />
      <GoldenHourEnvironment />
      <hemisphereLight args={[new Color("#9db1d0"), new Color("#57432c"), 0.7]} />
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
      <TreeLine />
      {tier !== "low" && <DustMotes count={tier === "high" ? 240 : 130} />}
    </>
  );
}
