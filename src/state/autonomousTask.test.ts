import { describe, expect, it } from "vitest";
import {
  completeTask,
  confirmTask,
  createPlannedTask,
  advanceTaskProgress,
  invalidateConfirmation,
  isConfirmationValid,
  raiseTaskException,
  verifyTaskOutcome,
  type AutonomousTaskRecord,
} from "./autonomousTask";

function task(id: string, dependencies: string[] = []) {
  return createPlannedTask({
    id,
    kind: "inspection",
    targetId: `FIELD-${id}`,
    equipmentId: `ROBOT-${id}`,
    routeId: `ROUTE-${id}`,
    parametersVersion: 1,
    safetyBoundaryVersion: 1,
    dependencies,
  });
}

describe("Autonomous Operation Task", () => {
  it("does not advance before a valid confirmation exists", () => {
    const planned = task("A");
    expect(advanceTaskProgress(planned, 0.42)).toMatchObject({ status: "planned", progress: 0 });

    const authorized = confirmTask(planned, "simulated-autoplay", "2026-06-03T08:10:00+08:00");
    expect(advanceTaskProgress(authorized, 0.42)).toMatchObject({ status: "running", progress: 0.42 });
  });

  it("invalidates authorization when a consequential plan field changes", () => {
    const confirmed = confirmTask(task("A"), "presenter", "2026-06-03T08:10:00+08:00");

    expect(isConfirmationValid(confirmed)).toBe(true);
    expect(confirmed.status).toBe("authorized");

    const changed = invalidateConfirmation(confirmed, {
      routeId: "ROUTE-A-REVISED",
      reason: "障碍导致路线边界变化",
      at: "2026-06-03T08:12:00+08:00",
    });

    expect(changed.status).toBe("awaiting-confirmation");
    expect(changed.confirmationReceipt).toMatchObject({
      source: "presenter",
      invalidatedAt: "2026-06-03T08:12:00+08:00",
      invalidationReason: "障碍导致路线边界变化",
    });
    expect(isConfirmationValid(changed)).toBe(false);
  });

  it("propagates an exception only through declared operational dependencies", () => {
    const tasks: Record<string, AutonomousTaskRecord> = {
      SENSOR: confirmTask(task("SENSOR"), "demo-preset", "2026-06-03T08:00:00+08:00"),
      WATER: confirmTask(task("WATER", ["SENSOR"]), "demo-preset", "2026-06-03T08:00:00+08:00"),
      VERIFY: confirmTask(task("VERIFY", ["WATER"]), "demo-preset", "2026-06-03T08:00:00+08:00"),
      MOW: confirmTask(task("MOW"), "demo-preset", "2026-06-03T08:00:00+08:00"),
    };

    const next = raiseTaskException(tasks, "SENSOR", {
      code: "SENSOR_OFFLINE",
      message: "A02 墒情采集盒离线",
      at: "2026-06-03T08:20:00+08:00",
    });

    expect(next.SENSOR?.status).toBe("exception");
    expect(next.WATER?.status).toBe("paused");
    expect(next.VERIFY?.status).toBe("paused");
    expect(next.MOW?.status).toBe("authorized");
  });

  it("keeps operation completion separate from a verified outcome", () => {
    const authorized = confirmTask(task("A02-WATER"), "simulated-autoplay", "2026-06-03T08:35:00+08:00");
    const running = advanceTaskProgress(authorized, 0.62);
    const completed = completeTask(running, {
      completedAt: "2026-06-03T09:12:00+08:00",
      receipt: "泵闸动作完成，A02 已到水",
    });

    expect(completed.status).toBe("completed");
    expect(completed.verifiedOutcome).toBeNull();

    const verified = verifyTaskOutcome(completed, {
      verifiedAt: "2026-06-06T09:20:00+08:00",
      result: "D1 根区与 D3 冠层复测一致，风险解除",
      evidenceIds: ["OBS-A02-D1", "OBS-A02-D3"],
    });

    expect(verified.status).toBe("verified");
    expect(verified.verifiedOutcome?.evidenceIds).toEqual(["OBS-A02-D1", "OBS-A02-D3"]);
  });
});
