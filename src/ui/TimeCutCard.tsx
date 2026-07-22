import { useFarmStore } from "../state/useFarmStore";

/**
 * 时间跳切卡（fv-o6c.11）。演示跨农业日期时短暂浮现的标题卡，
 * 显式表达"次日 D1 · 根区复测"这类农业时间，避免观众把动画压缩误读为实时恢复。
 */
export function TimeCutCard() {
  const timeCut = useFarmStore((s) => s.timeCut);
  if (!timeCut) return null;
  return (
    <div className="timecut" key={`${timeCut.day}-${timeCut.label}`} role="status" aria-live="polite">
      <span className="timecut__day">{timeCut.day}</span>
      <span className="timecut__label">{timeCut.label}</span>
    </div>
  );
}
