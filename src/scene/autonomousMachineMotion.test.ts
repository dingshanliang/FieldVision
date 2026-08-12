import { describe, expect, it } from "vitest";
import { MACHINE_ACTIVITY_LIMITS, createMotionSample, evaluateMachineMotion, selectActiveMachineIds } from "./autonomousMachineMotion";

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

  it("stops the inspection robot at the simulated obstacle and requests takeover", () => {
    const before = evaluateMachineMotion("inspection-robot", "coordinated-patrol", 0.48, createMotionSample());
    const stopped = evaluateMachineMotion("inspection-robot", "coordinated-patrol", 0.82, createMotionSample());

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
});
