import { isConfirmationValid, type AutonomousTaskRecord } from "./autonomousTask";
import type { RecoveryPhase } from "./recoveryModel";

export type HydraulicNodeId = "pump" | "main-gate" | "main-channel" | "branch-gate" | "branch-channel" | "field-inlet";
export type HydraulicNodeStatus = "waiting" | "active" | "complete";
export type A02RiskStatus = "pending-action" | "awaiting-verification" | "recovering" | "resolved";

export interface A02ResponseState {
  effectiveProgress: number;
  hydraulicChain: Array<{ id: HydraulicNodeId; status: HydraulicNodeStatus }>;
  riskStatus: A02RiskStatus;
}

const HYDRAULIC_DEPENDENCIES: ReadonlyArray<{ id: HydraulicNodeId; start: number; complete: number }> = [
  { id: "pump", start: 0.01, complete: 0.13 },
  { id: "main-gate", start: 0.11, complete: 0.25 },
  { id: "main-channel", start: 0.22, complete: 0.47 },
  { id: "branch-gate", start: 0.41, complete: 0.52 },
  { id: "branch-channel", start: 0.46, complete: 0.61 },
  { id: "field-inlet", start: 0.58, complete: 0.7 },
];

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/**
 * A02 监督式处置的只读业务投影。确认无效时整条水利链归零；Operation
 * Completion、D1 恢复和 D3/最终验证严格分开，供 UI、场景和测试共享。
 */
export function deriveA02Response(
  task: AutonomousTaskRecord,
  requestedProgress: number,
  recoveryPhase: RecoveryPhase,
): A02ResponseState {
  const executable = isConfirmationValid(task)
    && ["authorized", "running", "completed", "verified"].includes(task.status);
  const effectiveProgress = executable ? clamp01(requestedProgress) : 0;
  const hydraulicChain = HYDRAULIC_DEPENDENCIES.map(({ id, start, complete }) => ({
    id,
    status: effectiveProgress < start ? "waiting" as const : effectiveProgress >= complete ? "complete" as const : "active" as const,
  }));

  let riskStatus: A02RiskStatus = "pending-action";
  if (task.operationCompletion || recoveryPhase === "arrived") riskStatus = "awaiting-verification";
  if (recoveryPhase === "d1-root" || recoveryPhase === "d3-reflight") riskStatus = "recovering";
  if (task.status === "verified" && recoveryPhase === "resolved") riskStatus = "resolved";

  return { effectiveProgress, hydraulicChain, riskStatus };
}
