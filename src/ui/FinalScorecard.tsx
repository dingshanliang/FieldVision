/**
 * 片尾成绩卡（fv-227）：return-overview 章的"总结陈词"。数字全部派生——
 * 任务闭环从 store.tasks 数 verified，恢复指标走 recoverySummary()（与
 * 地块面板同源），不维护第二份手写数字。章节开始 ~1.5s 后入场，不阻塞
 * 镜头；present/photo 模式不渲染。
 */
import { BadgeCheck } from "lucide-react";
import { useFarmStore } from "../state/useFarmStore";
import { recoverySummary } from "../state/recoveryModel";

export function FinalScorecard() {
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const introComplete = useFarmStore((state) => state.introComplete);
  const tasks = useFarmStore((state) => state.tasks);
  if (chapter !== "return-overview" || !introComplete) return null;

  const records = Object.values(tasks);
  const verified = records.filter((task) => task.status === "verified").length;
  const summary = recoverySummary();

  return (
    <aside className="final-score" aria-live="polite">
      <div className="final-score__head">
        <BadgeCheck size={18} />
        <span>双日作业闭环</span>
      </div>
      <h2>全部任务完成并经核验</h2>
      <div className="final-score__metrics">
        <div>
          <small>任务闭环</small>
          <strong>{verified}<em>/{records.length}</em></strong>
          <span>回执可追溯</span>
        </div>
        <div>
          <small>A02 根区含水率</small>
          <strong>{summary.rootVwcBefore}<i>→</i>{summary.rootVwcAfter}<em>%</em></strong>
          <span>{summary.verifyDayLabel}复测回到区间</span>
        </div>
        <div>
          <small>冠层低值区</small>
          <strong>{summary.lowValueAreaBefore}<i>→</i>{summary.lowValueAreaAfter}<em>亩</em></strong>
          <span>连续复测收敛</span>
        </div>
      </div>
      <small>06-03 作业日 → 06-06 过境日 · 监督自治全程留痕</small>
    </aside>
  );
}
