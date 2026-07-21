import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { ACESFilmicToneMapping, PCFSoftShadowMap } from "three";
import { FarmScene } from "./FarmScene";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

export function FarmCanvas() {
  const tier = usePerformanceTier();
  const dpr: [number, number] = tier === "high" ? [1, 1.75] : tier === "medium" ? [1, 1.4] : [1, 1];
  return (
    <Canvas
      className="farm-canvas"
      shadows={{ type: PCFSoftShadowMap }}
      dpr={dpr}
      camera={{ position: [286, 196, 320], fov: 42, near: 0.1, far: 1600 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.04 }}
    >
      <Suspense fallback={null}><FarmScene /></Suspense>
    </Canvas>
  );
}
