import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { DoubleSide, ShaderMaterial } from "three";
import { fieldById } from "../data/fields";
import { useFarmStore } from "../state/useFarmStore";
import { phaseEvidence, SOURCE_STYLE } from "../state/recoveryModel";
import { evidenceMetadata } from "../state/evidenceModel";

/**
 * A02 冠层证据的"正射遥感"空间表达（fv-o6c.11 混合方案的空间英雄）。
 * UAV NDRE 假彩色图随扫描揭示，随恢复相位冷却；旁标同品种健康对照带，
 * 让 -12% 的相对偏差有视觉基准。替代旧的发光圆环 RiskOverlay。
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uReveal;
  uniform float uAnomaly;
  uniform float uAlpha;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i); float b = hash(i+vec2(1.0,0.0));
    float c = hash(i+vec2(0.0,1.0)); float d = hash(i+vec2(1.0,1.0));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  void main() {
    // 东侧低、斑块化的冠层指数场（NDRE 越低越偏暖）。
    float east = smoothstep(0.15, 1.0, vUv.x);
    float patchy = noise(vUv * 3.2) * 0.45 + noise(vUv * 7.1) * 0.22;
    float low = clamp(east * (0.7 + patchy), 0.0, 1.0);
    float anomaly = low * uAnomaly;
    vec3 healthy = vec3(0.28, 0.55, 0.27);
    vec3 mid = vec3(0.83, 0.70, 0.27);
    vec3 stress = vec3(0.82, 0.30, 0.16);
    vec3 color = anomaly < 0.5
      ? mix(healthy, mid, anomaly * 2.0)
      : mix(mid, stress, (anomaly - 0.5) * 2.0);
    float revealed = smoothstep(0.0, 0.04, uReveal - vUv.x);
    float front = smoothstep(0.06, 0.0, abs(uReveal - vUv.x));
    float swaths = smoothstep(0.46, 0.5, abs(fract(vUv.y * 5.0) - 0.5));
    vec2 p = vUv * 2.0 - 1.0;
    float falloff = 1.0 - smoothstep(0.78, 1.0, length(p));
    float a = uAlpha * falloff * (revealed * 0.55 + front * 0.5 + swaths * 0.05 * revealed);
    color += front * vec3(0.35, 0.85, 0.95) * 0.6;
    gl_FragColor = vec4(color, a);
  }
`;

function NdreOverlay({ position, size, reveal, anomaly }: { position: [number, number, number]; size: number; reveal: number; anomaly: number }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uReveal: { value: reveal },
          uAnomaly: { value: anomaly },
          uAlpha: { value: 0.9 },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    // 材质一次性创建；uniforms 每帧平滑更新。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame(({ clock }) => {
    const uniform = (key: string) => material.uniforms[key] as { value: number } | undefined;
    const uTime = uniform("uTime");
    const uReveal = uniform("uReveal");
    const uAnomaly = uniform("uAnomaly");
    if (uTime) uTime.value = clock.elapsedTime;
    if (uReveal) uReveal.value += (reveal - uReveal.value) * 0.08;
    if (uAnomaly) uAnomaly.value += (anomaly - uAnomaly.value) * 0.06;
  });
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[size, size, 1, 1]} />
    </mesh>
  );
}

export function EvidenceMap() {
  const layerMode = useFarmStore((s) => s.layerMode);
  const demoStep = useFarmStore((s) => s.demoStep);
  const scanProgress = useFarmStore((s) => s.scanProgress);
  const recoveryPhase = useFarmStore((s) => s.recoveryPhase);

  const a02 = fieldById.A02;
  const riskZone = a02?.riskZones?.[0];
  if (!riskZone) return null;

  const visible = layerMode === "growth" || ["inspect-risk", "drone-scan", "irrigation", "recovered"].includes(demoStep);
  if (!visible) return null;

  const phase = phaseEvidence(recoveryPhase);
  const center: [number, number, number] = [riskZone.center[0], 2.9, riskZone.center[2]];

  return (
    <group>
      <NdreOverlay position={center} size={riskZone.radius * 2.1} reveal={scanProgress} anomaly={phase.canopyAnomalyStrength} />
      {/* 同品种健康对照带（A02 西侧），作为 -12% 的视觉基准。 */}
      <mesh position={[-26, 2.92, -62]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 16]} />
        <meshBasicMaterial color="#3f7a3a" transparent opacity={0.2} depthWrite={false} side={DoubleSide} />
      </mesh>
      <Html position={[-26, 4.2, -62]} center distanceFactor={72} zIndexRange={[34, 5]}>
        <div className="evidence-chip evidence-chip--ref">
          <span className="evidence-dot" style={{ background: "#3f7a3a" }} />
          同品种对照
        </div>
      </Html>
      <Html position={[center[0], 7.6, center[2]]} center distanceFactor={74} zIndexRange={[40, 6]}>
        <div className="evidence-chip evidence-chip--hero">
          <div className="evidence-chip__head">
            <span className="evidence-dot" style={{ background: SOURCE_STYLE.canopy.color }} />
            <strong>{SOURCE_STYLE.canopy.label}</strong>
          </div>
          <span className="evidence-line">相对同品种对照 {phase.canopy.deltaPct}%</span>
          <span className="evidence-line">连续低值区 {phase.canopy.areaMu} 亩</span>
          <span className="evidence-line evidence-line--meta">{evidenceMetadata.provenance} · {evidenceMetadata.capturedAt}</span>
        </div>
      </Html>
    </group>
  );
}
