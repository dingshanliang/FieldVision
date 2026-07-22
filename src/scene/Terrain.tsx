import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import {
  BufferAttribute,
  Color,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  Vector2,
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

export function Terrain() {
  const [sourceColor, sourceNormal, sourceRoughness] = useTexture([
    "/assets/textures/source/Ground026/Ground026_1K-JPG_Color.jpg",
    "/assets/textures/source/Ground026/Ground026_1K-JPG_NormalGL.jpg",
    "/assets/textures/source/Ground026/Ground026_1K-JPG_Roughness.jpg",
  ]) as [Texture, Texture, Texture];
  const [colorMap, normalMap, roughnessMap] = useMemo(() => {
    const maps = [sourceColor.clone(), sourceNormal.clone(), sourceRoughness.clone()] as [Texture, Texture, Texture];
    maps.forEach((texture) => { texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping; texture.repeat.set(20, 16); });
    maps[0].colorSpace = SRGBColorSpace;
    return maps;
  }, [sourceColor, sourceNormal, sourceRoughness]);

  const geometry = useMemo(() => {
    const result = new PlaneGeometry(920, 720, 200, 156);
    result.rotateX(-Math.PI / 2);
    const positions = result.attributes.position;
    const colors: number[] = [];
    const grass = new Color("#81906e");
    const meadow = new Color("#909a78");
    const dry = new Color("#9d896b");
    const hill = new Color("#7e8980");
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
          normalScale={new Vector2(0.28, 0.28)}
          roughnessMap={roughnessMap}
          roughness={1}
          metalness={0}
          envMapIntensity={0.28}
        />
      </mesh>
    </group>
  );
}
