import { Play } from "lucide-react";
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
  const introComplete = useFarmStore((state) => state.introComplete);
  const reset = useFarmStore((state) => state.resetDemo);
  const selectField = useFarmStore((state) => state.selectField);
  const setViewMode = useFarmStore((state) => state.setViewMode);
  const setLayerMode = useFarmStore((state) => state.setLayerMode);
  const setDemoStep = useFarmStore((state) => state.setDemoStep);
  const setProgress = useFarmStore((state) => state.setIrrigationProgress);
  const setFieldStatus = useFarmStore((state) => state.setFieldStatus);
  const { play, stop } = useDemoSequence();
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === current || (current === "drone-scan" && step.id === "inspect-risk")));
  if (!introComplete) return <div className="intro-caption"><span>FIELDVISION / 01</span><strong>每一块田，都可以进入</strong><small>Loading spatial twin</small></div>;
  function jumpTo(step: DemoStep) {
    stop();
    if (step === "overview") { reset(); return; }
    selectField("A02");
    if (step === "select-field") { setProgress(0); setFieldStatus("A02", "risk"); setLayerMode("natural"); setViewMode("field-ground"); setDemoStep(step); return; }
    if (step === "inspect-risk") { setProgress(0); setFieldStatus("A02", "risk"); setLayerMode("growth"); setViewMode("field-aerial"); setDemoStep("drone-scan"); return; }
    if (step === "irrigation") { setLayerMode("growth"); setViewMode("irrigation"); setDemoStep(step); setProgress(0.62); setFieldStatus("A02", "processing"); return; }
    setLayerMode("natural"); setViewMode("field-aerial"); setDemoStep("recovered"); setProgress(1); setFieldStatus("A02", "recovered");
  }
  return (
    <footer className="demo-timeline">
      <button type="button" className="play-demo" onClick={() => void play()} disabled={playing}><Play size={15} fill="currentColor" />{playing ? "演示进行中" : "播放完整演示"}</button>
      <div className="timeline-track">
        <span className="timeline-fill" style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }} />
        {steps.map((step, index) => <button type="button" key={step.id} className={index <= activeIndex ? "is-active" : ""} onClick={() => jumpTo(step.id)}><i>{String(index + 1).padStart(2,"0")}</i><span>{step.label}</span></button>)}
      </div>
    </footer>
  );
}
