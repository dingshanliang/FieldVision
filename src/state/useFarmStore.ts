import { create } from "zustand";
import type { DemoStep, FieldStatus, LayerMode, ViewMode } from "../types/farm";
import { advanceTaskProgress as deriveTaskProgress, type AutonomousTaskRecord } from "./autonomousTask";
import { getDemoStatePreset } from "./irrigationEvent";
import type { RecoveryPhase } from "./recoveryModel";
import {
  getSmartFarmChapterSnapshot,
  type DailyOperationPlan,
  type SmartFarmChapter,
} from "./smartFarmState";

/** 时间跳切卡（D1 根区复测 / D3 冠层复飞 等农业时间锚点）。null = 不显示。 */
export interface TimeCut {
  day: string;
  label: string;
}

/** 演示节奏：fast 快览 / narration 讲解留白（导演系统 fv-o6c.12）。 */
export type Pacing = "fast" | "narration";

interface FarmState {
  selectedFieldId: string | null;
  hoveredFieldId: string | null;
  viewMode: ViewMode;
  layerMode: LayerMode;
  demoStep: DemoStep;
  demoPlaying: boolean;
  paused: boolean;
  pacing: Pacing;
  smartFarmChapter: SmartFarmChapter;
  tasks: Record<string, AutonomousTaskRecord>;
  dailyOperationPlan: DailyOperationPlan;
  introComplete: boolean;
  irrigationProgress: number;
  scanProgress: number;
  recoveryPhase: RecoveryPhase;
  timeCut: TimeCut | null;
  droneFollowing: boolean;
  fieldStatuses: Record<string, FieldStatus>;
  selectField: (id: string | null) => void;
  setHoveredField: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setLayerMode: (mode: LayerMode) => void;
  setDemoStep: (step: DemoStep) => void;
  setDemoPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setPacing: (pacing: Pacing) => void;
  setIntroComplete: (complete: boolean) => void;
  setIrrigationProgress: (progress: number) => void;
  setScanProgress: (progress: number) => void;
  setRecoveryPhase: (phase: RecoveryPhase) => void;
  setTimeCut: (cut: TimeCut | null) => void;
  setDroneFollowing: (following: boolean) => void;
  setFieldStatus: (id: string, status: FieldStatus) => void;
  applySmartFarmChapter: (chapter: SmartFarmChapter) => void;
  advanceTaskProgress: (taskId: string, progress: number) => void;
  applyDemoState: (step: DemoStep) => void;
  resetDemo: () => void;
}

const initialStatuses: Record<string, FieldStatus> = {
  A01: "normal", A02: "risk", A03: "normal", B01: "normal", B02: "processing", B03: "attention", C01: "normal",
};

const initialSmartFarmSnapshot = getSmartFarmChapterSnapshot("base-online");

export const useFarmStore = create<FarmState>((set) => ({
  selectedFieldId: null,
  hoveredFieldId: null,
  viewMode: "overview",
  layerMode: "natural",
  demoStep: "intro",
  demoPlaying: false,
  paused: false,
  pacing: "fast",
  smartFarmChapter: "base-online",
  tasks: initialSmartFarmSnapshot.tasks,
  dailyOperationPlan: initialSmartFarmSnapshot.dailyOperationPlan,
  introComplete: false,
  irrigationProgress: 0,
  scanProgress: 0,
  recoveryPhase: "none",
  timeCut: null,
  droneFollowing: false,
  fieldStatuses: initialStatuses,
  selectField: (selectedFieldId) => set({ selectedFieldId }),
  setHoveredField: (hoveredFieldId) => set({ hoveredFieldId }),
  setViewMode: (viewMode) => set({ viewMode }),
  setLayerMode: (layerMode) => set({ layerMode }),
  setDemoStep: (demoStep) => set({ demoStep }),
  setDemoPlaying: (demoPlaying) => set({ demoPlaying }),
  setPaused: (paused) => set({ paused }),
  setPacing: (pacing) => set({ pacing }),
  setIntroComplete: (introComplete) => set({ introComplete }),
  setIrrigationProgress: (progress) => set({ irrigationProgress: Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0 }),
  setScanProgress: (progress) => set({ scanProgress: Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0 }),
  setRecoveryPhase: (recoveryPhase) => set({ recoveryPhase }),
  setTimeCut: (timeCut) => set({ timeCut }),
  setDroneFollowing: (droneFollowing) => set({ droneFollowing }),
  setFieldStatus: (id, status) => set((state) => ({ fieldStatuses: { ...state.fieldStatuses, [id]: status } })),
  applySmartFarmChapter: (smartFarmChapter) => set((state) => {
    const snapshot = getSmartFarmChapterSnapshot(smartFarmChapter);
    return {
      smartFarmChapter,
      tasks: snapshot.tasks,
      dailyOperationPlan: snapshot.dailyOperationPlan,
      selectedFieldId: snapshot.selectedFieldId,
      hoveredFieldId: null,
      introComplete: true,
      viewMode: snapshot.viewMode,
      layerMode: snapshot.layerMode,
      demoStep: snapshot.demoStep,
      irrigationProgress: snapshot.irrigationProgress,
      scanProgress: snapshot.scanProgress,
      recoveryPhase: snapshot.recoveryPhase,
      timeCut: null,
      droneFollowing: false,
      fieldStatuses: { ...state.fieldStatuses, A02: snapshot.fieldStatus },
    };
  }),
  advanceTaskProgress: (taskId, progress) => set((state) => {
    if (state.paused) return state;
    const task = state.tasks[taskId];
    if (!task) return state;
    return { tasks: { ...state.tasks, [taskId]: deriveTaskProgress(task, progress) } };
  }),
  applyDemoState: (step) => set((state) => {
    const preset = getDemoStatePreset(step);
    return {
      selectedFieldId: preset.selectedFieldId,
      hoveredFieldId: null,
      viewMode: preset.viewMode,
      layerMode: preset.layerMode,
      demoStep: preset.demoStep,
      irrigationProgress: preset.irrigationProgress,
      scanProgress: preset.scanProgress,
      recoveryPhase: preset.recoveryPhase,
      timeCut: null,
      droneFollowing: false,
      fieldStatuses: { ...state.fieldStatuses, A02: preset.fieldStatus },
    };
  }),
  resetDemo: () => set(() => {
    const baseSnapshot = getSmartFarmChapterSnapshot("base-online");
    return {
      selectedFieldId: null,
      hoveredFieldId: null,
      viewMode: "overview",
      layerMode: "natural",
      demoStep: "overview",
      demoPlaying: false,
      paused: false,
      smartFarmChapter: "base-online",
      tasks: baseSnapshot.tasks,
      dailyOperationPlan: baseSnapshot.dailyOperationPlan,
      irrigationProgress: 0,
      scanProgress: 0,
      recoveryPhase: "none",
      timeCut: null,
      droneFollowing: false,
      fieldStatuses: { ...initialStatuses },
    };
  }),
}));

// Dev-only handle for visual QA automation (screenshot scripts can jump to any state).
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __farmStore?: typeof useFarmStore }).__farmStore = useFarmStore;
}
