import { describe, expect, it } from "vitest";
import { SMART_FARM_CHAPTERS } from "../state/smartFarmState";
import { compareQaRuns, createQaRunResult } from "./qaReplay";

describe("QA replay evidence", () => {
  const result = createQaRunResult({
    chapters: [...SMART_FARM_CHAPTERS],
    finalChapter: "return-overview",
    waterStatus: "verified",
    fieldStatus: "recovered",
    taskCount: 5,
    activeMachineCount: 1,
    demoPlaying: false,
    scene: { objects: 420, meshes: 240, geometries: 490 },
    postRunScene: { objects: 420, meshes: 240, geometries: 490 },
    postRunMutationCount: 0,
    lateWriteAttempts: 0,
  });

  it("accepts three identical complete nine-chapter runs", () => {
    expect(compareQaRuns([result, result, result], 3)).toEqual({ passed: true, reason: "verified" });
  });

  it("rejects chapter omissions, state drift and missing runs", () => {
    expect(compareQaRuns([{ ...result, chapters: SMART_FARM_CHAPTERS.slice(1) }, result, result], 3).passed).toBe(false);
    expect(compareQaRuns([result, { ...result, taskCount: 6 }, result], 3).passed).toBe(false);
    expect(compareQaRuns([result, result], 3).passed).toBe(false);
  });

  it("rejects scene accumulation and old-sequence writes", () => {
    expect(compareQaRuns([result, { ...result, postRunScene: { ...result.scene, objects: 421 } }, result], 3))
      .toEqual({ passed: false, reason: "scene-drift" });
    expect(compareQaRuns([result, { ...result, postRunMutationCount: 1 }, result], 3))
      .toEqual({ passed: false, reason: "late-write" });
    const geometryDrift = { ...result, postRunScene: { ...result.postRunScene, geometries: 488 } };
    expect(compareQaRuns([geometryDrift, geometryDrift, geometryDrift], 3))
      .toEqual({ passed: false, reason: "scene-drift" });
  });

  it("allows asynchronous renderer geometry settlement for a one-run browser smoke", () => {
    const settled = { ...result, postRunScene: { ...result.postRunScene, geometries: 488 } };
    expect(compareQaRuns([settled], 1)).toEqual({ passed: true, reason: "verified" });
  });

  it("allows adjacent scene samples to settle during a one-run Safari smoke", () => {
    const settling = {
      ...result,
      postRunScene: { objects: result.scene.objects - 1, meshes: result.scene.meshes - 1, geometries: 488 },
    };
    expect(compareQaRuns([settling], 1)).toEqual({ passed: true, reason: "verified" });
    expect(compareQaRuns([settling, settling, settling], 3)).toEqual({ passed: false, reason: "scene-drift" });
  });

  it("allows Safari to dispose the post-run renderer sample after a valid scene capture", () => {
    const disposed = { ...result, postRunScene: { objects: 0, meshes: 0, geometries: 0 } };
    expect(compareQaRuns([disposed], 1)).toEqual({ passed: true, reason: "verified" });
    expect(compareQaRuns([disposed, disposed, disposed], 3)).toEqual({ passed: false, reason: "scene-drift" });
  });

  it("treats one-run WebKit QA as a business smoke when renderer counters are unavailable", () => {
    const webkit = { ...result, scene: { objects: 0, meshes: 0, geometries: 0 }, postRunScene: { objects: 0, meshes: 0, geometries: 0 } };
    expect(compareQaRuns([webkit], 1)).toEqual({ passed: true, reason: "verified" });
    expect(compareQaRuns([webkit, webkit, webkit], 3)).toEqual({ passed: false, reason: "scene-drift" });
  });
});
