import { useEffect, useRef, useState } from "react";
import { Camera, CloudSun, Moon, Pause, Play, RotateCcw, Sunrise, Sun, Sunset } from "lucide-react";
import { useFarmStore } from "../state/useFarmStore";
import { useDemoSequence } from "../hooks/useDemoSequence";
import type { DayPhase } from "../types/farm";

const PHASES: Array<{ id: DayPhase; label: string; Icon: typeof Sun }> = [
  { id: "dawn", label: "清晨", Icon: Sunrise },
  { id: "day", label: "正午", Icon: Sun },
  { id: "dusk", label: "黄昏", Icon: Sunset },
  { id: "night", label: "夜晚", Icon: Moon },
];

/** fv-daynight：顶栏时间相位切换（清晨/正午/黄昏/夜晚）。 */
function DayPhaseSwitcher() {
  const dayPhase = useFarmStore((state) => state.dayPhase);
  const setDayPhase = useFarmStore((state) => state.setDayPhase);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const active = PHASES.find((phase) => phase.id === dayPhase) ?? PHASES[0]!;
  const ActiveIcon = active.Icon;
  return (
    <div className="day-phase" ref={rootRef}>
      <button
        type="button"
        className={`day-phase__toggle${open ? " is-open" : ""}`}
        aria-label={`时间：${active.label}，点击切换`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ActiveIcon size={15} /> {active.label}
      </button>
      {open && (
        <div className="day-phase__menu" role="menu" aria-label="切换时间相位">
          {PHASES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={id === dayPhase}
              className={id === dayPhase ? "is-active" : ""}
              onClick={() => { setDayPhase(id); setOpen(false); }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const playing = useFarmStore((state) => state.demoPlaying);
  const paused = useFarmStore((state) => state.paused);
  const introComplete = useFarmStore((state) => state.introComplete);
  const photoMode = useFarmStore((state) => state.photoMode);
  const setPhotoMode = useFarmStore((state) => state.setPhotoMode);
  const reset = useFarmStore((state) => state.resetDemo);
  const { play, stop, togglePause } = useDemoSequence();
  function returnToOverview() { stop(); reset(); }
  return (
    <header className="top-bar">
      <div className="brand-lockup">
        <span className="brand-mark">禾境</span>
        <div><strong>FieldVision</strong><small>农田数字孪生演示</small></div>
      </div>
      <div className="top-status">
        <span><CloudSun size={15} /> 23 °C · 东南风 2 级</span>
        <span><i className="status-dot" /> 12 台设备在线</span>
        {introComplete && <DayPhaseSwitcher />}
        {introComplete && (
          <button
            className={`icon-action${photoMode ? " is-active" : ""}`}
            type="button"
            aria-label={photoMode ? "退出照片模式 (Esc)" : "进入照片模式 (P)"}
            aria-pressed={photoMode}
            onClick={() => setPhotoMode(!photoMode)}
          >
            <Camera size={16} />
          </button>
        )}
        {introComplete && (
          <button className="icon-action" type="button" aria-label={playing ? paused ? "继续演示" : "暂停演示" : "播放完整演示"} onClick={() => playing ? togglePause() : void play()}>
            {playing && !paused ? <Pause size={16} /> : <Play size={16} />}
          </button>
        )}
        <button className="icon-action" type="button" aria-label="返回基地总览" onClick={returnToOverview}><RotateCcw size={16} /></button>
      </div>
    </header>
  );
}
