import type { SmartFarmChapter } from "../state/smartFarmState";

export type SmartMachineId = "tractor-seeder" | "inspection-robot" | "maintenance-vehicle";

export interface SmartMachineAsset {
  id: SmartMachineId;
  label: string;
  taskLabel: string;
  url: string;
  maxBytes: number;
  requiredNodes: readonly string[];
  chapter: SmartFarmChapter;
  position: readonly [number, number, number];
  rotationY: number;
  labelHeight: number;
  camera: {
    position: readonly [number, number, number];
    target: readonly [number, number, number];
  };
}

/**
 * 浏览器英雄农机资产契约。
 *
 * Blender 文件均以轮胎/履带接地面中心为原点；场景的 0.58m 是机耕路与地块表面
 * 的统一放置基准。这里同时声明章节、停驻位和近景，后续运动系统只改变沿路线的
 * 位姿，不再复制资产 URL、尺度或业务身份。
 */
export const SMART_MACHINE_ASSETS: readonly SmartMachineAsset[] = [
  {
    id: "maintenance-vehicle",
    label: "MOWER-01 · 自主维护设备",
    taskLabel: "东侧维护带待命",
    url: "/assets/models/fieldvision-maintenance-vehicle.glb",
    maxBytes: 300_000,
    requiredNodes: ["MaintenanceVehicleRig", "MowerDeckRig", "MowerBlade", "SafetyBeacon"],
    chapter: "daily-plan",
    position: [-101, 0.18, 91],
    rotationY: -0.35,
    labelHeight: 2.65,
    camera: { position: [-88, 5.4, 80], target: [-101, 1.35, 91] },
  },
  {
    id: "tractor-seeder",
    label: "TRACTOR-01 · 无人拖拉机",
    taskLabel: "B03 六行补播作业",
    url: "/assets/models/fieldvision-autonomous-tractor-seeder.glb",
    maxBytes: 500_000,
    requiredNodes: ["AutonomousTractorRig", "TractorBodyRig", "SeederLift", "RowUnit_6"],
    chapter: "autonomous-operations",
    position: [112, 0.58, 35],
    rotationY: -1.35,
    labelHeight: 5.25,
    camera: { position: [100, 7.2, 46], target: [112, 2.15, 35] },
  },
  {
    id: "inspection-robot",
    label: "ROBOT-01 · 田间巡检机器人",
    taskLabel: "A03 / B02 协同巡检",
    url: "/assets/models/fieldvision-inspection-robot.glb",
    maxBytes: 300_000,
    requiredNodes: ["InspectionRobotRig", "TrackLeft", "TrackRight", "SensorGimbal"],
    chapter: "coordinated-patrol",
    position: [78, 0.58, -19],
    rotationY: -0.78,
    labelHeight: 2.85,
    camera: { position: [67, 5.8, -8], target: [78, 1.4, -19] },
  },
] as const;

export function smartMachinesForChapter(chapter: SmartFarmChapter) {
  return SMART_MACHINE_ASSETS.filter((asset) => asset.chapter === chapter);
}

export function smartMachineCameraForChapter(chapter: SmartFarmChapter) {
  return SMART_MACHINE_ASSETS.find((asset) => asset.chapter === chapter)?.camera ?? null;
}
