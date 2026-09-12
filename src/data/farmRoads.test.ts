import { describe, expect, it } from "vitest";
import { fields } from "./fields";
import { roadPaths } from "./farmRoads";

function fieldContaining(x: number, z: number): string | null {
  for (const field of fields) {
    const poly = field.polygon;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i]!;
      const [xj, zj] = poly[j]!;
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    if (inside) return field.id;
  }
  return null;
}

describe("farm road network", () => {
  it("keeps every road — including both edges of its full width — out of all field parcels", () => {
    // 机耕路是无人农机的行驶边界语义载体，任何一段路面（含两侧路缘）都不得
    // 压进田块多边形；否则视觉上就是"路从田里穿过"。
    for (const { points, width } of roadPaths) {
      const half = width / 2;
      for (let seg = 0; seg < points.length - 1; seg++) {
        const [ax, az] = points[seg]!;
        const [bx, bz] = points[seg + 1]!;
        const length = Math.hypot(bx - ax, bz - az);
        const nx = (-(bz - az) / length) * half;
        const nz = ((bx - ax) / length) * half;
        for (let step = 0; step <= 100; step++) {
          const x = ax + (bx - ax) * (step / 100);
          const z = az + (bz - az) * (step / 100);
          for (const [ox, oz] of [[0, 0], [nx, nz], [-nx, -nz]] as const) {
            const hit = fieldContaining(x + ox, z + oz);
            expect(
              hit,
              `road seg ${seg} @${step}% edge (${(x + ox).toFixed(1)},${(z + oz).toFixed(1)}) inside ${hit}`,
            ).toBeNull();
          }
        }
      }
    }
  });
});
