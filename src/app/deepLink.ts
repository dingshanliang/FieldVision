import { SMART_FARM_CHAPTERS, type SmartFarmChapter } from "../state/smartFarmState";

/**
 * 章节深链（fv-227）：`?chapter=<id>` 打开即停在对应章节快照，autoplay
 * 从该章继续（"从第 N 章开讲"的销售刚需）。parse-once 模式（URL 不经导航
 * 不会变化，见 CameraDirector 的同款约定）；未知值静默忽略并保留完整
 * 播放。与 ?qa / ?tier / ?present 等参数互不冲突。
 */
function readInitialChapter(): SmartFarmChapter | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("chapter");
  if (!value) return null;
  return (SMART_FARM_CHAPTERS as readonly string[]).includes(value)
    ? (value as SmartFarmChapter)
    : null;
}

export const initialChapter: SmartFarmChapter | null = readInitialChapter();

/** 把当前地址栏的 chapter 参数与store 同步（时间线跳章后可分享/刷新）。 */
export function syncChapterParam(chapter: SmartFarmChapter) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (chapter === "base-online") params.delete("chapter");
  else params.set("chapter", chapter);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}
