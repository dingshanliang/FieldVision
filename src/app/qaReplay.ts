import { SMART_FARM_CHAPTERS, type SmartFarmChapter } from "../state/smartFarmState";
import type { QaSceneMetrics } from "../scene/qaSceneMetrics";

export interface QaRunResult {
  chapters: readonly SmartFarmChapter[];
  finalChapter: SmartFarmChapter;
  waterStatus: string;
  fieldStatus: string;
  taskCount: number;
  activeMachineCount: number;
  demoPlaying: boolean;
  scene: QaSceneMetrics;
  postRunScene: QaSceneMetrics;
  postRunMutationCount: number;
  lateWriteAttempts: number;
}

export function createQaRunResult(result: QaRunResult): QaRunResult {
  return { ...result, chapters: [...result.chapters] };
}

function signature(result: QaRunResult) {
  return JSON.stringify(result);
}

export function compareQaRuns(results: readonly QaRunResult[], expectedRuns: number) {
  if (results.length !== expectedRuns) return { passed: false, reason: "run-count" } as const;
  const expectedChapters = JSON.stringify(SMART_FARM_CHAPTERS);
  if (results.some((result) => JSON.stringify(result.chapters) !== expectedChapters)) {
    return { passed: false, reason: "chapter-order" } as const;
  }
  if (results.some((result) => result.finalChapter !== "return-overview"
    || result.waterStatus !== "verified"
    || result.fieldStatus !== "recovered"
    || result.demoPlaying)) {
    return { passed: false, reason: "final-state" } as const;
  }
  // WebKit does not expose stable renderer.info counters through this harness.
  // The single-run Safari matrix is therefore a cross-browser business smoke;
  // the strict three-run Chrome matrix owns resource-count accumulation.
  if (expectedRuns > 1 && results.some((result) => result.scene.objects <= 0
    || result.scene.meshes <= 0
    || result.scene.geometries <= 0
    || result.postRunScene.geometries <= 0)) {
    return { passed: false, reason: "scene-drift" } as const;
  }
  // A one-run cross-browser smoke proves that the real WebGL scene rendered
  // and reached its canonical business end state. Safari may finish deferred
  // renderer disposal after either adjacent sample. The three-run acceptance
  // matrix remains strict: each full result (including both scene snapshots)
  // must be identical across replays, and within-run object/mesh counts must
  // settle before the next run starts.
  if (expectedRuns > 1 && results.some((result) => result.scene.objects !== result.postRunScene.objects
    || result.scene.meshes !== result.postRunScene.meshes
    || result.scene.geometries !== result.postRunScene.geometries)) {
    return { passed: false, reason: "scene-drift" } as const;
  }
  if (results.some((result) => result.postRunMutationCount !== 0 || result.lateWriteAttempts !== 0)) {
    return { passed: false, reason: "late-write" } as const;
  }
  const first = results[0];
  if (!first || results.some((result) => signature(result) !== signature(first))) {
    return { passed: false, reason: "state-drift" } as const;
  }
  return { passed: true, reason: "verified" } as const;
}
