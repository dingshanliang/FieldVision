/**
 * Live-demo precheck (fv-66y.9). Splits a pure validator (testable, no DOM)
 * from the runtime read so the chapter/asset/canvas rules are covered by unit
 * tests without mounting the scene.
 */

/** Fidelity tier as seen by precheck (unknown before window is available). */
export type Tier = "low" | "medium" | "high" | "unknown";

export interface PrecheckResult {
  ok: boolean;
  tier: Tier;
  demoStep: string;
  introComplete: boolean;
  canvas: boolean;
  issues: string[];
}

/** Steps the demo is allowed to rest in; anything else is treated as drift. */
const VALID_STEPS: readonly string[] = [
  "intro",
  "overview",
  "select-field",
  "inspect-risk",
  "drone-scan",
  "irrigation",
  "recovered",
];

/**
 * Pure rule check. Returns the list of problems (empty ⇒ ok).
 * Exported for unit testing; runPrecheck composes it with DOM/store reads.
 */
export function precheckIssues(demoStep: string, introComplete: boolean, canvasOk: boolean): string[] {
  const issues: string[] = [];
  if (!canvasOk) issues.push("画布未就绪");
  if (!introComplete) issues.push("三维场景加载中");
  if (!VALID_STEPS.includes(demoStep)) issues.push(`章节状态异常（${demoStep}）`);
  return issues;
}

/** Whether an issue list can be cleared by a reset-to-overview (state drift), vs needs operator action. */
export function isRecoverable(issues: string[]): boolean {
  // A bad demoStep is fixed by reset; canvas/asset problems are not.
  return issues.every((i) => i.startsWith("章节状态异常"));
}
