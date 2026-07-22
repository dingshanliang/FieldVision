import { deriveIrrigationEvent } from "./irrigationEvent";

export const evidenceMetadata = {
  provenance: "演示模拟",
  source: "多光谱无人机",
  capturedAt: "08:42",
  moisture: 18,
  growthDelta: -12,
  confidence: 92,
  diagnosis: "A02 东侧连续低值，东支渠末端供水不足",
  reviewedAt: "09:06",
  recoveredMoisture: 27,
  riskAreaBeforeMu: 23.6,
  riskAreaAfterMu: 0.8,
} as const;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export interface EvidenceState {
  scanReveal: number;
  riskEvidenceStrength: number;
  wettingProgress: number;
  cropRecoveryProgress: number;
  verified: boolean;
}

export function deriveEvidenceState(scanInput: number, irrigationInput: number): EvidenceState {
  const scanReveal = clamp01(scanInput);
  const irrigation = deriveIrrigationEvent(irrigationInput);
  return {
    scanReveal,
    riskEvidenceStrength: scanReveal * (1 - irrigation.cropRecoveryProgress),
    wettingProgress: irrigation.wettingProgress,
    cropRecoveryProgress: irrigation.cropRecoveryProgress,
    verified: irrigation.stage === "verified",
  };
}
