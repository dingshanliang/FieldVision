import { describe, expect, it } from "vitest";
import { fields } from "../data/fields";
import { MACHINE_ACTIVITY_LIMITS, createMotionSample, evaluateMachineMotion, selectActiveMachineIds } from "./autonomousMachineMotion";

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

describe("autonomous machine motion", () => {
  it("respects the total active-device budget after counting the drone", () => {
    expect(MACHINE_ACTIVITY_LIMITS).toEqual({ high: 4, medium: 3, low: 2 });
    expect(selectActiveMachineIds("coordinated-patrol", "high")).toHaveLength(3);
    expect(selectActiveMachineIds("coordinated-patrol", "medium")).toHaveLength(2);
    expect(selectActiveMachineIds("coordinated-patrol", "low")).toHaveLength(1);
  });

  it("low tier keeps the tractor and robot business story", () => {
    expect(selectActiveMachineIds("autonomous-operations", "low")).toEqual(["tractor-seeder", "inspection-robot"]);
  });

  it("lowers the seeder on rows and raises it for a headland turn", () => {
    const working = evaluateMachineMotion("tractor-seeder", "autonomous-operations", 0.72, createMotionSample());
    const turning = evaluateMachineMotion("tractor-seeder", "autonomous-operations", 0.79, createMotionSample());

    expect(working.phase).toBe("working");
    expect(working.implementDown).toBe(true);
    expect(turning.phase).toBe("turning");
    expect(turning.implementDown).toBe(false);
    expect(turning.speedScale).toBeLessThan(working.speedScale);
  });

  it("stops the tractor at the simulated obstacle while inspection continues", () => {
    const before = evaluateMachineMotion("inspection-robot", "coordinated-patrol", 0.82, createMotionSample());
    const stopped = evaluateMachineMotion("tractor-seeder", "coordinated-patrol", 0.82, createMotionSample());

    expect(before.phase).toBe("working");
    expect(stopped.phase).toBe("exception");
    expect(stopped.speedScale).toBe(0);
    expect(stopped.exceptionCode).toBe("OBSTACLE_STOP");
    expect(stopped.position).toEqual(expect.arrayContaining([expect.any(Number), expect.any(Number), expect.any(Number)]));
  });

  it("returns every ground machine to a charging or parked result", () => {
    for (const id of ["tractor-seeder", "inspection-robot", "maintenance-vehicle"] as const) {
      const sample = evaluateMachineMotion(id, "return-overview", 1, createMotionSample());
      expect(sample.phase).toMatch(/charging|parked/);
      expect(sample.receipt).toContain("回库");
    }
  });

  it("keeps every machine route out of unapproved field parcels", () => {
    // 安全边界语义：拖拉机只允许进入 B03（批准补播条带），巡检机器人与
    // 渠道割草维护机全程不得进入任何田块。逐帧采样所有会出现运动的章节。
    const allowed: Record<string, string | null> = {
      "tractor-seeder": "B03",
      "inspection-robot": null,
      "maintenance-vehicle": null,
    };
    const chapters = ["autonomous-operations", "coordinated-patrol", "return-overview"] as const;
    for (const [id, allowedField] of Object.entries(allowed)) {
      for (const chapter of chapters) {
        const sample = createMotionSample();
        for (let step = 0; step <= 100; step++) {
          evaluateMachineMotion(id as "tractor-seeder", chapter, step / 100, sample);
          const hit = fieldContaining(sample.position[0], sample.position[2]);
          expect(
            hit === null || hit === allowedField,
            `${id} @ ${chapter} p=${step / 100} entered ${hit} (${sample.position.map((v) => v.toFixed(1)).join(",")})`,
          ).toBe(true);
        }
      }
    }
  });
});
