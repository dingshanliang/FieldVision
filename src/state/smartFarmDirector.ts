import type { Pacing } from "./useFarmStore";
import type { SmartFarmChapter } from "./smartFarmState";

export interface SmartFarmChapterMeta {
  id: SmartFarmChapter;
  label: string;
  outcome: string;
  fastDurationMs: number;
  narrationDurationMs: number;
  simulatedConfirmationDelayMs?: number;
}

export interface SmartFarmSequenceChapter extends SmartFarmChapterMeta {
  durationMs: number;
}

export const SMART_FARM_CHAPTER_META: readonly SmartFarmChapterMeta[] = [
  { id: "base-online", label: "基地上线", outcome: "智慧基础设施进入在线状态", fastDurationMs: 10_000, narrationDurationMs: 16_000 },
  { id: "daily-plan", label: "当日任务", outcome: "清晨作业计划完成模拟确认", fastDurationMs: 8_000, narrationDurationMs: 14_000 },
  { id: "autonomous-operations", label: "无人作业", outcome: "地面设备出库并进入任务区", fastDurationMs: 12_000, narrationDurationMs: 22_000 },
  { id: "coordinated-patrol", label: "空地巡田", outcome: "固定感知、地面巡检与航测协同", fastDurationMs: 10_000, narrationDurationMs: 17_000 },
  { id: "a02-alert", label: "A02 异常", outcome: "多源观测形成待处置风险区", fastDurationMs: 10_000, narrationDurationMs: 17_000 },
  {
    id: "remote-decision",
    label: "远程确认",
    outcome: "值守员确认处置范围与安全边界",
    fastDurationMs: 10_000,
    narrationDurationMs: 15_000,
    simulatedConfirmationDelayMs: 3_000,
  },
  { id: "irrigation-response", label: "泵闸执行", outcome: "水利链路按依赖顺序执行", fastDurationMs: 12_000, narrationDurationMs: 21_000 },
  { id: "outcome-verification", label: "D1/D3 复测", outcome: "多源复测形成验证结果", fastDurationMs: 10_000, narrationDurationMs: 17_000 },
  { id: "return-overview", label: "回库总览", outcome: "设备回库，基地持续运行", fastDurationMs: 8_000, narrationDurationMs: 11_000 },
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
