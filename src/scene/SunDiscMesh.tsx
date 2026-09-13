/**
 * GodRays 太阳光源（fv-qii）。postprocessing 的 GodRaysEffect 需要一个真实
 * Mesh 作为光源：其世界位置经主相机投影决定光心。场景里的太阳是纯 shader
 * 圆盘（MorningSky uniform），因此这里放一个跟随相机的小球：
 * `camera.position + normalize(currentLighting.sunDirection) × 700`——落在
 * 穹顶（1200）内、全景圆柱（r=375）外，与 shader 圆盘方向始终一致。
 *
 * 模块级单例 + <primitive> 挂载：ScenePostProcessing 的 <GodRays sun={...}>
 * 与本组件共享同一实例，不经 store 传递（同 dronePosition 先例）。可见性
 * 由 SunDisc 组件按相位/暴雨每帧门控；效果挂载侧用同一条件（响应式订阅）。
 */
import { useFrame } from "@react-three/fiber";
import { Color, Mesh, MeshBasicMaterial, SRGBColorSpace, SphereGeometry } from "three";
import { currentLighting } from "../config/dayNight";
import { useFarmStore } from "../state/useFarmStore";

export const SUN_DISC_DISTANCE = 700;

export const sunDiscMesh = new Mesh(
  new SphereGeometry(30, 24, 16),
  new MeshBasicMaterial({ color: new Color("#ffe0a8"), fog: false, transparent: true, depthWrite: false }),
);
sunDiscMesh.visible = false;
sunDiscMesh.frustumCulled = false;
// 渲染顺序：必须晚于照片全景圆柱（-900，不写深度）否则整条地平带都会
// 盖住圆盘；早于其余透明物体。前方树木/地形是不透明几何，深度测试自然
// 遮挡正确的部分。
sunDiscMesh.renderOrder = -890;

export function SunDisc() {
  useFrame(({ camera }) => {
    const farm = useFarmStore.getState();
    // 与 ScenePostProcessing 的 GodRays 挂载同条件（相位 × 暴雨）；低档不
    // 挂本组件。正午强光/夜间月盘不做光柱。
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
