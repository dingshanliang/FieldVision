/**
 * 闪电控制器（fv-weather 电影化）。仅暴雨峰值段（storm > 0.75，即
 * weather-front 的推演顶端）激活；时刻表与雷声延迟全部 seeded。包络写入
 * dayNight.lightningFlash（lerp 之后的加性通道，天穹/光源在阻尼之后叠加
 * 读取）。分档：高/中档全强度；低档乘 0.3 并驱动全屏微闪 overlay（CSS
 * 变量），雷声保留。photoFrozen 冻结包络；reduced-motion 用户整系统停用。
 */
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { lightningFlash } from "../config/dayNight";
import { seededRandom } from "../utils/geometry";
import { useFarmStore } from "../state/useFarmStore";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { audioEngine } from "../audio/audioEngine";
import { buildStrikeSchedule, flashValueAt, LIGHTNING_SEED, type LightningStrike } from "./lightningSchedule";

const ACTIVE_STORM_THRESHOLD = 0.75;
const REDUCED_MOTION = typeof window !== "undefined"
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Lightning() {
  const tier = usePerformanceTier();
  const controller = useRef({
    active: false,
    elapsed: 0,
    schedule: [] as LightningStrike[],
    triggeredStrikes: 0,
    overlayActive: false,
  });

  useFrame((_, delta) => {
    const state = controller.current;
    if (REDUCED_MOTION) {
      lightningFlash.value = 0;
      return;
    }
    const farm = useFarmStore.getState();
    const active = farm.stormProgress > ACTIVE_STORM_THRESHOLD;
    if (active && !state.active) {
      // 激活即重建同一 seed 的时刻表——每次进入暴雨峰值段序列一致。
      state.active = true;
      state.elapsed = 0;
      state.triggeredStrikes = 0;
      state.schedule = buildStrikeSchedule(seededRandom(LIGHTNING_SEED));
    } else if (!active) {
      state.active = false;
    }
    if (!state.active) {
      lightningFlash.value = 0;
      if (state.overlayActive) {
        document.documentElement.style.setProperty("--lightning-flash", "0");
        state.overlayActive = false;
      }
      return;
    }
    if (farm.photoFrozen) return;
    state.elapsed += delta;

    for (let index = state.triggeredStrikes; index < state.schedule.length; index += 1) {
      const strike = state.schedule[index]!;
      if (strike.at > state.elapsed) break;
      audioEngine.thunder(strike.thunderDelay);
      state.triggeredStrikes = index + 1;
    }

    const multiplier = tier === "low" ? 0.3 : 1;
    lightningFlash.value = flashValueAt(state.elapsed, state.schedule) * multiplier;

    if (tier === "low") {
      const overlay = lightningFlash.value * 0.16;
      if (overlay > 0.002 || state.overlayActive) {
        document.documentElement.style.setProperty("--lightning-flash", overlay.toFixed(3));
        state.overlayActive = overlay > 0.002;
      }
    }
  });

  return null;
}
