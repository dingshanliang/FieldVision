import { CameraControls } from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Raycaster, Vector2 } from "three";
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
    const camera = controls.current;
    if (!camera || introRan.current || introComplete) return;
    introRan.current = true;
    camera.smoothTime = 1.25;
    void camera.setLookAt(236, 164, 266, -18, 4, 4, false).then(async () => {
      await camera.setLookAt(...overview.position, ...overview.target, true);
      setIntroComplete(true);
      setDemoStep("overview");
    });
  }, [introComplete, setDemoStep, setIntroComplete]);

  useEffect(() => {
    const camera = controls.current;
    if (!camera || !introComplete) return;
    camera.smoothTime = 0.72;
    if (viewMode === "overview" || !selectedFieldId) {
      void camera.setLookAt(...overview.position, ...overview.target, true);
      return;
    }
    const field = fieldById[selectedFieldId];
    if (!field) return;
    if (demoStep === "drone-scan") {
      void camera.setLookAt(66, 52, -20, 23, 4, -66, true);
      return;
    }
    const preset = viewMode === "field-ground" || demoStep === "inspect-risk"
      ? field.cameraPresets.ground
      : viewMode === "irrigation" && field.cameraPresets.irrigationInlet
        ? field.cameraPresets.irrigationInlet
        : field.cameraPresets.aerial;
    void camera.setLookAt(...preset.position, ...preset.target, true);
  }, [demoStep, introComplete, selectedFieldId, viewMode]);

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
