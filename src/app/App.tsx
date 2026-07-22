import { FarmCanvas } from "../scene/FarmCanvas";
import { DemoTimeline } from "../ui/DemoTimeline";
import { FieldDetailPanel } from "../ui/FieldDetailPanel";
import { LayerSwitcher } from "../ui/LayerSwitcher";
import { TopBar } from "../ui/TopBar";
import { useFarmStore } from "../state/useFarmStore";
import { EvidencePrototypeControls } from "../prototype/evidence/EvidencePrototypeControls";

function AutoDemo() {
  const introComplete = useFarmStore((state) => state.introComplete);
  const started = useRef(false);
  const { play } = useDemoSequence();
  useEffect(() => {
    if (!introComplete || started.current) return;
    // QA harness: ?qa=1 disables autoplay so screenshot scripts can drive state directly.
    // ?proto=* 同样关闭自动播放，交给原型控制条驱动状态。
    const params = new URLSearchParams(window.location.search);
    if (params.has("qa") || params.has("proto")) return;
    started.current = true;
    const timer = window.setTimeout(() => void play(), 1200);
    return () => window.clearTimeout(timer);
  }, [introComplete, play]);
  return null;
}

export function App() {
  return (
    <main className="app-shell">
      <FarmCanvas />
      <AutoDemo />
      <div className="grain" aria-hidden="true" />
      <TopBar />
      <LayerSwitcher />
      <FieldDetailPanel />
      <DemoTimeline />
      <EvidencePrototypeControls />
      <div className="canvas-status" aria-live="polite">三维基地已就绪。可选择地块、切换图层或播放完整演示。</div>
    </main>
  );
}
import { useEffect, useRef } from "react";
import { useDemoSequence } from "../hooks/useDemoSequence";
