import { Vector3 } from "three";

/**
 * Live drone world position, written by <Drone> every frame and read by
 * <CameraDirector> for the drone-scan follow shot.
 *
 * Kept as a module-level mutable singleton instead of a store value on
 * purpose: the drone updates it every frame, and pushing that through the
 * Zustand store would re-render every subscriber each frame. The camera just
 * polls it in its own useFrame — no React state involved.
 */
export const droneWorldPosition = new Vector3(-8, 24, -43);
