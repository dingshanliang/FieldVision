/**
 * 暴雨雨幕（fv-weather）。全部运动在顶点着色器完成（uTime + 每粒种子），
 * CPU 每帧只写一个 uniform：opacity 跟随 store.stormProgress，雨停后整层
 * 隐藏，不产生每帧对象分配。低性能档降低粒数。
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from "three";
import { useFarmStore } from "../state/useFarmStore";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

const AREA_X = 300;
const AREA_Z = 230;
const RAIN_HEIGHT = 78;
const FALL_SPEED = 34;
const SLANT = 0.55;

const rainVertexShader = /* glsl */ `
  #define RAIN_HEIGHT ${RAIN_HEIGHT.toFixed(1)}
  attribute float aSeed;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uSlant;
  varying float vAlpha;

  void main() {
    vec3 base = position;
    // 从顶部落下，超出底部后回到顶部（mod 循环），水平随风斜切。
    float fallen = mod(aSeed * RAIN_HEIGHT - uTime * aSpeed, RAIN_HEIGHT);
    base.y = RAIN_HEIGHT - fallen;
    base.x += fallen * uSlant;
    vec4 world = modelMatrix * vec4(base, 1.0);
    vec4 view = viewMatrix * world;
    gl_Position = projectionMatrix * view;
    gl_PointSize = 220.0 / max(1.0, -view.z);
    vAlpha = smoothstep(0.0, 6.0, fallen) * (1.0 - smoothstep(RAIN_HEIGHT - 8.0, RAIN_HEIGHT, fallen));
  }
`;

const rainFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    // 竖直细雨丝：距点中心的纵向衰减比横向更慢，读作拉长的雨线。
    vec2 offset = gl_PointCoord - 0.5;
    float streak = smoothstep(0.5, 0.06, abs(offset.x)) * smoothstep(0.5, 0.0, abs(offset.y));
    float alpha = streak * vAlpha * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function Rain() {
  const tier = usePerformanceTier();
  const pointsRef = useRef<Points>(null);
  const count = tier === "high" ? 2600 : tier === "medium" ? 1500 : 800;

  const geometry = useMemo(() => {
    let seedState = 88017;
    const random = () => {
      seedState = (seedState * 16807) % 2147483647;
      return seedState / 2147483647;
    };
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - 0.5) * AREA_X * 2;
      positions[index * 3 + 1] = 0;
      positions[index * 3 + 2] = (random() - 0.5) * AREA_Z * 2;
      seeds[index] = random();
      speeds[index] = FALL_SPEED * (0.8 + random() * 0.5);
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(positions, 3));
    result.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    result.setAttribute("aSpeed", new BufferAttribute(speeds, 1));
    return result;
  }, [count]);

  const material = useMemo(() => new ShaderMaterial({
    vertexShader: rainVertexShader,
    fragmentShader: rainFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uSlant: { value: SLANT },
      uColor: { value: new Color("#c3d2d8") },
    },
    transparent: true,
    depthWrite: false,
    fog: false,
  }), []);

  useFrame(({ clock }, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    // 通过 ref 触达材质再修改（渲染作用域捕获的对象不可变，react-hooks 规则）。
    // fv-weather 穿帮修复：透明度向目标做 2.4 时间常数的指数阻尼（与光照
    // rig 同拍），直跳暴雨章时雨幕渐起，不再与光照错拍 1-2 秒地瞬跳。
    const pointsMaterial = points.material as ShaderMaterial;
    const storm = useFarmStore.getState().stormProgress;
    const frozen = useFarmStore.getState().photoFrozen;
    const opacity = pointsMaterial.uniforms.uOpacity;
    const time = pointsMaterial.uniforms.uTime;
    if (opacity) {
      if (!frozen) {
        opacity.value += (storm * 0.42 - opacity.value) * (1 - Math.exp(-delta * 2.4));
      }
      points.visible = storm > 0.02 || opacity.value > 0.004;
    }
    if (time && !frozen) time.value = clock.elapsedTime;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={8} />;
}
