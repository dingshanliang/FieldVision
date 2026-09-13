import type { DemoStatePreset } from "./irrigationEvent";
import { getDemoStatePreset } from "./irrigationEvent";
import {
  advanceTaskProgress,
  completeTask,
  confirmTask,
  createPlannedTask,
  raiseTaskException,
  verifyTaskOutcome,
  type AutonomousTaskRecord,
  type ConfirmationSource,
} from "./autonomousTask";
import { visualConfig } from "../config/visual";
import type { DayPhase } from "../types/farm";

export const SMART_FARM_CHAPTERS = [
  "base-online",
  "daily-plan",
  "autonomous-operations",
  "coordinated-patrol",
  "a02-alert",
  "remote-decision",
  "irrigation-response",
  "outcome-verification",
  "weather-front",
  "weather-resume",
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
  /** 章节进入时的暴雨强度（0 晴 → 1 强对流峰值），直跳与播放共用（fv-weather）。 */
  stormProgress: number;
  /** 章节进入时的日相（fv-daynight 三段式），直跳与播放共用。 */
  dayPhase: DayPhase;
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
      equipmentLabel: "无人拖拉机 · 6 行播种机",
      routeId: "B03-SOWING-STRIPS",
      objective: "夏大豆缺苗区补播覆盖率 ≥96%",
      expectedDurationMinutes: 55,
      safetyBoundaryLabel: "B03 批准补播条带",
      parametersVersion: 1,
      safetyBoundaryVersion: 1,
    }),
    "PATROL-A03": createPlannedTask({
      id: "PATROL-A03",
      kind: "inspection",
      targetId: "A03-B02-SERVICE-EDGE",
      equipmentId: "ROBOT-01",
      equipmentLabel: "田间巡检机器人",
      routeId: "CENTRAL-PATROL-ROUTE",
      objective: "完成 A03、B02 边缘苗情与路况巡检",
      expectedDurationMinutes: 42,
      safetyBoundaryLabel: "中央机耕路与批准地块边缘",
      parametersVersion: 1,
      safetyBoundaryVersion: 1,
    }),
    "MAINT-EAST": createPlannedTask({
      id: "MAINT-EAST",
      kind: "maintenance",
      targetId: "EAST-MAINTENANCE-BELT",
      equipmentId: "MOWER-01",
      equipmentLabel: "自主维护设备",
      routeId: "EAST-MAINTENANCE-ROUTE",
      objective: "清理泵站与渠道维护带杂草",
      expectedDurationMinutes: 48,
      safetyBoundaryLabel: "东侧环路与渠道维护带",
      parametersVersion: 1,
      safetyBoundaryVersion: 1,
    }),
    "UAV-A02": createPlannedTask({
      id: "UAV-A02",
      kind: "aerial-survey",
      targetId: "A02",
      equipmentId: "UAV-01",
      equipmentLabel: "多光谱无人机",
      routeId: "A02-MULTISPECTRAL-ROUTE",
      objective: "复核 A02 东侧连续低值区",
      expectedDurationMinutes: 18,
      safetyBoundaryLabel: "A02 核准航测走廊",
      parametersVersion: 1,
      safetyBoundaryVersion: 1,
    }),
    "IRRIGATE-A02": createPlannedTask({
      id: "IRRIGATE-A02",
      kind: "irrigation",
      targetId: "A02",
      equipmentId: "PUMP-01+GATE-E",
      equipmentLabel: "泵站 · 主闸 · 东支闸",
      routeId: "A02-EAST-WATER-CHAIN",
      objective: "根区含水率 18% → 26%",
      expectedDurationMinutes: 37,
      safetyBoundaryLabel: "A02 东侧 23.6 亩",
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
  if (chapter === "coordinated-patrol") {
    return raiseTaskException(tasks, "SOW-B03", {
      code: "OBSTACLE_STOP",
      message: "B03 地头检测到临时障碍，无人拖拉机已停车",
      at: "2026-06-03T08:24:00+08:00",
    });
  }

  tasks = verifiedUav(tasks);
  const irrigation = tasks["IRRIGATE-A02"];
  if (irrigation) tasks[irrigation.id] = { ...irrigation, status: "awaiting-confirmation" };
  if (chapter === "a02-alert") return tasks;

  if (chapter === "remote-decision") return tasks;

  if (tasks["IRRIGATE-A02"]) tasks["IRRIGATE-A02"] = confirmTask(tasks["IRRIGATE-A02"], "demo-preset", "2026-06-03T17:40:00+08:00");
  tasks = progress(tasks, { "IRRIGATE-A02": 0.62 });
  if (chapter === "irrigation-response") return tasks;

  const waterTask = tasks["IRRIGATE-A02"];
  if (waterTask) {
    const completed = completeTask(waterTask, {
      completedAt: "2026-06-03T19:10:00+08:00",
      receipt: "泵闸动作完成，A02 已到水",
    });
    tasks[waterTask.id] = verifyTaskOutcome(completed, {
      verifiedAt: "2026-06-04T07:30:00+08:00",
      result: "D1 根区复测回到目标区间，风险解除",
      evidenceIds: ["OBS-A02-D1"],
    });
  }
  if (chapter === "outcome-verification") return tasks;

  // fv-weather：复核当日午后强对流过境。雨后巡检任务（观测性质）在授权窗口内
  // 起飞，随即因雷电安全阈值触发 Task Exception——只有 STORM-CHECK 停机，
  // 已 verified 的历史任务不受影响（异常仅沿操作依赖传播）。
  const stormCheck = confirmTask(createPlannedTask({
    id: "STORM-CHECK",
    kind: "inspection",
    targetId: "BASE-WIDE",
    equipmentId: "UAV-01",
    equipmentLabel: "多光谱无人机",
    routeId: "POST-STORM-PERIMETER",
    objective: "雨后全基地设施与苗情巡检复核",
    expectedDurationMinutes: 26,
    safetyBoundaryLabel: "基地巡检走廊",
    parametersVersion: 1,
    safetyBoundaryVersion: 1,
  }), "demo-preset", "2026-06-06T14:02:00+08:00");
  tasks["STORM-CHECK"] = advanceTaskProgress(stormCheck, 0.25);

  if (chapter === "weather-front") {
    tasks = raiseTaskException(tasks, "STORM-CHECK", {
      code: "LIGHTNING_HOLD",
      message: "雷电预警：云层放电概率超安全阈值，无人机返航避让",
      at: "2026-06-06T14:08:00+08:00",
    });
    return tasks;
  }

  // 雨势减弱：值守员确认恢复（快照用 demo-preset 溯源，播放时由确认卡覆写）。
  const resumed = tasks["STORM-CHECK"];
  if (resumed) {
    tasks["STORM-CHECK"] = advanceTaskProgress(
      confirmTask(resumed, "demo-preset", "2026-06-06T14:46:00+08:00"),
      0.55,
    );
  }
  if (chapter === "weather-resume") return tasks;

  Object.values(tasks).forEach((task) => {
    if (task.status === "verified") return;
    const completed = completeTask(task, {
      completedAt: "2026-06-06T15:05:00+08:00",
      receipt: `${task.id} 完成并回库`,
    });
    tasks[task.id] = verifyTaskOutcome(completed, {
      verifiedAt: "2026-06-06T15:08:00+08:00",
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

/** fv-weather：章节进入时的暴雨强度基线（播放时会在章节内重新推演）。 */
function stormForChapter(chapter: SmartFarmChapter): number {
  if (chapter === "weather-front") return 1;
  if (chapter === "weather-resume") return 0.45;
  return 0;
}

/**
 * fv-daynight 三段式：章节进入时的日相基线。作业日（06-03）清晨推进到
 * 黄昏决策与夜间供水，次日清晨（06-04 D1）复测，第 3 天（06-06 D3）午后
 * 强对流过境后收尾。联动供水的夜相可通过 visualConfig.nightIrrigationPhase
 * 全局降级为 dusk（中档评审逃生开关）。
 */
export function dayPhaseForChapter(chapter: SmartFarmChapter): DayPhase {
  if (chapter === "remote-decision") return "dusk";
  if (chapter === "irrigation-response") return visualConfig.nightIrrigationPhase;
  if (chapter === "outcome-verification") return "dawn";
  if (chapter === "weather-front" || chapter === "weather-resume" || chapter === "return-overview") return "day";
  return "dawn";
}

export function getSmartFarmChapterSnapshot(chapter: SmartFarmChapter): SmartFarmChapterSnapshot {
  const visual = legacyPresetForChapter(chapter);
  return {
    ...visual,
    chapter,
    tasks: taskStateForChapter(chapter),
    dailyOperationPlan: plan(chapter === "base-online" ? "draft" : chapter === "return-overview" ? "completed" : "confirmed"),
    stormProgress: stormForChapter(chapter),
    dayPhase: dayPhaseForChapter(chapter),
  };
}
