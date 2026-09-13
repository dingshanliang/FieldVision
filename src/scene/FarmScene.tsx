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
import { Rain } from "./Rain";
import { PhotoModeBridge } from "./PhotoModeBridge";
import { Terrain } from "./Terrain";
import { GroundDetails } from "./GroundDetails";
import { HeroAssets } from "./HeroAssets";
import { SmartFarmInfrastructure } from "./SmartFarmInfrastructure";
import { SmartMachineAssets } from "./SmartMachineAssets";
import { WorldLod } from "./WorldLod";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { PerfProbe } from "./PerfInstrumentation";
import { perfEnabled } from "./perfStats";
import { QaSceneProbe } from "./QaSceneProbe";
import { qaSceneProbeEnabled } from "./qaSceneMetrics";

const ScenePostProcessing = lazy(() =>
  import("./ScenePostProcessing").then(({ ScenePostProcessing: component }) => ({ default: component })),
);

export function FarmScene() {
  const tier = usePerformanceTier();
  const clearFieldSelection = useFarmStore((state) => state.clearFieldSelection);
  const perf = perfEnabled();
  const qaProbe = qaSceneProbeEnabled();
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
      <Rain />
      <group onPointerMissed={clearFieldSelection}>
        <Terrain />
        <GroundDetails />
        <WorldLod />
        <FarmRoads />
        <Farmland />
        <IrrigationNetwork />
        <IrrigationTelemetry />
        <Facilities />
        <SmartFarmInfrastructure />
        <SmartMachineAssets />
        <HeroAssets />
        <SafeDrone />
        <EvidenceMap />
        <SpatialEvidence />
      </group>
      <CameraDirector />
      <PhotoModeBridge />
      {perf && <PerfProbe />}
      {qaProbe && <QaSceneProbe />}
      {tier !== "low" && postProcessingReady ? (
        <Suspense fallback={null}>
          <ScenePostProcessing />
        </Suspense>
      ) : null}
    </>
  );
}
