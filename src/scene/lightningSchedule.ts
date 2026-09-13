/**
 * 闪电时刻表与包络（fv-weather 电影化）——纯函数，与组件分离便于测试与
 * fast-refresh。包络是 lerp 之后的加性通道（dayNight.lightningFlash 消费）：
 * 40ms 攻击 + τ≈110ms 指数衰减（4% 以下归零，整脉冲 <400ms），30% 双闪
 * （+180ms、0.7 幅度）。全部 seeded，qaRun 三轮重放一致。
 */

export const LIGHTNING_SEED = 9021;
const ATTACK_SECONDS = 0.04;
const DECAY_TAU_SECONDS = 0.11;
const SECOND_STRIKE_OFFSET = 0.18;

export interface LightningStrike {
  /** 相对激活起点的秒数。 */
  at: number;
  double: boolean;
  /** 雷声相对闪电的延迟（秒），同 seed 派生。 */
  thunderDelay: number;
}

/** seeded 时刻表（首个雷 ~2-4s，间隔 5-9s，30% 双闪）。 */
export function buildStrikeSchedule(random: () => number, count = 12): LightningStrike[] {
  const strikes: LightningStrike[] = [];
  let at = 2.2 + random() * 2;
  for (let index = 0; index < count; index += 1) {
    strikes.push({ at, double: random() < 0.3, thunderDelay: 0.6 + random() * 1.0 });
    at += 5 + random() * 4;
  }
  return strikes;
}

function strikeEnvelope(elapsedSinceStrike: number, amplitude: number): number {
  if (elapsedSinceStrike < 0) return 0;
  if (elapsedSinceStrike < ATTACK_SECONDS) return amplitude * (elapsedSinceStrike / ATTACK_SECONDS);
  const decay = Math.exp(-(elapsedSinceStrike - ATTACK_SECONDS) / DECAY_TAU_SECONDS);
  return decay < 0.04 ? 0 : amplitude * decay;
}

/** 给定时刻的合成包络（多脉冲取 max，不叠加糊成一片）。 */
export function flashValueAt(elapsed: number, schedule: readonly LightningStrike[]): number {
  let flash = 0;
  for (const strike of schedule) {
    if (strike.at > elapsed) break;
    flash = Math.max(flash, strikeEnvelope(elapsed - strike.at, 1));
    if (strike.double) flash = Math.max(flash, strikeEnvelope(elapsed - strike.at - SECOND_STRIKE_OFFSET, 0.7));
  }
  return flash;
}
