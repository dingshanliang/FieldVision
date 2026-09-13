import { describe, expect, it } from "vitest";
import { cloudLayout } from "./cloudLayer";

/** 云层布局（fv-i1s）：确定性 + 不与照片全景穿帮的高度约束。 */
describe("cloudLayout", () => {
  it("is deterministic", () => {
    expect(cloudLayout()).toEqual(cloudLayout());
  });

  it("places every cloud above the photo-panorama band (y > 190)", () => {
    for (const spec of cloudLayout()) {
      expect(spec.position[1]).toBeGreaterThan(190);
      expect(spec.position[1]).toBeLessThan(340);
    }
  });

  it("keeps six seeded clouds with sane segment budgets", () => {
    const layout = cloudLayout();
    expect(layout).toHaveLength(6);
    const totalSegments = layout.reduce((sum, spec) => sum + spec.segments, 0);
    expect(totalSegments).toBeLessThanOrEqual(160);
    for (const spec of layout) {
      expect(spec.seed).toBeGreaterThan(0);
      expect(spec.opacity).toBeGreaterThan(0);
      expect(spec.opacity).toBeLessThanOrEqual(1);
    }
  });
});
