import { describe, expect, it } from "vitest";
import { SMART_FARM_CHAPTERS } from "./smartFarmState";
import {
  SMART_FARM_CHAPTER_META,
  createSmartFarmSequencePlan,
  smartFarmSequenceDuration,
} from "./smartFarmDirector";

describe("smart farm director plan", () => {
  it("uses the same eleven canonical chapters for both pacing modes", () => {
    expect(SMART_FARM_CHAPTER_META.map((chapter) => chapter.id)).toEqual(SMART_FARM_CHAPTERS);
    expect(createSmartFarmSequencePlan("fast").map((chapter) => chapter.id)).toEqual(SMART_FARM_CHAPTERS);
    expect(createSmartFarmSequencePlan("narration").map((chapter) => chapter.id)).toEqual(SMART_FARM_CHAPTERS);
  });

  it("keeps the complete story at exactly 112 and 186 seconds", () => {
    expect(smartFarmSequenceDuration("fast")).toBe(112_000);
    expect(smartFarmSequenceDuration("narration")).toBe(186_000);
  });

  it("reserves the visible simulated confirmation inside the decision chapter", () => {
    const decision = createSmartFarmSequencePlan("fast").find((chapter) => chapter.id === "remote-decision");
    expect(decision).toMatchObject({
      durationMs: 10_000,
      simulatedConfirmationDelayMs: 3_000,
    });
  });

  it("routes the weather-resume confirmation to the post-storm survey task", () => {
    const resume = createSmartFarmSequencePlan("fast").find((chapter) => chapter.id === "weather-resume");
    expect(resume).toMatchObject({
      simulatedConfirmationDelayMs: 3_000,
      confirmationTaskId: "STORM-CHECK",
    });
  });
});
