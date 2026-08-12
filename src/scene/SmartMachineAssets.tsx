import { Html, useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Mesh } from "three";
import {
  SMART_MACHINE_ASSETS,
  smartMachinesForChapter,
  type SmartMachineAsset,
} from "../data/smartMachineAssets";
import { useFarmStore } from "../state/useFarmStore";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

function SmartMachine({ asset }: { asset: SmartMachineAsset }) {
  const { scene } = useGLTF(asset.url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  return (
    <group position={asset.position} rotation={[0, asset.rotationY, 0]}>
      <primitive object={model} />
      <Html position={[0, asset.labelHeight, 0]} center distanceFactor={22} zIndexRange={[24, 4]}>
        <div className="facility-tag"><i className="is-online" />{asset.label} · {asset.taskLabel}</div>
      </Html>
    </group>
  );
}

/** 每个日常作业章节只挂载一台任务主角，避免把农场做成设备展厅。 */
export function SmartMachineAssets() {
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const assets = smartMachinesForChapter(chapter);

  return (
    <group>
      {assets.map((asset) => (
        <SceneErrorBoundary key={asset.id} name={asset.label}>
          <SmartMachine asset={asset} />
        </SceneErrorBoundary>
      ))}
    </group>
  );
}

for (const asset of SMART_MACHINE_ASSETS) useGLTF.preload(asset.url);
