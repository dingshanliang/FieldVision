import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from "three";
import { fbm2D } from "../utils/noise";

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Landscape height: flat farm apron around the fields, rolling fbm hills beyond,
 * so the world no longer ends in a hard rectangular rim.
 */
function terrainHeightAt(x: number, z: number) {
  const dx = Math.max(0, Math.abs(x) - 300);
  const dz = Math.max(0, Math.abs(z) - 235);
  const d = Math.hypot(dx, dz);
  const rise = smoothstep(30, 280, d);
  const hills = fbm2D(x * 0.0055, z * 0.0055, 4, 7) * 21 * rise;
  const undulation = fbm2D(x * 0.02, z * 0.02, 3, 23) * 0.32 * (1 - rise * 0.75);
  return hills + undulation - 0.12;
}

function RidgeRing({ radius, baseHeight, variance, seed, color }: {
  radius: number;
  baseHeight: number;
  variance: number;
  seed: number;
  color: string;
}) {
  const geometry = useMemo(() => {
    const segments = 220;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const ridge = baseHeight + fbm2D(Math.cos(angle) * 3.1, Math.sin(angle) * 3.1, 4, seed) * variance
        + fbm2D(Math.cos(angle) * 9.4, Math.sin(angle) * 9.4, 2, seed + 5) * variance * 0.22;
      positions.push(x, -10, z, x, Math.max(6, ridge), z);
      if (index < segments) {
        const row = index * 2;
        indices.push(row, row + 2, row + 1, row + 1, row + 2, row + 3);
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(positions, 3));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  }, [radius, baseHeight, variance, seed]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} fog side={DoubleSide} />
    </mesh>
  );
}

export function Terrain() {
  const [sourceColor, sourceNormal, sourceRoughness] = useTexture([
    "/assets/textures/source/Ground026/Ground026_1K-JPG_Color.jpg",
    "/assets/textures/source/Ground026/Ground026_1K-JPG_NormalGL.jpg",
    "/assets/textures/source/Ground026/Ground026_1K-JPG_Roughness.jpg",
  ]) as [Texture, Texture, Texture];
  const [colorMap, normalMap, roughnessMap] = useMemo(() => {
    const maps = [sourceColor.clone(), sourceNormal.clone(), sourceRoughness.clone()] as [Texture, Texture, Texture];
    maps.forEach((texture) => { texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping; texture.repeat.set(30, 24); });
    maps[0].colorSpace = SRGBColorSpace;
    return maps;
  }, [sourceColor, sourceNormal, sourceRoughness]);

  const geometry = useMemo(() => {
    const result = new PlaneGeometry(920, 720, 200, 156);
    result.rotateX(-Math.PI / 2);
    const positions = result.attributes.position;
    const colors: number[] = [];
    const grass = new Color("#4d5a34");
    const meadow = new Color("#5d6137");
    const dry = new Color("#6d5a3a");
    const hill = new Color("#665137");
    const scratch = new Color();

    if (positions) {
      for (let index = 0; index < positions.count; index += 1) {
        const x = positions.getX(index);
        const z = positions.getZ(index);
        const height = terrainHeightAt(x, z);
        positions.setY(index, height);

        const patch = fbm2D(x * 0.012 + 40, z * 0.012 - 17, 3, 91) * 0.5 + 0.5;
        const hilliness = smoothstep(1.5, 14, height);
        scratch.copy(grass).lerp(meadow, patch);
        scratch.lerp(dry, smoothstep(0.55, 0.9, fbm2D(x * 0.03 - 11, z * 0.03 + 29, 2, 47) * 0.5 + 0.5) * 0.55);
        scratch.lerp(hill, hilliness);
        colors.push(scratch.r, scratch.g, scratch.b);
      }
      result.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
      result.computeVertexNormals();
    }
    return result;
  }, []);

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          vertexColors
          map={colorMap}
          normalMap={normalMap}
          roughnessMap={roughnessMap}
          roughness={1}
          metalness={0}
          envMapIntensity={0.28}
        />
      </mesh>
      <RidgeRing radius={640} baseHeight={26} variance={34} seed={311} color="#5c4a40" />
      <RidgeRing radius={810} baseHeight={44} variance={52} seed={877} color="#71606b" />
    </group>
  );
}
