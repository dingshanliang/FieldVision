import { useEffect } from "react";
import { useDemoSequence } from "../hooks/useDemoSequence";
import { SMART_FARM_CHAPTERS, type SmartFarmChapter } from "../state/smartFarmState";
import { useFarmStore } from "../state/useFarmStore";

function chapterIndex(chapter: SmartFarmChapter): number {
  return Math.max(0, SMART_FARM_CHAPTERS.indexOf(chapter));
}

export function PresenterControls() {
  const introComplete = useFarmStore((state) => state.introComplete);
  const demoPlaying = useFarmStore((state) => state.demoPlaying);
  const paused = useFarmStore((state) => state.paused);
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const applySmartFarmChapter = useFarmStore((state) => state.applySmartFarmChapter);
  const { stop, togglePause } = useDemoSequence();

  useEffect(() => {
    if (!introComplete) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === " " || event.code === "Space") {
        if (!demoPlaying) return;
        event.preventDefault();
        togglePause();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = SMART_FARM_CHAPTERS[Math.min(SMART_FARM_CHAPTERS.length - 1, chapterIndex(chapter) + 1)];
        if (next) { stop(); applySmartFarmChapter(next); }
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        const previous = SMART_FARM_CHAPTERS[Math.max(0, chapterIndex(chapter) - 1)];
        if (previous) { stop(); applySmartFarmChapter(previous); }
      } else if (event.key === "Home") {
        event.preventDefault();
        stop();
        applySmartFarmChapter("base-online");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [introComplete, demoPlaying, chapter, applySmartFarmChapter, stop, togglePause]);

  if (!introComplete || !demoPlaying) return null;
  return (
    <div className="presenter-hud" role="status" aria-live="polite">
      <span className={`presenter-hud__state ${paused ? "is-paused" : ""}`}>{paused ? "⏸ 已暂停" : "▶ 演示中"}</span>
      <span className="presenter-hud__hint">空格：暂停/继续 · ←/→：切换章节 · Home：返回总览</span>
    </div>
  );
}
