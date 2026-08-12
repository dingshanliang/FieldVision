import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, PCFShadowMap } from "three";
import { FarmScene } from "./FarmScene";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

export function FarmCanvas() {
  const tier = usePerformanceTier();
  const dpr: [number, number] = tier === "high" ? [1, 1.75] : tier === "medium" ? [1, 1.4] : [1, 1];
  // Tone-mapping contract (see also the <ToneMapping> pass in FarmScene.tsx):
  // - ACESFilmicToneMapping is the LOW-tier baseline. On low tier the
  //   EffectComposer is unmounted, so the renderer itself must map HDR→LDR.
  // - On med/high the EffectComposer is mounted; @react-three/postprocessing
  //   forces renderer.toneMapping = NoToneMapping for the composer's lifetime
  //   and RESTORES this ACESFilmic value on unmount — so the <ToneMapping>
  //   effect pass owns ACES exactly once, and dropping to low tier at runtime
  //   still gets renderer ACES. Do not change either side independently.
  // - toneMappingExposure is read ONLY by the renderer-side (low-tier) path
  //   (three skips it while toneMapping is NoToneMapping on med/high), so it
  //   MUST stay 1 to match the composer pass's fixed ACES curve; any other
  //   value re-introduces a cross-tier exposure split.
  return (
    <Canvas
      className="farm-canvas"
      shadows={tier !== "low" ? { type: PCFShadowMap } : false}
      dpr={dpr}
      camera={{ position: [248, 148, 276], fov: 45, near: 0.1, far: 1600 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }}
    >
      <SceneErrorBoundary name="FarmScene"><FarmScene /></SceneErrorBoundary>
    </Canvas>
  );
}
