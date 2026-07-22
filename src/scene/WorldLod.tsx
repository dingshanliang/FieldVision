import { useMemo } from "react";
import { BoxGeometry, Color, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, Vector3 } from "three";
import { seededRandom } from "../utils/geometry";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

/**
 * 连续农田世界（fv-o6c.10，方向 C 分层 LOD）。
 * 在英雄地块外围补三层，消除"孤立地块 + 大面积底板"感：
 *  - 中景：相邻农田条带（不同作物/色相），让英雄地块成为连片稻区的一部分；
 *  - 远景：村庄轮廓（建筑尺度锚点）+ 远田色带；
 *  - 远景→地平线的色温收敛交给现有 fogExp2（暖→冷自动完成）。
 * 全部 InstancedMesh，按性能档降级（low 仅保留中景少量条带）。
 */

const CROP_COLORS = ["#5f7938", "#6a8a3e", "#839649", "#b39a4a", "#7d8f4a", "#537a34"];

interface StripSpec { x: number; z: number; rotation: number; width: number; depth: number; color: string }

function buildFieldStrips(count: number, ringMin: number, ringMax: number): StripSpec[] {
  const random = seededRandom(20260723);
  const strips: StripSpec[] = [];
  let attempts = 0;
  while (strips.length < count && attempts < count * 8) {
    attempts += 1;
    const angle = random() * Math.PI * 2;
    const radius = ringMin + random() * (ringMax - ringMin);
    strips.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius * 0.78, // 椭圆环，匹配地形宽高比
      rotation: random() * Math.PI,
      width: 26 + random() * 34,
      depth: 18 + random() * 26,
      color: CROP_COLORS[Math.floor(random() * CROP_COLORS.length)]!,
    });
  }
  return strips;
}

interface HouseSpec { x: number; z: number; rotation: number; scale: number }

function buildVillage(center: [number, number], count: number, spread: number): HouseSpec[] {
  const random = seededRandom(center[0] * 13 + center[1] * 7 + 55127);
  const houses: HouseSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = random() * Math.PI * 2;
    const r = random() * spread;
    houses.push({
      x: center[0] + Math.cos(a) * r,
      z: center[1] + Math.sin(a) * r * 0.7,
      rotation: Math.floor(random() * 4) * (Math.PI / 2) + (random() - 0.5) * 0.4,
      scale: 0.7 + random() * 0.6,
    });
  }
  return houses;
}

const MATRIX = new Matrix4();
const UP = new Vector3(0, 1, 0);
const QUAT = new Quaternion();
const POS = new Vector3();
const SCL = new Vector3();
const TMP_COLOR = new Color();

/** 单位平面靠 instanceMatrix 缩放成条带，摊在地面。 */
const UNIT_PLANE = new PlaneGeometry(1, 1);
const WALL_BOX = new BoxGeometry(1, 1, 1);
const ROOF_BOX = new BoxGeometry(1, 1, 1);

function applyStrips(mesh: InstancedMesh | null, strips: StripSpec[]) {
  if (!mesh) return;
  strips.forEach((s, i) => {
    QUAT.setFromAxisAngle(UP, s.rotation);
    POS.set(s.x, 0.12, s.z);
    SCL.set(s.width, s.depth, 1);
    MATRIX.compose(POS, QUAT, SCL);
    mesh.setMatrixAt(i, MATRIX);
    TMP_COLOR.set(s.color).offsetHSL(0, (Math.sin(i * 12.9) - 0.5) * 0.04, (Math.cos(i * 7.3) - 0.5) * 0.05);
    mesh.setColorAt(i, TMP_COLOR);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function MidFarmland({ count }: { count: number }) {
  const strips = useMemo(() => buildFieldStrips(count, 158, 248), [count]);
  return (
    <instancedMesh args={[UNIT_PLANE, undefined, strips.length]} receiveShadow ref={(m: InstancedMesh | null) => applyStrips(m, strips)}>
      <meshStandardMaterial roughness={0.95} metalness={0} side={2} />
    </instancedMesh>
  );
}

function Village({ center, count, spread }: { center: [number, number]; count: number; spread: number }) {
  const houses = useMemo(() => buildVillage(center, count, spread), [center, count, spread]);
  const apply = (mesh: InstancedMesh | null, kind: "wall" | "roof") => {
    if (!mesh) return;
    houses.forEach((h, i) => {
      const q = new Quaternion().setFromAxisAngle(UP, h.rotation);
      if (kind === "wall") {
        POS.set(h.x, 1.4 * h.scale, h.z);
        SCL.set(h.scale * 2.4, h.scale * 2.8, h.scale * 1.7);
      } else {
        // 屋顶：比墙稍大、压扁、45° 倾斜，形成人字轮廓近似。
        POS.set(h.x, 3.0 * h.scale, h.z);
        SCL.set(h.scale * 2.9, h.scale * 1.1, h.scale * 2.0);
        q.premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 4));
      }
      MATRIX.compose(POS, q, SCL);
      mesh.setMatrixAt(i, MATRIX);
      TMP_COLOR.set(kind === "wall" ? "#9a958a" : "#6b4a3a").offsetHSL(0, 0, (Math.sin(i * 3.1) - 0.5) * 0.04);
      mesh.setColorAt(i, TMP_COLOR);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  return (
    <group>
      <instancedMesh args={[WALL_BOX, undefined, houses.length]} ref={(m: InstancedMesh | null) => apply(m, "wall")} receiveShadow>
        <meshStandardMaterial roughness={0.9} metalness={0} />
      </instancedMesh>
      <instancedMesh args={[ROOF_BOX, undefined, houses.length]} ref={(m: InstancedMesh | null) => apply(m, "roof")}>
        <meshStandardMaterial roughness={0.85} metalness={0} />
      </instancedMesh>
    </group>
  );
}

function DistantFields() {
  const bands = useMemo(() => {
    const random = seededRandom(88421);
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + random() * 0.3;
      const r = 300 + random() * 60;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r * 0.8, rotation: a, color: CROP_COLORS[i % CROP_COLORS.length] };
    });
  }, []);
  return (
    <group>
      {bands.map((b, i) => (
        <mesh key={i} position={[b.x, 0.1, b.z]} rotation={[-Math.PI / 2, 0, b.rotation]}>
          <planeGeometry args={[120, 70]} />
          <meshStandardMaterial color={b.color} transparent opacity={0.5} roughness={1} metalness={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export function WorldLod() {
  const tier = usePerformanceTier();
  const fieldCount = tier === "high" ? 110 : tier === "medium" ? 70 : 36;
  return (
    <group>
      <MidFarmland count={fieldCount} />
      {tier !== "low" && (
        <>
          <Village center={[-262, -158]} count={tier === "high" ? 16 : 11} spread={60} />
          <Village center={[268, 150]} count={tier === "high" ? 12 : 8} spread={48} />
          <DistantFields />
        </>
      )}
    </group>
  );
}
