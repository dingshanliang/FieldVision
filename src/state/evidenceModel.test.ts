import { describe, expect, it } from "vitest";
import { deriveEvidenceState, evidenceMetadata } from "./evidenceModel";
import { phaseEvidence, RECOVERY_PHASES } from "./recoveryModel";

describe("deriveEvidenceState", () => {
  it("reveals scan evidence monotonically and keeps crops unrestored before water arrives", () => {
    const states = Array.from({ length: 11 }, (_, index) => deriveEvidenceState(index / 10, 0));
    states.forEach((state, index) => {
      expect(state.scanReveal).toBe(index / 10);
      expect(state.riskEvidenceStrength).toBe(index / 10); // anomaly full until recovery phase
      expect(state.wettingProgress).toBe(0);
      expect(state.cropRecoveryProgress).toBe(0); // phase "none" → no same-day recovery
      expect(state.verified).toBe(false);
    });
  });

  it("drives crop recovery from the agricultural phase, not the irrigation progress", () => {
    // 同日灌溉（相位 none）：无论灌溉进度多少，作物都不变绿（到水 ≠ 恢复）。
    for (let index = 0; index <= 100; index += 1) {
      const sameDay = deriveEvidenceState(1, index / 100, "none");
      expect(sameDay.cropRecoveryProgress).toBe(0);
      expect(sameDay.verified).toBe(false);
    }
    // 到水当天也不变绿。
    expect(deriveEvidenceState(1, 1, "arrived").cropRecoveryProgress).toBe(0);
    // D1 根区复测后才开始恢复，D3 复飞后基本恢复，resolved 完全恢复。
    expect(deriveEvidenceState(1, 1, "d1-root").cropRecoveryProgress).toBe(0.5);
    expect(deriveEvidenceState(1, 1, "d3-reflight").cropRecoveryProgress).toBe(0.85);
    expect(deriveEvidenceState(1, 1, "resolved").cropRecoveryProgress).toBe(1);
    expect(deriveEvidenceState(1, 1, "resolved").verified).toBe(true);
  });

  it("clamps invalid input", () => {
    expect(deriveEvidenceState(-1, -1)).toMatchObject({ scanReveal: 0, wettingProgress: 0 });
    expect(deriveEvidenceState(2, 2)).toMatchObject({ scanReveal: 1, wettingProgress: 1, cropRecoveryProgress: 0 });
    expect(deriveEvidenceState(Number.NaN, Number.NaN)).toMatchObject({ scanReveal: 0, wettingProgress: 0 });
  });
});

describe("evidenceMetadata", () => {
  it("labels UAV canopy capture truthfully and does not back soil moisture", () => {
    expect(evidenceMetadata).toMatchObject({
      provenance: "演示模拟",
      source: "多光谱无人机",
      capturedAt: "08:42",
      growthDelta: -12,
      confidence: 92,
      diagnosis: "A02 东侧连续低值，东支渠末端供水不足",
    });
    expect(evidenceMetadata).not.toHaveProperty("moisture"); // 墒情归根区探头，不归 UAV
  });
});

describe("recoveryModel", () => {
  it("keeps the 27% root VWC and 0.8 mu residual area behind their respective days", () => {
    // 27% 只在 D1 及之后出现；D0/到水仍是 18%。
    expect(phaseEvidence("none").rootVwc.value).toBe(18);
    expect(phaseEvidence("arrived").rootVwc.value).toBe(18);
    expect(phaseEvidence("d1-root").rootVwc.value).toBe(27);
    // 0.8 亩残余面积只在 D3 复飞出现；之前是 23.6 亩。
    expect(phaseEvidence("arrived").canopy.areaMu).toBe(23.6);
    expect(phaseEvidence("d3-reflight").canopy.areaMu).toBe(0.8);
  });

  it("orders crop recovery and canopy anomaly monotonically across phases", () => {
    const recovery = RECOVERY_PHASES.map((p) => phaseEvidence(p).cropRecovery);
    for (let i = 1; i < recovery.length; i += 1) expect(recovery[i]).toBeGreaterThanOrEqual(recovery[i - 1]!);
    const anomaly = RECOVERY_PHASES.map((p) => phaseEvidence(p).canopyAnomalyStrength);
    for (let i = 1; i < anomaly.length; i += 1) expect(anomaly[i]).toBeLessThanOrEqual(anomaly[i - 1]!);
  });
});
