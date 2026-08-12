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

const TRACTOR_TRANSIT = [YARD["tractor-seeder"], [-76, 0.48, 82], [-18, 0.52, 58], [52, 0.56, 45], [112, 0.58, 35]] as const;
const TRACTOR_ROW_A = [[112, 0.58, 35], [125, 0.58, 34], [140, 0.58, 33]] as const;
const TRACTOR_TURN = [[140, 0.58, 33], [145, 0.58, 36], [140, 0.58, 40]] as const;
const TRACTOR_ROW_B = [[140, 0.58, 40], [126, 0.58, 41], [111, 0.58, 42]] as const;
const ROBOT_ROUTE = [[-106, 0.34, 103], [-42, 0.48, 47], [5, 0.52, 8], [48, 0.55, -5], [78, 0.58, -19], [82, 0.58, 42]] as const;
const MAINTENANCE_ROUTE = [[-101, 0.18, 91], [-25, 0.28, 126], [50, 0.32, 118], [82, 0.34, 108], [118, 0.32, 101]] as const;

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
    const stoppedAt = chapter === "coordinated-patrol" && p >= 0.68;
    writeAlong(ROBOT_ROUTE, stoppedAt ? 0.8 : Math.min(0.8, p), sample);
    sample.phase = stoppedAt ? "exception" : "working";
    sample.speedScale = stoppedAt ? 0 : 0.46;
    sample.exceptionCode = stoppedAt ? "OBSTACLE_STOP" : null;
    return sample;
  }

  writeAlong(MAINTENANCE_ROUTE, p * 0.88, sample);
  sample.phase = "working";
  sample.speedScale = 0.62;
  sample.implementDown = true;
  return sample;
}
