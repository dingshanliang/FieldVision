import { Pause, Play } from "lucide-react";
import { useDemoSequence } from "../hooks/useDemoSequence";
import { useFarmStore } from "../state/useFarmStore";
import type { DemoStep } from "../types/farm";

const steps: Array<{ id: DemoStep; label: string }> = [
  { id: "overview", label: "基地总览" },
  { id: "select-field", label: "进入地块" },
  { id: "inspect-risk", label: "发现异常" },
  { id: "irrigation", label: "灌溉处置" },
  { id: "recovered", label: "恢复验证" },
];

export function DemoTimeline() {
  const current = useFarmStore((state) => state.demoStep);
  const playing = useFarmStore((state) => state.demoPlaying);
  const paused = useFarmStore((state) => state.paused);
  const pacing = useFarmStore((state) => state.pacing);
  const introComplete = useFarmStore((state) => state.introComplete);
  const applyDemoState = useFarmStore((state) => state.applyDemoState);
  const setPacing = useFarmStore((state) => state.setPacing);
  const { play, stop, togglePause } = useDemoSequence();
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === current || (current === "drone-scan" && step.id === "inspect-risk")));
  if (!introComplete) return <div className="intro-caption"><span>FIELDVISION / 01</span><strong>每一块田，都可以进入</strong><small>Loading spatial twin</small></div>;
  function jumpTo(step: DemoStep) {
    stop();
    applyDemoState(step);
  }
  return (
    <footer className="demo-timeline">
      <div className="demo-controls">
        {playing ? (
          <button type="button" className="play-demo" onClick={togglePause} aria-label={paused ? "继续" : "暂停"}>
            {paused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
            {paused ? "继续" : "暂停"}
          </button>
        ) : (
          <button type="button" className="play-demo" onClick={() => void play()}><Play size={15} fill="currentColor" />播放完整演示</button>
        )}
        <div className="pacing-toggle" role="group" aria-label="演示节奏">
          <button type="button" className={pacing === "fast" ? "is-active" : ""} onClick={() => setPacing("fast")}>快览</button>
          <button type="button" className={pacing === "narration" ? "is-active" : ""} onClick={() => setPacing("narration")}>讲解</button>
        </div>
      </div>
      <div className="timeline-track">
        <span className="timeline-fill" style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }} />
        {steps.map((step, index) => (
          <button type="button" key={step.id} className={index <= activeIndex ? "is-active" : ""} onClick={() => jumpTo(step.id)}>
            <i>{String(index + 1).padStart(2, "0")}</i><span>{step.label}</span>
          </button>
        ))}
      </div>
      <div className="director-hint" aria-hidden="true">空格 暂停 · ←/→ 章节 · Home 总览</div>
    </footer>
  );
}
