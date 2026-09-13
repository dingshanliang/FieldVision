import { Check, MousePointerClick, ShieldCheck } from "lucide-react";
import { useFarmStore } from "../state/useFarmStore";
import type { SmartFarmChapter } from "../state/smartFarmState";

/** 人工确认卡的章节上下文：每个条目指向一个 awaiting-confirmation 任务。 */
const CONFIRMATION_CONTEXT: Partial<Record<SmartFarmChapter, {
  taskId: string;
  ariaLabel: string;
  title: string;
  blurb: string;
  note: string;
}>> = {
  "remote-decision": {
    taskId: "IRRIGATE-A02",
    ariaLabel: "A02 远程处置确认",
    title: "A02 东侧缺水风险处置",
    blurb: "墒情监测与无人机多光谱复核共同发现连续低值区。系统不会仅凭单点数据自动处置，需由值守员确认后执行。",
    note: "确认前不会启动泵闸链路",
  },
  "weather-resume": {
    taskId: "STORM-CHECK",
    ariaLabel: "雨后巡检恢复确认",
    title: "雨后巡检恢复确认",
    blurb: "雷电预警解除，但巡检走廊仍有积水与阵风。恢复无人机巡检属于后果性操作，需值守员确认后执行。",
    note: "确认前 STORM-CHECK 保持安全停机",
  },
};

export function RemoteConfirmationCard() {
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const countdown = useFarmStore((state) => state.confirmationCountdown);
  const cue = useFarmStore((state) => state.confirmationCue);
  const confirmTaskForDemo = useFarmStore((state) => state.confirmTaskForDemo);
  const context = chapter ? CONFIRMATION_CONTEXT[chapter] : undefined;
  const task = useFarmStore((state) => (context ? state.tasks[context.taskId] : undefined));

  if (!context || !task) return null;
  const confirmed = task.status === "authorized" || task.status === "running";
  const buttonLabel = cue === "countdown"
    ? `自动演示将在 ${countdown ?? 0} 秒后模拟确认`
    : cue === "simulated-click"
      ? "已完成模拟确认"
      : cue === "presenter-click"
        ? "演示者已确认执行"
        : "确认执行";

  return (
    <aside className="remote-confirmation" aria-label={context.ariaLabel}>
      <div className="remote-confirmation__head">
        <span><ShieldCheck size={14} />人工确认后执行</span>
        <em>模拟演示</em>
      </div>
      <h2>{context.title}</h2>
      <p>{context.blurb}</p>
      <dl>
        <div><dt>处置目标</dt><dd>{task.plan.objective}</dd></div>
        <div><dt>执行设备</dt><dd>{task.plan.equipmentLabel}</dd></div>
        <div><dt>预计时长</dt><dd>{task.plan.expectedDurationMinutes} 分钟</dd></div>
        <div><dt>安全边界</dt><dd>{task.plan.safetyBoundaryLabel}</dd></div>
      </dl>
      <button
        type="button"
        className={confirmed ? "is-confirmed" : ""}
        disabled={confirmed}
        onClick={() => confirmTaskForDemo(context.taskId, "presenter")}
      >
        {confirmed ? <Check size={16} /> : <MousePointerClick size={16} />}
        {buttonLabel}
      </button>
      {task.confirmationReceipt ? (
        <small>确认记录 · {task.confirmationReceipt.source === "presenter" ? "演示者手动确认" : "自动演示中的模拟确认"}</small>
      ) : <small>{context.note}</small>}
    </aside>
  );
}
