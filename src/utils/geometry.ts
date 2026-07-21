import { BufferGeometry, Float32BufferAttribute, Vector2 } from "three";

export function pointInPolygon(point: [number, number], polygon: Array<[number, number]>) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const current = polygon[i];
    const previous = polygon[j];
    if (!current || !previous) continue;
    const [xi, yi] = current;
    const [xj, yj] = previous;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export interface ClumpOptions {
  blades: number;
  /** Average blade height in metres. */
  height: number;
  /** Blade half-width in metres. */
  width: number;
  /** How far blades arc outward, in metres at the tip. */
  lean: number;
  /** Base radius of the clump — blades start this far from centre. */
  spread: number;
  seed: number;
}

/**
 * A small clump of curved blades (several plants merged) tuned for believable
 * proportions at close range: narrow tapering blades that arc outward and
 * droop at the tip, instead of the old giant agave shape.
 */
export function createCropClumpGeometry({ blades, height, width, lean, spread, seed }: ClumpOptions) {
  const random = seededRandom(seed);
  const segments = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let blade = 0; blade < blades; blade += 1) {
    const angle = (blade / blades) * Math.PI * 2 + random() * 0.7;
    const direction = new Vector2(Math.cos(angle), Math.sin(angle));
    const sideways = new Vector2(-direction.y, direction.x);
    const bladeHeight = height * (0.82 + random() * 0.36);
    const bladeLean = lean * (0.6 + random() * 0.8);
    const bladeWidth = width * (0.8 + random() * 0.45);
    const baseRadius = spread * (0.3 + random() * 0.7);
    const baseX = direction.x * baseRadius;
    const baseZ = direction.y * baseRadius;
    const baseIndex = positions.length / 3;

    for (let segment = 0; segment <= segments; segment += 1) {
      const t = segment / segments;
      // Taper to a point near the tip; slight fullness low on the blade.
      const taper = Math.sin(Math.PI * Math.min(t * 0.86 + 0.06, 0.985));
      const halfWidth = bladeWidth * taper;
      // Arc outward, then droop: quadratic out, cubic pull-down at the tip.
      const out = bladeLean * t * t;
      const droop = t > 0.72 ? (t - 0.72) * (t - 0.72) * bladeHeight * 0.9 : 0;
      const centerX = baseX + direction.x * out;
      const centerZ = baseZ + direction.y * out;
      const centerY = bladeHeight * t - droop;
      positions.push(centerX + sideways.x * halfWidth, centerY, centerZ + sideways.y * halfWidth);
      positions.push(centerX - sideways.x * halfWidth, centerY, centerZ - sideways.y * halfWidth);
      uvs.push(0, t, 1, t);
    }

    for (let segment = 0; segment < segments; segment += 1) {
      const row = baseIndex + segment * 2;
      indices.push(row, row + 1, row + 2, row + 1, row + 3, row + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Per-crop clump presets: believable real-world proportions. */
export const cropClumpPresets = {
  rice: { blades: 13, height: 0.62, width: 0.016, lean: 0.16, spread: 0.16, rowSpacing: 0.62, plantSpacing: 0.52 },
  corn: { blades: 9, height: 1.85, width: 0.05, lean: 0.3, spread: 0.1, rowSpacing: 0.8, plantSpacing: 0.68 },
  vegetable: { blades: 11, height: 0.26, width: 0.05, lean: 0.2, spread: 0.14, rowSpacing: 0.5, plantSpacing: 0.44 },
  rapeseed: { blades: 8, height: 0.85, width: 0.02, lean: 0.12, spread: 0.09, rowSpacing: 0.55, plantSpacing: 0.52 },
} as const;
