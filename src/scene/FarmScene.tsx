import { lazy, Suspense, useEffect, useState } from "react";
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
import { SmartFarmInfrastructure } from "./SmartFarmInfrastructure";
import { WorldLod } from "./WorldLod";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { PerfProbe } from "./PerfInstrumentation";
import { perfEnabled } from "./perfStats";

const ScenePostProcessing = lazy(() =>
  import("./ScenePostProcessing").then(({ ScenePostProcessing: component }) => ({ default: component })),
);

export function FarmScene() {
  const tier = usePerformanceTier();
  const applyDemoState = useFarmStore((state) => state.applyDemoState);
  const perf = perfEnabled();
  const [postProcessingReady, setPostProcessingReady] = useState(false);

  useEffect(() => {
    if (tier === "low") return;
    // Effects run after paint; one additional animation frame gives the entry
    // scene ownership of first paint before requesting the heavy optical chunk.
    const frame = window.requestAnimationFrame(() => setPostProcessingReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [tier]);

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
        <SmartFarmInfrastructure />
        <HeroAssets />
        <SafeDrone />
        <EvidenceMap />
        <SpatialEvidence />
      </group>
      <CameraDirector />
      {perf && <PerfProbe />}
      {tier !== "low" && postProcessingReady ? (
        <Suspense fallback={null}>
          <ScenePostProcessing />
        </Suspense>
      ) : null}
    </>
  );
}
