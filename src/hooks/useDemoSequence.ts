import { useCallback } from "react";
import { useFarmStore } from "../state/useFarmStore";

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => { window.clearTimeout(timeout); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}

async function animateValue(duration: number, signal: AbortSignal, onUpdate: (value: number) => void) {
  const start = performance.now();
  await new Promise<void>((resolve, reject) => {
    function tick(now: number) {
      if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      const linear = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - linear, 3);
      onUpdate(eased);
      if (linear < 1) requestAnimationFrame(tick); else resolve();
    }
    requestAnimationFrame(tick);
  });
}

let activeController: AbortController | null = null;

export function useDemoSequence() {
  const store = useFarmStore;

  const stop = useCallback(() => {
    activeController?.abort();
    activeController = null;
    store.getState().setDemoPlaying(false);
  }, [store]);

  /**
   * 到水后的农业时间恢复序列（fv-o6c.11）。压缩播放但用显式时间跳切卡表达
   * 真实农业日期：到水(D0) → 次日 D1 根区复测 → D3 冠层复飞 → 解除。
   * 到水当天作物不变绿，恢复只发生在 D1 之后。
   */
  const runRecovery = useCallback(async (signal: AbortSignal) => {
    const s = store.getState();
    s.setRecoveryPhase("arrived");
    s.setTimeCut(null);
    await wait(1_600, signal);
    // 次日 D1：根区复测。
    s.setTimeCut({ day: "次日 D1", label: "根区复测" });
    await wait(1_300, signal);
    s.setRecoveryPhase("d1-root");
    await wait(2_200, signal);
    s.setTimeCut(null);
    await wait(400, signal);
    // D3：冠层复飞。
    s.setTimeCut({ day: "D3", label: "冠层复飞" });
    await wait(1_300, signal);
    s.setRecoveryPhase("d3-reflight");
    await wait(2_200, signal);
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
    try {
      await animateValue(12_000, controller.signal, (value) => store.getState().setIrrigationProgress(value));
      // 切到证据验收机位后跑恢复时间轴（不改 fieldStatus，直到 resolved）。
      store.getState().setDemoStep("recovered");
      await wait(1_100, controller.signal);
      await runRecovery(controller.signal);
      store.getState().applyDemoState("recovered");
      await wait(2_400, controller.signal);
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
    try {
      await wait(2_500, controller.signal);
      store.getState().applyDemoState("select-field");
      await wait(5_200, controller.signal);
      store.getState().setScanProgress(0);
      store.getState().setDemoStep("inspect-risk");
      store.getState().setLayerMode("growth");
      await wait(1_600, controller.signal);
      store.getState().setDemoStep("drone-scan");
      await animateValue(5_200, controller.signal, (value) => store.getState().setScanProgress(value));
      await wait(1_600, controller.signal);
      store.getState().applyDemoState("irrigation");
      store.getState().setIrrigationProgress(0);
      await animateValue(12_000, controller.signal, (value) => store.getState().setIrrigationProgress(value));
      // 恢复时间轴：到水 → D1 根区复测 → D3 冠层复飞 → 解除。
      store.getState().setDemoStep("recovered");
      await wait(1_100, controller.signal);
      await runRecovery(controller.signal);
      store.getState().applyDemoState("recovered");
      await wait(3_200, controller.signal);
      store.getState().applyDemoState("overview");
      store.getState().setDemoPlaying(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  }, [runRecovery, store]);

  return { play, stop, irrigate };
}
