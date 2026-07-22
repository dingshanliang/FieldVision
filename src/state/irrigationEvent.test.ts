import { describe, expect, it } from "vitest";
import { deriveIrrigationEvent, getDemoStatePreset } from "./irrigationEvent";
import { useFarmStore } from "./useFarmStore";

describe("deriveIrrigationEvent", () => {
  it("keeps every physical response on one ordered progress model", () => {
    const snapshots = Array.from({ length: 101 }, (_, index) => deriveIrrigationEvent(index / 100));
    const series = [
      snapshots.map((state) => state.pumpProgress),
      snapshots.map((state) => state.gateProgress),
      snapshots.map((state) => state.mainChannelProgress),
      snapshots.map((state) => state.branchChannelProgress),
      snapshots.map((state) => state.inletProgress),
      snapshots.map((state) => state.wettingProgress),
      snapshots.map((state) => state.cropRecoveryProgress),
      snapshots.map((state) => state.verificationProgress),
    ];

    series.forEach((values) => {
      values.forEach((value, index) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        if (index > 0) expect(value).toBeGreaterThanOrEqual(values[index - 1]!);
      });
    });

    const firstActiveIndex = (values: number[]) => values.findIndex((value) => value > 0);
    expect(series.map(firstActiveIndex)).toEqual([...series.map(firstActiveIndex)].sort((a, b) => a - b));
    expect(snapshots.at(-1)).toMatchObject({
      stage: "verified",
      pumpProgress: 1,
      gateProgress: 1,
      inletProgress: 1,
      wettingProgress: 1,
      cropRecoveryProgress: 1,
      verificationProgress: 1,
    });
  });

  it("clamps invalid progress without leaking NaN", () => {
    expect(deriveIrrigationEvent(-2).progress).toBe(0);
    expect(deriveIrrigationEvent(3).progress).toBe(1);
    expect(deriveIrrigationEvent(Number.NaN).progress).toBe(0);
    expect(deriveIrrigationEvent(Number.POSITIVE_INFINITY).progress).toBe(0);
    expect(Object.values(deriveIrrigationEvent(Number.NaN)).some((value) => typeof value === "number" && Number.isNaN(value))).toBe(false);
  });

  it("does not let field recovery outrun water arrival", () => {
    for (let index = 0; index <= 100; index += 1) {
      const state = deriveIrrigationEvent(index / 100);
      expect(state.cropRecoveryProgress).toBeLessThanOrEqual(state.wettingProgress);
      expect(state.wettingProgress).toBeLessThanOrEqual(state.inletProgress);
    }
  });
});

describe("getDemoStatePreset", () => {
  it("defines coherent canonical states for every timeline destination", () => {
    expect(getDemoStatePreset("overview")).toMatchObject({ selectedFieldId: null, irrigationProgress: 0, layerMode: "natural", fieldStatus: "risk" });
    expect(getDemoStatePreset("select-field")).toMatchObject({ selectedFieldId: "A02", viewMode: "field-ground", irrigationProgress: 0, fieldStatus: "risk" });
    expect(getDemoStatePreset("inspect-risk")).toMatchObject({ selectedFieldId: "A02", layerMode: "growth", scanProgress: 1, fieldStatus: "risk" });
    expect(getDemoStatePreset("irrigation")).toMatchObject({ selectedFieldId: "A02", irrigationProgress: 0.62, fieldStatus: "processing" });
    expect(getDemoStatePreset("recovered")).toMatchObject({ selectedFieldId: "A02", irrigationProgress: 1, scanProgress: 1, fieldStatus: "recovered" });
  });

  it("applies each destination atomically without leaking the previous chapter", () => {
    const store = useFarmStore.getState();
    store.applyDemoState("irrigation");
    expect(useFarmStore.getState()).toMatchObject({
      selectedFieldId: "A02",
      demoStep: "irrigation",
      irrigationProgress: 0.62,
      scanProgress: 1,
      fieldStatuses: { A02: "processing" },
    });

    useFarmStore.getState().applyDemoState("overview");
    expect(useFarmStore.getState()).toMatchObject({
      selectedFieldId: null,
      demoStep: "overview",
      viewMode: "overview",
      layerMode: "natural",
      irrigationProgress: 0,
      scanProgress: 0,
      fieldStatuses: { A02: "risk" },
    });
  });
});
