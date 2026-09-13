/**
 * 远景鸟群（fv-66y.5 微动/生命感）。作物风阵已在 CropInstances 的着色器里
 * 实现， irriga­tion 粒子覆盖水面生命感；本组件补"天空有活物"——一小群剪影鸟
 * 以循环节奏偶尔掠过天空（旅行期 + 间歇期），而非一直忙碌。低档跳过。
 *
 * 设计要点：
 * - 每只鸟=两片薄翼（inner-edge 绑定到身体中心），绕 z 轴拍动；MeshBasicMaterial
 *   做剪影，受场景 fog 影响自然融入远空。
 * - 整群沿 x 平移穿越天空；travelProgress>1 的间歇期整群隐藏，形成"偶尔出现"。
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, Group, MeshBasicMaterial, PlaneGeometry } from "three";
import { seededRandom } from "../utils/geometry";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { useFarmStore } from "../state/useFarmStore";
import { currentLighting } from "../config/dayNight";

const TRAVEL_X0 = -175;
const TRAVEL_X1 = 175;
const ALTITUDE = 94;
const DEPTH = -120;
const SPEED = 12; // units/sec across the sky
const REST_FRACTION = 0.5; // half the cycle the flock is gone → intermittent

function Bird({ phase, flapSpeed, wingSpan }: { phase: number; flapSpeed: number; wingSpan: number }) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const material = useMemo(
    () => new MeshBasicMaterial({ color: "#2b2b30", transparent: true, opacity: 0.82, side: DoubleSide, depthWrite: false }),
    [],
  );
  const { leftGeo, rightGeo } = useMemo(() => {
    // Inner edge at the body centre (origin) so wings pivot at the shoulder.
    const l = new PlaneGeometry(wingSpan * 0.5, 0.24);
    l.translate(-wingSpan * 0.25, 0, 0);
    const r = new PlaneGeometry(wingSpan * 0.5, 0.24);
    r.translate(wingSpan * 0.25, 0, 0);
    return { leftGeo: l, rightGeo: r };
  }, [wingSpan]);

  useFrame(({ clock }) => {
    const flap = Math.sin(clock.elapsedTime * flapSpeed + phase) * 0.5;
    if (left.current) left.current.rotation.z = -(0.45 + flap);
    if (right.current) right.current.rotation.z = 0.45 + flap;
  });

  return (
    <group>
      <group ref={left}>
        <mesh geometry={leftGeo} material={material} />
      </group>
      <group ref={right}>
        <mesh geometry={rightGeo} material={material} />
      </group>
    </group>
  );
}

export function BirdFlock() {
  const tier = usePerformanceTier();
  const groupRef = useRef<Group>(null);
  const count = tier === "high" ? 7 : 5;
  const birds = useMemo(() => {
    const rng = seededRandom(7);
    return Array.from({ length: count }, (_, index) => ({
      key: index,
      offsetX: (rng() - 0.5) * 14,
      offsetY: (rng() - 0.5) * 5,
      offsetZ: (rng() - 0.5) * 5,
      phase: rng() * Math.PI * 2,
      flapSpeed: 5.5 + rng() * 2.5,
      wingSpan: 5 + rng() * 2.5,
    }));
  }, [count]);

  const travelSeconds = (TRAVEL_X1 - TRAVEL_X0) / SPEED;
  const cycle = travelSeconds / (1 - REST_FRACTION);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    // fv-photo 冻结：定格时鸟群停摆；夜幕/暴雨（作业灯亮起）时归巢隐去。
    if (useFarmStore.getState().photoFrozen) return;
    const grounded = currentLighting.nightLights > 0.55;
    if (grounded) {
      g.visible = false;
      return;
    }
    const tInCycle = clock.elapsedTime % cycle;
    const travelProgress = tInCycle / travelSeconds;
    if (travelProgress > 1) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.x = TRAVEL_X0 + travelProgress * (TRAVEL_X1 - TRAVEL_X0);
    g.position.y = ALTITUDE + Math.sin(clock.elapsedTime * 0.5) * 1.2;
  });

  return (
    <group ref={groupRef} position={[TRAVEL_X0, ALTITUDE, DEPTH]} renderOrder={2}>
      {birds.map((b) => (
        <group key={b.key} position={[b.offsetX, b.offsetY, b.offsetZ]}>
          <Bird phase={b.phase} flapSpeed={b.flapSpeed} wingSpan={b.wingSpan} />
        </group>
      ))}
    </group>
  );
}
