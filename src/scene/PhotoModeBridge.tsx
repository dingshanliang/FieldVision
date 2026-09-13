/**
 * 照片模式画布侧桥（fv-photo）：
 * - FOV：store.photoFov 的期望值经 ref 传递，在 useFrame 里应用到相机
 *   （null = 恢复默认 45）。
 * - 截图：photoCaptureTick 变化时渲染一帧并同步导出 PNG——WebGL 画布
 *   没有 preserveDrawingBuffer，必须在同一任务里先 render 再 toDataURL。
 *   中/高档机渲染必须走 sceneComposer（完整后期链：ACES/AO/Bloom/SMAA/
 *   暗角/颗粒），裸 gl.render 会导出无后效的原片（P0 修复）；低档机无
 *   composer，renderer 侧 ACES 兜底本来就是正确画面。
 * - 画幅：photoLetterbox 开启时把帧合成到离屏 2D 画布并加 2.39:1 黑边，
 *   与屏显的 DOM letterbox（globals.css 8vh / ≤720px 6vh）对齐。
 * 相机/场景/渲染器一律取自 useFrame 回调参数，不在渲染作用域捕获后修改。
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { useFarmStore } from "../state/useFarmStore";
import { sceneComposer } from "./composerBridge";

const DEFAULT_FOV = 45;

function composeLetterboxed(source: HTMLCanvasElement): string {
  const target = document.createElement("canvas");
  target.width = source.width;
  target.height = source.height;
  const ctx = target.getContext("2d");
  if (!ctx) return source.toDataURL("image/png");
  ctx.drawImage(source, 0, 0);
  const barHeight = Math.round(target.height * (target.height <= 720 ? 0.06 : 0.08));
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, target.width, barHeight);
  ctx.fillRect(0, target.height - barHeight, target.width, barHeight);
  return target.toDataURL("image/png");
}

export function PhotoModeBridge() {
  const photoFov = useFarmStore((state) => state.photoFov);
  const desiredFovRef = useRef(DEFAULT_FOV);
  const lastCaptureTickRef = useRef(-1);

  useEffect(() => {
    desiredFovRef.current = photoFov ?? DEFAULT_FOV;
  }, [photoFov]);

  useFrame((state) => {
    const perspective = state.camera as PerspectiveCamera;
    const target = desiredFovRef.current;
    if (Math.abs(perspective.fov - target) >= 0.01) {
      perspective.fov = target;
      perspective.updateProjectionMatrix();
    }

    const tick = useFarmStore.getState().photoCaptureTick;
    if (tick === lastCaptureTickRef.current) return;
    lastCaptureTickRef.current = tick;
    if (tick === 0) return;
    const composer = sceneComposer.current;
    if (composer) composer.render();
    else state.gl.render(state.scene, state.camera);
    const url = useFarmStore.getState().photoLetterbox
      ? composeLetterboxed(state.gl.domElement)
      : state.gl.domElement.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fieldvision-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.png`;
    anchor.click();
  });

  return null;
}
