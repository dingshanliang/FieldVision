import type { PerformanceTier } from "../hooks/usePerformanceTier";
import type { SmartFarmChapter } from "../state/smartFarmState";

export type SupportNodeKind = "crop-camera" | "soil-box" | "pest-monitor" | "water-meter" | "rtk" | "edge-cabinet";
export type SpatialDetailLevel = "action" | "route" | "silhouette";
export type TaskCorridorId = "yard-to-b03" | "central-patrol" | "east-maintenance" | "uav-a02" | "a02-water-chain";

export interface SupportNode {
  id: string;
  label: string;
  kind: SupportNodeKind;
  position: readonly [number, number, number];
  priority: number;
}

export interface TaskCorridor {
  id: TaskCorridorId;
  label: string;
  color: string;
  focus: readonly [number, number, number];
  points: readonly (readonly [number, number, number])[];
}

export const SUPPORT_NODE_LIMITS: Record<PerformanceTier, { nodes: number; labels: number }> = {
  high: { nodes: 15, labels: 8 },
  medium: { nodes: 10, labels: 5 },
  low: { nodes: 6, labels: 3 },
};

export const SUPPORT_NODES: readonly SupportNode[] = [
  { id: "RTK-YARD", label: "北斗 RTK 基准站", kind: "rtk", position: [-122, 10.8, 112], priority: 1 },
  { id: "EDGE-YARD", label: "作业场边缘控制", kind: "edge-cabinet", position: [-102, 1.2, 122], priority: 2 },
  { id: "SOIL-A02", label: "A02 根区墒情", kind: "soil-box", position: [20, 0.7, -65], priority: 3 },
  { id: "WATER-PUMP", label: "泵站流量回传", kind: "water-meter", position: [82, 1.4, 101], priority: 4 },
  { id: "WATER-A02-INLET", label: "A02 进水口水位", kind: "water-meter", position: [57, 1.2, -34], priority: 5 },
  { id: "CAM-A02", label: "A02 苗情视频", kind: "crop-camera", position: [6, 0.8, -48], priority: 6 },
  { id: "WATER-GATE", label: "东支闸水位", kind: "water-meter", position: [69, 1.2, -18], priority: 7 },
  { id: "CAM-B03", label: "B03 补播苗情", kind: "crop-camera", position: [112, 0.8, 35], priority: 8 },
  { id: "SOIL-B03", label: "B03 播层墒情", kind: "soil-box", position: [105, 0.7, 30], priority: 9 },
  { id: "EDGE-EAST", label: "东侧水利边缘柜", kind: "edge-cabinet", position: [93, 1.2, 92], priority: 10 },
  { id: "CAM-A03", label: "A03 苗情视频", kind: "crop-camera", position: [45, 0.8, 37], priority: 11 },
  { id: "SOIL-A03", label: "A03 根区墒情", kind: "soil-box", position: [34, 0.7, 29], priority: 12 },
  { id: "SOIL-B02", label: "B02 根区墒情", kind: "soil-box", position: [77, 0.7, 61], priority: 13 },
  { id: "PEST-C01", label: "C01 虫情监测", kind: "pest-monitor", position: [-73, 0.8, -6], priority: 14 },
  { id: "WATER-MAIN", label: "主渠流量监测", kind: "water-meter", position: [77, 1.2, 45], priority: 15 },
] as const;

export const TASK_CORRIDORS: Record<TaskCorridorId, TaskCorridor> = {
  "yard-to-b03": {
    id: "yard-to-b03",
    label: "B03 无人补播任务走廊",
    color: "#e4c46b",
    focus: [112, 1.2, 35],
    points: [[-112, 1, 110], [-76, 1, 82], [-18, 1, 58], [52, 1, 45], [112, 1, 35]],
  },
  "central-patrol": {
    id: "central-patrol",
    label: "A03 / B02 巡检走廊",
    color: "#76d5c3",
    focus: [78, 1.2, -19],
    points: [[-8, 1, 8], [31, 1, 3], [69, 1, -12], [78, 1, -19], [82, 1, 42]],
  },
  "east-maintenance": {
    id: "east-maintenance",
    label: "泵站与渠道维护带",
    color: "#9bc979",
    focus: [118, 1.2, 101],
    points: [[-102, 1, 122], [-25, 1, 126], [50, 1, 118], [82, 1, 108], [118, 1, 101]],
  },
  "uav-a02": {
    id: "uav-a02",
    label: "无人机巡田与 A02 复核航线",
    color: "#7bc8e8",
    focus: [23, 12, -66],
    points: [[-103, 3, 111], [-62, 18, 72], [-10, 24, 21], [23, 18, -66]],
  },
  "a02-water-chain": {
    id: "a02-water-chain",
    label: "A02 泵闸供水链路",
    color: "#63c7c2",
    focus: [23, 1.2, -66],
    points: [[82, 1.5, 108], [77, 1.2, 45], [69, 1.2, -18], [57, 1.2, -34], [23, 1.2, -66]],
  },
};

const CHAPTER_CORRIDOR: Partial<Record<SmartFarmChapter, TaskCorridorId>> = {
  "autonomous-operations": "yard-to-b03",
  "coordinated-patrol": "central-patrol",
  "a02-alert": "uav-a02",
  "remote-decision": "a02-water-chain",
  "irrigation-response": "a02-water-chain",
  "outcome-verification": "uav-a02",
};

export function selectSupportNetwork(tier: PerformanceTier) {
  const limits = SUPPORT_NODE_LIMITS[tier];
  const nodes = SUPPORT_NODES.slice(0, limits.nodes);
  return {
    nodes,
    labeledNodeIds: nodes.slice(0, limits.labels).map((node) => node.id),
  };
}

export function spatialDetailLevel(distanceMeters: number): SpatialDetailLevel {
  if (distanceMeters <= 20) return "action";
  if (distanceMeters <= 80) return "route";
  return "silhouette";
}

export function corridorForChapter(chapter: SmartFarmChapter): TaskCorridor | null {
  const id = CHAPTER_CORRIDOR[chapter];
  return id ? TASK_CORRIDORS[id] : null;
}
