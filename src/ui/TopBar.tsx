import { CloudSun, Pause, Play, RotateCcw } from "lucide-react";
import { useFarmStore } from "../state/useFarmStore";
import { useDemoSequence } from "../hooks/useDemoSequence";

export function TopBar() {
  const playing = useFarmStore((state) => state.demoPlaying);
  const introComplete = useFarmStore((state) => state.introComplete);
  const reset = useFarmStore((state) => state.resetDemo);
  const { play, stop } = useDemoSequence();
  function returnToOverview() { stop(); reset(); }
  return (
    <header className="top-bar">
      <div className="brand-lockup">
        <span className="brand-mark">禾境</span>
        <div><strong>FieldVision</strong><small>智慧农业示范基地</small></div>
      </div>
      <div className="top-status">
        <span><CloudSun size={15} /> 23°C · 东南风 2级</span>
        <span><i className="status-dot" /> 12 台设备在线</span>
        {introComplete && (
          <button className="icon-action" type="button" aria-label={playing ? "暂停演示" : "播放完整演示"} onClick={() => playing ? stop() : void play()}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
        )}
        <button className="icon-action" type="button" aria-label="返回基地总览" onClick={returnToOverview}><RotateCcw size={16} /></button>
      </div>
    </header>
  );
}
