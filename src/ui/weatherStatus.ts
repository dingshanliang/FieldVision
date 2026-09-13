import type { DayPhase } from "../types/farm";

export type WeatherStatusKind = "storm" | "rain" | "drizzle" | "night-clear" | "clear";
export interface WeatherStatus {
  kind: WeatherStatusKind;
  label: string;
}

/**
 * 顶栏气象读数（fv-weather 穿帮修复）：从 store 的 stormProgress/dayPhase
 * 单一事实源派生，不维护第二份 mock 文案——雷电压境时必须读作雷雨，
 * 这是观众最容易抓住的"系统是否可信"信号。
 */
export function weatherStatusFor(storm: number, dayPhase: DayPhase): WeatherStatus {
  if (storm >= 0.8) return { kind: "storm", label: "强对流 · 雷电预警" };
  if (storm >= 0.25) return { kind: "rain", label: "降雨 · 东南风 5 级" };
  if (storm > 0.02) return { kind: "drizzle", label: "小雨 · 东南风 3 级" };
  if (dayPhase === "night") return { kind: "night-clear", label: "19 °C · 微风" };
  return { kind: "clear", label: "23 °C · 东南风 2 级" };
}
