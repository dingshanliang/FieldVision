import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshPhysicalMaterial,
  Points,
  PointsMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three";
import type { WebGLProgramParametersWithUniforms } from "three";
import { useKtx2 } from "./ktx2Loader";
import { useFarmStore } from "../state/useFarmStore";
import { deriveIrrigationEvent } from "../state/irrigationEvent";
import { seededRandom } from "../utils/geometry";

const mainPoints = [[82, 1.3, 104], [78, 1.1, 78], [74, 0.8, 43], [70, 0.9, 8], [67, 1.1, -20], [62, 1.2, -44], [54, 1.35, -62]] as const;
const curve = new CatmullRomCurve3(mainPoints.map(([x, y, z]) => new Vector3(x, y, z)), false, "catmullrom", 0.28);

const branchPoints = [[69, 1.05, -18], [66.5, 1.0, -25], [63, 0.95, -31], [58, 0.9, -35]] as const;
const branchCurve = new CatmullRomCurve3(branchPoints.map(([x, y, z]) => new Vector3(x, y, z)), false, "catmullrom", 0.3);

function createRibbon(path: CatmullRomCurve3, width: number, lift: number, uvScale = 8) {
  const divisions = 90;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= divisions; index += 1) {
    const t = index / divisions;
    const point = path.getPointAt(t);
    const tangent = path.getTangentAt(t).normalize();
    const side = new Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
    positions.push(point.x + side.x, point.y + lift, point.z + side.z, point.x - side.x, point.y + lift, point.z - side.z);
    uvs.push(0, t * uvScale, 1, t * uvScale);
    if (index < divisions) {
      const row = index * 2;
      indices.push(row, row + 1, row + 2, row + 1, row + 3, row + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Two side bands with an open centre, used for earthen banks and concrete lining. */
function createEdgeBands(path: CatmullRomCurve3, outerWidth: number, innerWidth: number, lift: number, uvScale = 8) {
  const divisions = 90;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= divisions; index += 1) {
    const t = index / divisions;
    const point = path.getPointAt(t);
    const tangent = path.getTangentAt(t).normalize();
    const side = new Vector3(-tangent.z, 0, tangent.x).normalize();
    const offsets = [outerWidth / 2, innerWidth / 2, -innerWidth / 2, -outerWidth / 2];
    offsets.forEach((offset, sideIndex) => {
      positions.push(point.x + side.x * offset, point.y + lift, point.z + side.z * offset);
      uvs.push(sideIndex === 0 || sideIndex === 3 ? 0 : 1, t * uvScale);
    });
    if (index < divisions) {
      const row = index * 4;
      indices.push(
        row, row + 1, row + 4,
        row + 1, row + 5, row + 4,
        row + 2, row + 3, row + 6,
        row + 3, row + 7, row + 6,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function useWaterNormal(): Texture {
  const [sourceNormal] = useKtx2(["/assets/textures/source/Ground037/Ground037_1K-JPG_NormalGL.ktx2"]);
  return useMemo(() => {
    const map = sourceNormal.clone();
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat.set(0.5, 3);
    return map;
  }, [sourceNormal]);
}

function useChannelMaps(asset: "Concrete032" | "Ground037"): [Texture, Texture, Texture] {
  const [sourceColor, sourceNormal, sourceRoughness] = useKtx2([
    `/assets/textures/source/${asset}/${asset}_1K-JPG_Color.ktx2`,
    `/assets/textures/source/${asset}/${asset}_1K-JPG_NormalGL.ktx2`,
    `/assets/textures/source/${asset}/${asset}_1K-JPG_Roughness.ktx2`,
  ]);
  return useMemo(() => {
    const maps = [sourceColor.clone(), sourceNormal.clone(), sourceRoughness.clone()] as [Texture, Texture, Texture];
    maps.forEach((map) => {
      map.wrapS = RepeatWrapping;
      map.wrapT = RepeatWrapping;
      map.repeat.set(1.4, 9);
    });
    maps[0].colorSpace = SRGBColorSpace;
    return maps;
  }, [sourceColor, sourceNormal, sourceRoughness]);
}

function ChannelWater({ path, width, baseLift, fill, rise }: { path: CatmullRomCurve3; width: number; baseLift: number; fill: number; rise: number }) {
  const normalMap = useWaterNormal();
  const meshRef = useRef<Mesh>(null);
  const shaderRef = useRef<WebGLProgramParametersWithUniforms | null>(null);
  const geometry = useMemo(() => createRibbon(path, width, 0, 10), [path, width]);
  const patchWaterShader = useMemo(() => (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uFvTime = { value: 0 };
    shader.uniforms.uFvFlow = { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float uFvTime;
        uniform float uFvFlow;
        varying vec2 vFvWaterUv;
        varying vec3 vFvWaterWorld;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        float fvAlong = uv.y * 0.82;
        float fvAcross = uv.x * 6.2831853;
        float fvWaveA = sin(fvAlong * 2.6 + uFvTime * (0.65 + uFvFlow * 1.45) + sin(fvAcross) * 0.35);
        float fvWaveB = sin(fvAlong * 5.1 - uFvTime * 0.42 + fvAcross * 0.45);
        float fvWaveMix = 0.3 + uFvFlow * 0.7;
        transformed.y += (fvWaveA * 0.035 + fvWaveB * 0.018) * fvWaveMix;
        transformed.x += cos(fvAlong * 2.6 + uFvTime * 0.65) * 0.012 * fvWaveMix;
        transformed.z += sin(fvAlong * 5.1 - uFvTime * 0.42) * 0.008 * fvWaveMix;
        vFvWaterUv = uv;
        vFvWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uFvTime;
        uniform float uFvFlow;
        varying vec2 vFvWaterUv;
        varying vec3 vFvWaterWorld;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        {
          vec3 fvView = normalize(cameraPosition - vFvWaterWorld);
          vec2 fvD1 = normalize(vec2(0.82, 0.57));
          vec2 fvD2 = normalize(vec2(-0.35, 0.94));
          float fvP1 = dot(vFvWaterWorld.xz, fvD1) * 1.35 + uFvTime * (0.8 + uFvFlow * 1.2);
          float fvP2 = dot(vFvWaterWorld.xz, fvD2) * 2.15 - uFvTime * 0.55;
          vec2 fvSlope = cos(fvP1) * fvD1 * 0.09 + cos(fvP2) * fvD2 * 0.045;
          vec3 fvNormal = normalize(vec3(-fvSlope.x, 1.0, -fvSlope.y));
          float fvFresnel = pow(1.0 - clamp(dot(fvView, fvNormal), 0.0, 1.0), 3.0);
          vec3 fvSun = normalize(vec3(-1.0, 0.38, 0.15));
          float fvGlint = pow(max(dot(reflect(-fvView, fvNormal), fvSun), 0.0), 72.0);
          float fvEdge = 1.0 - smoothstep(0.015, 0.15, min(vFvWaterUv.x, 1.0 - vFvWaterUv.x));
          float fvFoamNoise = 0.58 + 0.42 * sin(vFvWaterUv.y * 18.0 - uFvTime * (1.1 + uFvFlow));
          float fvFoam = fvEdge * smoothstep(0.08, 0.42, uFvFlow) * smoothstep(0.18, 0.74, fvFoamNoise) * 0.68;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.39, 0.57, 0.58), fvFresnel * 0.42);
          diffuseColor.rgb += fvGlint * vec3(1.0, 0.82, 0.58) * (0.12 + uFvFlow * 0.26);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.76, 0.84, 0.76), fvFoam);
        }`);
    shaderRef.current = shader;
  }, []);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const material = mesh.material as MeshPhysicalMaterial;
    if (material.normalMap) material.normalMap.offset.y += delta * (0.02 + fill * 0.09);
    material.opacity = 0.64 + fill * 0.2;
    material.roughness = 0.34 - fill * 0.1;
    const shader = shaderRef.current;
    if (shader) {
      shader.uniforms.uFvTime!.value = clock.elapsedTime;
      shader.uniforms.uFvFlow!.value = fill;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position-y={baseLift + fill * rise} receiveShadow>
      <meshPhysicalMaterial
        color="#557b70"
        roughness={0.34}
        metalness={0}
        clearcoat={0.38}
        clearcoatRoughness={0.38}
        transparent
        opacity={0.68}
        normalMap={normalMap}
        onBeforeCompile={patchWaterShader}
        envMapIntensity={0.76}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

function FlowParticles({ path, flowProgress, pulseProgress, count = 42, size = 0.44, lift = -0.1 }: { path: CatmullRomCurve3; flowProgress: number; pulseProgress: number; count?: number; size?: number; lift?: number }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<PointsMaterial>(null);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return result;
  }, [count]);
  const particleTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 30);
      gradient.addColorStop(0, "rgba(225, 244, 236, .9)");
      gradient.addColorStop(0.45, "rgba(150, 214, 196, .42)");
      gradient.addColorStop(1, "rgba(96, 172, 156, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);

  // Accumulated phase + eased speed: the current accelerates from a stand when
  // the gate opens, instead of every particle already moving at working speed
  // the instant it becomes visible. elapsedTime*speed would teleport particles
  // whenever the speed target changes, so the phase is integrated per-frame.
  const speedRef = useRef(0);
  const phaseRef = useRef(0);
  const previousArrivalRef = useRef(0);
  const arrivalPulseRef = useRef(0);
  const pointScratch = useRef(new Vector3());
  useFrame((_, delta) => {
    const material = materialRef.current;
    if (previousArrivalRef.current < 0.6 && pulseProgress >= 0.6) arrivalPulseRef.current = 1;
    previousArrivalRef.current = pulseProgress;
    arrivalPulseRef.current = Math.max(0, arrivalPulseRef.current - delta * 0.92);
    if (material) {
      const pulse = arrivalPulseRef.current * arrivalPulseRef.current;
      material.opacity = 0.3 + pulse * 0.3;
      material.size = size * (1 + pulse * 0.18);
    }
    if (!pointsRef.current || flowProgress <= 0.01) return;
    const positions = pointsRef.current.geometry.attributes.position;
    if (!positions) return;
    const targetSpeed = 0.05 + flowProgress * 0.05;
    speedRef.current += (targetSpeed - speedRef.current) * Math.min(1, delta * 1.5);
    phaseRef.current = (phaseRef.current + delta * speedRef.current) % 1;
    const reveal = Math.min(1, flowProgress * 1.18);
    for (let index = 0; index < count; index += 1) {
      const normalized = (index / count + phaseRef.current) % 1;
      const point = path.getPointAt(normalized * reveal, pointScratch.current);
      positions.setXYZ(index, point.x, point.y + lift, point.z);
    }
    positions.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} visible={flowProgress > 0.01}>
      <pointsMaterial ref={materialRef} map={particleTexture} color="#cfe8dd" size={size} sizeAttenuation transparent opacity={0.3} depthWrite={false} />
    </points>
  );
}

interface MistSeed {
  phase: number;
  speed: number;
  angle: number;
  radius: number;
  drift: number;
}

/** Restrained backlit spray where moving water meets open air. */
function WaterMist({ name, position, strength, count = 26, spread = 1 }: { name: string; position: [number, number, number]; strength: number; count?: number; spread?: number }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<PointsMaterial>(null);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return result;
  }, [count]);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(24, 24, 1, 24, 24, 22);
      gradient.addColorStop(0, "rgba(236, 244, 232, .58)");
      gradient.addColorStop(0.28, "rgba(184, 211, 199, .24)");
      gradient.addColorStop(1, "rgba(132, 169, 158, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 48, 48);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  const seeds = useMemo<MistSeed[]>(() => {
    const random = seededRandom(1847 + count * 31);
    return Array.from({ length: count }, () => ({
      phase: random(),
      speed: 0.38 + random() * 0.46,
      angle: random() * Math.PI * 2,
      radius: 0.16 + random() * 0.84,
      drift: random() - 0.5,
    }));
  }, [count]);

  useFrame(({ clock }, delta) => {
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!points || !material) return;
    const eased = strength * strength * (3 - 2 * strength);
    material.opacity += (eased * 0.42 - material.opacity) * Math.min(1, delta * 4.2);
    material.size = 0.22 + eased * 0.2;
    if (eased <= 0.002) return;
    const positions = points.geometry.attributes.position;
    if (!positions) return;
    const time = clock.elapsedTime;
    seeds.forEach((seed, index) => {
      const life = (seed.phase + time * seed.speed) % 1;
      const expansion = life * spread * seed.radius;
      const fadeLift = Math.sin(life * Math.PI);
      positions.setXYZ(
        index,
        Math.cos(seed.angle) * expansion + seed.drift * life * 0.34,
        life * (0.52 + spread * 0.3) + fadeLift * 0.16,
        Math.sin(seed.angle) * expansion * 0.58,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points name={name} ref={pointsRef} position={position} geometry={geometry} visible={strength > 0.01} frustumCulled={false}>
      <pointsMaterial
        ref={materialRef}
        map={texture}
        color="#d8e4dc"
        size={0.22}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  );
}

export function IrrigationNetwork() {
  const progress = useFarmStore((state) => state.irrigationProgress);
  const event = deriveIrrigationEvent(progress);
  const mainBank = useMemo(() => createEdgeBands(curve, 12.4, 8.4, 0.05), []);
  const mainLining = useMemo(() => createEdgeBands(curve, 8.4, 5.7, 0.07), []);
  const branchBank = useMemo(() => createEdgeBands(branchCurve, 5.4, 3.25, 0.02, 3), []);
  const branchLining = useMemo(() => createEdgeBands(branchCurve, 3.25, 1.85, 0.04, 3), []);
  const [soilColor, soilNormal, soilRoughness] = useChannelMaps("Ground037");
  const [concreteColor, concreteNormal, concreteRoughness] = useChannelMaps("Concrete032");
  return (
    <group>
      <mesh geometry={mainBank} receiveShadow castShadow>
        <meshStandardMaterial color="#5e5948" map={soilColor} normalMap={soilNormal} roughnessMap={soilRoughness} roughness={1} metalness={0} envMapIntensity={0.18} side={DoubleSide} />
      </mesh>
      <mesh geometry={branchBank} receiveShadow>
        <meshStandardMaterial color="#585344" map={soilColor} normalMap={soilNormal} roughnessMap={soilRoughness} roughness={1} metalness={0} envMapIntensity={0.16} side={DoubleSide} />
      </mesh>
      <mesh geometry={mainLining} receiveShadow>
        <meshStandardMaterial color="#88877d" map={concreteColor} normalMap={concreteNormal} roughnessMap={concreteRoughness} roughness={0.92} metalness={0} envMapIntensity={0.25} side={DoubleSide} />
      </mesh>
      <mesh geometry={branchLining} receiveShadow>
        <meshStandardMaterial color="#7b7a70" map={concreteColor} normalMap={concreteNormal} roughnessMap={concreteRoughness} roughness={0.95} metalness={0} envMapIntensity={0.22} side={DoubleSide} />
      </mesh>
      <ChannelWater path={curve} width={5.7} baseLift={-0.3} fill={event.mainChannelProgress} rise={0.24} />
      <ChannelWater path={branchCurve} width={1.85} baseLift={-0.2} fill={event.branchChannelProgress} rise={0.15} />
      <FlowParticles path={curve} flowProgress={event.mainChannelProgress} pulseProgress={event.inletProgress} />
      {/* East branch actually delivers water to A02 — its flow cue must read as
          strongly as the main canal, not just an opacity change on the surface. */}
      <FlowParticles path={branchCurve} flowProgress={event.branchChannelProgress} pulseProgress={event.inletProgress} count={24} size={0.28} lift={-0.08} />
      {/* Fine spray is localized to actual hydraulic transitions: the main
          pump discharge, then the A02 headwall as water reaches the parcel. */}
      <WaterMist name="PumpOutletMist" position={[78.9, 2.12, 94.65]} strength={event.pumpProgress} count={52} spread={1.25} />
      <WaterMist name="A02InletMist" position={[57.3, 1.82, -34.6]} strength={event.inletProgress} count={40} spread={0.9} />
    </group>
  );
}
