import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, GodRays, N8AO, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type EffectComposer as EffectComposerImpl } from "postprocessing";
import { Vector2 } from "three";
import { useEffect, useRef } from "react";
import { visualConfig } from "../config/visual";
import { resolveLightingTargets } from "../config/dayNight";
import { useFarmStore } from "../state/useFarmStore";
import { povCutEngaged } from "./dronePov";
import { sceneComposer } from "./composerBridge";
import { sunDiscMesh } from "./sunDisc";

/** Cinematic shallow focus for the close-up beats; wide shots stay fully sharp. */
function dofPreset(viewMode: string, demoStep: string) {
  if (viewMode === "field-ground" || demoStep === "inspect-risk") return { focus: 62, range: 95 };
  if (demoStep === "drone-scan") return { focus: 76, range: 110 };
  if (demoStep === "irrigation") return { focus: 48, range: 80 };
  if (demoStep === "recovered") return { focus: 70, range: 100 };
  return null;
}

/** QA escape hatch for a same-browser AO A/B without changing production defaults. */
function aoEnabled(): boolean {
  return typeof window === "undefined" || new URLSearchParams(window.location.search).get("ao") !== "0";
}

const chromaticOffset = new Vector2(0.00065, 0.00035);

/**
 * Heavy optical pipeline. FarmScene loads this module after the browser's first
 * paint, keeping postprocessing + N8AO out of the entry chunk while preserving
 * the complete medium/high-tier visual stack.
 */
export function ScenePostProcessing() {
  const composerRef = useRef<EffectComposerImpl>(null);
  // Publish the live composer so PhotoModeBridge can render a capture through
  // the full post chain (P0 export fix). Unmount clears it unless a newer
  // instance already took the slot (tier switch remounts).
  useEffect(() => {
    const composer = composerRef.current;
    sceneComposer.current = composer;
    return () => {
      if (sceneComposer.current === composer) sceneComposer.current = null;
    };
  }, []);
  const viewMode = useFarmStore((state) => state.viewMode);
  const demoStep = useFarmStore((state) => state.demoStep);
  const scanProgress = useFarmStore((state) => state.scanProgress);
  // fv-daynight/fv-weather：夜幕与暴雨让状态灯、水面高光更"发光"。
  const dayPhase = useFarmStore((state) => state.dayPhase);
  const stormProgress = useFarmStore((state) => state.stormProgress);
  const bloomIntensity = visualConfig.bloomIntensity + resolveLightingTargets(dayPhase, stormProgress).bloomBoost;
  // Gimbal first-person cut: FPV 窗口内关掉 DOF——无人机回传是深焦画面，
  // 沿用第三人称跟拍的 focus 76 会把 20m 外的地面糊掉。
  const dof = demoStep === "drone-scan" && povCutEngaged(scanProgress) ? null : dofPreset(viewMode, demoStep);
  const ao = aoEnabled();
  // fv-qii：清晨/黄昏低角度光柱（GodRaysEffect 自带于 postprocessing，零新
  // 依赖）。太阳出画时效果自然衰减为无操作；与 SunDiscMesh 的可见性同条件。
  const godRaysActive = (dayPhase === "dawn" || dayPhase === "dusk") && stormProgress < 0.3;
  const effects = [
    ...(ao
      ? [
          <N8AO
            key="ao"
            aoRadius={2.2}
            distanceFalloff={0.6}
            intensity={1.15}
            color="#0b100d"
            quality="performance"
            halfRes
            depthAwareUpsampling
          />,
        ]
      : []),
    ...(dof
      ? [
          <DepthOfField
            key="dof"
            worldFocusDistance={dof.focus}
            worldFocusRange={dof.range}
            focalLength={0.026}
            bokehScale={1.55}
          />,
        ]
      : []),
    <Bloom
      key="bloom"
      intensity={bloomIntensity}
      luminanceThreshold={visualConfig.bloomThreshold}
      mipmapBlur
    />,
    ...(godRaysActive
      ? [
          <GodRays
            key="godrays"
            sun={sunDiscMesh}
            samples={48}
            density={0.94}
            decay={0.92}
            weight={0.45}
            exposure={0.85}
            blur
          />,
        ]
      : []),
    <ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />,
    <SMAA key="smaa" />,
    <ChromaticAberration
      key="chromatic-aberration"
      blendFunction={BlendFunction.NORMAL}
      offset={chromaticOffset}
      radialModulation
      modulationOffset={0.22}
    />,
    <Noise key="grain" opacity={0.045} blendFunction={BlendFunction.SOFT_LIGHT} />,
    <Vignette key="vignette" eskil={false} offset={0.32} darkness={0.26} />,
  ];

  // N8AO owns its depth/normal work internally, so the composer's shared
  // NormalPass stays disabled. DepthOfField is mounted per beat; multisampling
  // stays 0 to avoid Chrome depth/stencil blit errors, with SMAA restoring AA.
  return (
    <EffectComposer ref={composerRef} multisampling={0} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  );
}
