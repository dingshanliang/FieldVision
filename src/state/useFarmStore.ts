import { create } from "zustand";
import type { DayPhase, DemoStep, FieldStatus, LayerMode, ViewMode } from "../types/farm";
import {
  advanceTaskProgress as deriveTaskProgress,
  confirmTask,
  isConfirmationValid,
  type AutonomousTaskRecord,
  type ConfirmationSource,
} from "./autonomousTask";
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

/**
 * fv-daynight 三段式的时间锚点：章节与农业日期强绑定处显示跳切卡，
 * 防止观众把 20 秒动画误读为实时恢复（CONTEXT.md Verified Outcome）。
 * 播放与直跳同源（applySmartFarmChapter 查表写入），确定性。
 */
export const TIME_CUT_FOR_CHAPTER: Partial<Record<SmartFarmChapter, TimeCut>> = {
  "irrigation-response": { day: "D0", label: "当日傍晚 · 联动供水" },
  "outcome-verification": { day: "D1", label: "次日清晨 · 复测" },
  "weather-front": { day: "D3", label: "第 3 天 · 强对流过境" },
};

/** 演示节奏：fast 快览 / narration 讲解留白（导演系统 fv-o6c.12）。 */
export type Pacing = "fast" | "narration";
export type InteractiveConfirmationSource = Exclude<ConfirmationSource, "demo-preset">;
export type ConfirmationCue = "idle" | "countdown" | "simulated-click" | "presenter-click";

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
  confirmationCountdown: number | null;
  confirmationCue: ConfirmationCue;
  introComplete: boolean;
  irrigationProgress: number;
  scanProgress: number;
  recoveryPhase: RecoveryPhase;
  timeCut: TimeCut | null;
  droneFollowing: boolean;
  fieldStatuses: Record<string, FieldStatus>;
  /** 日夜循环时间相位（fv-daynight）；resetDemo 回到清晨。 */
  dayPhase: DayPhase;
  /** 暴雨进度 0（无雨）→ 1（强对流峰值），由天气章节与快照驱动。 */
  stormProgress: number;
  /** 照片模式（fv-photo）：纯净画面 + 冻结 + 曝光/焦距 + PNG 导出。 */
  photoMode: boolean;
  photoFrozen: boolean;
  photoExposure: number;
  photoFov: number | null;
  photoCaptureTick: number;
  /** 导出 PNG 是否合成 2.39:1 电影黑边（与屏显 letterbox 对齐）。 */
  photoLetterbox: boolean;
  /** 进入照片模式前的演示暂停态，退出时恢复（瞬态簿记，非演示状态）。 */
  photoPriorPaused: boolean;
  /** 声效开启态（UI 单一事实源；AudioContext 由 UI 层在手势内初始化）。 */
  soundEnabled: boolean;
  selectField: (id: string | null) => void;
  clearFieldSelection: () => void;
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
  setDayPhase: (phase: DayPhase) => void;
  setStormProgress: (progress: number) => void;
  setPhotoMode: (enabled: boolean) => void;
  setPhotoFrozen: (frozen: boolean) => void;
  setPhotoExposure: (exposure: number) => void;
  setPhotoFov: (fov: number | null) => void;
  setPhotoLetterbox: (letterbox: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  requestPhotoCapture: () => void;
  applySmartFarmChapter: (chapter: SmartFarmChapter) => void;
  setConfirmationCountdown: (seconds: number | null) => void;
  confirmTaskForDemo: (taskId: string, source: InteractiveConfirmationSource) => void;
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
  confirmationCountdown: null,
  confirmationCue: "idle",
  introComplete: false,
  irrigationProgress: 0,
  scanProgress: 0,
  recoveryPhase: "none",
  timeCut: null,
  droneFollowing: false,
  fieldStatuses: initialStatuses,
  dayPhase: "dawn",
  stormProgress: 0,
  photoMode: false,
  photoFrozen: false,
  photoExposure: 1,
  photoFov: null,
  photoCaptureTick: 0,
  photoLetterbox: true,
  photoPriorPaused: false,
  soundEnabled: false,
  selectField: (selectedFieldId) => set({ selectedFieldId }),
  // 点空白（onPointerMissed）只清选区：旧 applyDemoState("overview") 会重置
  // legacy 演示字段却不写 smartFarmChapter/stormProgress，播放中触发会与
  // 章节推演互相覆写造成一次状态抖动（双轨泄漏点，fv-p7x 穿帮修复）。
  clearFieldSelection: () => set({ selectedFieldId: null }),
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
  setDayPhase: (dayPhase) => set({ dayPhase }),
  setStormProgress: (progress) => set({ stormProgress: Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0 }),
  // 进入照片模式即接管演示控制权：复用 paused 冻结章节时间（wait() 已感知），
  // 不发明第三种暂停态；退出时恢复进入前的暂停态。曝光/焦距/冻结在进出时复位。
  setPhotoMode: (photoMode) => set((state) => ({
    photoMode,
    photoFrozen: false,
    photoExposure: 1,
    photoFov: null,
    ...(photoMode
      ? { photoPriorPaused: state.paused, paused: true }
      : { paused: state.photoPriorPaused }),
  })),
  setPhotoFrozen: (photoFrozen) => set({ photoFrozen }),
  setPhotoExposure: (photoExposure) => set({ photoExposure: Number.isFinite(photoExposure) ? Math.min(1.7, Math.max(0.55, photoExposure)) : 1 }),
  setPhotoFov: (photoFov) => set({ photoFov }),
  setPhotoLetterbox: (photoLetterbox) => set({ photoLetterbox }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  requestPhotoCapture: () => set((state) => ({ photoCaptureTick: state.photoCaptureTick + 1 })),
  applySmartFarmChapter: (smartFarmChapter) => set((state) => {
    const snapshot = getSmartFarmChapterSnapshot(smartFarmChapter);
    const previousWaterTask = state.tasks["IRRIGATE-A02"];
    const snapshotWaterTask = snapshot.tasks["IRRIGATE-A02"];
    const tasks = previousWaterTask && snapshotWaterTask
      && isConfirmationValid(previousWaterTask)
      && ["authorized", "running", "completed", "verified"].includes(snapshotWaterTask.status)
      ? {
          ...snapshot.tasks,
          "IRRIGATE-A02": {
            ...snapshotWaterTask,
            confirmationReceipt: previousWaterTask.confirmationReceipt,
          },
        }
      : snapshot.tasks;
    return {
      smartFarmChapter,
      tasks,
      dailyOperationPlan: snapshot.dailyOperationPlan,
      confirmationCountdown: null,
      confirmationCue: "idle",
      selectedFieldId: snapshot.selectedFieldId,
      hoveredFieldId: null,
      introComplete: true,
      viewMode: snapshot.viewMode,
      layerMode: snapshot.layerMode,
      demoStep: snapshot.demoStep,
      irrigationProgress: snapshot.irrigationProgress,
      scanProgress: snapshot.scanProgress,
      recoveryPhase: snapshot.recoveryPhase,
      stormProgress: snapshot.stormProgress ?? 0,
      dayPhase: snapshot.dayPhase,
      timeCut: TIME_CUT_FOR_CHAPTER[smartFarmChapter] ?? null,
      droneFollowing: false,
      fieldStatuses: { ...state.fieldStatuses, A02: snapshot.fieldStatus },
    };
  }),
  setConfirmationCountdown: (confirmationCountdown) => set({
    confirmationCountdown,
    confirmationCue: confirmationCountdown === null ? "idle" : "countdown",
  }),
  confirmTaskForDemo: (taskId, source) => set((state) => {
    const task = state.tasks[taskId];
    if (!task || task.status !== "awaiting-confirmation") return state;
    // 确认时刻跟随章节的农业日期：远程确认在作业日（06-03）傍晚，
    // STORM-CHECK 在过境日（06-06）午后——与快照时间线同源，不再产生
    // "夜幕画面 + 早晨 08:35 回执"的穿帮。
    const confirmAt: Partial<Record<SmartFarmChapter, string>> = {
      "remote-decision": "2026-06-03T17:40:00+08:00",
      "weather-resume": "2026-06-06T14:46:00+08:00",
    };
    return {
      tasks: {
        ...state.tasks,
        [taskId]: confirmTask(task, source, confirmAt[state.smartFarmChapter] ?? "2026-06-03T17:40:00+08:00"),
      },
      confirmationCountdown: null,
      confirmationCue: source === "simulated-autoplay" ? "simulated-click" : "presenter-click",
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
      confirmationCountdown: null,
      confirmationCue: "idle",
      irrigationProgress: 0,
      scanProgress: 0,
      recoveryPhase: "none",
      stormProgress: 0,
      dayPhase: "dawn",
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
