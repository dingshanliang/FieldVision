import { useTexture } from "@react-three/drei";
import { Component, type ReactNode, Suspense, useMemo } from "react";
import { BackSide, SRGBColorSpace } from "three";
import type { WebGLProgramParametersWithUniforms } from "three";

function JiangnanHorizon() {
  const source = useTexture("/assets/environment/jiangnan-rice-horizon-v1.png");
  const texture = useMemo(() => {
    const result = source.clone();
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 8;
    result.repeat.set(1, 0.72);
    result.offset.set(0, 0.28);
    result.needsUpdate = true;
    return result;
  }, [source]);
  const fadeLowerEdge = useMemo(() => (shader: WebGLProgramParametersWithUniforms) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      "#include <map_fragment>\ndiffuseColor.a *= smoothstep(0.28, 0.42, vMapUv.y) * (1.0 - smoothstep(0.9, 1.0, vMapUv.y));",
    );
  }, []);

  return (
    <mesh position={[0, 78, 0]} rotation-y={-0.38} renderOrder={-900} frustumCulled={false}>
      <cylinderGeometry args={[375, 375, 190, 128, 1, true]} />
      <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} fog={false} toneMapped transparent onBeforeCompile={fadeLowerEdge} />
    </mesh>
  );
}

class HorizonErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* Keep the local procedural fallback for offline resilience. */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function SafePhotographicHorizon({ fallback }: { fallback: ReactNode }) {
  return (
    <HorizonErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <JiangnanHorizon />
      </Suspense>
    </HorizonErrorBoundary>
  );
}

useTexture.preload("/assets/environment/jiangnan-rice-horizon-v1.png");
