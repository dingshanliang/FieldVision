import type { Pacing } from "./useFarmStore";
import type { SmartFarmChapter } from "./smartFarmState";

export interface SmartFarmChapterMeta {
  id: SmartFarmChapter;
  label: string;
  outcome: string;
  fastDurationMs: number;
  narrationDurationMs: number;
  simulatedConfirmationDelayMs?: number;
  /** 该章节等待确认的任务（缺省 IRRIGATE-A02，fv-weather 起支持其他任务）。 */
  confirmationTaskId?: string;
}

export interface SmartFarmSequenceChapter extends SmartFarmChapterMeta {
  durationMs: number;
}

export const SMART_FARM_CHAPTER_META: readonly SmartFarmChapterMeta[] = [
  { id: "base-online", label: "基地全景", outcome: "基地设施、农机与感知设备全面在线", fastDurationMs: 10_000, narrationDurationMs: 16_000 },
  { id: "daily-plan", label: "今日作业", outcome: "今日作业计划已确认", fastDurationMs: 8_000, narrationDurationMs: 14_000 },
  { id: "autonomous-operations", label: "无人作业", outcome: "无人农机按计划进入作业区", fastDurationMs: 12_000, narrationDurationMs: 22_000 },
  { id: "coordinated-patrol", label: "协同巡田", outcome: "固定监测、地面巡检与无人机协同复核", fastDurationMs: 10_000, narrationDurationMs: 17_000 },
  { id: "a02-alert", label: "发现缺水", outcome: "多源观测锁定 A02 缺水风险区", fastDurationMs: 10_000, narrationDurationMs: 17_000 },
  {
    id: "remote-decision",
    label: "远程确认",
    outcome: "值守员确认处置范围和安全边界",
    fastDurationMs: 10_000,
    narrationDurationMs: 15_000,
    simulatedConfirmationDelayMs: 3_000,
  },
  { id: "irrigation-response", label: "联动供水", outcome: "泵站、闸门与渠道依次联动供水", fastDurationMs: 12_000, narrationDurationMs: 21_000 },
  { id: "outcome-verification", label: "恢复验证", outcome: "连续复测确认 A02 恢复达标", fastDurationMs: 10_000, narrationDurationMs: 17_000 },
  {
    id: "weather-front",
    label: "强对流预警",
    outcome: "气象预警触发无人机返航与巡检任务安全暂停",
    fastDurationMs: 12_000,
    narrationDurationMs: 20_000,
  },
  {
    id: "weather-resume",
    label: "雨后复业",
    outcome: "雨势减弱，值守员确认恢复巡检作业",
    fastDurationMs: 10_000,
    narrationDurationMs: 16_000,
    simulatedConfirmationDelayMs: 3_000,
    confirmationTaskId: "STORM-CHECK",
  },
  { id: "return-overview", label: "闭环完成", outcome: "设备回库，A02 风险解除，基地持续运行", fastDurationMs: 8_000, narrationDurationMs: 11_000 },
] as const;

export function createSmartFarmSequencePlan(pacing: Pacing): SmartFarmSequenceChapter[] {
  return SMART_FARM_CHAPTER_META.map((chapter) => ({
    ...chapter,
    durationMs: pacing === "narration" ? chapter.narrationDurationMs : chapter.fastDurationMs,
  }));
}

export function smartFarmSequenceDuration(pacing: Pacing): number {
  return createSmartFarmSequencePlan(pacing).reduce((total, chapter) => total + chapter.durationMs, 0);
}
