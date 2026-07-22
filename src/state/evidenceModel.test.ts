import { describe, expect, it } from "vitest";
import { deriveEvidenceState, evidenceMetadata } from "./evidenceModel";

describe("deriveEvidenceState", () => {
  it("reveals scan evidence monotonically before irrigation recovery begins", () => {
    const states = Array.from({ length: 11 }, (_, index) => deriveEvidenceState(index / 10, 0));
    states.forEach((state, index) => {
      expect(state.scanReveal).toBe(index / 10);
      expect(state.riskEvidenceStrength).toBe(index / 10);
      expect(state.wettingProgress).toBe(0);
      expect(state.cropRecoveryProgress).toBe(0);
    });
  });

  it("keeps crop recovery behind the wetting front and removes risk only after water arrives", () => {
    for (let index = 0; index <= 100; index += 1) {
      const state = deriveEvidenceState(1, index / 100);
      expect(state.cropRecoveryProgress).toBeLessThanOrEqual(state.wettingProgress);
      expect(state.riskEvidenceStrength).toBeCloseTo(1 - state.cropRecoveryProgress, 6);
    }
  });

  it("clamps invalid input", () => {
    expect(deriveEvidenceState(-1, -1)).toMatchObject({ scanReveal: 0, wettingProgress: 0 });
    expect(deriveEvidenceState(2, 2)).toMatchObject({ scanReveal: 1, wettingProgress: 1, cropRecoveryProgress: 1 });
    expect(deriveEvidenceState(Number.NaN, Number.NaN)).toMatchObject({ scanReveal: 0, wettingProgress: 0 });
  });
});

describe("evidenceMetadata", () => {
  it("labels mock evidence truthfully and exposes the required decision inputs", () => {
    expect(evidenceMetadata).toMatchObject({
      provenance: "演示模拟",
      source: "多光谱无人机",
      capturedAt: "08:42",
      moisture: 18,
      growthDelta: -12,
      confidence: 92,
      diagnosis: "A02 东侧连续低值，东支渠末端供水不足",
    });
  });
});
