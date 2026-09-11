import { useEffect } from "react";
import { POV_WINDOW, povCutEngaged } from "../scene/dronePov";
import { useFarmStore } from "../state/useFarmStore";

/**
 * 云台第一人称切入的画面覆盖层（fv-66y.6，cut 变体评审晋升）。
 *
 * FPV 窗口内叠加云台 HUD：取景框、REC、遥测条、随窗口进度下移的扫描线，
 * 并给 WebGL 画面挂一层"传感器回传"调色（body.is-drone-pov），
 * 与第三人称画面形成通道差异。纯展示层，pointer-events: none。
 */

function timecode(scanProgress: number): string {
  const seconds = Math.round(scanProgress * 10);
  return `T+00:${String(seconds).padStart(2, "0")}`;
}

function ndvi(scanProgress: number): string {
  return (0.74 - scanProgress * 0.33).toFixed(2);
}

export function DronePovHud() {
  const demoStep = useFarmStore((state) => state.demoStep);
  const scanProgress = useFarmStore((state) => state.scanProgress);
  const active = demoStep === "drone-scan" && povCutEngaged(scanProgress);

  // FPV 窗口内的传感器调色 + 场景内 Html 标签隐藏都挂在 body class 上。
  useEffect(() => {
    document.body.classList.toggle("is-drone-pov", active);
    return () => document.body.classList.remove("is-drone-pov");
  }, [active]);

  if (!active) return null;

  const [start, end] = POV_WINDOW;
  const windowT = Math.min(1, Math.max(0, (scanProgress - start) / (end - start)));
  return (
    <div className="pov-hud" aria-hidden="true">
      <i className="pov-hud__corner pov-hud__corner--tl" />
      <i className="pov-hud__corner pov-hud__corner--tr" />
      <i className="pov-hud__corner pov-hud__corner--bl" />
      <i className="pov-hud__corner pov-hud__corner--br" />
      <div className="pov-hud__top">
        <span className="pov-hud__rec">● REC</span>
        <span>CAM 01 · 多光谱 NDVI</span>
        <span>{timecode(scanProgress)}</span>
      </div>
      <div className="pov-hud__crosshair">
        <span />
      </div>
      <div className="pov-hud__scanline" style={{ top: `${12 + windowT * 76}%` }} />
      <div className="pov-hud__bottom">
        <span>ALT 24.0 m · SPD 6.8 m/s · 航向 132°</span>
        <span className="pov-hud__ndvi">NDVI {ndvi(scanProgress)} ↓</span>
        <span>A02 东区二号田 · 航带 3/5</span>
      </div>
    </div>
  );
}
