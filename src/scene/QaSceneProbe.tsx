import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Mesh } from "three";
import { writeQaSceneMetrics } from "./qaSceneMetrics";

/** Production-only QA probe: samples real scene/render counts without affecting product state. */
export function QaSceneProbe() {
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.25) return;
    elapsed.current = 0;
    let objects = 0;
    let meshes = 0;
    scene.traverse((object) => {
      objects += 1;
      if (object instanceof Mesh) meshes += 1;
    });
    writeQaSceneMetrics({
      objects,
      meshes,
      geometries: gl.info.memory.geometries,
    });
  });
  return null;
}
