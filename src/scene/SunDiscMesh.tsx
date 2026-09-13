/**
 * GodRays 太阳光源组件（fv-qii）：把 sunDiscMesh 挂进场景并每帧跟随相机
 * （camera.position + normalize(currentLighting.sunDirection) × 700——落在
 * 穹顶 1200 内、全景圆柱 r=375 外，与 shader 圆盘方向一致）。可见性按
 * 相位/暴雨门控，与 ScenePostProcessing 的 GodRays 挂载同条件；低档不
 * 挂本组件。
 */
import { useFrame } from "@react-three/fiber";
import { MeshBasicMaterial, SRGBColorSpace } from "three";
import { currentLighting } from "../config/dayNight";
import { useFarmStore } from "../state/useFarmStore";
import { SUN_DISC_DISTANCE, sunDiscMesh } from "./sunDisc";

export function SunDisc() {
  useFrame(({ camera }) => {
    const farm = useFarmStore.getState();
    sunDiscMesh.visible = (farm.dayPhase === "dawn" || farm.dayPhase === "dusk") && farm.stormProgress < 0.3;
    if (!sunDiscMesh.visible) return;
    const direction = currentLighting.sunDirection;
    sunDiscMesh.position.set(
      camera.position.x + direction[0] * SUN_DISC_DISTANCE,
      camera.position.y + direction[1] * SUN_DISC_DISTANCE,
      camera.position.z + direction[2] * SUN_DISC_DISTANCE,
    );
    // 超 1.0 的基色让圆盘越过 Bloom 阈值（1.18），黄昏读作发光体而不
    // 是一块贴片。
    (sunDiscMesh.material as MeshBasicMaterial).color.setRGB(...currentLighting.sunDiscColor, SRGBColorSpace).multiplyScalar(1.8);
  });
  return <primitive object={sunDiscMesh} />;
}
