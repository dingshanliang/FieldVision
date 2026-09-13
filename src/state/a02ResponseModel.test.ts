import { describe, expect, it } from "vitest";
import { advanceTaskProgress, completeTask, confirmTask, createPlannedTask, verifyTaskOutcome } from "./autonomousTask";
import { deriveA02Response } from "./a02ResponseModel";

function waterTask() {
  return createPlannedTask({
    id: "IRRIGATE-A02", kind: "irrigation", targetId: "A02", equipmentId: "PUMP-01+GATE-E",
    equipmentLabel: "泵站 · 主闸 · 东支闸", routeId: "A02-EAST-WATER-CHAIN",
    objective: "根区含水率 18% → 27%", expectedDurationMinutes: 37,
    safetyBoundaryLabel: "A02 东侧 23.6 亩", parametersVersion: 1, safetyBoundaryVersion: 1,
  });
}

describe("A02 supervised response", () => {
  it("keeps every hydraulic dependency idle before confirmation", () => {
    const response = deriveA02Response(waterTask(), 0.9, "none");
    expect(response.effectiveProgress).toBe(0);
    expect(response.hydraulicChain.every((node) => node.status === "waiting")).toBe(true);
  });

  it("activates pump, gates, channels and inlet in dependency order", () => {
    const running = advanceTaskProgress(confirmTask(waterTask(), "presenter", "D0"), 0.62);
    const response = deriveA02Response(running, 0.62, "none");
    const active = response.hydraulicChain.filter((node) => node.status !== "waiting").map((node) => node.id);
    expect(active).toEqual(["pump", "main-gate", "main-channel", "branch-gate", "branch-channel", "field-inlet"]);
  });

  it("does not resolve risk at operation completion or D1", () => {
    const running = advanceTaskProgress(confirmTask(waterTask(), "presenter", "D0"), 1);
    const completed = completeTask(running, { completedAt: "D0", receipt: "A02 已到水" });
    expect(deriveA02Response(completed, 1, "arrived").riskStatus).toBe("awaiting-verification");
    expect(deriveA02Response(completed, 1, "d1-root").riskStatus).toBe("recovering");
  });

  it("resolves only after a verified task and resolved multi-source phase", () => {
    const running = advanceTaskProgress(confirmTask(waterTask(), "presenter", "D0"), 1);
    const completed = completeTask(running, { completedAt: "D0", receipt: "A02 已到水" });
    const verified = verifyTaskOutcome(completed, { verifiedAt: "D3", result: "D1/D3 一致", evidenceIds: ["D1", "D3"] });
    expect(deriveA02Response(verified, 1, "d3-reflight").riskStatus).toBe("recovering");
    expect(deriveA02Response(verified, 1, "resolved").riskStatus).toBe("resolved");
  });
});
