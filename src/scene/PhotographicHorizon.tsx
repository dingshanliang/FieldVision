import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, type ReactNode, Suspense, useMemo, useRef } from "react";
import { BackSide, Color, Mesh, SRGBColorSpace } from "three";
import type { WebGLProgramParametersWithUniforms } from "three";
import { currentLighting } from "../config/dayNight";
function JiangnanHorizon() {
  // KTX2 was rejected after a reproducible ~1 FPS regression on this non-PoT,
  // shader-patched panorama. WebP keeps the proven useTexture path while
  // cutting the 2.0 MB PNG to ~211 KB.
  const source = useTexture("/assets/environment/jiangnan-rice-horizon-v1.webp");
  const meshRef = useRef<Mesh>(null);
  // fv-daynight：全景图用乘色跟随昼夜/暴雨（夜里压成蓝调、暴雨压成灰绿）。
  const tint = useMemo(() => new Color(1, 1, 1), []);
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

  useFrame((_, delta) => {
    const material = meshRef.current?.material as { color: Color } | undefined;
    if (!material) return;
    // hex 调色板是 sRGB 意图，声明色彩空间避免被当线性值解读。
    tint.setRGB(...currentLighting.horizonTint, SRGBColorSpace);
    material.color.lerp(tint, Math.min(1, delta * 2.4));
  });

  return (
    <mesh ref={meshRef} position={[0, 78, 0]} rotation-y={-0.38} renderOrder={-900} frustumCulled={false}>
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

useTexture.preload("/assets/environment/jiangnan-rice-horizon-v1.webp");
