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
      store.getState().applyDemoState("recovered");
      await wait(2_400, controller.signal);
      store.getState().setDemoPlaying(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  }, [store]);

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
      store.getState().applyDemoState("recovered");
      await wait(3_200, controller.signal);
      store.getState().applyDemoState("overview");
      store.getState().setDemoPlaying(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  }, [store]);

  return { play, stop, irrigate };
}
