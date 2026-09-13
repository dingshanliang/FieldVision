/**
 * 夜间/暴雨作业灯（fv-daynight + fv-weather）。设施点位不动原模型：
 * 叠加加性辉光 sprite + 少量真实点光源（仅高档），亮度由 currentLighting.
 * nightLights 驱动——夜晚渐亮，白昼暴雨也会点亮（安全灯逻辑）。
 * 强度 <= 0.02 时整组隐藏，白天零开销。
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Group, PointLight, SpriteMaterial, Texture } from "three";
import { currentLighting } from "../config/dayNight";
import { useFarmStore } from "../state/useFarmStore";
import type { PerformanceTier } from "../hooks/usePerformanceTier";

interface LampSpec {
  position: [number, number, number];
  color: string;
  size: number;
  base: number;
  /** 信标闪烁：暴雨时快闪，其余时间缓慢呼吸。 */
  blink?: boolean;
}

const LAMPS: LampSpec[] = [
  // 一号泵站：两盏暖色泛光（Task Hero 资产，夜间最亮）
  { position: [79, 4.9, 102], color: "#ffd9a0", size: 5.2, base: 0.85 },
  { position: [85, 4.9, 108], color: "#ffd9a0", size: 5.2, base: 0.85 },
  // 智慧作业场（仓房 + 场院）：冷白场院灯
  { position: [-126, 4.7, 117], color: "#dce8ff", size: 4.6, base: 0.62 },
  { position: [-114, 4.7, 122], color: "#dce8ff", size: 4.6, base: 0.58 },
  { position: [-98, 3.9, 96], color: "#dce8ff", size: 4.0, base: 0.5 },
  // 东支闸门信号灯：状态绿
  { position: [69, 2.9, -18], color: "#7fe8a8", size: 1.7, base: 0.9 },
  // 无人机坞：青色信标（低亮度，避免加性叠加 + Bloom 过曝成白球）
  { position: [-103, 3.2, 118], color: "#8fd8e8", size: 1.15, base: 0.42 },
  // 微气象站警示信标：琥珀色，暴雨快闪
  { position: [-12, 4.5, 132], color: "#ffb35c", size: 1.7, base: 0.8, blink: true },
];

function makeGlowTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 31);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    gradient.addColorStop(0.32, "rgba(255, 255, 255, 0.32)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** 高档设备的真实点光源：强度跟随 nightLights，白天为 0。 */
function NightPointLight(props: { position: [number, number, number]; color: string; maxIntensity: number; distance: number }) {
  const lightRef = useRef<PointLight>(null);
  useFrame(() => {
    if (lightRef.current) lightRef.current.intensity = props.maxIntensity * currentLighting.nightLights;
  });
  return (
    <pointLight
      ref={lightRef}
      position={props.position}
      color={props.color}
      intensity={0}
      distance={props.distance}
      decay={1.6}
      castShadow={false}
    />
  );
}

export function NightLights({ tier }: { tier: PerformanceTier }) {
  const groupRef = useRef<Group>(null);
  const glowTexture = useMemo(() => makeGlowTexture(), []);
  const materials = useMemo(() => LAMPS.map((lamp) => ({
    lamp,
    material: new SpriteMaterial({
      color: lamp.color,
      map: glowTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    }),
  })), [glowTexture]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const level = currentLighting.nightLights;
    group.visible = level > 0.02;
    if (!group.visible) return;
    const storm = useFarmStore.getState().stormProgress;
    const time = clock.elapsedTime;
    materials.forEach(({ lamp, material }, index) => {
      let intensity = lamp.base * level;
      if (lamp.blink) {
        // 暴雨预警快闪（~2.4Hz），夜间常态慢呼吸。
        intensity *= storm > 0.25
          ? (Math.sin(time * 15) > 0 ? 1 : 0.18)
          : 0.72 + 0.28 * Math.sin(time * 1.4 + index);
      } else {
        intensity *= 0.94 + 0.06 * Math.sin(time * 6.4 + index * 2.1);
      }
      material.opacity = intensity;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {materials.map(({ lamp, material }, index) => (
        <sprite
          key={index}
          position={lamp.position}
          scale={[lamp.size, lamp.size, 1]}
          material={material}
          renderOrder={5}
        />
      ))}
      {tier === "high" && (
        <>
          <NightPointLight position={[82, 6.4, 105]} color="#ffd9a0" maxIntensity={34} distance={58} />
          <NightPointLight position={[-120, 6, 118]} color="#cfe2ff" maxIntensity={22} distance={52} />
        </>
      )}
    </group>
  );
}
