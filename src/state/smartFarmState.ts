import type { DemoStatePreset } from "./irrigationEvent";
import { getDemoStatePreset } from "./irrigationEvent";
import {
  advanceTaskProgress,
  completeTask,
  confirmTask,
  createPlannedTask,
  verifyTaskOutcome,
  type AutonomousTaskRecord,
  type ConfirmationSource,
} from "./autonomousTask";

export const SMART_FARM_CHAPTERS = [
  "base-online",
  "daily-plan",
  "autonomous-operations",
  "coordinated-patrol",
  "a02-alert",
  "remote-decision",
  "irrigation-response",
  "outcome-verification",
  "return-overview",
] as const;

export type SmartFarmChapter = (typeof SMART_FARM_CHAPTERS)[number];
export type DailyOperationPlanStatus = "draft" | "confirmed" | "completed";

export interface DailyOperationPlan {
  id: string;
  operatingWindow: string;
  taskIds: string[];
  status: DailyOperationPlanStatus;
  confirmationSource: ConfirmationSource | null;
}

export interface SmartFarmChapterSnapshot extends DemoStatePreset {
  chapter: SmartFarmChapter;
  tasks: Record<string, AutonomousTaskRecord>;
  dailyOperationPlan: DailyOperationPlan;
}

const ROUTINE_TASK_IDS = ["SOW-B03", "PATROL-A03", "MAINT-EAST"] as const;
const DEMO_TIME = "2026-06-03T08:00:00+08:00";

function createBaseTasks(): Record<string, AutonomousTaskRecord> {
  return {
    "SOW-B03": createPlannedTask({
      id: "SOW-B03",
      kind: "sowing",
      targetId: "B03",
      equipmentId: "TRACTOR-01",
      routeId: "B03-SOWING-STRIPS",
      parametersVersion: 1,
      safetyBoundaryVersion: 1,
    }),
    "PATROL-A03": createPlannedTask({
      id: "PATROL-A03",
      kind: "inspection",
      targetId: "A03-B02-SERVICE-EDGE",
      equipmentId: "ROBOT-01",
      routeId: "CENTRAL-PATROL-ROUTE",
      parametersVersion: 1,
      safetyBoundaryVersion: 1,
    }),
    "MAINT-EAST": createPlannedTask({
      id: "MAINT-EAST",
      kind: "maintenance",
      targetId: "EAST-MAINTENANCE-BELT",
      equipmentId: "MOWER-01",
      routeId: "EAST-MAINTENANCE-ROUTE",
      parametersVersion: 1,
      safetyBoundaryVersion: 1,
    }),
    "UAV-A02": createPlannedTask({
      id: "UAV-A02",
      kind: "aerial-survey",
      targetId: "A02",
      equipmentId: "UAV-01",
      routeId: "A02-MULTISPECTRAL-ROUTE",
      parametersVersion: 1,
      safetyBoundaryVersion: 1,
    }),
    "IRRIGATE-A02": createPlannedTask({
      id: "IRRIGATE-A02",
      kind: "irrigation",
      targetId: "A02",
      equipmentId: "PUMP-01+GATE-E",
      routeId: "A02-EAST-WATER-CHAIN",
      parametersVersion: 1,
      safetyBoundaryVersion: 1,
      dependencies: ["UAV-A02"],
    }),
  };
}

function plan(status: DailyOperationPlanStatus): DailyOperationPlan {
  return {
    id: "PLAN-2026-06-03-AM",
    operatingWindow: "2026-06-03 08:00–10:30 +08:00",
    taskIds: [...ROUTINE_TASK_IDS],
    status,
    confirmationSource: status === "draft" ? null : "demo-preset",
  };
}

function authorize(tasks: Record<string, AutonomousTaskRecord>, ids: readonly string[]) {
  return ids.reduce<Record<string, AutonomousTaskRecord>>((next, id) => {
    const task = next[id];
    if (task) next[id] = confirmTask(task, "demo-preset", DEMO_TIME);
    return next;
  }, { ...tasks });
}

function progress(tasks: Record<string, AutonomousTaskRecord>, values: Record<string, number>) {
  return Object.entries(values).reduce<Record<string, AutonomousTaskRecord>>((next, [id, value]) => {
    const task = next[id];
    if (task) next[id] = advanceTaskProgress(task, value);
    return next;
  }, { ...tasks });
}

function verifiedUav(tasks: Record<string, AutonomousTaskRecord>) {
  const next = { ...tasks };
  const task = next["UAV-A02"];
  if (!task) return next;
  const completed = completeTask(task, { completedAt: "2026-06-03T08:32:00+08:00", receipt: "A02 多光谱航测覆盖完成" });
  next[task.id] = verifyTaskOutcome(completed, {
    verifiedAt: "2026-06-03T08:33:00+08:00",
    result: "固定感知与航测均提示 A02 东侧连续低值",
    evidenceIds: ["OBS-A02-ROOT-D0", "OBS-A02-UAV-D0"],
  });
  return next;
}

function taskStateForChapter(chapter: SmartFarmChapter) {
  let tasks = createBaseTasks();
  if (chapter === "base-online") return tasks;

  tasks = authorize(tasks, ROUTINE_TASK_IDS);
  if (chapter === "daily-plan") return tasks;

  tasks = progress(tasks, { "SOW-B03": 0.42, "PATROL-A03": 0.28, "MAINT-EAST": 0.35 });
  if (chapter === "autonomous-operations") return tasks;

  tasks = authorize(tasks, ["UAV-A02"]);
  tasks = progress(tasks, { "UAV-A02": 0.48 });
  if (chapter === "coordinated-patrol") return tasks;

  tasks = verifiedUav(tasks);
  const irrigation = tasks["IRRIGATE-A02"];
  if (irrigation) tasks[irrigation.id] = { ...irrigation, status: "awaiting-confirmation" };
  if (chapter === "a02-alert") return tasks;

  if (tasks["IRRIGATE-A02"]) tasks["IRRIGATE-A02"] = confirmTask(tasks["IRRIGATE-A02"], "demo-preset", "2026-06-03T08:35:00+08:00");
  if (chapter === "remote-decision") return tasks;

  tasks = progress(tasks, { "IRRIGATE-A02": 0.62 });
  if (chapter === "irrigation-response") return tasks;

  const waterTask = tasks["IRRIGATE-A02"];
  if (waterTask) {
    const completed = completeTask(waterTask, {
      completedAt: "2026-06-03T09:12:00+08:00",
      receipt: "泵闸动作完成，A02 已到水",
    });
    tasks[waterTask.id] = verifyTaskOutcome(completed, {
      verifiedAt: "2026-06-06T09:20:00+08:00",
      result: "D1 根区与 D3 冠层复测一致，风险解除",
      evidenceIds: ["OBS-A02-D1", "OBS-A02-D3"],
    });
  }
  if (chapter === "outcome-verification") return tasks;

  Object.values(tasks).forEach((task) => {
    if (task.status === "verified") return;
    const completed = completeTask(task, {
      completedAt: "2026-06-03T10:20:00+08:00",
      receipt: `${task.id} 完成并回库`,
    });
    tasks[task.id] = verifyTaskOutcome(completed, {
      verifiedAt: "2026-06-03T10:22:00+08:00",
      result: `${task.id} 作业结果已核验`,
      evidenceIds: [`RECEIPT-${task.id}`],
    });
  });
  return tasks;
}

function legacyPresetForChapter(chapter: SmartFarmChapter) {
  if (chapter === "a02-alert" || chapter === "remote-decision") return getDemoStatePreset("inspect-risk");
  if (chapter === "irrigation-response") return getDemoStatePreset("irrigation");
  if (chapter === "outcome-verification") return getDemoStatePreset("recovered");
  if (chapter === "return-overview") {
    return {
      ...getDemoStatePreset("overview"),
      fieldStatus: "recovered" as const,
      recoveryPhase: "resolved" as const,
    };
  }
  return getDemoStatePreset("overview");
}

export function getSmartFarmChapterSnapshot(chapter: SmartFarmChapter): SmartFarmChapterSnapshot {
  const visual = legacyPresetForChapter(chapter);
  return {
    ...visual,
    chapter,
    tasks: taskStateForChapter(chapter),
    dailyOperationPlan: plan(chapter === "base-online" ? "draft" : chapter === "return-overview" ? "completed" : "confirmed"),
  };
}
