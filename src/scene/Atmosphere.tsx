import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  FogExp2,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  Points,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  ShaderMaterial,
  Vector3,
} from "three";
import { visualConfig } from "../config/visual";
import { currentLighting, lerpCurrentLighting, lightningFlash, resolveLightingTargets } from "../config/dayNight";
import { seededRandom } from "../utils/geometry";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { useFarmStore } from "../state/useFarmStore";
import type { DayPhase } from "../types/farm";
import { SafePhotographicHorizon } from "./PhotographicHorizon";
import { BirdFlock } from "./BirdFlock";
import { NightLights } from "./NightLights";

const baseSunDirection = new Vector3(...visualConfig.sunDirection).normalize();

const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// fv-daynight: 天穹配色全部参数化（清晨/正午/黄昏/夜晚 + 暴雨覆盖），
// uniform 由 currentLighting 每帧插值写入，着色器结构保持不变。
const skyFragmentShader = /* glsl */ `
  varying vec3 vDirection;
  uniform vec3 sunDirection;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uCloudDark;
  uniform vec3 uCloudLight;
  uniform vec3 uSunGlow;
  uniform float uGlowStrength;
  uniform vec3 uSunDisc;
  uniform vec3 uHaze;
  uniform float uFlash;

  float fvHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fvNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(fvHash(i), fvHash(i + vec2(1.0, 0.0)), u.x),
               mix(fvHash(i + vec2(0.0, 1.0)), fvHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fvFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.52;
    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * fvNoise(p);
      p = p * 2.08 + 13.7;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float h = dir.y;
    float vertical = smoothstep(-0.08, 0.72, h);
    vec3 sky = mix(uHorizon, uZenith, vertical);

    if (h > 0.015) {
      vec2 projected = dir.xz / (h + 0.24);
      float broad = fvFbm(projected * vec2(0.55, 0.9) + vec2(4.7, -2.1));
      float detail = fvFbm(projected * vec2(1.25, 1.65) - vec2(8.2, 3.6));
      float cloud = smoothstep(0.38, 0.58, broad * 0.72 + detail * 0.28);
      float cloudBand = smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.5, 0.83, h));
      float underside = smoothstep(0.48, 0.64, broad);
      vec3 cloudColor = mix(uCloudDark, uCloudLight, underside);
      sky = mix(sky, cloudColor, cloud * cloudBand * 0.64);
    }

    float sunAmount = max(dot(dir, sunDirection), 0.0);
    sky += uSunGlow * pow(sunAmount, 24.0) * uGlowStrength;
    sky += uSunDisc * smoothstep(0.99984, 0.99995, sunAmount) * 1.0;
    sky = mix(sky, uHaze, smoothstep(0.0, -0.14, h));
    // 闪电：天穹整体向冷白提亮（lerp 之后的加性包络，照亮云底一瞬）。
    sky = mix(sky, vec3(0.92, 0.95, 1.0), uFlash * 0.55);
    gl_FragColor = vec4(sky, 1.0);
  }
`;

function MorningSky() {
  const mesh = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    sunDirection: { value: baseSunDirection.clone() },
    uZenith: { value: new Color(...currentLighting.skyZenith) },
    uHorizon: { value: new Color(...currentLighting.skyHorizon) },
    uCloudDark: { value: new Color(...currentLighting.skyCloudDark) },
    uCloudLight: { value: new Color(...currentLighting.skyCloudLight) },
    uSunGlow: { value: new Color(...currentLighting.sunGlowColor) },
    uGlowStrength: { value: currentLighting.sunGlowStrength },
    uSunDisc: { value: new Color(...currentLighting.sunDiscColor) },
    uHaze: { value: new Color(...currentLighting.skyHaze) },
    uFlash: { value: 0 },
  }), []);
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
    // 只通过 ref 触达 uniform——渲染作用域捕获的对象不可变（react-hooks 规则）。
    const uniforms = materialRef.current?.uniforms;
    if (!uniforms) return;
    uniforms.sunDirection!.value.set(...currentLighting.sunDirection).normalize();
    uniforms.uZenith!.value.setRGB(...currentLighting.skyZenith);
    uniforms.uHorizon!.value.setRGB(...currentLighting.skyHorizon);
    uniforms.uCloudDark!.value.setRGB(...currentLighting.skyCloudDark);
    uniforms.uCloudLight!.value.setRGB(...currentLighting.skyCloudLight);
    uniforms.uSunGlow!.value.setRGB(...currentLighting.sunGlowColor);
    uniforms.uGlowStrength!.value = currentLighting.sunGlowStrength;
    uniforms.uSunDisc!.value.setRGB(...currentLighting.sunDiscColor);
    uniforms.uHaze!.value.setRGB(...currentLighting.skyHaze);
    uniforms.uFlash!.value = lightningFlash.value;
  });
  return (
    <mesh ref={mesh} scale={1200} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[1, 64, 36]} />
      <shaderMaterial
        ref={materialRef}
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={skyVertexShader}
        fragmentShader={skyFragmentShader}
      />
    </mesh>
  );
}

/** Real rural HDR lighting gives metal, water and leaf surfaces coherent reflections. */
function GoldenHourEnvironment() {
  return <Environment files="/assets/environment/rural_landscape_1k.hdr" />;
}

/**
 * fv-daynight 控制器：每帧把当前光照向目标（相位 × 暴雨）阻尼插值，并写入
 * 平行光 / 半球光 / 雾 / HDR 环境强度。照片模式的曝光倍率同时作用于三类光源。
 * 阴影相机范围随章节镜头由 React props 声明式更新，与逐帧动画互不冲突。
 */
function LightingRig({ shadowSize, shadowHorizontal, shadowVertical, castShadow }: {
  shadowSize: number;
  shadowHorizontal: number;
  shadowVertical: number;
  castShadow: boolean;
}) {
  const sunRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);
  const prevPhaseRef = useRef<DayPhase | null>(null);
  useFrame((root, delta) => {
    const farm = useFarmStore.getState();
    const target = resolveLightingTargets(farm.dayPhase, farm.stormProgress);
    // 相位切换 = 章节剪辑点：当帧全量快切（alpha=1），太阳/颜色/雾一次到位。
    // 若走阻尼，sunDirection 的逐分量插值会让太阳"划过地平线"，低太阳角
    // 的长阴影闪烁非常刺眼。同相位内（含暴雨推演）维持 2.4 时间常数阻尼。
    const phaseChanged = prevPhaseRef.current !== farm.dayPhase;
    prevPhaseRef.current = farm.dayPhase;
    lerpCurrentLighting(target, phaseChanged ? 1 : 1 - Math.exp(-delta * 2.4));
    const exposure = farm.photoMode ? farm.photoExposure : 1;

    const sun = sunRef.current;
    if (sun) {
      sun.position.set(
        currentLighting.sunDirection[0] * 260,
        currentLighting.sunDirection[1] * 260,
        currentLighting.sunDirection[2] * 260,
      );
      // 闪电为 lerp 之后的加性包络：脉冲不得被阻尼抹平（"慢闪"根因）。
      sun.intensity = currentLighting.sunIntensity * exposure + lightningFlash.value * 3.2;
      sun.color.setRGB(...currentLighting.sunColor, SRGBColorSpace);
    }
    const hemi = hemiRef.current;
    if (hemi) {
      hemi.intensity = currentLighting.hemiIntensity * exposure + lightningFlash.value * 1.1;
      hemi.color.setRGB(...currentLighting.hemiSky, SRGBColorSpace);
      hemi.groundColor.setRGB(...currentLighting.hemiGround, SRGBColorSpace);
    }
    // scene/fog 均取自 useFrame 回调参数（渲染作用域捕获的对象不可变）。
    const scene = root.scene;
    if (scene.fog instanceof FogExp2) {
      // 调色板 hex 是 sRGB 意图——setRGB 必须声明色彩空间，否则被当线性值
      // 解读，雾会比预期亮近一倍（暴雨天整片中景泛白的根因）。
      scene.fog.color.setRGB(...currentLighting.fogColor, SRGBColorSpace);
      scene.fog.density = currentLighting.fogDensity;
    }
    // three r163+ 场景级环境强度——HDR IBL 随相位/暴雨/曝光同步缩放。
    scene.environmentIntensity = currentLighting.envIntensity * exposure;
  });
  return (
    <>
      {/* Hemisphere dropped from 0.88 → 0.5: the HDRI already provides IBL, and
          a strong hemi fill was flattening shadow contrast (the "looks plastic /
          washed-out" symptom). Lower fill restores volumetric depth in canopy
          gaps, furrows and under eaves. */}
      <hemisphereLight ref={hemiRef} args={[new Color("#b8cad4"), new Color("#4c4a3b"), 0.5]} />
      <directionalLight
        ref={sunRef}
        position={[baseSunDirection.x * 260, baseSunDirection.y * 260, baseSunDirection.z * 260]}
        intensity={visualConfig.sunIntensity}
        color={visualConfig.sunColor}
        castShadow={castShadow}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-shadowHorizontal}
        shadow-camera-right={shadowHorizontal}
        shadow-camera-top={shadowVertical}
        shadow-camera-bottom={-shadowVertical}
        shadow-camera-near={10}
        shadow-camera-far={720}
        shadow-bias={-0.00012}
        shadow-normalBias={0.6}
      />
    </>
  );
}

/**
 * 夜幕星野（fv-daynight 升级版）：seeded 银河带采样 + 每星亮度/尺寸/闪烁相位，
 * 数量按性能档分级（high 1600 / medium 1000 / low 500）。透明度跟随
 * currentLighting.stars，photoFrozen 时闪烁停走。固定像素尺寸 + 加性混合，
 * 与雾/深度写入无关，不参与裁剪。
 */
const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aBrightness;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.82 + 0.18 * sin(uTime * (0.5 + aPhase * 1.6) + aPhase * 6.2831);
    vAlpha = aBrightness * twinkle;
    gl_PointSize = aSize;
  }
`;

const starFragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float radial = smoothstep(0.5, 0.08, length(offset));
    float alpha = radial * vAlpha * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(0.82, 0.88, 1.0, alpha);
  }
`;

/** 银河带大圆法向（固定值保证逐帧/逐次重放一致）。 */
const MILKY_WAY_NORMAL: readonly [number, number, number] = [0.38, 0.86, 0.34];

function Stars() {
  const tier = usePerformanceTier();
  const pointsRef = useRef<Points>(null);
  const count = tier === "high" ? 1600 : tier === "medium" ? 1000 : 500;
  const geometry = useMemo(() => {
    const random = seededRandom(4409);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const brightness = new Float32Array(count);
    const bandNormal = MILKY_WAY_NORMAL;
    const bandLength = Math.hypot(bandNormal[0], bandNormal[1], bandNormal[2]);
    let index = 0;
    while (index < count) {
      // 均匀取上半球方向；沿银河带大圆做拒绝采样加权，带内密度更高。
      const azimuth = random() * Math.PI * 2;
      const elevation = Math.asin(random() * 0.96 + 0.04);
      const dx = Math.cos(elevation) * Math.cos(azimuth);
      const dy = Math.sin(elevation);
      const dz = Math.cos(elevation) * Math.sin(azimuth);
      const bandDistance = Math.abs((dx * bandNormal[0] + dy * bandNormal[1] + dz * bandNormal[2]) / bandLength);
      const inBandProbability = 0.22 + 0.78 * Math.exp(-Math.pow(bandDistance / 0.16, 2));
      if (random() > inBandProbability) continue;
      const radius = 820;
      positions[index * 3] = dx * radius;
      positions[index * 3 + 1] = dy * radius + 20;
      positions[index * 3 + 2] = dz * radius;
      // 带内恒星偏亮偏大：银河读得出"一条带"而不是均匀噪点。
      const bandBoost = 1 - Math.min(1, bandDistance / 0.3);
      sizes[index] = 1.1 + random() * 1.2 + bandBoost * 0.5;
      phases[index] = random();
      brightness[index] = 0.32 + random() * 0.5 + bandBoost * 0.22;
      index += 1;
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(positions, 3));
    result.setAttribute("aSize", new BufferAttribute(sizes, 1));
    result.setAttribute("aPhase", new BufferAttribute(phases, 1));
    result.setAttribute("aBrightness", new BufferAttribute(brightness, 1));
    return result;
  }, [count]);
  const material = useMemo(() => new ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: AdditiveBlending,
  }), []);
  useFrame(({ clock }) => {
    const points = pointsRef.current;
    if (!points) return;
    // 通过 ref 触达材质再修改（渲染作用域捕获的对象不可变，react-hooks 规则）。
    const pointsMaterial = points.material as ShaderMaterial;
    points.visible = currentLighting.stars > 0.02;
    pointsMaterial.uniforms.uOpacity!.value = currentLighting.stars;
    if (!useFarmStore.getState().photoFrozen) pointsMaterial.uniforms.uTime!.value = clock.elapsedTime;
  });
  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={-990} />;
}

interface TreeSpec { x: number; z: number; scale: number; rotation: number; tone: number }

function TreeLine() {
  const treeCount = 170;
  const poplarCount = 34;

  const trunkGeometry = useMemo(() => new CylinderGeometry(0.22, 0.4, 3.4, 6), []);
  const crownGeometry = useMemo(() => new PlaneGeometry(6.8, 6.4), []);
  const poplarGeometry = useMemo(() => new ConeGeometry(1, 4.4, 7), []);
  const crownTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (context) {
      const random = seededRandom(12017);
      for (let index = 0; index < 210; index += 1) {
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(random());
        const x = 128 + Math.cos(angle) * radius * 93 * (0.76 + random() * 0.24);
        const y = 126 + Math.sin(angle) * radius * 73 - radius * 10;
        const width = 8 + random() * 20;
        const height = width * (0.58 + random() * 0.42);
        const light = 36 + Math.round(random() * 38);
        const alpha = 0.42 + random() * 0.48;
        const gradient = context.createRadialGradient(x - width * 0.18, y - height * 0.2, 1, x, y, width);
        gradient.addColorStop(0, `rgba(${light + 12}, ${light + 35}, ${light + 3}, ${alpha})`);
        gradient.addColorStop(0.62, `rgba(${light - 4}, ${light + 19}, ${Math.max(18, light - 15)}, ${alpha * 0.9})`);
        gradient.addColorStop(1, `rgba(18, 34, 18, 0)`);
        context.save();
        context.translate(x, y);
        context.scale(1, height / width);
        context.translate(-x, -y);
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, width, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);

  const trees = useMemo<TreeSpec[]>(() => {
    const random = seededRandom(9417);
    return Array.from({ length: treeCount }, (_, index) => {
      const edge = index % 4;
      const along = Math.min(1, Math.max(0, ((index / treeCount) * 4) % 1 + (random() - 0.5) * 0.018));
      let x = 0;
      let z = 0;
      if (edge === 0) { x = -262 + along * 524; z = -192 - random() * 26; }
      if (edge === 1) { x = 250 + random() * 24; z = -188 + along * 376; }
      if (edge === 2) { x = 262 - along * 524; z = 192 + random() * 26; }
      if (edge === 3) { x = -250 - random() * 24; z = 188 - along * 376; }
      return { x, z, scale: 0.75 + random() * 0.85, rotation: random() * Math.PI * 2, tone: random() };
    });
  }, []);

  // Poplars line the farm tracks (east road + south road) — previously they ran
  // in a straight file straight through the A03 and B03 fields.
  const poplars = useMemo<TreeSpec[]>(() => {
    const random = seededRandom(3351);
    const eastCount = 18;
    const southCount = 16;
    const list: TreeSpec[] = [];
    for (let index = 0; index < eastCount; index += 1) {
      const t = index / (eastCount - 1);
      list.push({
        x: 171 + random() * 2.6,
        z: 88 - t * 184 + (random() - 0.5) * 4,
        scale: 0.8 + random() * 0.55,
        rotation: random() * Math.PI * 2,
        tone: random(),
      });
    }
    for (let index = 0; index < southCount; index += 1) {
      const t = index / (southCount - 1);
      list.push({
        x: -148 + t * 296 + (random() - 0.5) * 4,
        z: -111 - random() * 2.6,
        scale: 0.8 + random() * 0.55,
        rotation: random() * Math.PI * 2,
        tone: random(),
      });
    }
    return list;
  }, []);

  const crownDark = useMemo(() => new Color("#22331f"), []);
  const crownLight = useMemo(() => new Color("#57683a"), []);
  const poplarDark = useMemo(() => new Color("#1d2c1e"), []);
  const poplarLight = useMemo(() => new Color("#3d5230"), []);

  const setInstances = (mesh: InstancedMesh | null, kind: "trunk" | "crown" | "crown-cross" | "poplar") => {
    if (!mesh) return;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const color = new Color();
    if (kind === "trunk") {
      trees.forEach((tree, index) => {
        quaternion.setFromAxisAngle(up, tree.rotation);
        matrix.compose(new Vector3(tree.x, 1.5 * tree.scale, tree.z), quaternion, new Vector3(tree.scale, tree.scale, tree.scale));
        mesh.setMatrixAt(index, matrix);
      });
    }
    if (kind === "crown" || kind === "crown-cross") {
      trees.forEach((tree, index) => {
        quaternion.setFromAxisAngle(up, tree.rotation + (kind === "crown-cross" ? Math.PI / 2 : 0));
        matrix.compose(
          new Vector3(tree.x, 5.0 * tree.scale, tree.z),
          quaternion,
          new Vector3(tree.scale * (0.9 + tree.tone * 0.25), tree.scale * (0.88 + tree.tone * 0.18), tree.scale),
        );
        mesh.setMatrixAt(index, matrix);
        color.copy(crownDark).lerp(crownLight, Math.min(1, tree.tone * 0.72 + 0.18));
        mesh.setColorAt(index, color);
      });
    }
    if (kind === "poplar") {
      poplars.forEach((tree, index) => {
        quaternion.setFromAxisAngle(up, tree.rotation);
        matrix.compose(
          new Vector3(tree.x, 2.1 * tree.scale, tree.z),
          quaternion,
          new Vector3(tree.scale * 0.85, tree.scale * 1.6, tree.scale * 0.85),
        );
        mesh.setMatrixAt(index, matrix);
        color.copy(poplarDark).lerp(poplarLight, tree.tone);
        mesh.setColorAt(index, color);
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  return (
    <group>
      <instancedMesh args={[trunkGeometry, undefined, treeCount]} receiveShadow ref={(mesh: InstancedMesh | null) => setInstances(mesh, "trunk")}>
        <meshStandardMaterial color="#4a3b28" roughness={1} />
      </instancedMesh>
      <instancedMesh args={[crownGeometry, undefined, treeCount]} receiveShadow ref={(mesh: InstancedMesh | null) => setInstances(mesh, "crown")}>
        <meshStandardMaterial map={crownTexture} color="#ffffff" roughness={0.94} side={DoubleSide} alphaTest={0.2} alphaToCoverage />
      </instancedMesh>
      <instancedMesh args={[crownGeometry, undefined, treeCount]} receiveShadow ref={(mesh: InstancedMesh | null) => setInstances(mesh, "crown-cross")}>
        <meshStandardMaterial map={crownTexture} color="#ffffff" roughness={0.94} side={DoubleSide} alphaTest={0.2} alphaToCoverage />
      </instancedMesh>
      <instancedMesh args={[poplarGeometry, undefined, poplarCount]} receiveShadow ref={(mesh: InstancedMesh | null) => setInstances(mesh, "poplar")}>
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** Backlit dust motes drifting over the farm — sells the golden-hour air. */
function DustMotes({ count }: { count: number }) {
  const pointsRef = useRef<Points>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 1, 16, 16, 15);
      gradient.addColorStop(0, "rgba(255, 232, 196, 0.85)");
      gradient.addColorStop(0.5, "rgba(255, 214, 160, 0.28)");
      gradient.addColorStop(1, "rgba(255, 206, 150, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  const seeds = useMemo(() => {
    const random = seededRandom(6101);
    return Array.from({ length: count }, () => ({
      x: (random() - 0.5) * 380,
      y: 0.6 + random() * 22,
      z: -150 + random() * 300,
      phase: random() * Math.PI * 2,
      speed: 0.14 + random() * 0.4,
    }));
  }, [count]);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return result;
  }, [count]);

  useFrame(({ clock }) => {
    // fv-photo 冻结：照片模式定格时尘埃停摆；雨夜/黑夜尘埃隐去。
    if (useFarmStore.getState().photoFrozen) return;
    const hidden = currentLighting.stars > 0.45 || currentLighting.nightLights > 0.6;
    if (pointsRef.current) pointsRef.current.visible = !hidden;
    const positions = pointsRef.current?.geometry.attributes.position;
    if (!positions || hidden) return;
    const time = clock.elapsedTime;
    seeds.forEach((mote, index) => {
      positions.setXYZ(
        index,
        mote.x + Math.sin(time * mote.speed + mote.phase) * 2.4,
        mote.y + Math.sin(time * mote.speed * 0.7 + mote.phase * 1.7) * 1.5,
        mote.z + Math.cos(time * mote.speed * 0.9 + mote.phase) * 2.4,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={texture}
        color="#ffd9a8"
        size={0.85}
        sizeAttenuation
        transparent
        opacity={0.34}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function Atmosphere() {
  const tier = usePerformanceTier();
  const demoStep = useFarmStore((state) => state.demoStep);
  const heroShot = demoStep !== "overview";
  const shadowSize = tier === "low" ? 1024 : 2048;
  const shadowHorizontal = heroShot ? 95 : 210;
  const shadowVertical = heroShot ? 95 : 190;
  return (
    <>
      <fogExp2 attach="fog" args={[visualConfig.fogColor, visualConfig.fogDensity]} />
      <MorningSky />
      <GoldenHourEnvironment />
      <LightingRig
        shadowSize={shadowSize}
        shadowHorizontal={shadowHorizontal}
        shadowVertical={shadowVertical}
        castShadow={tier !== "low"}
      />
      <Stars />
      <SafePhotographicHorizon fallback={<TreeLine />} />
      {tier !== "low" && <BirdFlock />}
      {tier !== "low" && <DustMotes count={tier === "high" ? 240 : 130} />}
      <NightLights tier={tier} />
    </>
  );
}
