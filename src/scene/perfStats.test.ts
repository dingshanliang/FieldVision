import { describe, expect, it } from "vitest";
import { computeFpsStats, readPerfSample } from "./perfStats";

describe("computeFpsStats", () => {
  it("returns 0/0 for an empty window", () => {
    expect(computeFpsStats([])).toEqual({ fps: 0, p10: 0 });
  });

  it("returns 0/0 (never Infinity) when frame deltas sum to 0", () => {
    expect(computeFpsStats([0, 0, 0, 0])).toEqual({ fps: 0, p10: 0 });
  });

  it("reports ~60 fps for a steady 60 Hz window", () => {
    const times = Array.from({ length: 60 }, () => 1000 / 60);
    const { fps, p10 } = computeFpsStats(times);
    expect(fps).toBeCloseTo(60, 0);
    expect(p10).toBeCloseTo(60, 0);
  });

  it("drives p10 below average fps when 10% of frames stutter", () => {
    // 90 crisp frames at 10ms + 10 stutter frames at 50ms.
    const times = [...Array.from({ length: 90 }, () => 10), ...Array.from({ length: 10 }, () => 50)];
    const { fps, p10 } = computeFpsStats(times);
    expect(fps).toBeGreaterThan(60);
    // p10 reflects the slow tail (50ms → 20 fps), so it must lag the average.
    expect(p10).toBeLessThan(fps);
    expect(p10).toBeCloseTo(20, 0);
  });
});

describe("readPerfSample singleton", () => {
  it("returns the same mutable object across calls", () => {
    const a = readPerfSample();
    const b = readPerfSample();
    expect(a).toBe(b);
    a.frames = 42;
    expect(readPerfSample().frames).toBe(42);
  });
});
