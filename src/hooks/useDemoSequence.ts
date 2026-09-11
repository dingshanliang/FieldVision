import { useCallback } from "react";
import { createSmartFarmSequencePlan } from "../state/smartFarmDirector";
import { useFarmStore } from "../state/useFarmStore";

/** 暂停感知的等待：只在未暂停时倒计时（导演系统 fv-o6c.12 真实暂停继续）。 */
function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let remaining = milliseconds;
    let lastTick = performance.now();
    const id = window.setInterval(() => {
      if (signal.aborted) { window.clearInterval(id); reject(new DOMException("Aborted", "AbortError")); return; }
      const now = performance.now();
      const elapsed = now - lastTick;
      lastTick = now;
      if (!useFarmStore.getState().paused) remaining -= elapsed;
      if (remaining <= 0) { window.clearInterval(id); resolve(); }
    }, 100);
    signal.addEventListener("abort", () => { window.clearInterval(id); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}

function waitForPresenterConfirmation(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const unsubscribe = useFarmStore.subscribe((state) => {
      if (state.tasks["IRRIGATE-A02"]?.status !== "awaiting-confirmation") {
        unsubscribe();
        resolve();
      }
    });
    signal.addEventListener("abort", () => {
      unsubscribe();
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

let activeController: AbortController | null = null;
let sequenceGeneration = 0;
let lateWriteAttempts = 0;

export function readDemoSequenceAudit() {
  return { generation: sequenceGeneration, lateWriteAttempts } as const;
}

function commitIfActive(controller: AbortController, action: () => void) {
  if (activeController !== controller || controller.signal.aborted) {
    lateWriteAttempts += 1;
    return false;
  }
  action();
  return true;
}

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

  const play = useCallback(async (options?: { confirmationMode?: "simulated" | "presenter" }) => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    sequenceGeneration += 1;
    const state = store.getState();
    const plan = createSmartFarmSequencePlan(state.pacing);
    state.resetDemo();
    state.setDemoPlaying(true);
    state.setPaused(false);
    try {
      for (const chapter of plan) {
        if (!commitIfActive(controller, () => store.getState().applySmartFarmChapter(chapter.id))) break;
        let elapsed = 0;

        if (chapter.simulatedConfirmationDelayMs && (options?.confirmationMode ?? (state.pacing === "narration" ? "presenter" : "simulated")) === "presenter") {
          commitIfActive(controller, () => store.getState().setConfirmationCountdown(null));
          await waitForPresenterConfirmation(controller.signal);
        } else if (chapter.simulatedConfirmationDelayMs) {
          const countdownSeconds = Math.ceil(chapter.simulatedConfirmationDelayMs / 1_000);
          commitIfActive(controller, () => store.getState().setConfirmationCountdown(countdownSeconds));
          for (let remaining = countdownSeconds; remaining > 0; remaining -= 1) {
            await wait(1_000, controller.signal);
            elapsed += 1_000;
            const task = store.getState().tasks["IRRIGATE-A02"];
            if (task?.status !== "awaiting-confirmation") break;
            commitIfActive(controller, () => store.getState().setConfirmationCountdown(remaining - 1));
          }
          if (store.getState().tasks["IRRIGATE-A02"]?.status === "awaiting-confirmation") {
            commitIfActive(controller, () => store.getState().confirmTaskForDemo("IRRIGATE-A02", "simulated-autoplay"));
          }
        }

        if (chapter.id === "a02-alert") {
          // 扫描进度在章节内从 0 推进到 1：无人机真正飞完采集航带，证据随
          // 扫描逐渐显现（任务书 §13.3 扫描节拍）；云台 FPV 切入窗口
          // （fv-66y.6，scanProgress 0.38–0.70）也在此期间自然经过。
          // 章节快照把 scanProgress 置 1（供直接跳转），播放时先归零再爬坡。
          const slices = 8;
          commitIfActive(controller, () => store.getState().setScanProgress(0));
          for (let index = 1; index <= slices; index += 1) {
            await wait(chapter.durationMs / slices, controller.signal);
            elapsed += chapter.durationMs / slices;
            const progress = index / slices;
            commitIfActive(controller, () => store.getState().setScanProgress(progress));
          }
        }

        if (chapter.id === "irrigation-response") {
          const slices = 6;
          for (let index = 1; index <= slices; index += 1) {
            await wait(chapter.durationMs / slices, controller.signal);
            elapsed += chapter.durationMs / slices;
            const progress = 0.62 + (1 - 0.62) * (index / slices);
            commitIfActive(controller, () => {
              store.getState().setIrrigationProgress(progress);
              store.getState().advanceTaskProgress("IRRIGATE-A02", progress);
            });
          }
          commitIfActive(controller, () => {
            store.getState().setRecoveryPhase("arrived");
            store.getState().setFieldStatus("A02", "processing");
          });
        }

        if (chapter.id === "outcome-verification") {
          commitIfActive(controller, () => {
            store.getState().setRecoveryPhase("arrived");
            store.getState().setFieldStatus("A02", "processing");
          });
          for (const phase of ["d1-root", "d3-reflight", "resolved"] as const) {
            await wait(chapter.durationMs / 3, controller.signal);
            elapsed += chapter.durationMs / 3;
            commitIfActive(controller, () => store.getState().setRecoveryPhase(phase));
          }
          commitIfActive(controller, () => store.getState().setFieldStatus("A02", "recovered"));
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
