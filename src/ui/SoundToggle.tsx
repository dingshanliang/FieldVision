/**
 * 声音开关（fv-66y.4 + fv-jqb 音频入场重设计）。开启态以 store.soundEnabled
 * 为单一事实源（intro 卡的"开启声效"按钮与此处共用）；点击首次初始化
 * AudioEngine（满足 autoplay 策略的用户手势），之后切换静音。订阅
 * demoStep/storm/dayPhase/FPV 窗口，让章节 SFX、雨声、鸟鸣与电机增益
 * 跟随演示。默认关闭。
 *
 * 可发现性：默认 🔇 图标对首次观众几乎不可见——开场结束后的 ~8s 短窗
 * 内、未开启时，在 toggle 旁显示脉冲提示；主要的入场入口已前移到 intro
 * 结束卡（autoplay 无点击路径，那是唯一可靠的手势载体）。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine, type AudioCue } from "../audio/audioEngine";
import { useFarmStore } from "../state/useFarmStore";
import { deriveIrrigationEvent, type IrrigationStage } from "../state/irrigationEvent";
import { povWindowActive } from "../scene/dronePov";

const HINT_DURATION_MS = 8_000;

export function SoundToggle() {
  const enabled = useFarmStore((s) => s.soundEnabled);
  // hintDismissed 永久标记"已展示过提示"——首次开启或 8s 超时即置真，避免后续反复打扰。
  const [hintDismissed, setHintDismissed] = useState(false);
  const demoStep = useFarmStore((s) => s.demoStep);
  const introComplete = useFarmStore((s) => s.introComplete);
  const hintVisible = introComplete && !enabled && !hintDismissed;
  const previousStage = useRef<IrrigationStage>(deriveIrrigationEvent(useFarmStore.getState().irrigationProgress).stage);
  const previousRecovery = useRef(useFarmStore.getState().recoveryPhase);
  const previousStorm = useRef(useFarmStore.getState().stormProgress);
  const previousDaylight = useRef("");
  const previousFpv = useRef(false);

  // Keep the engine's ambience in sync with the demo while sound is on.
  useEffect(() => {
    if (enabled) {
      const state = useFarmStore.getState();
      audioEngine.setChapter(demoStep);
      audioEngine.setStorm(state.stormProgress);
      audioEngine.setDaylight(state.dayPhase, state.stormProgress);
    }
  }, [demoStep, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const stageCue: Partial<Record<IrrigationStage, AudioCue>> = {
      "pump-starting": "pump",
      "gate-opening": "gate",
      "main-channel": "channel",
      "east-branch": "channel",
      "field-inlet": "inlet",
      wetting: "wetting",
      verified: "verified",
    };
    return useFarmStore.subscribe((state) => {
      const stage = deriveIrrigationEvent(state.irrigationProgress).stage;
      if (stage !== previousStage.current) {
        previousStage.current = stage;
        const cue = stageCue[stage];
        if (cue) audioEngine.sfx(cue);
      }
      if (state.recoveryPhase !== previousRecovery.current) {
        previousRecovery.current = state.recoveryPhase;
        if (state.recoveryPhase === "resolved") audioEngine.sfx("recovered");
      }
      if (state.stormProgress !== previousStorm.current) {
        previousStorm.current = state.stormProgress;
        audioEngine.setStorm(state.stormProgress);
        audioEngine.setDaylight(state.dayPhase, state.stormProgress);
      }
      const daylightKey = `${state.dayPhase}|${state.stormProgress < 0.2}`;
      if (daylightKey !== previousDaylight.current) {
        previousDaylight.current = daylightKey;
        audioEngine.setDaylight(state.dayPhase, state.stormProgress);
      }
      const fpvActive = state.demoStep === "drone-scan" && povWindowActive(state.scanProgress);
      if (fpvActive !== previousFpv.current) {
        previousFpv.current = fpvActive;
        audioEngine.setMotorBoost(fpvActive);
      }
    });
  }, [enabled]);

  // 提示展示后 ~8s 自动消失。setState 仅在 setTimeout 异步触发，避免 set-state-in-effect。
  useEffect(() => {
    if (!hintVisible) return;
    const id = window.setTimeout(() => setHintDismissed(true), HINT_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [hintVisible]);

  const toggle = useCallback(() => {
    if (!audioEngine.isInitialised) audioEngine.init();
    const next = !audioEngine.isEnabled;
    if (next) setHintDismissed(true);
    void audioEngine.setEnabled(next);
    useFarmStore.getState().setSoundEnabled(next);
    if (next) {
      const state = useFarmStore.getState();
      audioEngine.setChapter(state.demoStep);
      audioEngine.setStorm(state.stormProgress);
      audioEngine.setDaylight(state.dayPhase, state.stormProgress);
    }
  }, []);

  return (
    <>
      {hintVisible && (
        <span className="sound-hint" aria-hidden="true">◀ 开启环境音效，体验更完整</span>
      )}
      <button
        type="button"
        className="sound-toggle"
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={enabled ? "关闭声音" : "开启声音"}
        title={enabled ? "关闭环境音效" : "开启环境音效"}
        style={{
          position: "fixed",
          right: 12,
          top: 12,
          zIndex: 40,
          width: 32,
          height: 32,
          display: "grid",
          placeItems: "center",
          background: "rgba(8,16,14,0.72)",
          color: "#cfe8dd",
          fontSize: 15,
          lineHeight: 1,
          border: "1px solid rgba(150,214,196,0.25)",
          borderRadius: 6,
          cursor: "pointer",
          backdropFilter: "blur(2px)",
        }}
      >
        {enabled ? "🔊" : "🔇"}
      </button>
    </>
  );
}
