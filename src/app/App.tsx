import { useEffect, useRef } from "react";
import { FarmCanvas } from "../scene/FarmCanvas";
import { PerfHud } from "../scene/PerfInstrumentation";
import { ChapterCaption } from "../ui/ChapterCaption";
import { DemoPrecheck } from "../ui/DemoPrecheck";
import { SoundToggle } from "../ui/SoundToggle";
import { DemoTimeline } from "../ui/DemoTimeline";
import { FieldDetailPanel } from "../ui/FieldDetailPanel";
import { LayerSwitcher } from "../ui/LayerSwitcher";
import { PresenterControls } from "../ui/PresenterControls";
import { TimeCutCard } from "../ui/TimeCutCard";
import { TopBar } from "../ui/TopBar";
import { useDemoSequence } from "../hooks/useDemoSequence";
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

/** 大屏/汇报模式（fv-66y.8）：?present=1 隐藏全部操作层，只留 3D 画面 + 电影粒，供投影/录屏。 */
function presentMode(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("present");
}

export function App() {
  const present = presentMode();
  const demoStep = useFarmStore((state) => state.demoStep);
  // fv-66y.22: 2.39:1 letterbox 仅在无人机扫描与恢复验证两拍启用——那是"作为镜头"的强信号。
  // present 模式也保留（属于电影感画面而非操作层）。
  const cinematic = demoStep === "drone-scan" || demoStep === "recovered";
  return (
    <main className={`app-shell${present ? " is-present" : ""}`}>
      <FarmCanvas />
      <AutoDemo />
      <div className="grain" aria-hidden="true" />
      <div className={`letterbox${cinematic ? " is-active" : ""}`} aria-hidden="true" />
      {present ? null : (
        <>
          <TopBar />
          <LayerSwitcher />
          <FieldDetailPanel />
          <DemoTimeline />
          <PresenterControls />
          <TimeCutCard />
          <ChapterCaption />
          <DemoPrecheck />
          <SoundToggle />
          <div className="canvas-status" aria-live="polite">三维基地已就绪。可选择地块、切换图层或播放完整演示。</div>
        </>
      )}
      <PerfHud />
    </main>
  );
}
