import { describe, expect, it } from "vitest";
import { seededRandom } from "../utils/geometry";
import { buildStrikeSchedule, flashValueAt, LIGHTNING_SEED } from "./lightningSchedule";

/** 闪电时刻表与包络的确定性（qaRun 三轮重放一致性的根基）。 */
describe("lightning schedule and envelope", () => {
  it("rebuilds an identical schedule from the same seed", () => {
    const a = buildStrikeSchedule(seededRandom(LIGHTNING_SEED));
    const b = buildStrikeSchedule(seededRandom(LIGHTNING_SEED));
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(4);
    expect(a[0]!.at).toBeGreaterThanOrEqual(2.2);
    expect(a[0]!.at).toBeLessThan(4.2);
  });

  it("spaces strikes 5-9 seconds apart with delayed thunder", () => {
    const schedule = buildStrikeSchedule(seededRandom(LIGHTNING_SEED));
    for (let index = 1; index < schedule.length; index += 1) {
      const gap = schedule[index]!.at - schedule[index - 1]!.at;
      expect(gap).toBeGreaterThanOrEqual(5);
      expect(gap).toBeLessThanOrEqual(9);
    }
    for (const strike of schedule) {
      expect(strike.thunderDelay).toBeGreaterThanOrEqual(0.6);
      expect(strike.thunderDelay).toBeLessThanOrEqual(1.6);
    }
  });

  it("produces a fast attack and a sub-400ms decay per strike", () => {
    const schedule = [{ at: 0, double: false, thunderDelay: 0.8 }];
    expect(flashValueAt(-0.1, schedule)).toBe(0);
    expect(flashValueAt(0.02, schedule)).toBeCloseTo(0.5, 5);
    expect(flashValueAt(0.04, schedule)).toBeCloseTo(1, 5);
    expect(flashValueAt(0.15, schedule)).toBeGreaterThan(0.2);
    expect(flashValueAt(0.15, schedule)).toBeLessThan(1);
    expect(flashValueAt(0.4, schedule)).toBe(0);
  });

  it("reads a double strike as a clearly separated second pulse", () => {
    const single = [{ at: 0, double: false, thunderDelay: 0.8 }];
    const double = [{ at: 0, double: true, thunderDelay: 0.8 }];
    // 0.22s：单闪已衰减到尾部，双闪的第二脉冲（0.18s 起、峰值 0.7）接管，
    // 两次脉冲读作"闪-闪"而不是一片糊白。
    const singleValue = flashValueAt(0.22, single);
    const doubleValue = flashValueAt(0.22, double);
    expect(doubleValue).toBeGreaterThan(singleValue + 0.3);
    expect(doubleValue).toBeGreaterThanOrEqual(0.6);
    // 第二脉冲同样在 ~400ms 内收净。
    expect(flashValueAt(0.58, double)).toBe(0);
  });

  it("stays dark before the first strike and between strikes", () => {
    const schedule = buildStrikeSchedule(seededRandom(LIGHTNING_SEED));
    expect(flashValueAt(0, schedule)).toBe(0);
    expect(flashValueAt(schedule[0]!.at - 0.01, schedule)).toBe(0);
    const between = (schedule[0]!.at + schedule[1]!.at) / 2;
    expect(flashValueAt(between, schedule)).toBe(0);
  });
});
