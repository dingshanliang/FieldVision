import type { DemoStep, FieldStatus, LayerMode, ViewMode } from "../types/farm";

export type IrrigationStage =
  | "idle"
  | "pump-starting"
  | "gate-opening"
  | "main-channel"
  | "east-branch"
  | "field-inlet"
  | "wetting"
  | "verifying"
  | "verified";

export interface IrrigationEventState {
  progress: number;
  stage: IrrigationStage;
  pumpProgress: number;
  gateProgress: number;
  mainChannelProgress: number;
  branchChannelProgress: number;
  inletProgress: number;
  wettingProgress: number;
  cropRecoveryProgress: number;
  verificationProgress: number;
}

export interface DemoStatePreset {
  selectedFieldId: string | null;
  viewMode: ViewMode;
  layerMode: LayerMode;
  demoStep: DemoStep;
  irrigationProgress: number;
  scanProgress: number;
  fieldStatus: FieldStatus;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function segment(progress: number, start: number, end: number) {
  return clamp01((progress - start) / (end - start));
}

export function deriveIrrigationEvent(input: number): IrrigationEventState {
  const progress = clamp01(input);
  const pumpProgress = segment(progress, 0.01, 0.13);
  const gateProgress = segment(progress, 0.11, 0.25);
  const mainChannelProgress = segment(progress, 0.22, 0.47);
  const branchChannelProgress = segment(progress, 0.41, 0.61);
  const inletProgress = segment(progress, 0.58, 0.7);
  const wettingProgress = Math.min(inletProgress, segment(progress, 0.66, 0.94));
  const cropRecoveryProgress = Math.min(wettingProgress, segment(progress, 0.73, 0.98));
  const verificationProgress = segment(progress, 0.96, 1);

  let stage: IrrigationStage = "idle";
  if (pumpProgress > 0) stage = "pump-starting";
  if (gateProgress > 0) stage = "gate-opening";
  if (mainChannelProgress > 0) stage = "main-channel";
  if (branchChannelProgress > 0) stage = "east-branch";
  if (inletProgress > 0) stage = "field-inlet";
  if (wettingProgress > 0) stage = "wetting";
  if (verificationProgress > 0) stage = "verifying";
  if (progress === 1) stage = "verified";

  return {
    progress,
    stage,
    pumpProgress,
    gateProgress,
    mainChannelProgress,
    branchChannelProgress,
    inletProgress,
    wettingProgress,
    cropRecoveryProgress,
    verificationProgress,
  };
}

const canonicalPresets: Record<Exclude<DemoStep, "intro" | "drone-scan">, DemoStatePreset> = {
  overview: {
    selectedFieldId: null,
    viewMode: "overview",
    layerMode: "natural",
    demoStep: "overview",
    irrigationProgress: 0,
    scanProgress: 0,
    fieldStatus: "risk",
  },
  "select-field": {
    selectedFieldId: "A02",
    viewMode: "field-ground",
    layerMode: "natural",
    demoStep: "select-field",
    irrigationProgress: 0,
    scanProgress: 0,
    fieldStatus: "risk",
  },
  "inspect-risk": {
    selectedFieldId: "A02",
    viewMode: "field-aerial",
    layerMode: "growth",
    demoStep: "drone-scan",
    irrigationProgress: 0,
    scanProgress: 1,
    fieldStatus: "risk",
  },
  irrigation: {
    selectedFieldId: "A02",
    viewMode: "irrigation",
    layerMode: "growth",
    demoStep: "irrigation",
    irrigationProgress: 0.62,
    scanProgress: 1,
    fieldStatus: "processing",
  },
  recovered: {
    selectedFieldId: "A02",
    viewMode: "field-aerial",
    layerMode: "growth",
    demoStep: "recovered",
    irrigationProgress: 1,
    scanProgress: 1,
    fieldStatus: "recovered",
  },
};

export function getDemoStatePreset(step: DemoStep): DemoStatePreset {
  if (step === "intro") return { ...canonicalPresets.overview, demoStep: "intro" };
  if (step === "drone-scan") return { ...canonicalPresets["inspect-risk"], demoStep: "drone-scan" };
  return canonicalPresets[step];
}
