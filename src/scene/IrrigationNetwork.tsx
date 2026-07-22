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
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three";
import { useTexture } from "@react-three/drei";
import { useFarmStore } from "../state/useFarmStore";
import { deriveIrrigationEvent } from "../state/irrigationEvent";

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
  const [sourceNormal] = useTexture(["/assets/textures/source/Ground037/Ground037_1K-JPG_NormalGL.jpg"]) as [Texture];
  return useMemo(() => {
    const map = sourceNormal.clone();
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.repeat.set(0.5, 3);
    return map;
  }, [sourceNormal]);
}

function useChannelMaps(asset: "Concrete032" | "Ground037"): [Texture, Texture, Texture] {
  const [sourceColor, sourceNormal, sourceRoughness] = useTexture([
    `/assets/textures/source/${asset}/${asset}_1K-JPG_Color.jpg`,
    `/assets/textures/source/${asset}/${asset}_1K-JPG_NormalGL.jpg`,
    `/assets/textures/source/${asset}/${asset}_1K-JPG_Roughness.jpg`,
  ]) as [Texture, Texture, Texture];
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
  const geometry = useMemo(() => createRibbon(path, width, 0, 10), [path, width]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const material = mesh.material as MeshPhysicalMaterial;
    if (material.normalMap) material.normalMap.offset.y += delta * (0.02 + fill * 0.09);
    material.opacity = 0.64 + fill * 0.2;
    material.roughness = 0.34 - fill * 0.1;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position-y={baseLift + fill * rise} receiveShadow>
      <meshPhysicalMaterial
        color="#45665d"
        roughness={0.34}
        metalness={0}
        clearcoat={0.28}
        clearcoatRoughness={0.38}
        transparent
        opacity={0.64}
        normalMap={normalMap}
        envMapIntensity={0.62}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

function FlowParticles({ flowProgress }: { flowProgress: number }) {
  const pointsRef = useRef<Points>(null);
  const count = 42;
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return result;
  }, []);
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

  useFrame(({ clock }) => {
    if (!pointsRef.current || flowProgress <= 0.01) return;
    const positions = pointsRef.current.geometry.attributes.position;
    if (!positions) return;
    for (let index = 0; index < count; index += 1) {
      const normalized = (index / count + clock.elapsedTime * (0.05 + flowProgress * 0.05)) % 1;
      const reveal = Math.min(1, flowProgress * 1.18);
      const point = curve.getPointAt(normalized * reveal);
      positions.setXYZ(index, point.x, point.y - 0.1, point.z);
    }
    positions.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} visible={flowProgress > 0.01}>
      <pointsMaterial map={particleTexture} color="#cfe8dd" size={0.44} sizeAttenuation transparent opacity={0.3} depthWrite={false} />
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
      <FlowParticles flowProgress={event.mainChannelProgress} />
    </group>
  );
}
