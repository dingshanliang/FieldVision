import { CameraControls } from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { Raycaster, Vector2, Vector3 } from "three";
import { fieldById } from "../data/fields";
import { useFarmStore } from "../state/useFarmStore";

const overview = { position: [268, 82, 304] as const, target: [-26, 30, -40] as const };

export function CameraDirector() {
  const controls = useRef<CameraControlsImpl>(null);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const selectedFieldId = useFarmStore((state) => state.selectedFieldId);
  const viewMode = useFarmStore((state) => state.viewMode);
  const demoStep = useFarmStore((state) => state.demoStep);
  const introComplete = useFarmStore((state) => state.introComplete);
  const setIntroComplete = useFarmStore((state) => state.setIntroComplete);
  const setDemoStep = useFarmStore((state) => state.setDemoStep);
  const introRan = useRef(false);

  // Cinematic breathing: remember the shot we're flying to, then drift around
  // it with slow sine offsets once arrived. Suspended during transitions and
  // for a few seconds after any user interaction; the user's framing becomes
  // the new base. Three rules keep this state machine from fighting scripted
  // camera moves:
  //  - Transition completion is detected by DISTANCE to the destination (plus
  //    a wall-clock cap for shots clamped by maxDistance, e.g. the overview),
  //    never by the setLookAt promise, which resolves late on a future rest
  //    event when the transition was interrupted.
  //  - The intro's awaited promise chain carries a generation token; user
  //    interaction or the wall-clock fallback invalidates it, so a late
  //    resolution can no longer stomp demoStep/base mid-demo.
  //  - Breathing amplitude ramps in over ~1.5s so the camera never snaps when
  //    drift (re)activates.
  const basePosition = useRef(new Vector3(...overview.position));
  const baseTarget = useRef(new Vector3(...overview.target));
  const transitioning = useRef(false);
  const transitionStartedAt = useRef(0);
  const introGeneration = useRef(0);
  const userHoldUntil = useRef(0);
  const breathingRampStart = useRef(0);
  const scratchPosition = useRef(new Vector3());

  const TRANSITION_MAX_MS = 4_200;
  const BREATHING_RAMP_MS = 1_500;

  const flyTo = useCallback((position: readonly number[], target: readonly number[], smooth: boolean) => {
    const current = controls.current;
    if (!current) return;
    transitioning.current = true;
    transitionStartedAt.current = performance.now();
    basePosition.current.set(position[0]!, position[1]!, position[2]!);
    baseTarget.current.set(target[0]!, target[1]!, target[2]!);
    void current.setLookAt(position[0]!, position[1]!, position[2]!, target[0]!, target[1]!, target[2]!, smooth);
  }, []);

  useEffect(() => {
    // Dev-only handles so QA screenshot scripts can frame arbitrary close-ups
    // and raycast through a screen point to identify mystery objects.
    if (import.meta.env.DEV && controls.current) {
      const win = window as unknown as {
        __cameraControls?: CameraControlsImpl;
        __pickAt?: (ndcX: number, ndcY: number) => unknown;
      };
      win.__cameraControls = controls.current;
      win.__pickAt = (ndcX, ndcY) => {
        const raycaster = new Raycaster();
        raycaster.setFromCamera(new Vector2(ndcX, ndcY), camera);
        return raycaster
          .intersectObjects(scene.children, true)
          .slice(0, 6)
          .map((hit) => ({
            name: hit.object.name || hit.object.type,
            parent: hit.object.parent?.name || hit.object.parent?.type,
            distance: Math.round(hit.distance),
            point: hit.point.toArray().map((v) => Math.round(v)),
          }));
      };
    }
  });

  useEffect(() => {
    const current = controls.current;
    if (!current) return;
    const onControlStart = () => {
      userHoldUntil.current = performance.now() + 60_000;
      // The user owns the camera now — abandon any in-flight scripted move
      // and invalidate the intro chain so its late promise resolution can
      // never stomp demo state mid-demo.
      transitioning.current = false;
      introGeneration.current += 1;
    };
    const onControlEnd = () => { userHoldUntil.current = performance.now() + 4_000; };
    current.addEventListener("controlstart", onControlStart);
    current.addEventListener("controlend", onControlEnd);
    return () => {
      current.removeEventListener("controlstart", onControlStart);
      current.removeEventListener("controlend", onControlEnd);
    };
  }, []);

  useEffect(() => {
    const current = controls.current;
    if (!current || introRan.current || introComplete) return;
    introRan.current = true;
    // Generation token: the awaited promises below resolve on camera-controls
    // 'rest' events, which janky first-frame shader compilation can delay or
    // skip past the 6s fallback — a late resolution must become a no-op, not
    // reset demoStep/base mid-demo.
    const generation = ++introGeneration.current;
    const isCurrent = () => introGeneration.current === generation && !useFarmStore.getState().introComplete;
    current.smoothTime = 1.25;
    transitioning.current = true;
    transitionStartedAt.current = performance.now();
    void current.setLookAt(236, 164, 266, -18, 4, 4, false).then(async () => {
      if (!isCurrent()) return;
      basePosition.current.set(...overview.position);
      baseTarget.current.set(...overview.target);
      transitionStartedAt.current = performance.now();
      await current.setLookAt(...overview.position, ...overview.target, true).catch(() => undefined);
      if (!isCurrent()) return;
      transitioning.current = false;
      breathingRampStart.current = performance.now();
      setIntroComplete(true);
      setDemoStep("overview");
    });
    // Wall-clock fallback: the rest promise can be skipped when frames are
    // huge (headless / heavy jank) — never leave the app stuck in the intro.
    const fallback = window.setTimeout(() => {
      introGeneration.current += 1;
      if (useFarmStore.getState().introComplete) return;
      transitioning.current = false;
      breathingRampStart.current = performance.now();
      setIntroComplete(true);
      setDemoStep("overview");
    }, 6_000);
    return () => window.clearTimeout(fallback);
  }, [introComplete, setDemoStep, setIntroComplete]);

  useEffect(() => {
    const current = controls.current;
    if (!current || !introComplete) return;
    current.smoothTime = 0.72;
    if (viewMode === "overview" || !selectedFieldId) {
      flyTo(overview.position, overview.target, true);
      return;
    }
    const field = fieldById[selectedFieldId];
    if (!field) return;
    if (demoStep === "drone-scan") {
      flyTo([66, 52, -20], [23, 4, -66], true);
      return;
    }
    const preset = viewMode === "field-ground" || demoStep === "inspect-risk"
      ? field.cameraPresets.ground
      : viewMode === "irrigation" && field.cameraPresets.irrigationInlet
        ? field.cameraPresets.irrigationInlet
        : field.cameraPresets.aerial;
    flyTo(preset.position, preset.target, true);
  }, [demoStep, flyTo, introComplete, selectedFieldId, viewMode]);

  useFrame(({ clock }) => {
    const current = controls.current;
    if (!current) return;
    if (!useFarmStore.getState().introComplete) return;
    // QA screenshot scripts drive the camera directly — never fight them.
    if (new URLSearchParams(window.location.search).has("qa")) return;
    const now = performance.now();
    if (transitioning.current) {
      // Arrival check by distance — immune to stale rest promises and to
      // headless frame steps that skip the rest threshold window. The
      // wall-clock cap covers destinations camera-controls clamps out of
      // reach (the overview shot sits beyond maxDistance), where the
      // distance check can never pass.
      // camera-controls returns the transition END value by default. Read the
      // live value explicitly or every new shot is misclassified as arrived
      // and the following non-smoothed breathing update teleports to the end.
      current.getPosition(scratchPosition.current, false);
      const arrived = scratchPosition.current.distanceTo(basePosition.current) < 0.8
        || now - transitionStartedAt.current > TRANSITION_MAX_MS;
      if (arrived) {
        // Adopt where the camera ACTUALLY came to rest as the drift base —
        // never the requested destination. The overview shot is clamped by
        // maxDistance ~125m short of its preset, so breathing toward the
        // preset would teleport the camera when the drift kicks in.
        transitioning.current = false;
        current.getPosition(basePosition.current, false);
        current.getTarget(baseTarget.current, false);
        breathingRampStart.current = now;
      }
      return;
    }
    if (now < userHoldUntil.current) {
      // Adopt wherever the user left the camera as the new breathing base.
      current.getPosition(basePosition.current, false);
      current.getTarget(baseTarget.current, false);
      breathingRampStart.current = now;
      return;
    }
    // Ease the drift in from zero amplitude so activating breathing never
    // snaps the camera.
    const ramp = Math.min(1, (now - breathingRampStart.current) / BREATHING_RAMP_MS);
    const amplitude = ramp * ramp * (3 - 2 * ramp);
    const time = clock.elapsedTime;
    current.setLookAt(
      basePosition.current.x + (Math.sin(time * 0.36) * 0.45 + Math.sin(time * 0.11 + 2.0) * 0.3) * amplitude,
      basePosition.current.y + Math.sin(time * 0.27 + 1.3) * 0.24 * amplitude,
      basePosition.current.z + Math.cos(time * 0.31 + 0.7) * 0.45 * amplitude,
      baseTarget.current.x + Math.sin(time * 0.21 + 0.4) * 0.3 * amplitude,
      baseTarget.current.y + Math.sin(time * 0.17 + 2.2) * 0.15 * amplitude,
      baseTarget.current.z + Math.cos(time * 0.19 + 1.1) * 0.3 * amplitude,
      false,
    );
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={4}
      maxDistance={330}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2.04}
      dollyToCursor
      truckSpeed={1.8}
    />
  );
}
