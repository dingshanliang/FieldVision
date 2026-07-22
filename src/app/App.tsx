import { FarmCanvas } from "../scene/FarmCanvas";
import { DemoTimeline } from "../ui/DemoTimeline";
import { FieldDetailPanel } from "../ui/FieldDetailPanel";
import { LayerSwitcher } from "../ui/LayerSwitcher";
import { PresenterControls } from "../ui/PresenterControls";
import { TimeCutCard } from "../ui/TimeCutCard";
import { TopBar } from "../ui/TopBar";
import { useFarmStore } from "../state/useFarmStore";

function AutoDemo() {
  const introComplete = useFarmStore((state) => state.introComplete);
  const started = useRef(false);
  const { play } = useDemoSequence();
  useEffect(() => {
    if (!introComplete || started.current) return;
    // QA harness: ?qa=1 disables autoplay so screenshot scripts can drive state directly.
    if (new URLSearchParams(window.location.search).has("qa")) return;
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
      <PresenterControls />
      <TimeCutCard />
      <div className="canvas-status" aria-live="polite">三维基地已就绪。可选择地块、切换图层或播放完整演示。</div>
    </main>
  );
}
import { useEffect, useRef } from "react";
import { useDemoSequence } from "../hooks/useDemoSequence";
