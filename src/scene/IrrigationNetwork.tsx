import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
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

function ChannelWater({ path, width, baseLift, fillStart, rise }: { path: CatmullRomCurve3; width: number; baseLift: number; fillStart: number; rise: number }) {
  const progress = useFarmStore((state) => state.irrigationProgress);
  const normalMap = useWaterNormal();
  const meshRef = useRef<Mesh>(null);
  const geometry = useMemo(() => createRibbon(path, width, 0, 10), [path, width]);
  const fill = Math.min(1, Math.max(0, (progress - fillStart) / Math.max(0.001, 1 - fillStart)));

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const material = mesh.material as MeshPhysicalMaterial;
    if (material.normalMap) material.normalMap.offset.y += delta * (0.02 + fill * 0.09);
    material.opacity = 0.55 + fill * 0.35;
    material.roughness = 0.16 - fill * 0.09;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position-y={baseLift + fill * rise} receiveShadow>
      <meshPhysicalMaterial
        color="#3d5248"
        roughness={0.14}
        metalness={0}
        clearcoat={0.55}
        clearcoatRoughness={0.25}
        transparent
        opacity={0.55}
        normalMap={normalMap}
        envMapIntensity={1.3}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

function FlowParticles() {
  const pointsRef = useRef<Points>(null);
  const progress = useFarmStore((state) => state.irrigationProgress);
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
    if (!pointsRef.current || progress <= 0.01) return;
    const positions = pointsRef.current.geometry.attributes.position;
    if (!positions) return;
    for (let index = 0; index < count; index += 1) {
      const normalized = (index / count + clock.elapsedTime * (0.05 + progress * 0.05)) % 1;
      const reveal = Math.min(1, progress * 1.18);
      const point = curve.getPointAt(normalized * reveal);
      positions.setXYZ(index, point.x, point.y - 0.1, point.z);
    }
    positions.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} visible={progress > 0.01}>
      <pointsMaterial map={particleTexture} color="#cfe8dd" size={0.68} sizeAttenuation transparent opacity={0.5} depthWrite={false} />
    </points>
  );
}

export function IrrigationNetwork() {
  const mainBank = useMemo(() => createRibbon(curve, 10.2, 0.05), []);
  const branchBank = useMemo(() => createRibbon(branchCurve, 3.6, 0.02, 3), []);
  return (
    <group>
      <mesh geometry={mainBank} receiveShadow castShadow>
        <meshStandardMaterial color="#57503f" roughness={0.98} metalness={0} envMapIntensity={0.25} />
      </mesh>
      <mesh geometry={branchBank} receiveShadow>
        <meshStandardMaterial color="#514b3c" roughness={1} metalness={0} envMapIntensity={0.2} />
      </mesh>
      <ChannelWater path={curve} width={6.2} baseLift={-0.32} fillStart={0} rise={0.26} />
      <ChannelWater path={branchCurve} width={2.1} baseLift={-0.22} fillStart={0.3} rise={0.17} />
      <FlowParticles />
    </group>
  );
}
