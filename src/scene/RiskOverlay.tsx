import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Mesh, ShaderMaterial } from "three";
import { useFarmStore } from "../state/useFarmStore";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uStrength;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    // Noise-eroded edge so the patch reads organic, not like a UI circle.
    float edgeNoise = (hash(floor(p * 9.0)) - 0.5) * 0.16;
    float body = 1.0 - smoothstep(0.45, 0.9, r + edgeNoise);
    // Concentric scan rings travelling outward.
    float ring = smoothstep(0.055, 0.0, abs(fract(r * 2.6 - uTime * 0.32) - 0.5) - 0.4);
    float pulse = 0.6 + 0.25 * sin(uTime * 2.1);
    float alpha = (body * 0.32 + ring * body * 0.55) * pulse * uStrength;
    vec3 color = mix(vec3(0.92, 0.42, 0.13), vec3(1.0, 0.66, 0.28), ring);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function RiskOverlay() {
  const ref = useRef<Mesh>(null);
  const layerMode = useFarmStore((state) => state.layerMode);
  const step = useFarmStore((state) => state.demoStep);
  const visible = layerMode === "growth" || layerMode === "moisture" || ["inspect-risk", "drone-scan", "irrigation"].includes(step);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 }, uStrength: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const progress = useFarmStore.getState().irrigationProgress;
    const target = visible ? Math.max(0, 1 - progress) : 0;
    const shaderMaterial = ref.current.material as ShaderMaterial;
    const uTime = shaderMaterial.uniforms.uTime as { value: number } | undefined;
    const uStrength = shaderMaterial.uniforms.uStrength as { value: number } | undefined;
    if (uTime) uTime.value = clock.elapsedTime;
    if (uStrength) uStrength.value += (target - uStrength.value) * Math.min(1, delta * 3);
    ref.current.scale.setScalar(1.06 - progress * 0.5 + Math.sin(clock.elapsedTime * 1.4) * 0.02);
  });

  return (
    <mesh ref={ref} position={[23, 2.75, -66]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <circleGeometry args={[19, 64]} />
    </mesh>
  );
}
