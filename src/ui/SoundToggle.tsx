/**
 * 声音开关（fv-66y.4）。点击首次初始化 AudioEngine（满足 autoplay 策略的用户手势），
 * 之后切换静音。订阅 demoStep 让 AudioEngine 的章节 SFX 跟随演示。默认关闭。
 */
import { useCallback, useEffect, useState } from "react";
import { audioEngine } from "../audio/audioEngine";
import { useFarmStore } from "../state/useFarmStore";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(audioEngine.isEnabled);
  const demoStep = useFarmStore((s) => s.demoStep);

  // Keep the engine's chapter SFX in sync with the demo while sound is on.
  useEffect(() => {
    if (enabled) audioEngine.setChapter(demoStep);
  }, [demoStep, enabled]);

  const toggle = useCallback(() => {
    if (!audioEngine.isInitialised) audioEngine.init();
    const next = !audioEngine.isEnabled;
    setEnabled(next);
    void audioEngine.setEnabled(next);
    if (next) audioEngine.setChapter(useFarmStore.getState().demoStep);
  }, []);

  return (
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
  );
}
