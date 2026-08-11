/**
 * Perf singleton + helpers, kept separate from the React components so the
 * component file only exports components (react-refresh) and so the probe can
 * write here each frame while the HUD polls. See PerfInstrumentation.tsx.
 */
export interface PerfSample {
  /** Total frames the probe has sampled since mount (heartbeat; >0 ⇒ loop is running). */
  frames: number;
  fps: number;
  /** 10th-percentile fps (you're above this 90% of the time). */
  p10: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  programs: number;
}

const sample: PerfSample = { frames: 0, fps: 0, p10: 0, drawCalls: 0, triangles: 0, textures: 0, geometries: 0, programs: 0 };

export function readPerfSample(): PerfSample {
  return sample;
}

/**
 * Pure fps/p10 computation over a rolling window of per-frame deltas (ms).
 * Extracted from the probe so the math is unit-testable without a Canvas.
 * - fps = 1000 * N / sum(deltas)
 * - p10 fps uses the 90th-percentile frame time (slowest 10%): 1000 / slowTail.
 * Returns 0/0 for empty or non-progressing windows (avoids div-by-zero / Infinity).
 */
export function computeFpsStats(times: number[]): { fps: number; p10: number } {
  if (times.length === 0) return { fps: 0, p10: 0 };
  let sum = 0;
  for (const t of times) sum += t;
  if (sum <= 0) return { fps: 0, p10: 0 };
  const sorted = [...times].sort((a, b) => a - b);
  const slowTail = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] || sum / times.length;
  return {
    fps: (1000 * times.length) / sum,
    p10: slowTail > 0 ? 1000 / slowTail : 0,
  };
}

/** Inert unless `?perf=1` is present. Mount-sites gate on this so the probe loop is skipped otherwise. */
export function perfEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("perf");
}
