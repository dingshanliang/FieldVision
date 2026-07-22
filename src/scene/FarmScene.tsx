import { EffectComposer, Bloom, DepthOfField, Vignette } from "@react-three/postprocessing";
import { useFarmStore } from "../state/useFarmStore";
import { Atmosphere } from "./Atmosphere";
import { CameraDirector } from "./CameraDirector";
import { Drone } from "./Drone";
import { Facilities } from "./Facilities";
import { Farmland } from "./Farmland";
import { FarmRoads } from "./FarmRoads";
import { IrrigationNetwork } from "./IrrigationNetwork";
import { RiskOverlay } from "./RiskOverlay";
import { Terrain } from "./Terrain";
import { GroundDetails } from "./GroundDetails";
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
  const selectField = useFarmStore((state) => state.selectField);
  const setViewMode = useFarmStore((state) => state.setViewMode);
  const viewMode = useFarmStore((state) => state.viewMode);
  const demoStep = useFarmStore((state) => state.demoStep);
  const dof = dofPreset(viewMode, demoStep);
  return (
    <>
      <Atmosphere />
      <group onPointerMissed={() => { selectField(null); setViewMode("overview"); }}>
        <Terrain />
        <GroundDetails />
        <FarmRoads />
        <Farmland />
        <IrrigationNetwork />
        <Facilities />
        <Drone />
        <RiskOverlay />
      </group>
      <CameraDirector />
      {tier !== "low" && (
        // DepthOfField adds and removes a depth-aware pass as the demo changes
        // shots. Multisampled composer targets cannot safely blit that changing
        // depth/stencil attachment in Chrome/WebGL, which flooded the render
        // loop with GL_INVALID_OPERATION errors after the irrigation cut.
        // Canvas DPR + native antialiasing still provide edge smoothing.
        <EffectComposer multisampling={0} enableNormalPass={false}>
          {[
            ...(dof
              ? [<DepthOfField key="dof" worldFocusDistance={dof.focus} worldFocusRange={dof.range} focalLength={0.026} bokehScale={1.55} />]
              : []),
            <Bloom key="bloom" intensity={visualConfig.bloomIntensity} luminanceThreshold={visualConfig.bloomThreshold} mipmapBlur />,
            <Vignette key="vignette" eskil={false} offset={0.28} darkness={0.22} />,
          ]}
        </EffectComposer>
      )}
    </>
  );
}
