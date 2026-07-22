import { useEffect } from "react";
import type { DemoStep } from "../types/farm";
import { useDemoSequence } from "../hooks/useDemoSequence";
import { useFarmStore } from "../state/useFarmStore";

/**
 * 导演系统：演讲者控制层（fv-o6c.12，方案 B）。
 * 键控：空格 暂停/继续 · ←/→ 上一/下一章节 · Home 回安全总览机位。
 * 仅在演示中接管；输入框聚焦时不拦截。
 */
const CHAPTERS: DemoStep[] = ["overview", "select-field", "inspect-risk", "irrigation", "recovered"];

function chapterIndex(step: DemoStep): number {
  return Math.max(0, CHAPTERS.indexOf(step === "drone-scan" ? "inspect-risk" : step));
}

export function PresenterControls() {
  const introComplete = useFarmStore((s) => s.introComplete);
  const demoPlaying = useFarmStore((s) => s.demoPlaying);
  const paused = useFarmStore((s) => s.paused);
  const demoStep = useFarmStore((s) => s.demoStep);
  const applyDemoState = useFarmStore((s) => s.applyDemoState);
  const { stop, togglePause } = useDemoSequence();

  useEffect(() => {
    if (!introComplete) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === " " || e.code === "Space") {
        if (!demoPlaying) return;
        e.preventDefault();
        togglePause();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = CHAPTERS[Math.min(CHAPTERS.length - 1, chapterIndex(demoStep) + 1)];
        if (next) { stop(); applyDemoState(next); }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = CHAPTERS[Math.max(0, chapterIndex(demoStep) - 1)];
        if (prev) { stop(); applyDemoState(prev); }
      } else if (e.key === "Home") {
        e.preventDefault();
        stop();
        applyDemoState("overview");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [introComplete, demoPlaying, demoStep, applyDemoState, stop, togglePause]);

  if (!introComplete || !demoPlaying) return null;
  return (
    <div className="presenter-hud" role="status" aria-live="polite">
      <span className={`presenter-hud__state ${paused ? "is-paused" : ""}`}>{paused ? "⏸ 已暂停" : "▶ 演示中"}</span>
      <span className="presenter-hud__hint">空格 暂停/继续 · ←/→ 章节 · Home 总览</span>
    </div>
  );
}
