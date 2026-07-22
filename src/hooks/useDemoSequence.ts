import { useCallback } from "react";
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

/** 暂停感知的数值动画：只在未暂停时累计时长。 */
async function animateValue(duration: number, signal: AbortSignal, onUpdate: (value: number) => void) {
  let elapsed = 0;
  let last = performance.now();
  await new Promise<void>((resolve, reject) => {
    function tick(now: number) {
      if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      const delta = now - last;
      last = now;
      if (!useFarmStore.getState().paused) elapsed += delta;
      const linear = Math.min(1, elapsed / duration);
      onUpdate(1 - Math.pow(1 - linear, 3));
      if (linear < 1) requestAnimationFrame(tick); else resolve();
    }
    requestAnimationFrame(tick);
  });
}

/** 节奏：narration 讲解版留白更长。 */
function dur(fast: number, narration: number) {
  return useFarmStore.getState().pacing === "narration" ? narration : fast;
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

  /** 到水后的农业时间恢复序列（fv-o6c.11）。到水(D0)→次日D1根区复测→D3冠层复飞→解除。 */
  const runRecovery = useCallback(async (signal: AbortSignal) => {
    const s = store.getState();
    s.setRecoveryPhase("arrived");
    s.setTimeCut(null);
    await wait(dur(1_600, 2_800), signal);
    s.setTimeCut({ day: "次日 D1", label: "根区复测" });
    await wait(dur(1_300, 2_000), signal);
    s.setRecoveryPhase("d1-root");
    await wait(dur(2_200, 3_800), signal);
    s.setTimeCut(null);
    await wait(400, signal);
    s.setTimeCut({ day: "D3", label: "冠层复飞" });
    await wait(dur(1_300, 2_000), signal);
    s.setRecoveryPhase("d3-reflight");
    await wait(dur(2_200, 3_800), signal);
    s.setTimeCut(null);
    await wait(400, signal);
    s.setRecoveryPhase("resolved");
  }, [store]);

  const irrigate = useCallback(async () => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const state = store.getState();
    state.applyDemoState("irrigation");
    state.setIrrigationProgress(0);
    state.setDemoPlaying(true);
    state.setPaused(false);
    try {
      await animateValue(dur(12_000, 16_000), controller.signal, (value) => store.getState().setIrrigationProgress(value));
      store.getState().setDemoStep("recovered");
      await wait(1_100, controller.signal);
      await runRecovery(controller.signal);
      store.getState().applyDemoState("recovered");
      await wait(dur(2_400, 4_000), controller.signal);
      store.getState().setDemoPlaying(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  }, [runRecovery, store]);

  const play = useCallback(async () => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const state = store.getState();
    state.resetDemo();
    state.setDemoPlaying(true);
    state.setPaused(false);
    try {
      await wait(dur(2_500, 4_500), controller.signal);
      store.getState().applyDemoState("select-field");
      await wait(dur(5_200, 8_000), controller.signal);
      store.getState().setScanProgress(0);
      store.getState().setDemoStep("inspect-risk");
      store.getState().setLayerMode("growth");
      await wait(dur(1_600, 2_800), controller.signal);
      store.getState().setDemoStep("drone-scan");
      await animateValue(dur(5_200, 7_000), controller.signal, (value) => store.getState().setScanProgress(value));
      await wait(dur(1_600, 2_800), controller.signal);
      store.getState().applyDemoState("irrigation");
      store.getState().setIrrigationProgress(0);
      await animateValue(dur(12_000, 16_000), controller.signal, (value) => store.getState().setIrrigationProgress(value));
      // 恢复时间轴：到水 → D1 根区复测 → D3 冠层复飞 → 解除。
      store.getState().setDemoStep("recovered");
      await wait(1_100, controller.signal);
      await runRecovery(controller.signal);
      store.getState().applyDemoState("recovered");
      await wait(dur(3_200, 5_000), controller.signal);
      store.getState().applyDemoState("overview");
      store.getState().setDemoPlaying(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  }, [runRecovery, store]);

  return { play, stop, irrigate, togglePause };
}
