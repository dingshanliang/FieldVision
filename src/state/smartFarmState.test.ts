import { describe, expect, it } from "vitest";
import { SMART_FARM_CHAPTERS, getSmartFarmChapterSnapshot } from "./smartFarmState";
import { useFarmStore } from "./useFarmStore";

describe("smart farm canonical chapter snapshots", () => {
  it("defines one complete deterministic snapshot for all nine chapters", () => {
    expect(SMART_FARM_CHAPTERS).toHaveLength(9);

    const snapshots = SMART_FARM_CHAPTERS.map(getSmartFarmChapterSnapshot);
    expect(snapshots.map((snapshot) => snapshot.chapter)).toEqual(SMART_FARM_CHAPTERS);
    snapshots.forEach((snapshot) => {
      expect(Object.keys(snapshot.tasks)).toEqual([
        "SOW-B03",
        "PATROL-A03",
        "MAINT-EAST",
        "UAV-A02",
        "IRRIGATE-A02",
      ]);
      expect(snapshot.dailyOperationPlan.taskIds).toEqual(["SOW-B03", "PATROL-A03", "MAINT-EAST"]);
    });
  });

  it("keeps A02 irrigation outside the daily plan and independently confirmed", () => {
    const plan = getSmartFarmChapterSnapshot("daily-plan");
    expect(plan.dailyOperationPlan.status).toBe("confirmed");
    expect(plan.dailyOperationPlan.taskIds).not.toContain("IRRIGATE-A02");
    expect(plan.tasks["IRRIGATE-A02"]?.status).toBe("planned");

    const decision = getSmartFarmChapterSnapshot("remote-decision");
    expect(decision.tasks["IRRIGATE-A02"]).toMatchObject({
      status: "awaiting-confirmation",
      confirmationReceipt: null,
    });
  });

  it("uses one confirmation action for autoplay and presenter input", () => {
    useFarmStore.getState().applySmartFarmChapter("remote-decision");
    useFarmStore.getState().confirmTaskForDemo("IRRIGATE-A02", "simulated-autoplay");
    const autoplayTask = useFarmStore.getState().tasks["IRRIGATE-A02"];

    useFarmStore.getState().applySmartFarmChapter("remote-decision");
    useFarmStore.getState().confirmTaskForDemo("IRRIGATE-A02", "presenter");
    const presenterTask = useFarmStore.getState().tasks["IRRIGATE-A02"];

    expect(autoplayTask).toBeDefined();
    expect(presenterTask).toBeDefined();
    expect({ ...autoplayTask, confirmationReceipt: { ...autoplayTask?.confirmationReceipt, source: null } }).toEqual({
      ...presenterTask,
      confirmationReceipt: { ...presenterTask?.confirmationReceipt, source: null },
    });
    expect(autoplayTask?.confirmationReceipt?.source).toBe("simulated-autoplay");
    expect(presenterTask?.confirmationReceipt?.source).toBe("presenter");
  });

  it("does not treat water arrival as a verified outcome", () => {
    const executing = getSmartFarmChapterSnapshot("irrigation-response");
    expect(executing.tasks["IRRIGATE-A02"]).toMatchObject({ status: "running", verifiedOutcome: null });

    const verified = getSmartFarmChapterSnapshot("outcome-verification");
    expect(verified.tasks["IRRIGATE-A02"]).toMatchObject({
      status: "verified",
      verifiedOutcome: { evidenceIds: ["OBS-A02-D1", "OBS-A02-D3"] },
    });

    const finalOverview = getSmartFarmChapterSnapshot("return-overview");
    expect(finalOverview).toMatchObject({
      selectedFieldId: null,
      viewMode: "overview",
      fieldStatus: "recovered",
      recoveryPhase: "resolved",
    });
  });

  it("applies a direct chapter jump atomically through the store", () => {
    useFarmStore.getState().applySmartFarmChapter("irrigation-response");
    expect(useFarmStore.getState()).toMatchObject({
      smartFarmChapter: "irrigation-response",
      introComplete: true,
      selectedFieldId: "A02",
      viewMode: "irrigation",
      fieldStatuses: { A02: "processing" },
      tasks: { "IRRIGATE-A02": { status: "running" } },
    });

    useFarmStore.getState().applySmartFarmChapter("base-online");
    expect(useFarmStore.getState()).toMatchObject({
      smartFarmChapter: "base-online",
      selectedFieldId: null,
      viewMode: "overview",
      irrigationProgress: 0,
      scanProgress: 0,
      tasks: { "IRRIGATE-A02": { status: "planned" } },
    });
  });

  it("preserves the canonical snapshot while presentation is paused", () => {
    useFarmStore.getState().applySmartFarmChapter("autonomous-operations");
    useFarmStore.getState().setPaused(true);
    const before = useFarmStore.getState();

    useFarmStore.getState().advanceTaskProgress("SOW-B03", 0.62);

    expect(useFarmStore.getState().tasks["SOW-B03"]?.progress).toBe(before.tasks["SOW-B03"]?.progress);
  });

  it("stops only the patrol robot for the simulated obstacle", () => {
    const patrol = getSmartFarmChapterSnapshot("coordinated-patrol");

    expect(patrol.tasks["PATROL-A03"]).toMatchObject({
      status: "exception",
      exception: { code: "OBSTACLE_STOP" },
    });
    expect(patrol.tasks["SOW-B03"]?.status).toBe("running");
    expect(patrol.tasks["MAINT-EAST"]?.status).toBe("running");
  });
});
