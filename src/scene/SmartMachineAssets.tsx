import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, MathUtils, Mesh } from "three";
import {
  SMART_MACHINE_ASSETS,
  smartMachinesForChapter,
  type SmartMachineAsset,
  type SmartMachineId,
} from "../data/smartMachineAssets";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { useFarmStore } from "../state/useFarmStore";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import {
  createMotionSample,
  evaluateMachineMotion,
  selectActiveMachineIds,
} from "./autonomousMachineMotion";

const TASK_BY_MACHINE: Record<SmartMachineId, string> = {
  "tractor-seeder": "SOW-B03",
  "inspection-robot": "PATROL-A03",
  "maintenance-vehicle": "MAINT-EAST",
};

const CHAPTER_DURATION_SECONDS = {
  "autonomous-operations": 12,
  "coordinated-patrol": 10,
  "return-overview": 8,
} as const;

const WHEEL_NAMES: Record<SmartMachineId, readonly string[]> = {
  "tractor-seeder": ["WheelFrontLeft", "WheelFrontRight", "WheelRearLeft", "WheelRearRight"],
  "inspection-robot": ["TrackLeft", "TrackRight"],
  "maintenance-vehicle": ["MaintenanceWheel_-0.78_-0.72", "MaintenanceWheel_-0.78_0.72", "MaintenanceWheel_0.78_-0.72", "MaintenanceWheel_0.78_0.72"],
};

function manualProgress(chapter: keyof typeof CHAPTER_DURATION_SECONDS) {
  if (chapter === "coordinated-patrol") return 0.82;
  if (chapter === "return-overview") return 1;
  return 0.72;
}

function SmartMachine({ asset }: { asset: SmartMachineAsset }) {
  const group = useRef<Group>(null);
  const progress = useRef(0);
  const previousChapter = useRef(useFarmStore.getState().smartFarmChapter);
  const sample = useRef(createMotionSample());
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const demoPlaying = useFarmStore((state) => state.demoPlaying);
  const paused = useFarmStore((state) => state.paused);
  const task = useFarmStore((state) => state.tasks[TASK_BY_MACHINE[asset.id]]);
  const { scene } = useGLTF(asset.url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  useFrame(({ clock }, delta) => {
    const target = group.current;
    if (!target) return;
    const motionChapter = chapter === "autonomous-operations" || chapter === "coordinated-patrol" || chapter === "return-overview"
      ? chapter
      : "daily-plan";
    if (previousChapter.current !== chapter) {
      progress.current = demoPlaying && motionChapter !== "daily-plan" ? 0 : motionChapter === "daily-plan" ? 0 : manualProgress(motionChapter);
      previousChapter.current = chapter;
    }
    if (demoPlaying && !paused && motionChapter !== "daily-plan") {
      progress.current = Math.min(1, progress.current + delta / CHAPTER_DURATION_SECONDS[motionChapter]);
    } else if (!demoPlaying && motionChapter !== "daily-plan") {
      progress.current = manualProgress(motionChapter);
    }

    const motion = evaluateMachineMotion(asset.id, motionChapter, progress.current, sample.current);
    target.position.set(motion.position[0], motion.position[1], motion.position[2]);
    target.rotation.y = motionChapter === "daily-plan" ? asset.rotationY : motion.heading + Math.PI;
    const wheelSpeed = motion.speedScale * delta * 7;
    for (const name of WHEEL_NAMES[asset.id]) {
      const wheel = model.getObjectByName(name);
      if (wheel) wheel.rotation.x += wheelSpeed;
    }
    const seederLift = model.getObjectByName("SeederLift");
    const gimbal = model.getObjectByName("SensorGimbal");
    const mowerBlade = model.getObjectByName("MowerBlade");
    if (seederLift) seederLift.rotation.x = MathUtils.lerp(seederLift.rotation.x, motion.implementDown ? 0 : -0.28, Math.min(1, delta * 5));
    if (gimbal) gimbal.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.62;
    if (mowerBlade && motion.speedScale > 0) mowerBlade.rotation.z += delta * 18;
  });

  const exception = task?.exception;
  const status = exception
    ? `${exception.message} · 请求模拟人工接管`
    : chapter === "return-overview"
      ? "任务完成 · 已回库补能"
      : `${asset.taskLabel} · ${Math.round((task?.progress ?? 0) * 100)}%`;

  return (
    <group ref={group} position={asset.position} rotation={[0, asset.rotationY, 0]}>
      <primitive object={model} />
      <Html position={[0, asset.labelHeight, 0]} center distanceFactor={22} zIndexRange={[24, 4]}>
        <div className={exception ? "task-corridor-tag" : "facility-tag"}>
          <i className={exception ? undefined : "is-online"} />{asset.label} · {status}
        </div>
      </Html>
    </group>
  );
}

export function SmartMachineAssets() {
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const tier = usePerformanceTier();
  const ids = selectActiveMachineIds(chapter, tier);
  const assets = ids.length > 0
    ? ids.map((id) => SMART_MACHINE_ASSETS.find((asset) => asset.id === id)).filter((asset): asset is SmartMachineAsset => Boolean(asset))
    : smartMachinesForChapter(chapter);

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
