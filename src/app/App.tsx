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
import { RemoteConfirmationCard } from "../ui/RemoteConfirmationCard";
import { TimeCutCard } from "../ui/TimeCutCard";
import { TopBar } from "../ui/TopBar";
import { readDemoSequenceAudit, useDemoSequence } from "../hooks/useDemoSequence";
import { useFarmStore } from "../state/useFarmStore";
import type { SmartFarmChapter } from "../state/smartFarmState";
import { shouldAutoReplay } from "./autoReplay";
import { compareQaRuns, createQaRunResult, type QaRunResult } from "./qaReplay";
import { selectActiveMachineIds } from "../scene/autonomousMachineMotion";
import { detectTier } from "../hooks/usePerformanceTier";
import { readQaSceneMetrics } from "../scene/qaSceneMetrics";

function AutoDemo() {
  const introComplete = useFarmStore((state) => state.introComplete);
  const started = useRef(false);
  const { play } = useDemoSequence();
  useEffect(() => {
    if (!introComplete || started.current) return;
    const params = new URLSearchParams(window.location.search);
    // QA harness: ?qa=1 disables autoplay so screenshot scripts can drive state directly.
    if (params.has("qa")) return;
    started.current = true;
    const qaRun = params.get("qaRun");
    if (qaRun === "fast" || qaRun === "narration") {
      const runs = Math.min(3, Math.max(1, Number(params.get("qaRuns")) || 1));
      const pacing = qaRun === "narration" ? "narration" : "fast";
      useFarmStore.getState().setPacing(pacing);
      document.title = `FieldVision QA RUNNING · ${pacing} ×${runs}`;
      const timer = window.setTimeout(() => {
        void (async () => {
          const results: QaRunResult[] = [];
          for (let index = 0; index < runs; index += 1) {
            const chapters: SmartFarmChapter[] = ["base-online"];
            // Every play() resets to base-online. Seed the observer with that
            // canonical first chapter so subsequent runs do not record it twice.
            let previous: SmartFarmChapter = "base-online";
            const unsubscribe = useFarmStore.subscribe((state) => {
              if (state.smartFarmChapter !== previous) {
                chapters.push(state.smartFarmChapter);
                previous = state.smartFarmChapter;
              }
            });
            const auditBefore = readDemoSequenceAudit();
            await play({ confirmationMode: "simulated" });
            unsubscribe();
            let postRunMutationCount = 0;
            const unsubscribeQuarantine = useFarmStore.subscribe(() => { postRunMutationCount += 1; });
            // Let the renderer finish chapter teardown before taking the
            // resource baseline. Store writes remain monitored throughout,
            // so this settling window cannot hide a stale controller update.
            await new Promise((resolve) => window.setTimeout(resolve, 500));
            const scene = readQaSceneMetrics();
            await new Promise((resolve) => window.setTimeout(resolve, 500));
            unsubscribeQuarantine();
            const postRunScene = readQaSceneMetrics();
            const sequenceAudit = readDemoSequenceAudit();
            const state = useFarmStore.getState();
            results.push(createQaRunResult({
              chapters,
              finalChapter: state.smartFarmChapter,
              waterStatus: state.tasks["IRRIGATE-A02"]?.status ?? "missing",
              fieldStatus: state.fieldStatuses.A02 ?? "missing",
              taskCount: Object.keys(state.tasks).length,
              activeMachineCount: selectActiveMachineIds(state.smartFarmChapter, detectTier()).length,
              demoPlaying: state.demoPlaying,
              scene,
              postRunScene,
              postRunMutationCount,
              lateWriteAttempts: sequenceAudit.lateWriteAttempts - auditBefore.lateWriteAttempts,
            }));
          }
          const audit = compareQaRuns(results, runs);
          (window as unknown as { __qaReport?: { audit: typeof audit; results: QaRunResult[] } }).__qaReport = { audit, results };
          const state = useFarmStore.getState();
          const water = state.tasks["IRRIGATE-A02"];
          const failureDetail = results.map((result) =>
            `${result.scene.objects}/${result.scene.meshes}/${result.scene.geometries}`
            + `>${result.postRunScene.objects}/${result.postRunScene.meshes}/${result.postRunScene.geometries}`,
          ).join(",");
          document.title = `FieldVision QA ${audit.passed ? "PASS" : "FAIL"} · ${pacing} ×${runs} · ${state.smartFarmChapter} · ${audit.passed ? (water?.status ?? audit.reason) : `${audit.reason} ${failureDetail}`}`;
        })();
      }, 1_200);
      return () => window.clearTimeout(timer);
    }
    let completedAt: number | null = null;
    let lastActivityAt = performance.now();
    let wasPlaying = useFarmStore.getState().demoPlaying;
    const markActivity = () => { lastActivityAt = performance.now(); };
    const activityEvents: (keyof WindowEventMap)[] = ["pointerdown", "pointermove", "touchstart", "wheel", "keydown"];
    activityEvents.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));

    // Observe every run, including manual playback and presenter stop/reset.
    // A true→false transition starts a fresh idle window; a new run clears it.
    const unsubscribe = useFarmStore.subscribe((state) => {
      if (wasPlaying && !state.demoPlaying) completedAt = performance.now();
      if (!wasPlaying && state.demoPlaying) completedAt = null;
      wasPlaying = state.demoPlaying;
    });
    const initialTimer = window.setTimeout(() => void play(), 1200);
    const replayTimer = window.setInterval(() => {
      const state = useFarmStore.getState();
      const now = performance.now();
      if (!shouldAutoReplay({
        now,
        completedAt,
        lastActivityAt,
        playing: state.demoPlaying,
        hidden: document.hidden,
      })) return;
      completedAt = null;
      void play();
    }, 1000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(replayTimer);
      unsubscribe();
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity));
    };
  }, [introComplete, play]);
  return null;
}

/** 大屏/汇报模式（fv-66y.8）：?present=1 隐藏全部操作层，只留 3D 画面 + 电影粒，供投影/录屏。 */
function presentMode(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("present");
}

export function App() {
  const present = presentMode();
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  // fv-66y.22: 2.39:1 letterbox 仅在无人机扫描与恢复验证两拍启用——那是"作为镜头"的强信号。
  // present 模式也保留（属于电影感画面而非操作层）。
  const cinematic = chapter === "coordinated-patrol" || chapter === "a02-alert" || chapter === "outcome-verification";
  return (
    <main className={`app-shell${present ? " is-present" : ""}`}>
      <FarmCanvas />
      <AutoDemo />
      <div className={`letterbox${cinematic ? " is-active" : ""}`} aria-hidden="true" />
      {present ? null : (
        <>
          <TopBar />
          <LayerSwitcher />
          <FieldDetailPanel />
          <DemoTimeline />
          <PresenterControls />
          <RemoteConfirmationCard />
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
