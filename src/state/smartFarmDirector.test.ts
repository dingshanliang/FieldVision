import { describe, expect, it } from "vitest";
import { SMART_FARM_CHAPTERS } from "./smartFarmState";
import {
  SMART_FARM_CHAPTER_META,
  createSmartFarmSequencePlan,
  smartFarmSequenceDuration,
} from "./smartFarmDirector";

describe("smart farm director plan", () => {
  it("uses the same nine canonical chapters for both pacing modes", () => {
    expect(SMART_FARM_CHAPTER_META.map((chapter) => chapter.id)).toEqual(SMART_FARM_CHAPTERS);
    expect(createSmartFarmSequencePlan("fast").map((chapter) => chapter.id)).toEqual(SMART_FARM_CHAPTERS);
    expect(createSmartFarmSequencePlan("narration").map((chapter) => chapter.id)).toEqual(SMART_FARM_CHAPTERS);
  });

  it("keeps the complete story at exactly 90 and 150 seconds", () => {
    expect(smartFarmSequenceDuration("fast")).toBe(90_000);
    expect(smartFarmSequenceDuration("narration")).toBe(150_000);
  });

  it("reserves the visible simulated confirmation inside the decision chapter", () => {
    const decision = createSmartFarmSequencePlan("fast").find((chapter) => chapter.id === "remote-decision");
    expect(decision).toMatchObject({
      durationMs: 10_000,
      simulatedConfirmationDelayMs: 3_000,
    });
  });
});
