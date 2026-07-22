/**
 * PROTOTYPE — fv-o6c.6。共享 3D 证据原子。
 * 像共享 <Header> 一样可被三变体复用；变体间的结构差异来自如何组合，
 * 而非这些原子本身。确定方案后随原型移除。
 */
import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { DoubleSide, Mesh, ShaderMaterial, type ColorRepresentation } from "three";

/** A02 风险区与证据锚点的场景坐标（来自 fields.ts：A02-R1 center [23,1.6,-66], r=18）。 */
export const GEO = {
  riskCenter: [23, 2.9, -66] as [number, number, number],
  riskRadius: 18,
  /** 同品种健康对照带（A02 西侧），给眼睛一个 -12% 的比较基准。 */
  referenceCenter: [-26, 2.9, -62] as [number, number, number],
  referenceSize: [26, 16] as [number, number],
  /** 根区土壤探头点（风险区内 3 点，离散、带深度）。 */
  rootProbes: [
    [16, 2.9, -60],
    [29, 2.9, -67],
    [22, 2.9, -75],
  ] as [number, number, number][],
  /** 田间观察管（田间水位）。 */
  fieldTube: [9, 2.9, -57] as [number, number, number],
  /** 东支渠水尺（渠道水位/到水），位于支渠末端进水口附近。 */
  channelGauge: [61, 2.9, -33] as [number, number, number],
};

const ndreVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ndreFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uReveal;   // 扫描揭示进度 0..1（沿 x 推进）
  uniform float uAnomaly;  // 残余异常强度 0..1（D0=1，D7≈0）
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
    // 假彩色 ramps：健康绿 → 黄 → 橙红。
    vec3 healthy = vec3(0.28, 0.55, 0.27);
    vec3 mid = vec3(0.83, 0.70, 0.27);
    vec3 stress = vec3(0.82, 0.30, 0.16);
    vec3 color = anomaly < 0.5
      ? mix(healthy, mid, anomaly * 2.0)
      : mix(mid, stress, (anomaly - 0.5) * 2.0);
    // 扫描条带揭示：沿 x 推进的前沿 + 横向 swath 纹理。
    float revealed = smoothstep(0.0, 0.04, uReveal - vUv.x);
    float front = smoothstep(0.06, 0.0, abs(uReveal - vUv.x));
    float swaths = smoothstep(0.46, 0.5, abs(fract(vUv.y * 5.0) - 0.5));
    // 圆形 falloff，避免硬方形边缘。
    vec2 p = vUv * 2.0 - 1.0;
    float falloff = 1.0 - smoothstep(0.78, 1.0, length(p));
    float a = uAlpha * falloff * (revealed * 0.55 + front * 0.5 + swaths * 0.05 * revealed);
    color += front * vec3(0.35, 0.85, 0.95) * 0.6;
    gl_FragColor = vec4(color, a);
  }
`;

export function NdreOverlay({
  position,
  size,
  reveal,
  anomaly,
  alpha = 0.9,
}: {
  position: [number, number, number];
  size: number;
  reveal: number;
  anomaly: number;
  alpha?: number;
}) {
  const ref = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: ndreVertex,
        fragmentShader: ndreFragment,
        uniforms: {
          uTime: { value: 0 },
          uReveal: { value: reveal },
          uAnomaly: { value: anomaly },
          uAlpha: { value: alpha },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    // 仅原型：材质一次性创建，uniforms 每帧更新。
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
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[size, size, 1, 1]} />
    </mesh>
  );
}

/** 健康同品种对照带：一块稳定绿色，作为 -12% 的视觉基准。 */
export function ReferenceStrip({
  position,
  size,
  label = "同品种对照",
}: {
  position: [number, number, number];
  size: [number, number];
  label?: string;
}) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={size} />
        <meshBasicMaterial color="#3f7a3a" transparent opacity={0.22} depthWrite={false} side={DoubleSide} />
      </mesh>
      <Html position={[0, 1.4, 0]} center distanceFactor={70} zIndexRange={[34, 5]}>
        <div className="ep-chip ep-chip--ref">
          <span className="ep-dot" style={{ background: "#3f7a3a" }} />
          {label}
        </div>
      </Html>
    </group>
  );
}

/** 离散证据点钉：3D 立柱 + 头部 + 可选 Html 标签。颜色即来源。 */
export function Pin({
  position,
  color,
  height = 4.2,
  children,
}: {
  position: [number, number, number];
  color: ColorRepresentation;
  height?: number;
  children?: ReactNode;
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, height, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[0, height + 0.35, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.4} />
      </mesh>
      {children && (
        <Html position={[0, height + 1.1, 0]} center distanceFactor={64} zIndexRange={[36, 6]}>
          {children}
        </Html>
      )}
    </group>
  );
}

/** 来源标签卡片：颜色点 + 标题 + 数值行 + 可选"属于哪天"标签。 */
export function SourceChip({
  color,
  title,
  lines,
  dayTag,
}: {
  color: string;
  title: string;
  lines: string[];
  dayTag?: string;
}) {
  return (
    <div className="ep-chip">
      <div className="ep-chip__head">
        <span className="ep-dot" style={{ background: color }} />
        <strong>{title}</strong>
        {dayTag && <em className="ep-day">{dayTag}</em>}
      </div>
      {lines.map((line) => (
        <span key={line} className="ep-line">{line}</span>
      ))}
    </div>
  );
}

/** 风险区虚线轮廓（冠层异常范围），区别于填色图。 */
export function RiskOutline({
  center,
  radius,
  color = "#e07a3c",
  opacity = 0.8,
}: {
  center: [number, number, number];
  radius: number;
  color?: string;
  opacity?: number;
}) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * Math.PI * 2;
      pts.push([center[0] + Math.cos(a) * radius, center[1], center[2] + Math.sin(a) * radius]);
    }
    return pts;
  }, [center, radius]);
  return <Line points={points} color={color} lineWidth={1.5} dashed dashSize={1.6} gapSize={1.1} transparent opacity={opacity} />;
}

/** 细连接线，把离散证据锚点连到风险区，暗示同一事件不同来源。 */
export function Connector(from: [number, number, number], to: [number, number, number], color = "#caa37a") {
  return <Line points={[from, to]} color={color} lineWidth={1} transparent opacity={0.5} />;
}
