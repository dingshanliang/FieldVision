/**
 * 照片模式工具条（fv-photo）：纯净画面下的唯一 UI——冻结、曝光、焦距、
 * 快门与退出。曝光作用于场景光源（LightingRig 曝光倍率），焦距作用于
 * 相机 FOV（PhotoModeBridge），导出只含画布内容、不含任何 UI。
 */
import { Aperture, Camera, Pause, Play, X, ZoomIn } from "lucide-react";
import { useFarmStore } from "../state/useFarmStore";

export function PhotoToolbar() {
  const photoFrozen = useFarmStore((state) => state.photoFrozen);
  const setPhotoFrozen = useFarmStore((state) => state.setPhotoFrozen);
  const photoExposure = useFarmStore((state) => state.photoExposure);
  const setPhotoExposure = useFarmStore((state) => state.setPhotoExposure);
  const photoFov = useFarmStore((state) => state.photoFov);
  const setPhotoFov = useFarmStore((state) => state.setPhotoFov);
  const requestPhotoCapture = useFarmStore((state) => state.requestPhotoCapture);
  const setPhotoMode = useFarmStore((state) => state.setPhotoMode);

  return (
    <div className="photo-toolbar" role="toolbar" aria-label="照片模式工具">
      <button type="button" className="photo-toolbar__exit" onClick={() => setPhotoMode(false)} aria-label="退出照片模式 (Esc)">
        <X size={15} /> 退出
      </button>
      <button
        type="button"
        className={photoFrozen ? "is-active" : ""}
        aria-pressed={photoFrozen}
        onClick={() => setPhotoFrozen(!photoFrozen)}
        title="定格画面（作物/无人机/鸟群全部暂停）"
      >
        {photoFrozen ? <Pause size={15} /> : <Play size={15} />} {photoFrozen ? "已定格" : "定格"}
      </button>
      <label className="photo-toolbar__slider">
        <Aperture size={14} />
        <span>曝光</span>
        <input
          type="range"
          min={0.55}
          max={1.7}
          step={0.01}
          value={photoExposure}
          onChange={(event) => setPhotoExposure(Number(event.target.value))}
          aria-label="曝光"
        />
        <em>{photoExposure.toFixed(2)}×</em>
      </label>
      <label className="photo-toolbar__slider">
        <ZoomIn size={14} />
        <span>焦距</span>
        <input
          type="range"
          min={22}
          max={70}
          step={1}
          value={photoFov ? 87 - photoFov : 42}
          onChange={(event) => setPhotoFov(87 - Number(event.target.value))}
          aria-label="焦距（视场角）"
        />
        <em>{photoFov ? `${photoFov}°` : "默认"}</em>
      </label>
      <button type="button" className="photo-toolbar__shutter" onClick={requestPhotoCapture} title="导出 PNG（仅画面，无 UI）">
        <Camera size={15} /> 快门
      </button>
      <small>拖动旋转 · 滚轮缩放 · Esc 退出</small>
    </div>
  );
}
