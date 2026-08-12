export type AutonomousTaskKind = "sowing" | "inspection" | "maintenance" | "aerial-survey" | "irrigation";
export type AutonomousTaskStatus =
  | "planned"
  | "awaiting-confirmation"
  | "authorized"
  | "running"
  | "paused"
  | "exception"
  | "completed"
  | "verified";
export type ConfirmationSource = "simulated-autoplay" | "presenter" | "demo-preset";

export interface AutonomousTaskPlan {
  targetId: string;
  equipmentId: string;
  routeId: string;
  parametersVersion: number;
  safetyBoundaryVersion: number;
}

export interface ConfirmationReceipt {
  source: ConfirmationSource;
  confirmedAt: string;
  planFingerprint: string;
  invalidatedAt: string | null;
  invalidationReason: string | null;
}

export interface TaskException {
  code: string;
  message: string;
  at: string;
}

export interface OperationCompletion {
  completedAt: string;
  receipt: string;
}

export interface VerifiedOutcome {
  verifiedAt: string;
  result: string;
  evidenceIds: string[];
}

export interface AutonomousTaskRecord {
  id: string;
  kind: AutonomousTaskKind;
  status: AutonomousTaskStatus;
  plan: AutonomousTaskPlan;
  dependencies: string[];
  progress: number;
  confirmationReceipt: ConfirmationReceipt | null;
  exception: TaskException | null;
  operationCompletion: OperationCompletion | null;
  verifiedOutcome: VerifiedOutcome | null;
}

export interface PlannedTaskInput extends AutonomousTaskPlan {
  id: string;
  kind: AutonomousTaskKind;
  dependencies?: string[];
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function fingerprint(plan: AutonomousTaskPlan) {
  return [
    plan.targetId,
    plan.equipmentId,
    plan.routeId,
    plan.parametersVersion,
    plan.safetyBoundaryVersion,
  ].join("|");
}

export function createPlannedTask(input: PlannedTaskInput): AutonomousTaskRecord {
  return {
    id: input.id,
    kind: input.kind,
    status: "planned",
    plan: {
      targetId: input.targetId,
      equipmentId: input.equipmentId,
      routeId: input.routeId,
      parametersVersion: input.parametersVersion,
      safetyBoundaryVersion: input.safetyBoundaryVersion,
    },
    dependencies: [...(input.dependencies ?? [])],
    progress: 0,
    confirmationReceipt: null,
    exception: null,
    operationCompletion: null,
    verifiedOutcome: null,
  };
}

export function confirmTask(task: AutonomousTaskRecord, source: ConfirmationSource, confirmedAt: string): AutonomousTaskRecord {
  return {
    ...task,
    status: "authorized",
    confirmationReceipt: {
      source,
      confirmedAt,
      planFingerprint: fingerprint(task.plan),
      invalidatedAt: null,
      invalidationReason: null,
    },
    exception: null,
  };
}

export function isConfirmationValid(task: AutonomousTaskRecord) {
  const receipt = task.confirmationReceipt;
  return Boolean(
    receipt
    && receipt.invalidatedAt === null
    && receipt.planFingerprint === fingerprint(task.plan),
  );
}

export interface ConfirmationChange extends Partial<AutonomousTaskPlan> {
  reason: string;
  at: string;
}

export function invalidateConfirmation(task: AutonomousTaskRecord, change: ConfirmationChange): AutonomousTaskRecord {
  const { reason, at, ...planChange } = change;
  const receipt = task.confirmationReceipt;
  return {
    ...task,
    status: "awaiting-confirmation",
    plan: { ...task.plan, ...planChange },
    confirmationReceipt: receipt ? {
      ...receipt,
      invalidatedAt: at,
      invalidationReason: reason,
    } : null,
  };
}

export function advanceTaskProgress(task: AutonomousTaskRecord, progress: number): AutonomousTaskRecord {
  if (["paused", "exception", "completed", "verified"].includes(task.status)) return task;
  if (!isConfirmationValid(task)) return task;
  const nextProgress = clamp01(progress);
  return {
    ...task,
    status: nextProgress > 0 ? "running" : task.status,
    progress: nextProgress,
  };
}

export function completeTask(task: AutonomousTaskRecord, completion: OperationCompletion): AutonomousTaskRecord {
  if (task.status !== "running" || !isConfirmationValid(task)) {
    throw new Error(`Task ${task.id} must be running with valid confirmation before completion`);
  }
  return {
    ...task,
    status: "completed",
    progress: 1,
    operationCompletion: { ...completion },
    verifiedOutcome: null,
  };
}

export function verifyTaskOutcome(task: AutonomousTaskRecord, outcome: VerifiedOutcome): AutonomousTaskRecord {
  if (task.status !== "completed") throw new Error(`Task ${task.id} must be completed before verification`);
  return {
    ...task,
    status: "verified",
    verifiedOutcome: { ...outcome, evidenceIds: [...outcome.evidenceIds] },
  };
}

export function raiseTaskException(
  tasks: Record<string, AutonomousTaskRecord>,
  taskId: string,
  exception: TaskException,
): Record<string, AutonomousTaskRecord> {
  if (!tasks[taskId]) return tasks;
  const affected = new Set([taskId]);
  let changed = true;
  while (changed) {
    changed = false;
    Object.values(tasks).forEach((task) => {
      if (!affected.has(task.id) && task.dependencies.some((dependency) => affected.has(dependency))) {
        affected.add(task.id);
        changed = true;
      }
    });
  }

  return Object.fromEntries(Object.entries(tasks).map(([id, task]) => {
    if (!affected.has(id)) return [id, task];
    if (id === taskId) return [id, { ...task, status: "exception", exception: { ...exception } }];
    return [id, { ...task, status: "paused" }];
  }));
}
