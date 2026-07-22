import { Component, type ReactNode, Suspense } from "react";
import { useFarmStore } from "../state/useFarmStore";
import { Drone } from "./Drone";

function FallbackSurveyDrone() {
  const demoStep = useFarmStore((state) => state.demoStep);
  const scanProgress = useFarmStore((state) => state.scanProgress);
  const scanning = demoStep === "drone-scan";
  const position: [number, number, number] = scanning
    ? [-8 + scanProgress * 39, 24, -43 - scanProgress * 38]
    : [24, 34, 111];
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[2.6, 0.65, 1.8]} />
        <meshStandardMaterial color="#34413c" metalness={0.62} roughness={0.4} />
      </mesh>
      {[-1.8, 1.8].flatMap((x) => [-1.4, 1.4].map((z) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh rotation={[0, 0, Math.atan2(z, x)]}>
            <boxGeometry args={[3.6, 0.12, 0.16]} />
            <meshStandardMaterial color="#47534e" metalness={0.5} roughness={0.44} />
          </mesh>
          <mesh position-y={0.18} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.92, 24]} />
            <meshBasicMaterial color="#9ba59f" transparent opacity={0.28} />
          </mesh>
        </group>
      )))}
      {scanning && (
        <mesh position-y={-9}>
          <coneGeometry args={[7.5, 18, 32, 1, true]} />
          <meshBasicMaterial color="#65d9cb" transparent opacity={0.07} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

class DroneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // The ground evidence flow is authoritative; a missing decorative GLB
    // falls back silently so the presenter can finish the story.
  }

  render() {
    return this.state.failed ? <FallbackSurveyDrone /> : this.props.children;
  }
}

export function SafeDrone() {
  return (
    <DroneErrorBoundary>
      <Suspense fallback={<FallbackSurveyDrone />}>
        <Drone />
      </Suspense>
    </DroneErrorBoundary>
  );
}
