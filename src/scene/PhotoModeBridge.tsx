/**
 * 照片模式画布侧桥（fv-photo）：
 * - FOV：store.photoFov 的期望值经 ref 传递，在 useFrame 里应用到相机
 *   （null = 恢复默认 45）。
 * - 截图：photoCaptureTick 变化时手动渲染一帧并同步导出 PNG——WebGL 画布
 *   没有 preserveDrawingBuffer，必须在同一任务里先 render 再 toDataURL。
 * 相机/场景/渲染器一律取自 useFrame 回调参数，不在渲染作用域捕获后修改。
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { useFarmStore } from "../state/useFarmStore";

const DEFAULT_FOV = 45;

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
    state.gl.render(state.scene, state.camera);
    const url = state.gl.domElement.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fieldvision-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.png`;
    anchor.click();
  });

  return null;
}
