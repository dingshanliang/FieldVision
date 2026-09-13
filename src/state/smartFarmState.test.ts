import { describe, expect, it } from "vitest";
import { SMART_FARM_CHAPTERS, getSmartFarmChapterSnapshot } from "./smartFarmState";
import { recoverySummary } from "./recoveryModel";
import { useFarmStore } from "./useFarmStore";

describe("smart farm canonical chapter snapshots", () => {
  it("defines one complete deterministic snapshot for all eleven chapters", () => {
    expect(SMART_FARM_CHAPTERS).toHaveLength(11);

    const snapshots = SMART_FARM_CHAPTERS.map(getSmartFarmChapterSnapshot);
    expect(snapshots.map((snapshot) => snapshot.chapter)).toEqual(SMART_FARM_CHAPTERS);
    snapshots.forEach((snapshot) => {
      // 天气章节及其后的闭环章节会多出 STORM-CHECK（fv-weather 雨后巡检）。
      const expectedTasks = ["SOW-B03", "PATROL-A03", "MAINT-EAST", "UAV-A02", "IRRIGATE-A02"];
      if (["weather-front", "weather-resume", "return-overview"].includes(snapshot.chapter)) {
        expectedTasks.push("STORM-CHECK");
      }
      expect(Object.keys(snapshot.tasks)).toEqual(expectedTasks);
      expect(snapshot.dailyOperationPlan.taskIds).toEqual(["SOW-B03", "PATROL-A03", "MAINT-EAST"]);
    });
  });

  it("holds only the post-storm survey while lightning crosses the safety threshold", () => {
    const front = getSmartFarmChapterSnapshot("weather-front");
    expect(front.stormProgress).toBe(1);
    expect(front.tasks["STORM-CHECK"]).toMatchObject({
      status: "exception",
      exception: { code: "LIGHTNING_HOLD" },
    });
    // 已 verified 的历史任务不受影响——异常只沿操作依赖传播。
    expect(front.tasks["IRRIGATE-A02"]?.status).toBe("verified");

    const resume = getSmartFarmChapterSnapshot("weather-resume");
    expect(resume.stormProgress).toBe(0.45);
    expect(resume.tasks["STORM-CHECK"]).toMatchObject({ status: "running", exception: null });

    const overview = getSmartFarmChapterSnapshot("return-overview");
    expect(overview.stormProgress).toBe(0);
    expect(overview.tasks["STORM-CHECK"]?.status).toBe("verified");
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

  it("preserves the confirmation source into hydraulic execution", () => {
    useFarmStore.getState().applySmartFarmChapter("remote-decision");
    useFarmStore.getState().confirmTaskForDemo("IRRIGATE-A02", "presenter");
    useFarmStore.getState().applySmartFarmChapter("irrigation-response");

    expect(useFarmStore.getState().tasks["IRRIGATE-A02"]?.confirmationReceipt?.source).toBe("presenter");
    expect(useFarmStore.getState().tasks["IRRIGATE-A02"]?.status).toBe("running");
  });

  it("does not treat water arrival as a verified outcome", () => {
    const executing = getSmartFarmChapterSnapshot("irrigation-response");
    expect(executing.tasks["IRRIGATE-A02"]).toMatchObject({ status: "running", verifiedOutcome: null });

    const verified = getSmartFarmChapterSnapshot("outcome-verification");
    expect(verified.tasks["IRRIGATE-A02"]).toMatchObject({
      status: "verified",
      // D1（06-04 清晨）回执只引用 D1 证据；引用未来的 D3 证据曾是
      // 时间线穿帮的一部分。
      verifiedOutcome: { evidenceIds: ["OBS-A02-D1"], verifiedAt: "2026-06-04T07:30:00+08:00" },
    });

    const finalOverview = getSmartFarmChapterSnapshot("return-overview");
    expect(finalOverview).toMatchObject({
      selectedFieldId: null,
      viewMode: "overview",
      fieldStatus: "recovered",
      recoveryPhase: "resolved",
    });
  });

  it("carries the dusk–night–dawn arc through the story chapters", () => {
    const phase = (chapter: ReturnType<typeof getSmartFarmChapterSnapshot>["chapter"]) =>
      getSmartFarmChapterSnapshot(chapter).dayPhase;
    expect(phase("base-online")).toBe("dawn");
    expect(phase("a02-alert")).toBe("dawn");
    expect(phase("remote-decision")).toBe("dusk");
    expect(phase("irrigation-response")).toBe("night");
    expect(phase("outcome-verification")).toBe("dawn");
    expect(phase("weather-front")).toBe("day");
    expect(phase("weather-resume")).toBe("day");
    expect(phase("return-overview")).toBe("day");
  });

  it("keeps the two-day mock timeline monotonic", () => {
    const irrigation = getSmartFarmChapterSnapshot("irrigation-response").tasks["IRRIGATE-A02"];
    expect(irrigation?.confirmationReceipt?.confirmedAt).toBe("2026-06-03T17:40:00+08:00");
    const outcome = getSmartFarmChapterSnapshot("outcome-verification").tasks["IRRIGATE-A02"];
    expect(outcome?.operationCompletion?.completedAt).toBe("2026-06-03T19:10:00+08:00");
    expect(outcome?.verifiedOutcome?.verifiedAt).toBe("2026-06-04T07:30:00+08:00");
    // 收尾回执在过境日（06-06）午后，不再倒流回作业日早晨。
    const backfill = getSmartFarmChapterSnapshot("return-overview").tasks["MAINT-EAST"];
    expect(backfill?.verifiedOutcome?.verifiedAt).toBe("2026-06-06T15:08:00+08:00");
  });

  it("derives time-cut anchors from the chapter snapshot through the store", () => {
    useFarmStore.getState().applySmartFarmChapter("irrigation-response");
    expect(useFarmStore.getState().dayPhase).toBe("night");
    expect(useFarmStore.getState().timeCut).toEqual({ day: "D0", label: "当日傍晚 · 联动供水" });

    useFarmStore.getState().applySmartFarmChapter("outcome-verification");
    expect(useFarmStore.getState().dayPhase).toBe("dawn");
    expect(useFarmStore.getState().timeCut).toEqual({ day: "D1", label: "次日清晨 · 复测" });

    useFarmStore.getState().applySmartFarmChapter("weather-front");
    expect(useFarmStore.getState().timeCut).toEqual({ day: "D3", label: "第 3 天 · 强对流过境" });

    useFarmStore.getState().applySmartFarmChapter("base-online");
    expect(useFarmStore.getState().dayPhase).toBe("dawn");
    expect(useFarmStore.getState().timeCut).toBeNull();
  });

  it("backs the final scorecard with fully verified receipts", () => {
    const closing = getSmartFarmChapterSnapshot("return-overview");
    const records = Object.values(closing.tasks);
    expect(records).toHaveLength(6);
    expect(records.every((task) => task.status === "verified")).toBe(true);
    const summary = recoverySummary();
    expect(summary).toMatchObject({ rootVwcBefore: 18, rootVwcAfter: 27, lowValueAreaBefore: 23.6, lowValueAreaAfter: 0.4 });
    // 任务目标与恢复模型同源（27%），消灭第二份手写数字。
    expect(closing.tasks["IRRIGATE-A02"]?.plan.objective).toContain("27%");
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

  it("clearing the field selection leaves chapter-driven state untouched", () => {
    useFarmStore.getState().applySmartFarmChapter("weather-front");
    const before = useFarmStore.getState();
    useFarmStore.getState().selectField("A03");
    useFarmStore.getState().clearFieldSelection();
    const after = useFarmStore.getState();
    expect(after.selectedFieldId).toBeNull();
    expect(after.smartFarmChapter).toBe("weather-front");
    expect(after.stormProgress).toBe(before.stormProgress);
    expect(after.viewMode).toBe(before.viewMode);
    expect(after.demoStep).toBe(before.demoStep);
  });

  it("preserves the canonical snapshot while presentation is paused", () => {
    useFarmStore.getState().applySmartFarmChapter("autonomous-operations");
    useFarmStore.getState().setPaused(true);
    const before = useFarmStore.getState();

    useFarmStore.getState().advanceTaskProgress("SOW-B03", 0.62);

    expect(useFarmStore.getState().tasks["SOW-B03"]?.progress).toBe(before.tasks["SOW-B03"]?.progress);
  });

  it("stops only the B03 tractor for the simulated obstacle", () => {
    const patrol = getSmartFarmChapterSnapshot("coordinated-patrol");

    expect(patrol.tasks["SOW-B03"]).toMatchObject({
      status: "exception",
      exception: { code: "OBSTACLE_STOP" },
    });
    expect(patrol.tasks["PATROL-A03"]?.status).toBe("running");
    expect(patrol.tasks["MAINT-EAST"]?.status).toBe("running");
  });
});
