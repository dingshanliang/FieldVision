import { describe, expect, it } from "vitest";
import { weatherStatusFor } from "./weatherStatus";

/** 顶栏气象从 stormProgress/dayPhase 派生（fv-weather 穿帮修复）。 */
describe("weatherStatusFor", () => {
  it("reads as a thunderstorm warning at the storm chapter peak", () => {
    expect(weatherStatusFor(1, "day").kind).toBe("storm");
    expect(weatherStatusFor(0.8, "night").kind).toBe("storm");
  });

  it("reads as rain while the weather chapter ramps and drizzle on the tail", () => {
    expect(weatherStatusFor(0.45, "day").kind).toBe("rain");
    expect(weatherStatusFor(0.25, "day").kind).toBe("rain");
    expect(weatherStatusFor(0.03, "day").kind).toBe("drizzle");
  });

  it("keeps the clear-weather copy outside the storm, cooler at night", () => {
    expect(weatherStatusFor(0, "dawn").label).toBe("23 °C · 东南风 2 级");
    expect(weatherStatusFor(0, "day").kind).toBe("clear");
    expect(weatherStatusFor(0, "night").label).toBe("19 °C · 微风");
  });

  it("prioritises the storm readout over the phase readout", () => {
    expect(weatherStatusFor(0.9, "night").kind).toBe("storm");
  });
});
