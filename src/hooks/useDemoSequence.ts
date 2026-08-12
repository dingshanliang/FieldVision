import { useCallback } from "react";
import { createSmartFarmSequencePlan } from "../state/smartFarmDirector";
import { useFarmStore } from "../state/useFarmStore";

/** 暂停感知的等待：只在未暂停时倒计时（导演系统 fv-o6c.12 真实暂停继续）。 */
function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let remaining = milliseconds;
    const id = window.setInterval(() => {
      if (signal.aborted) { window.clearInterval(id); reject(new DOMException("Aborted", "AbortError")); return; }
      if (!useFarmStore.getState().paused) remaining -= 100;
      if (remaining <= 0) { window.clearInterval(id); resolve(); }
    }, 100);
    signal.addEventListener("abort", () => { window.clearInterval(id); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}

let activeController: AbortController | null = null;

export function useDemoSequence() {
  const store = useFarmStore;

  const stop = useCallback(() => {
    activeController?.abort();
    activeController = null;
    const s = store.getState();
    s.setDemoPlaying(false);
    s.setPaused(false);
  }, [store]);

  const togglePause = useCallback(() => {
    if (!activeController) return;
    store.getState().setPaused(!store.getState().paused);
  }, [store]);

  /** 现场汇报安全网：中止当前演示、清干净临时状态、回到稳定的基地总览（fv-66y.9）。 */
  const reset = useCallback(() => {
    activeController?.abort();
    activeController = null;
    const s = store.getState();
    s.resetDemo();
    s.setDemoPlaying(false);
    s.setPaused(false);
  }, [store]);

  const play = useCallback(async () => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const state = store.getState();
    const plan = createSmartFarmSequencePlan(state.pacing);
    state.resetDemo();
    state.setDemoPlaying(true);
    state.setPaused(false);
    try {
      for (const chapter of plan) {
        store.getState().applySmartFarmChapter(chapter.id);
        let elapsed = 0;

        if (chapter.simulatedConfirmationDelayMs) {
          const countdownSeconds = Math.ceil(chapter.simulatedConfirmationDelayMs / 1_000);
          store.getState().setConfirmationCountdown(countdownSeconds);
          for (let remaining = countdownSeconds; remaining > 0; remaining -= 1) {
            await wait(1_000, controller.signal);
            elapsed += 1_000;
            const task = store.getState().tasks["IRRIGATE-A02"];
            if (task?.status !== "awaiting-confirmation") break;
            store.getState().setConfirmationCountdown(remaining - 1);
          }
          if (store.getState().tasks["IRRIGATE-A02"]?.status === "awaiting-confirmation") {
            store.getState().confirmTaskForDemo("IRRIGATE-A02", "simulated-autoplay");
          }
        }

        await wait(Math.max(0, chapter.durationMs - elapsed), controller.signal);
      }
      if (activeController === controller) {
        activeController = null;
        store.getState().setDemoPlaying(false);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  }, [store]);

  return { play, stop, togglePause, reset };
}
