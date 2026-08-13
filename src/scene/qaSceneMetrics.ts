export interface QaSceneMetrics {
  objects: number;
  meshes: number;
  geometries: number;
}

let latestMetrics: QaSceneMetrics = { objects: 0, meshes: 0, geometries: 0 };

export function writeQaSceneMetrics(metrics: QaSceneMetrics) {
  latestMetrics = metrics;
}

export function readQaSceneMetrics(): QaSceneMetrics {
  return { ...latestMetrics };
}

export function qaSceneProbeEnabled(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("qaRun");
}
