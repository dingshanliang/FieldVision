import { useMemo } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Float32BufferAttribute,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from "three";

/**
 * Farm track network: a ring road around the field blocks plus a short spur
 * toward the pump station. Sits on the flat farm apron (terrain undulates at
 * most ±0.32 there, so y = 0.34 keeps the surface above ground everywhere).
 */
const ROAD_Y = 0.34;
const roadPaths: Array<{ points: Array<[number, number]>; width: number }> = [
  { points: [[-165, -104], [-60, -106], [40, -103], [162, -100]], width: 5.6 }, // south
  { points: [[162, -100], [166, -20], [164, 60], [150, 96]], width: 5.6 }, // east
  { points: [[150, 96], [110, 102], [92, 103]], width: 4.2 }, // pump spur
  { points: [[-165, -104], [-168, 0], [-166, 80], [-150, 122]], width: 5.2 }, // west
  { points: [[-150, 122], [-60, 126], [30, 124], [80, 120]], width: 5.2 }, // north
  { points: [[-153, -18], [-82, -21], [-10, -22], [63, -20], [154, -15]], width: 4.4 }, // central field track
  { points: [[-49, -98], [-47, -56], [-48, -20], [-43, 36], [-36, 79], [-30, 118]], width: 3.8 }, // north-south service track
];

function createRoadGeometry(points: Array<[number, number]>, width: number) {
  const curve = new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z)), false, "catmullrom", 0.35);
  const length = curve.getLength();
  const divisions = Math.max(24, Math.floor(length / 3));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= divisions; index += 1) {
    const t = index / divisions;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
    positions.push(point.x + side.x, ROAD_Y, point.z + side.z, point.x - side.x, ROAD_Y, point.z - side.z);
    uvs.push(0, t * length / 8, 1, t * length / 8);
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

/** Dirt with two darker wheel ruts across the width; tiles along the road. */
function makeRoadTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#8d7454";
    context.fillRect(0, 0, size, size);
    let seed = 41;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let index = 0; index < 1100; index += 1) {
      const shade = random();
      context.fillStyle = shade > 0.5
        ? `rgba(196, 172, 132, ${0.04 + random() * 0.1})`
        : `rgba(82, 62, 42, ${0.05 + random() * 0.12})`;
      context.fillRect(random() * size, random() * size, 1 + random() * 2.4, 1 + random() * 2.4);
    }
    for (const center of [0.3, 0.7]) {
      const x = center * size;
      const rut = context.createLinearGradient(x - 17, 0, x + 17, 0);
      rut.addColorStop(0, "rgba(74, 58, 40, 0)");
      rut.addColorStop(0.5, "rgba(74, 58, 40, 0.5)");
      rut.addColorStop(1, "rgba(74, 58, 40, 0)");
      context.fillStyle = rut;
      context.fillRect(x - 17, 0, 34, size);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function FarmRoads() {
  const geometries = useMemo(() => roadPaths.map(({ points, width }) => createRoadGeometry(points, width)), []);
  const texture = useMemo(() => makeRoadTexture(), []);
  return (
    <group>
      {geometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} receiveShadow>
          <meshStandardMaterial
            map={texture}
            roughness={0.98}
            metalness={0}
            envMapIntensity={0.2}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ))}
    </group>
  );
}
