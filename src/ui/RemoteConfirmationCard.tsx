import { Check, MousePointerClick, ShieldCheck } from "lucide-react";
import { useFarmStore } from "../state/useFarmStore";

export function RemoteConfirmationCard() {
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const task = useFarmStore((state) => state.tasks["IRRIGATE-A02"]);
  const countdown = useFarmStore((state) => state.confirmationCountdown);
  const cue = useFarmStore((state) => state.confirmationCue);
  const confirmTaskForDemo = useFarmStore((state) => state.confirmTaskForDemo);

  if (chapter !== "remote-decision" || !task) return null;
  const confirmed = task.status === "authorized";
  const buttonLabel = cue === "countdown"
    ? `模拟值守员将在 ${countdown ?? 0} 秒后确认`
    : cue === "simulated-click"
      ? "模拟值守员已点击确认"
      : cue === "presenter-click"
        ? "演示者已确认执行"
        : "确认执行";

  return (
    <aside className="remote-confirmation" aria-label="A02 远程处置确认">
      <div className="remote-confirmation__head">
        <span><ShieldCheck size={14} />监督式决策</span>
        <em>演示模拟</em>
      </div>
      <h2>A02 东侧缺水风险处置</h2>
      <p>固定墒情与多光谱复核共同提示连续低值，待值守员确认后执行，不代表单点自动确诊。</p>
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
        onClick={() => confirmTaskForDemo("IRRIGATE-A02", "presenter")}
      >
        {confirmed ? <Check size={16} /> : <MousePointerClick size={16} />}
        {buttonLabel}
      </button>
      {task.confirmationReceipt ? (
        <small>Confirmation Receipt · {task.confirmationReceipt.source === "presenter" ? "演示者入口" : "模拟自动播放入口"}</small>
      ) : <small>确认前不会启动泵闸链路</small>}
    </aside>
  );
}
