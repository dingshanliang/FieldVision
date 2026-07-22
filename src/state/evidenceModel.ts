import { deriveIrrigationEvent } from "./irrigationEvent";
import { phaseEvidence, type RecoveryPhase } from "./recoveryModel";

/**
 * UAV 冠层采集元数据（演示模拟）。只描述冠层光谱采集本身——
 * 不再为土壤墒情背书（墒情由根区探头表达，见 recoveryModel）。
 */
export const evidenceMetadata = {
  provenance: "演示模拟",
  source: "多光谱无人机",
  capturedAt: "08:42",
  growthDelta: -12,
  riskAreaMu: 23.6,
  confidence: 92,
  diagnosis: "A02 东侧连续低值，东支渠末端供水不足",
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

/**
 * 推导可见证据状态。
 *
 * 作物恢复（cropRecoveryProgress）由农业恢复相位驱动，而非灌溉进度——
 * 到水当天作物不会变绿，恢复只发生在 D1 根区复测之后（修掉旧的同日恢复 bug）。
 * 地表湿润锋（wettingProgress）仍随灌溉推进，供 FieldParcel 水面着色器使用。
 */
export function deriveEvidenceState(
  scanInput: number,
  irrigationInput: number,
  recoveryPhase: RecoveryPhase = "none",
): EvidenceState {
  const scanReveal = clamp01(scanInput);
  const irrigation = deriveIrrigationEvent(irrigationInput);
  const phase = phaseEvidence(recoveryPhase);
  return {
    scanReveal,
    riskEvidenceStrength: scanReveal * phase.canopyAnomalyStrength,
    wettingProgress: irrigation.wettingProgress,
    cropRecoveryProgress: phase.cropRecovery,
    verified: recoveryPhase === "resolved",
  };
}
