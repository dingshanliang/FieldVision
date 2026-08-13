import { Vector3 } from "three";

export type DroneFlightPhase =
  | "ready"
  | "self-check"
  | "taking-off"
  | "airborne"
  | "returning"
  | "landing"
  | "charging";

export const SMART_YARD_POSITION = [-122, 1.4, 112] as const;
export const DRONE_DOCK_LOCAL_POSITION = [19, 0.45, 6] as const;
export const SMART_YARD_ROTATION_Y = -0.35;

/** Shared world-space center of the physical dock pad. */
export const DRONE_DOCK_WORLD_POSITION = new Vector3(...DRONE_DOCK_LOCAL_POSITION)
  .applyAxisAngle(new Vector3(0, 1, 0), SMART_YARD_ROTATION_Y)
  .add(new Vector3(...SMART_YARD_POSITION))
  .setY(3.35);

/** Live scene telemetry; mutated in the render loop to avoid store churn. */
export const droneFlightTelemetry: {
  position: Vector3;
  distanceToDock: number;
  phase: DroneFlightPhase;
} = {
  position: DRONE_DOCK_WORLD_POSITION.clone(),
  distanceToDock: 0,
  phase: "ready",
};
