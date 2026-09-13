import { Color, Mesh, MeshBasicMaterial, SphereGeometry } from "three";

/**
 * GodRays 太阳光源单例（fv-qii）。模块级可变 Mesh：ScenePostProcessing 的
 * <GodRays sun={...}> 与 <SunDisc> 组件共享同一实例（同 dronePosition 先例，
 * 不经 store 传递）。位置由 SunDisc 每帧写：camera + sunDirection × 700。
 */
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
