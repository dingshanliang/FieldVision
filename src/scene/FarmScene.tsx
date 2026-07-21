import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useFarmStore } from "../state/useFarmStore";
import { Atmosphere } from "./Atmosphere";
import { CameraDirector } from "./CameraDirector";
import { Drone } from "./Drone";
import { Facilities } from "./Facilities";
import { Farmland } from "./Farmland";
import { IrrigationNetwork } from "./IrrigationNetwork";
import { RiskOverlay } from "./RiskOverlay";
import { Terrain } from "./Terrain";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { visualConfig } from "../config/visual";

export function FarmScene() {
  const tier = usePerformanceTier();
  const selectField = useFarmStore((state) => state.selectField);
  const setViewMode = useFarmStore((state) => state.setViewMode);
  return (
    <>
      <Atmosphere />
      <group onPointerMissed={() => { selectField(null); setViewMode("overview"); }}>
        <Terrain />
        <Farmland />
        <IrrigationNetwork />
        <Facilities />
        <Drone />
        <RiskOverlay />
      </group>
      <CameraDirector />
      {tier !== "low" && (
        <EffectComposer multisampling={tier === "high" ? 4 : 0} enableNormalPass={false}>
          <Bloom intensity={visualConfig.bloomIntensity} luminanceThreshold={visualConfig.bloomThreshold} mipmapBlur />
          <Vignette eskil={false} offset={0.22} darkness={0.34} />
        </EffectComposer>
      )}
    </>
  );
}
