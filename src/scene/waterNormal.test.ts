import { describe, expect, it } from "vitest";
import { generateWaterNormalData, WATER_NORMAL_SIZE } from "./waterNormal";

/** 程序化水法线（fv-2zv）：确定性、四向平铺、编码范围。 */
describe("generateWaterNormalData", () => {
  it("is deterministic for the same seed", () => {
    const a = generateWaterNormalData(4409);
    const b = generateWaterNormalData(4409);
    expect(a).toEqual(b);
  });

  it("differs between the two crossfade maps", () => {
    const a = generateWaterNormalData(4409);
    const b = generateWaterNormalData(7717);
    let differing = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1]) differing += 1;
    }
    expect(differing).toBeGreaterThan(WATER_NORMAL_SIZE * WATER_NORMAL_SIZE * 0.5);
  });

  it("tiles seamlessly in all four directions", () => {
    const data = generateWaterNormalData(4409);
    const at = (x: number, y: number) => {
      const i = (((y % WATER_NORMAL_SIZE) + WATER_NORMAL_SIZE) % WATER_NORMAL_SIZE) * WATER_NORMAL_SIZE
        + (((x % WATER_NORMAL_SIZE) + WATER_NORMAL_SIZE) % WATER_NORMAL_SIZE);
      const base = i * 4;
      return [data[base]!, data[base + 1]!] as const;
    };
    let worst = 0;
    for (let y = 0; y < WATER_NORMAL_SIZE; y += 1) {
      const left = at(0, y);
      const right = at(WATER_NORMAL_SIZE, y);
      worst = Math.max(worst, Math.abs(left[0] - right[0]), Math.abs(left[1] - right[1]));
    }
    for (let x = 0; x < WATER_NORMAL_SIZE; x += 1) {
      const top = at(x, 0);
      const bottom = at(x, WATER_NORMAL_SIZE);
      worst = Math.max(worst, Math.abs(top[0] - bottom[0]), Math.abs(top[1] - bottom[1]));
    }
    expect(worst).toBeLessThanOrEqual(1);
  });

  it("encodes unit-length normals in the 0-255 range", () => {
    const data = generateWaterNormalData(4409);
    for (let i = 0; i < data.length; i += 4) {
      const nx = (data[i]! / 255) * 2 - 1;
      const ny = (data[i + 1]! / 255) * 2 - 1;
      const nz = (data[i + 2]! / 255) * 2 - 1;
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 1);
      expect(data[i + 3]!).toBe(255);
    }
  });
});
