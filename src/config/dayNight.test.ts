import { beforeEach, describe, expect, it } from "vitest";
import { currentLighting, DAY_PHASE_LIGHTING, lerpCurrentLighting, resolveLightingTargets } from "./dayNight";

/** 光照目标的纯函数行为（fv-daynight 三段式的回归高发区）。 */
describe("resolveLightingTargets", () => {
  it("returns the phase baseline untouched when the sky is clear", () => {
    const target = resolveLightingTargets("night", 0);
    expect(target.nightLights).toBeCloseTo(DAY_PHASE_LIGHTING.night.nightLights, 10);
    expect(target.sunIntensity).toBeCloseTo(DAY_PHASE_LIGHTING.night.sunIntensity, 10);
    expect(target.stars).toBeCloseTo(DAY_PHASE_LIGHTING.night.stars, 10);
  });

  it("dims light and thickens fog at the storm peak", () => {
    const clear = resolveLightingTargets("day", 0);
    const storm = resolveLightingTargets("day", 1);
    expect(storm.sunIntensity).toBeLessThan(clear.sunIntensity * 0.4);
    expect(storm.hemiIntensity).toBeLessThan(clear.hemiIntensity);
    expect(storm.envIntensity).toBeLessThan(clear.envIntensity);
    expect(storm.fogDensity).toBeGreaterThan(clear.fogDensity);
    expect(storm.stars).toBe(0);
  });

  it("lights work safety lamps during a daytime storm via the max rule", () => {
    // day 相位基线 nightLights=0，白昼暴雨仍要点亮安全灯（≥0.85）。
    expect(resolveLightingTargets("day", 1).nightLights).toBeGreaterThanOrEqual(0.8);
    // 夜晚基线为 1，不应被暴雨压暗。
    expect(resolveLightingTargets("night", 1).nightLights).toBeCloseTo(1, 10);
  });

  it("clamps storm input outside [0, 1]", () => {
    expect(resolveLightingTargets("day", 5)).toEqual(resolveLightingTargets("day", 1));
    expect(resolveLightingTargets("day", -1)).toEqual(resolveLightingTargets("day", 0));
  });
});

describe("lerpCurrentLighting", () => {
  beforeEach(() => {
    // 复位共享状态，避免用例间顺序耦合。
    const dawn = resolveLightingTargets("dawn", 0);
    lerpCurrentLighting(dawn, 1);
  });

  it("approaches the target monotonically without overshooting", () => {
    const target = resolveLightingTargets("night", 0);
    const start = currentLighting.sunIntensity;
    let previous = start;
    for (let step = 0; step < 40; step += 1) {
      lerpCurrentLighting(target, 0.25);
      const now = currentLighting.sunIntensity;
      // dawn(2.15) → night(0.55)：单调递减且始终夹在起点与目标之间。
      expect(now).toBeLessThanOrEqual(previous + 1e-9);
      expect(now).toBeGreaterThanOrEqual(target.sunIntensity - 1e-9);
      previous = now;
    }
    expect(previous).toBeLessThan(start);
  });

  it("snaps fully on a chapter cut (alpha = 1)", () => {
    const target = resolveLightingTargets("dusk", 0);
    lerpCurrentLighting(target, 1);
    expect(currentLighting.sunIntensity).toBeCloseTo(target.sunIntensity, 10);
    expect(currentLighting.sunDirection[0]).toBeCloseTo(target.sunDirection[0], 10);
    expect(currentLighting.skyHorizon[0]).toBeCloseTo(target.skyHorizon[0], 10);
    // 下一帧继续阻尼时不再移动（已到目标）。
    lerpCurrentLighting(target, 0.5);
    expect(currentLighting.sunIntensity).toBeCloseTo(target.sunIntensity, 10);
  });

  it("moves colour channels proportionally", () => {
    const target = resolveLightingTargets("night", 0);
    lerpCurrentLighting(target, 0.5);
    expect(currentLighting.sunColor[0]).toBeCloseTo((resolveLightingTargets("dawn", 0).sunColor[0] + target.sunColor[0]) / 2, 6);
  });
});
