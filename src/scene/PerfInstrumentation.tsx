/**
 * Lightweight perf instrumentation, gated by the `?perf=1` URL flag so it is
 * inert (and mount-skipped) in normal use. Solves the two things
 * dev-baseline-perf-budget.md lists as unmeasured: live fps + renderer.info
 * (draw calls / triangles / textures / geometries / programs).
 *
 * - <PerfProbe/> mounts inside <Canvas>; it samples frame times and reads
 *   gl.info each frame into the perfStats singleton.
 * - <PerfHud/> mounts in the DOM (App); it polls the singleton on an interval
 *   and renders a fixed overlay.
 *
 * Mount sites gate on perfEnabled() so the probe's useFrame never runs when the
 * flag is off (zero cost for normal playback / production).
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { WebGLInfo } from "three";
import { computeFpsStats, perfEnabled, readPerfSample, type PerfSample } from "./perfStats";

/** Canvas-side sampler. Mount only when perfEnabled() so the loop is skipped otherwise. */
export function PerfProbe() {
  const gl = useThree((state) => state.gl);
  const frameTimes = useRef<number[]>([]);
  const last = useRef(0);
  const acc = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (last.current === 0) last.current = now;
    const dt = now - last.current;
    last.current = now;
    const times = frameTimes.current;
    times.push(dt);
    if (times.length > 120) times.shift();
    const s = readPerfSample();
    // Heartbeat every frame, before the 500ms gate — frames>0 in the HUD proves
    // the R3F loop is driving the probe (and lets the HUD show life immediately).
    s.frames += 1;
    if (typeof window !== "undefined") {
      (window as unknown as { __perf?: PerfSample }).__perf = s;
    }
    acc.current += dt;
    if (acc.current < 500) return;
    acc.current = 0;
    const stats = computeFpsStats(times);
    const info = gl.info as WebGLInfo;
    s.fps = stats.fps;
    s.p10 = stats.p10;
    s.drawCalls = info.render.calls;
    s.triangles = info.render.triangles;
    s.textures = info.memory.textures;
    s.geometries = info.memory.geometries;
    s.programs = info.programs?.length ?? 0;
  });

  return null;
}

/** DOM overlay. Renders nothing when the flag is off. */
export function PerfHud() {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((x) => x + 1), 500);
    return () => window.clearInterval(id);
  }, []);
  if (!perfEnabled()) return null;
  const s = readPerfSample();
  const row = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, minWidth: 150 }}>
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
  return (
    <div
      aria-hidden
      className="perf-hud"
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 50,
        padding: "8px 10px",
        background: "rgba(8,16,14,0.72)",
        color: "#cfe8dd",
        fontFamily: "ui-monospace, SFmono-Regular, Menlo, monospace",
        fontSize: 11,
        lineHeight: 1.5,
        borderRadius: 6,
        pointerEvents: "none",
        border: "1px solid rgba(150,214,196,0.25)",
      }}
    >
      {row("frames", s.frames.toString())}
      {row("fps", s.fps.toFixed(1))}
      {row("p10 fps", s.p10.toFixed(1))}
      {row("draw", s.drawCalls.toString())}
      {row("tris", s.triangles.toLocaleString())}
      {row("tex", s.textures.toString())}
      {row("geo", s.geometries.toString())}
      {row("prog", s.programs.toString())}
    </div>
  );
}
