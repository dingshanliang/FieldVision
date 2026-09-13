/**
 * 照片模式工具条（fv-photo）：纯净画面下的唯一 UI——冻结、曝光、视角、
 * 画幅、快门与退出。曝光作用于场景光源（LightingRig 曝光倍率），视角作用
 * 于相机 FOV（PhotoModeBridge），导出含完整后期链；开启 2.39:1 时导出
 * PNG 会合成与屏显一致的电影黑边。
 */
import { Aperture, Camera, Pause, Play, RectangleHorizontal, X, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/audioEngine";
import { useFarmStore } from "../state/useFarmStore";

const DEFAULT_FOV = 45;

export function PhotoToolbar() {
  const photoFrozen = useFarmStore((state) => state.photoFrozen);
  const setPhotoFrozen = useFarmStore((state) => state.setPhotoFrozen);
  const photoExposure = useFarmStore((state) => state.photoExposure);
  const setPhotoExposure = useFarmStore((state) => state.setPhotoExposure);
  const photoFov = useFarmStore((state) => state.photoFov);
  const setPhotoFov = useFarmStore((state) => state.setPhotoFov);
  const photoLetterbox = useFarmStore((state) => state.photoLetterbox);
  const setPhotoLetterbox = useFarmStore((state) => state.setPhotoLetterbox);
  const requestPhotoCapture = useFarmStore((state) => state.requestPhotoCapture);
  const setPhotoMode = useFarmStore((state) => state.setPhotoMode);
  const [savedVisible, setSavedVisible] = useState(false);
  const savedTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
  }, []);

  const onShutter = () => {
    audioEngine.sfx("shutter");
    requestPhotoCapture();
    setSavedVisible(true);
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSavedVisible(false), 1_800);
  };

  const fovValue = photoFov ?? DEFAULT_FOV;

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
        <span>视角</span>
        <input
          type="range"
          min={22}
          max={70}
          step={1}
          value={87 - fovValue}
          onChange={(event) => setPhotoFov(87 - Number(event.target.value))}
          aria-label="视角（FOV 角度，数值越小镜头越长）"
        />
        <em>{fovValue}°</em>
      </label>
      <button
        type="button"
        className={photoLetterbox ? "is-active" : ""}
        aria-pressed={photoLetterbox}
        onClick={() => setPhotoLetterbox(!photoLetterbox)}
        title="导出 PNG 是否合成 2.39:1 电影黑边（与屏显画幅一致）"
      >
        <RectangleHorizontal size={15} /> 2.39:1
      </button>
      <button type="button" className="photo-toolbar__shutter" onClick={onShutter} title="导出 PNG（含完整后期效果，无 UI）">
        <Camera size={15} /> 快门
      </button>
      {savedVisible && <span className="photo-toolbar__hint" aria-live="polite">已导出 PNG</span>}
      <small>拖动旋转 · 滚轮缩放 · Esc 退出</small>
    </div>
  );
}
