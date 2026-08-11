import { EffectComposer, Bloom, DepthOfField, Vignette, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useFarmStore } from "../state/useFarmStore";
import { Atmosphere } from "./Atmosphere";
import { CameraDirector } from "./CameraDirector";
import { SafeDrone } from "./SafeDrone";
import { Facilities } from "./Facilities";
import { Farmland } from "./Farmland";
import { FarmRoads } from "./FarmRoads";
import { IrrigationNetwork } from "./IrrigationNetwork";
import { IrrigationTelemetry } from "./IrrigationTelemetry";
import { EvidenceMap } from "./EvidenceMap";
import { SpatialEvidence } from "./SpatialEvidence";
import { Terrain } from "./Terrain";
import { GroundDetails } from "./GroundDetails";
import { HeroAssets } from "./HeroAssets";
import { WorldLod } from "./WorldLod";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { visualConfig } from "../config/visual";

/** Cinematic shallow focus for the close-up beats; wide shots stay fully sharp. */
function dofPreset(viewMode: string, demoStep: string) {
  if (viewMode === "field-ground" || demoStep === "inspect-risk") return { focus: 62, range: 95 };
  if (demoStep === "drone-scan") return { focus: 76, range: 110 };
  return null;
}

export function FarmScene() {
  const tier = usePerformanceTier();
  const applyDemoState = useFarmStore((state) => state.applyDemoState);
  const viewMode = useFarmStore((state) => state.viewMode);
  const demoStep = useFarmStore((state) => state.demoStep);
  const dof = dofPreset(viewMode, demoStep);
  return (
    <>
      <Atmosphere />
      <group onPointerMissed={() => applyDemoState("overview")}>
        <Terrain />
        <GroundDetails />
        <WorldLod />
        <FarmRoads />
        <Farmland />
        <IrrigationNetwork />
        <IrrigationTelemetry />
        <Facilities />
        <HeroAssets />
        <SafeDrone />
        <EvidenceMap />
        <SpatialEvidence />
      </group>
      <CameraDirector />
      {tier !== "low" && (
        // DepthOfField is mounted/unmounted per beat. Multisampled composer
        // targets cannot safely blit that swapping depth/stencil attachment in
        // Chrome/WebGL (GL_INVALID_OPERATION), so multisampling stays 0. SMAA
        // below restores edge AA without needing an MSAA target — Canvas
        // antialias:true does NOT reach the composer's intermediate target, so
        // without SMAA every leaf/wire/ridgeline edge would alias.
        <EffectComposer multisampling={0} enableNormalPass={false}>
          {[
            ...(dof
              ? [<DepthOfField key="dof" worldFocusDistance={dof.focus} worldFocusRange={dof.range} focalLength={0.026} bokehScale={1.55} />]
              : []),
            <Bloom key="bloom" intensity={visualConfig.bloomIntensity} luminanceThreshold={visualConfig.bloomThreshold} mipmapBlur />,
            // ToneMapping owns ACES: renderer.toneMapping is NoToneMapping so the
            // scene renders linear into the composer, then this pass maps HDR→LDR
            // exactly once (otherwise ACES is bypassed by the composer and the
            // frame goes to screen linear/washed-out).
            <ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />,
            <SMAA key="smaa" />,
            <Vignette key="vignette" eskil={false} offset={0.32} darkness={0.26} />,
          ]}
        </EffectComposer>
      )}
    </>
  );
}
