import type { SmartMachineId } from "../data/smartMachineAssets";
import type { PerformanceTier } from "../hooks/usePerformanceTier";
import type { SmartFarmChapter } from "../state/smartFarmState";

export const MACHINE_ACTIVITY_LIMITS: Record<PerformanceTier, number> = { high: 4, medium: 3, low: 2 };

export type MachineMotionPhase = "parked" | "self-check" | "transit" | "working" | "turning" | "exception" | "returning" | "charging";

export interface MachineMotionSample {
  position: [number, number, number];
  heading: number;
  phase: MachineMotionPhase;
  speedScale: number;
  implementDown: boolean;
  exceptionCode: string | null;
  receipt: string | null;
}

const YARD: Record<SmartMachineId, readonly [number, number, number]> = {
  "tractor-seeder": [-111, 0.58, 108],
  "inspection-robot": [-106, 0.34, 103],
  "maintenance-vehicle": [-101, 0.18, 91],
};

// 拖拉机转场全程贴机耕路网：场院 → 北环路 → 泵站支线 → 从 B03 北缘进田，
// 只有 B03 是批准作业地块（安全边界 "B03 批准补播条带"），转场不得横穿其他田块。
const TRACTOR_TRANSIT = [
  YARD["tractor-seeder"],
  [-108, 0.5, 121], [-60, 0.48, 126], [30, 0.5, 124], [80, 0.52, 120],
  [108, 0.54, 102], [112, 0.56, 70], [112, 0.58, 35],
] as const;
const TRACTOR_ROW_A = [[112, 0.58, 35], [125, 0.58, 34], [140, 0.58, 33]] as const;
const TRACTOR_TURN = [[140, 0.58, 33], [145, 0.58, 36], [140, 0.58, 40]] as const;
const TRACTOR_ROW_B = [[140, 0.58, 40], [126, 0.58, 41], [111, 0.58, 42]] as const;
// 巡检机器人按任务边界（"中央机耕路与批准地块边缘"）巡 B01/B02 南缘与 A03 北缘：
// 场院 → 西环路 → 中央机耕路 → A03 西北角 → B02/B03 之间地带北段。
const ROBOT_ROUTE = [
  YARD["inspection-robot"],
  [-140, 0.4, 110], [-162, 0.44, 55], [-164, 0.46, -8], [-150, 0.5, -19],
  [-82, 0.52, -21], [-10, 0.54, -22], [63, 0.56, -20], [78, 0.58, -19],
  [64, 0.58, 0], [60, 0.58, 24],
] as const;
// 场院 → 东侧维护带的转场段先沿场院西侧北上、再贴 C01 北缘渠岸东进，
// 与 "east-maintenance" 走廊线一致，避免斜穿 C01 品种试验田。
const MAINTENANCE_TRANSIT = [YARD["maintenance-vehicle"], [-104, 0.24, 118], [-25, 0.28, 126]] as const;
const MAINTENANCE_BELT = [[-25, 0.28, 126], [50, 0.32, 118], [82, 0.34, 108], [118, 0.32, 101]] as const;
const MAINTENANCE_ROUTE = [
  MAINTENANCE_TRANSIT[0], MAINTENANCE_TRANSIT[1],
  MAINTENANCE_BELT[0], MAINTENANCE_BELT[1], MAINTENANCE_BELT[2], MAINTENANCE_BELT[3],
] as const;

export function createMotionSample(): MachineMotionSample {
  return {
    position: [0, 0, 0], heading: 0, phase: "parked", speedScale: 0,
    implementDown: false, exceptionCode: null, receipt: null,
  };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function writeAlong(points: readonly (readonly [number, number, number])[], progress: number, sample: MachineMotionSample) {
  const scaled = clamp01(progress) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const from = points[index]!;
  const to = points[index + 1]!;
  sample.position[0] = from[0] + (to[0] - from[0]) * local;
  sample.position[1] = from[1] + (to[1] - from[1]) * local;
  sample.position[2] = from[2] + (to[2] - from[2]) * local;
  sample.heading = Math.atan2(to[0] - from[0], to[2] - from[2]);
}

function resetSample(sample: MachineMotionSample) {
  sample.speedScale = 1;
  sample.implementDown = false;
  sample.exceptionCode = null;
  sample.receipt = null;
}

export function selectActiveMachineIds(chapter: SmartFarmChapter, tier: PerformanceTier): SmartMachineId[] {
  const droneActive = chapter === "coordinated-patrol" || chapter === "return-overview";
  const groundBudget = MACHINE_ACTIVITY_LIMITS[tier] - (droneActive ? 1 : 0);
  const priority: SmartMachineId[] = chapter === "coordinated-patrol"
    ? ["inspection-robot", "tractor-seeder", "maintenance-vehicle"]
    : ["tractor-seeder", "inspection-robot", "maintenance-vehicle"];
  if (!["autonomous-operations", "coordinated-patrol", "return-overview"].includes(chapter)) return [];
  return priority.slice(0, groundBudget);
}

export function evaluateMachineMotion(
  id: SmartMachineId,
  chapter: SmartFarmChapter,
  progress: number,
  sample: MachineMotionSample,
) {
  const p = clamp01(progress);
  resetSample(sample);

  if (chapter === "return-overview") {
    const route = id === "tractor-seeder" ? TRACTOR_TRANSIT : id === "inspection-robot" ? ROBOT_ROUTE : MAINTENANCE_ROUTE;
    writeAlong(route, 1 - p, sample);
    // 回库时车辆沿路线反向行驶，朝向需对准实际行驶方向，避免"脸朝前倒库"。
    sample.heading += Math.PI;
    sample.phase = p >= 0.98 ? (id === "maintenance-vehicle" ? "parked" : "charging") : "returning";
    sample.speedScale = p >= 0.98 ? 0 : 0.72;
    sample.receipt = p >= 0.98 ? `${id} 完成回库并生成任务回执` : null;
    return sample;
  }

  if (chapter === "daily-plan" || chapter === "base-online") {
    const parked = YARD[id];
    sample.position[0] = parked[0]; sample.position[1] = parked[1]; sample.position[2] = parked[2];
    sample.heading = -0.35; sample.phase = chapter === "daily-plan" ? "self-check" : "parked"; sample.speedScale = 0;
    return sample;
  }

  if (id === "tractor-seeder") {
    if (chapter === "coordinated-patrol") {
      writeAlong(TRACTOR_ROW_B, 1, sample); sample.phase = "exception"; sample.speedScale = 0; sample.exceptionCode = "OBSTACLE_STOP"; return sample;
    }
    if (chapter !== "autonomous-operations") {
      writeAlong(TRACTOR_ROW_B, 1, sample); sample.phase = "working"; sample.implementDown = true; sample.speedScale = 0.45; return sample;
    }
    if (p < 0.55) { writeAlong(TRACTOR_TRANSIT, p / 0.55, sample); sample.phase = "transit"; sample.speedScale = 0.82; }
    else if (p < 0.76) { writeAlong(TRACTOR_ROW_A, (p - 0.55) / 0.21, sample); sample.phase = "working"; sample.implementDown = true; }
    else if (p < 0.83) { writeAlong(TRACTOR_TURN, (p - 0.76) / 0.07, sample); sample.phase = "turning"; sample.speedScale = 0.3; }
    else { writeAlong(TRACTOR_ROW_B, (p - 0.83) / 0.17, sample); sample.phase = "working"; sample.implementDown = true; }
    return sample;
  }

  if (id === "inspection-robot") {
    writeAlong(ROBOT_ROUTE, Math.min(0.8, p), sample);
    sample.phase = "working";
    sample.speedScale = 0.46;
    return sample;
  }

  // maintenance-vehicle：先收起割草台空载转场到东侧维护带，进入渠岸后再放下作业。
  if (p < 0.3) {
    writeAlong(MAINTENANCE_TRANSIT, p / 0.3, sample);
    sample.phase = "transit";
    sample.speedScale = 0.78;
  } else {
    writeAlong(MAINTENANCE_BELT, (p - 0.3) / 0.7, sample);
    sample.phase = "working";
    sample.implementDown = true;
    sample.speedScale = 0.5;
  }
  return sample;
}
