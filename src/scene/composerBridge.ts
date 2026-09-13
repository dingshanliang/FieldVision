import type { EffectComposer } from "postprocessing";

/**
 * Live post-processing composer, registered by <ScenePostProcessing> while the
 * med/high-tier chain is mounted and nulled on unmount.
 *
 * Kept as a module-level mutable singleton instead of store state on purpose
 * (same trade-off as dronePosition.ts): <PhotoModeBridge> needs the composer
 * instance on the rare capture tick only, and a ref-shaped bridge avoids
 * pushing a non-serialisable object through the Zustand store.
 */
export const sceneComposer: { current: EffectComposer | null } = { current: null };
