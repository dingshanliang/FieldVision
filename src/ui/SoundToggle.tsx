/**
 * 声音开关（fv-66y.4）。点击首次初始化 AudioEngine（满足 autoplay 策略的用户手势），
 * 之后切换静音。订阅 demoStep 让 AudioEngine 的章节 SFX 跟随演示。默认关闭。
 *
 * 可发现性（fv-66y.13）：默认 🔇 图标对首次观众几乎不可见——开场结束后的 ~8s 短窗
 * 内、未开启时，在 toggle 旁加一个 "▶ 点击开启电影音效" 脉冲提示。开启或超时即消失。
 */
import { useCallback, useEffect, useState } from "react";
import { audioEngine } from "../audio/audioEngine";
import { useFarmStore } from "../state/useFarmStore";

const HINT_DURATION_MS = 8_000;

export function SoundToggle() {
  const [enabled, setEnabled] = useState(audioEngine.isEnabled);
  // hintDismissed 永久标记"已展示过提示"——首次开启或 8s 超时即置真，避免后续反复打扰。
  const [hintDismissed, setHintDismissed] = useState(false);
  const demoStep = useFarmStore((s) => s.demoStep);
  const introComplete = useFarmStore((s) => s.introComplete);
  const hintVisible = introComplete && !enabled && !hintDismissed;

  // Keep the engine's chapter SFX in sync with the demo while sound is on.
  useEffect(() => {
    if (enabled) audioEngine.setChapter(demoStep);
  }, [demoStep, enabled]);

  // 提示展示后 ~8s 自动消失。setState 仅在 setTimeout 异步触发，避免 set-state-in-effect。
  useEffect(() => {
    if (!hintVisible) return;
    const id = window.setTimeout(() => setHintDismissed(true), HINT_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [hintVisible]);

  const toggle = useCallback(() => {
    if (!audioEngine.isInitialised) audioEngine.init();
    const next = !audioEngine.isEnabled;
    setEnabled(next);
    if (next) setHintDismissed(true);
    void audioEngine.setEnabled(next);
    if (next) audioEngine.setChapter(useFarmStore.getState().demoStep);
  }, []);

  return (
    <>
      {hintVisible && (
        <span className="sound-hint" aria-hidden="true">◀ 点击开启电影音效</span>
      )}
      <button
        type="button"
        className="sound-toggle"
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={enabled ? "关闭声音" : "开启声音"}
        title={enabled ? "关闭声音（合成底噪 + 章节 SFX）" : "开启声音（合成底噪 + 章节 SFX）"}
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
