import type { DayPhase } from "../types/farm";

/**
 * 日夜循环（fv-daynight）：每个时间相位一套完整光照目标。控制器每帧向目标
 * 阻尼插值，天穹 shader、平行光、半球光、雾、HDR 环境强度、地平线染色与
 * 夜间灯光全部从 currentLighting 取值，参数不允许散落在组件里。
 */
export interface DayPhaseLighting {
  label: string;
  /** 指向太阳（夜间为月亮）的方向。 */
  sunDirection: readonly [number, number, number];
  sunIntensity: number;
  sunColor: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  envIntensity: number;
  fogColor: string;
  fogDensity: number;
  skyZenith: string;
  skyHorizon: string;
  skyCloudDark: string;
  skyCloudLight: string;
  sunGlowColor: string;
  sunGlowStrength: number;
  sunDiscColor: string;
  skyHaze: string;
  /** 地平线全景图的乘色（夜里压暗成蓝调）。 */
  horizonTint: string;
  /** 夜间灯光 0→1（泵站泛光、场院灯、气象站信标）。 */
  nightLights: number;
  stars: number;
  bloomBoost: number;
}

export const DAY_PHASE_LIGHTING: Record<DayPhase, DayPhaseLighting> = {
  dawn: {
    label: "清晨",
    sunDirection: [-1.0, 0.38, 0.15],
    sunIntensity: 2.15,
    sunColor: "#fff0dc",
    hemiSky: "#b8cad4",
    hemiGround: "#4c4a3b",
    hemiIntensity: 0.5,
    envIntensity: 0.58,
    fogColor: "#abb8b8",
    fogDensity: 0.00072,
    skyZenith: "#385c85",
    skyHorizon: "#abb8b8",
    skyCloudDark: "#788588",
    skyCloudLight: "#e0e0d4",
    sunGlowColor: "#ffb061",
    sunGlowStrength: 0.12,
    sunDiscColor: "#ffe0a8",
    skyHaze: "#4f5954",
    horizonTint: "#ffffff",
    nightLights: 0.12,
    stars: 0,
    bloomBoost: 0,
  },
  day: {
    label: "正午",
    sunDirection: [-0.8, 0.88, 0.22],
    sunIntensity: 2.6,
    sunColor: "#fff6e8",
    hemiSky: "#cfe0ea",
    hemiGround: "#59604b",
    hemiIntensity: 0.55,
    envIntensity: 0.72,
    fogColor: "#b8c6c4",
    fogDensity: 0.00055,
    skyZenith: "#2e578c",
    skyHorizon: "#b8c6c4",
    skyCloudDark: "#8b979a",
    skyCloudLight: "#f4f2e8",
    sunGlowColor: "#fff3cf",
    sunGlowStrength: 0.09,
    sunDiscColor: "#fff8e6",
    skyHaze: "#5b665f",
    horizonTint: "#ffffff",
    nightLights: 0,
    stars: 0,
    bloomBoost: -0.02,
  },
  dusk: {
    label: "黄昏",
    sunDirection: [-1.0, 0.12, -0.38],
    sunIntensity: 1.35,
    sunColor: "#ffb27a",
    hemiSky: "#8f7f9a",
    hemiGround: "#4a3c33",
    hemiIntensity: 0.38,
    envIntensity: 0.34,
    fogColor: "#b09a8a",
    fogDensity: 0.0009,
    skyZenith: "#333d66",
    skyHorizon: "#db9a68",
    skyCloudDark: "#7f6a74",
    skyCloudLight: "#f5c49a",
    sunGlowColor: "#ff8f4d",
    sunGlowStrength: 0.26,
    sunDiscColor: "#ffd2a0",
    skyHaze: "#54473f",
    horizonTint: "#e0b48c",
    nightLights: 0.6,
    stars: 0.3,
    bloomBoost: 0.06,
  },
  night: {
    label: "夜晚",
    sunDirection: [0.42, 0.52, 0.3],
    sunIntensity: 0.55,
    sunColor: "#a8c4e8",
    hemiSky: "#33465f",
    hemiGround: "#1c232c",
    hemiIntensity: 0.32,
    envIntensity: 0.2,
    fogColor: "#14222e",
    fogDensity: 0.0011,
    skyZenith: "#0a1526",
    skyHorizon: "#1f3044",
    skyCloudDark: "#18212e",
    skyCloudLight: "#334054",
    sunGlowColor: "#9db8dd",
    sunGlowStrength: 0.1,
    sunDiscColor: "#e8f0ff",
    skyHaze: "#101a24",
    horizonTint: "#46607c",
    nightLights: 1,
    stars: 0.9,
    bloomBoost: 0.18,
  },
};

/** 暴雨对任何相位的覆盖强度（fv-weather）：压光、雾变浓、风变大。 */
export const STORM_OVERLAY = {
  sunDim: 0.28,          // 暴雨时太阳强度乘到 28%
  hemiDim: 0.55,
  envDim: 0.5,
  fogColor: "#59645e",
  fogDensityAdd: 0.0009,
  horizonTint: "#3f4c49",
  glowKill: 0.1,         // 太阳辉光乘到 10%
  windBoost: 1.15,       // 作物风摆加成（乘到 1+1.15*storm）
  nightLights: 0.85,     // 白昼暴雨也点亮作业灯
  cloudDark: "#2f373e",
  cloudLight: "#49545c",
  // 天穹 shader 直接把 uniform 当线性色输出（比 hex 直觉亮），天际线需要
  // 单独一组更深的值；fogColor 只供 scene.fog（标准色彩空间）使用。
  skyHorizon: "#20262a",
};

export interface LightingTargets {
  sunDirection: [number, number, number];
  sunIntensity: number;
  sunColor: [number, number, number];
  hemiSky: [number, number, number];
  hemiGround: [number, number, number];
  hemiIntensity: number;
  envIntensity: number;
  fogColor: [number, number, number];
  fogDensity: number;
  skyZenith: [number, number, number];
  skyHorizon: [number, number, number];
  skyCloudDark: [number, number, number];
  skyCloudLight: [number, number, number];
  sunGlowColor: [number, number, number];
  sunGlowStrength: number;
  sunDiscColor: [number, number, number];
  skyHaze: [number, number, number];
  horizonTint: [number, number, number];
  nightLights: number;
  stars: number;
  bloomBoost: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function mix3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** 组合一个相位的基线光照与暴雨覆盖，得到逐帧插值的最终目标。 */
export function resolveLightingTargets(dayPhase: DayPhase, storm: number): LightingTargets {
  const base = DAY_PHASE_LIGHTING[dayPhase];
  const s = Math.min(1, Math.max(0, storm));
  const stormFog = hexToRgb(STORM_OVERLAY.fogColor);
  return {
    sunDirection: [...base.sunDirection] as [number, number, number],
    sunIntensity: base.sunIntensity * (1 - (1 - STORM_OVERLAY.sunDim) * s),
    sunColor: hexToRgb(base.sunColor),
    hemiSky: hexToRgb(base.hemiSky),
    hemiGround: hexToRgb(base.hemiGround),
    hemiIntensity: base.hemiIntensity * (1 - (1 - STORM_OVERLAY.hemiDim) * s),
    envIntensity: base.envIntensity * (1 - (1 - STORM_OVERLAY.envDim) * s),
    fogColor: mix3(hexToRgb(base.fogColor), stormFog, s),
    fogDensity: base.fogDensity + STORM_OVERLAY.fogDensityAdd * s,
    skyZenith: mix3(hexToRgb(base.skyZenith), hexToRgb(STORM_OVERLAY.cloudDark), s * 0.55),
    skyHorizon: mix3(hexToRgb(base.skyHorizon), hexToRgb(STORM_OVERLAY.skyHorizon), s),
    skyCloudDark: mix3(hexToRgb(base.skyCloudDark), hexToRgb(STORM_OVERLAY.cloudDark), s),
    skyCloudLight: mix3(hexToRgb(base.skyCloudLight), hexToRgb(STORM_OVERLAY.cloudLight), s),
    sunGlowColor: hexToRgb(base.sunGlowColor),
    sunGlowStrength: base.sunGlowStrength * (1 - (1 - STORM_OVERLAY.glowKill) * s),
    sunDiscColor: hexToRgb(base.sunDiscColor),
    skyHaze: mix3(hexToRgb(base.skyHaze), hexToRgb(STORM_OVERLAY.cloudDark), s * 0.7),
    horizonTint: mix3(hexToRgb(base.horizonTint), hexToRgb(STORM_OVERLAY.horizonTint), s),
    nightLights: Math.max(base.nightLights, STORM_OVERLAY.nightLights * s),
    stars: base.stars * (1 - s),
    bloomBoost: base.bloomBoost + 0.08 * s,
  };
}

const DAWN = resolveLightingTargets("dawn", 0);

/**
 * 每帧插值的共享光照状态。控制器写入，MorningSky / 灯光 / 地平线 / 夜灯
 * 各自的 useFrame 读取——同一帧内的先后差一帧不可见，免去 ref 传递。
 */
export const currentLighting = {
  sunDirection: [...DAWN.sunDirection] as [number, number, number],
  sunIntensity: DAWN.sunIntensity,
  sunColor: [...DAWN.sunColor] as [number, number, number],
  hemiSky: [...DAWN.hemiSky] as [number, number, number],
  hemiGround: [...DAWN.hemiGround] as [number, number, number],
  hemiIntensity: DAWN.hemiIntensity,
  envIntensity: DAWN.envIntensity,
  fogColor: [...DAWN.fogColor] as [number, number, number],
  fogDensity: DAWN.fogDensity,
  skyZenith: [...DAWN.skyZenith] as [number, number, number],
  skyHorizon: [...DAWN.skyHorizon] as [number, number, number],
  skyCloudDark: [...DAWN.skyCloudDark] as [number, number, number],
  skyCloudLight: [...DAWN.skyCloudLight] as [number, number, number],
  sunGlowColor: [...DAWN.sunGlowColor] as [number, number, number],
  sunGlowStrength: DAWN.sunGlowStrength,
  sunDiscColor: [...DAWN.sunDiscColor] as [number, number, number],
  skyHaze: [...DAWN.skyHaze] as [number, number, number],
  horizonTint: [...DAWN.horizonTint] as [number, number, number],
  nightLights: DAWN.nightLights,
  stars: DAWN.stars,
  bloomBoost: DAWN.bloomBoost,
};

export function lerpCurrentLighting(target: LightingTargets, alpha: number) {
  const t = Math.min(1, Math.max(0, alpha));
  const mix = (key: keyof LightingTargets) => {
    const from = currentLighting[key] as [number, number, number];
    const to = target[key] as [number, number, number];
    from[0] += (to[0] - from[0]) * t;
    from[1] += (to[1] - from[1]) * t;
    from[2] += (to[2] - from[2]) * t;
  };
  mix("sunDirection");
  mix("sunColor");
  mix("hemiSky");
  mix("hemiGround");
  mix("fogColor");
  mix("skyZenith");
  mix("skyHorizon");
  mix("skyCloudDark");
  mix("skyCloudLight");
  mix("sunGlowColor");
  mix("sunDiscColor");
  mix("skyHaze");
  mix("horizonTint");
  const approach = (key: "sunIntensity" | "hemiIntensity" | "envIntensity" | "fogDensity" | "sunGlowStrength" | "nightLights" | "stars" | "bloomBoost") => {
    currentLighting[key] += (target[key] - currentLighting[key]) * t;
  };
  approach("sunIntensity");
  approach("hemiIntensity");
  approach("envIntensity");
  approach("fogDensity");
  approach("sunGlowStrength");
  approach("nightLights");
  approach("stars");
  approach("bloomBoost");
}
