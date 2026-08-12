import { Html, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useKtx2 } from "./ktx2Loader";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { useMemo, useRef } from "react";
import { ExtrudeGeometry, Group, MeshStandardMaterial, RepeatWrapping, Shape, SRGBColorSpace, Texture } from "three";
import { useFarmStore } from "../state/useFarmStore";
import { deriveIrrigationEvent } from "../state/irrigationEvent";

type PbrSet = [Texture, Texture, Texture];

function useMaterialMaps(asset: "Concrete032" | "Metal025", repeat = 1): PbrSet {
  const [sourceColor, sourceNormal, sourceRoughness] = useKtx2([
    `/assets/textures/source/${asset}/${asset}_1K-JPG_Color.ktx2`,
    `/assets/textures/source/${asset}/${asset}_1K-JPG_NormalGL.ktx2`,
    `/assets/textures/source/${asset}/${asset}_1K-JPG_Roughness.ktx2`,
  ]);
  return useMemo(() => {
    const maps = [sourceColor.clone(), sourceNormal.clone(), sourceRoughness.clone()] as PbrSet;
    maps.forEach((texture) => { texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping; texture.repeat.set(repeat, repeat); });
    maps[0].colorSpace = SRGBColorSpace;
    return maps;
  }, [repeat, sourceColor, sourceNormal, sourceRoughness]);
}

function GableRoof({ width, height, depth, y, color }: { width: number; height: number; depth: number; y: number; color: string }) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const result = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    result.translate(0, 0, -depth / 2);
    result.computeVertexNormals();
    return result;
  }, [width, height, depth]);
  return (
    <mesh geometry={geometry} position-y={y} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.3} envMapIntensity={0.5} />
    </mesh>
  );
}

function PumpStation() {
  const [colorMap, normalMap, roughnessMap] = useMaterialMaps("Concrete032", 1.4);
  const progress = useFarmStore((state) => state.irrigationProgress);
  const event = deriveIrrigationEvent(progress);
  const active = event.pumpProgress > 0;
  const statusRef = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const mat = statusRef.current;
    if (!mat) return;
    const p = event.pumpProgress;
    if (p <= 0) { mat.emissiveIntensity = 0; return; }
    // Smoothstep ramp so the strip warms up instead of snapping full-bright;
    // a starting flicker decays through the first half of the ramp as the
    // pump "catches" — reads as a motor spinning up, not a switch.
    const ease = p * p * (3 - 2 * p);
    const flicker = p < 0.5 ? (1 - p / 0.5) * (Math.sin(clock.elapsedTime * 28) * 0.5 + 0.5) : 0;
    mat.emissiveIntensity = ease * 3.2 + flicker * 0.7;
  });
  return (
    <group position={[82, 1.6, 108]} rotation={[0, -0.16, 0]}>
      {/* concrete apron */}
      <mesh position-y={0.14} receiveShadow>
        <boxGeometry args={[21, 0.3, 16]} />
        <meshStandardMaterial color="#7d7a6e" map={colorMap} normalMap={normalMap} roughnessMap={roughnessMap} roughness={0.9} />
      </mesh>
      {/* main hall */}
      <RoundedBox args={[13, 6, 8.6]} radius={0.35} smoothness={3} position-y={3.3} castShadow receiveShadow>
        <meshStandardMaterial color="#9a9c90" map={colorMap} normalMap={normalMap} roughnessMap={roughnessMap} roughness={0.85} envMapIntensity={0.4} />
      </RoundedBox>
      <GableRoof width={14.4} height={2.4} depth={10.2} y={6.3} color="#3c434a" />
      {/* door + louvres on the south face */}
      <mesh position={[3.6, 2.5, 4.42]} castShadow>
        <boxGeometry args={[2.2, 4.2, 0.25]} />
        <meshStandardMaterial color="#2c3532" roughness={0.55} metalness={0.3} />
      </mesh>
      {[-3.2, -0.6].map((x) => (
        <group key={x} position={[x, 4.6, 4.42]}>
          <mesh>
            <boxGeometry args={[1.9, 1.3, 0.22]} />
            <meshStandardMaterial color="#38423e" roughness={0.7} metalness={0.2} />
          </mesh>
          {[-0.42, -0.14, 0.14, 0.42].map((y) => (
            <mesh key={y} position={[0, y, 0.14]}>
              <boxGeometry args={[1.72, 0.07, 0.08]} />
              <meshStandardMaterial color="#788078" metalness={0.35} roughness={0.52} />
            </mesh>
          ))}
        </group>
      ))}
      {/* status strip */}
      <mesh position={[0, 6.05, 4.45]}>
        <boxGeometry args={[6.4, 0.28, 0.1]} />
        <meshStandardMaterial ref={statusRef} color={active ? "#7ff0a5" : "#5c665f"} emissive={active ? "#3fdf7c" : "#000000"} emissiveIntensity={0} />
      </mesh>
      {/* outlet pipe running north into the canal */}
      <mesh position={[-5.2, 1.5, -7.2]} rotation={[Math.PI / 2.18, 0, 0]} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 11.5, 20]} />
        <meshStandardMaterial color="#3d4c46" roughness={0.42} metalness={0.55} envMapIntensity={0.7} />
      </mesh>
      <mesh position={[-5.2, 3.2, -2.2]} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 3.4, 20]} />
        <meshStandardMaterial color="#43524c" roughness={0.42} metalness={0.55} envMapIntensity={0.7} />
      </mesh>
      {/* pipe flanges, roof vents and safety rail make the plant read as real infrastructure */}
      <mesh position={[-5.2, 0.72, -11.9]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.16, 0.16, 10, 28]} />
        <meshStandardMaterial color="#33433e" metalness={0.65} roughness={0.38} />
      </mesh>
      {[-3.1, 3.1].map((x) => (
        <group key={x} position={[x, 8.15, -0.8]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.38, 0.48, 1.7, 16]} />
            <meshStandardMaterial color="#59625d" metalness={0.48} roughness={0.46} />
          </mesh>
          <mesh position-y={0.9} castShadow>
            <cylinderGeometry args={[0.62, 0.38, 0.18, 16]} />
            <meshStandardMaterial color="#3d4743" metalness={0.52} roughness={0.42} />
          </mesh>
        </group>
      ))}
      {[-8.4, -4.2, 0, 4.2, 8.4].map((x) => (
        <mesh key={x} position={[x, 1.2, 7.35]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 2.1, 8]} />
          <meshStandardMaterial color="#b7a55c" metalness={0.55} roughness={0.48} />
        </mesh>
      ))}
      <mesh position={[0, 2.12, 7.35]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 17, 8]} />
        <meshStandardMaterial color="#b7a55c" metalness={0.55} roughness={0.48} />
      </mesh>
      <mesh position={[-1.6, 3.5, 4.56]}>
        <boxGeometry args={[2.5, 0.7, 0.09]} />
        <meshStandardMaterial color="#273a35" roughness={0.7} />
      </mesh>
      <Html position={[0, 9.6, 0]} center distanceFactor={90}><div className="facility-tag">一号智慧泵站 <i className={active ? "is-online" : ""} /></div></Html>
    </group>
  );
}

function Gate() {
  const [colorMap, normalMap, roughnessMap] = useMaterialMaps("Metal025", 1.1);
  const [concreteColor, concreteNormal, concreteRoughness] = useMaterialMaps("Concrete032", 1.2);
  const progress = useFarmStore((state) => state.irrigationProgress);
  const event = deriveIrrigationEvent(progress);
  const ledRef = useRef<MeshStandardMaterial>(null);
  // Ease-in-out on the gate leaf so it lifts with mechanical weight
  // (slow → fast → settle) instead of a linear crawl.
  const opening = event.gateProgress;
  const openingEase = opening * opening * (3 - 2 * opening);
  useFrame(() => {
    const mat = ledRef.current;
    if (!mat) return;
    const g = event.gateProgress;
    mat.emissiveIntensity = g <= 0 ? 0 : (g * g * (3 - 2 * g)) * 1.6;
  });
  return (
    <group position={[69, 0.38, -18]} rotation={[0, 0.18, 0]}>
      <RoundedBox args={[8.4, 0.55, 5.2]} radius={0.14} smoothness={2} position-y={0.04} receiveShadow>
        <meshStandardMaterial color="#74776f" map={concreteColor} normalMap={concreteNormal} roughnessMap={concreteRoughness} roughness={0.94} />
      </RoundedBox>
      {[-2.9, 2.9].map((x) => (
        <RoundedBox key={x} args={[1.3, 4.8, 2.1]} radius={0.12} smoothness={2} position={[x, 2.55, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#858980" map={concreteColor} normalMap={concreteNormal} roughnessMap={concreteRoughness} roughness={0.9} envMapIntensity={0.28} />
        </RoundedBox>
      ))}
      {/* guide rails */}
      {[-2.32, 2.32].map((x) => (
        <mesh key={x} position={[x, 2.4, 0]}>
          <boxGeometry args={[0.18, 4.6, 0.5]} />
          <meshStandardMaterial color="#4a524e" metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 5.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.5, 0.42, 2.65]} />
        <meshStandardMaterial color="#5c625e" metalness={0.22} roughness={0.62} envMapIntensity={0.4} />
      </mesh>
      {/* rising gate leaf */}
      <mesh position={[0, 2.1 + openingEase * 2.7, 0]} castShadow>
        <boxGeometry args={[4.6, 3.6, 0.32]} />
        <meshStandardMaterial color="#96907f" map={colorMap} normalMap={normalMap} roughnessMap={roughnessMap} metalness={0.6} roughness={0.5} envMapIntensity={0.6} />
      </mesh>
      {/* hoist */}
      <RoundedBox args={[2.1, 1.2, 1.55]} radius={0.16} smoothness={2} position={[0, 5.95, 0]} castShadow>
        <meshStandardMaterial color="#31443f" metalness={0.4} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 5.95, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.52, 0.09, 10, 24]} />
        <meshStandardMaterial color="#b8934a" metalness={0.75} roughness={0.32} envMapIntensity={0.8} />
      </mesh>
      {[-1.72, -0.86, 0, 0.86, 1.72].map((x) => (
        <mesh key={x} position={[x, 2.1 + openingEase * 2.7, 0.21]}>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshStandardMaterial color="#363b39" metalness={0.72} roughness={0.34} />
        </mesh>
      ))}
      {/* bridge handrails */}
      {[-1.12, 1.12].flatMap((z) => [-3.45, -1.72, 0, 1.72, 3.45].map((x) => (
        <mesh key={`${z}-${x}`} position={[x, 6.02, z]}>
          <cylinderGeometry args={[0.055, 0.055, 1.65, 8]} />
          <meshStandardMaterial color="#b8ad62" metalness={0.56} roughness={0.44} />
        </mesh>
      )))}
      {[-1.12, 1.12].map((z) => (
        <group key={z}>
          {[5.55, 6.65].map((y) => (
            <mesh key={y} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.055, 0.055, 7.1, 8]} />
              <meshStandardMaterial color="#b8ad62" metalness={0.56} roughness={0.44} />
            </mesh>
          ))}
        </group>
      ))}
      <RoundedBox args={[1.15, 1.7, 0.85]} radius={0.1} smoothness={2} position={[2.2, 6.05, -0.2]} castShadow>
        <meshStandardMaterial color="#54635d" metalness={0.38} roughness={0.52} />
      </RoundedBox>
      <mesh position={[2.2, 6.15, 0.25]}>
        <boxGeometry args={[0.58, 0.42, 0.04]} />
        <meshStandardMaterial ref={ledRef} color={event.gateProgress > 0 ? "#72d69b" : "#303936"} emissive={event.gateProgress > 0 ? "#3fbd75" : "#000000"} emissiveIntensity={0} />
      </mesh>
    </group>
  );
}

function WeatherStation() {
  const rotor = useRef<Group>(null);
  useFrame((_, delta) => {
    if (rotor.current) rotor.current.rotation.y += delta * 2.4;
  });
  return (
    <group position={[-12, 0.9, 132]}>
      <mesh position-y={4.5} castShadow>
        <cylinderGeometry args={[0.09, 0.16, 9, 10]} />
        <meshStandardMaterial color="#b9c0ba" metalness={0.7} roughness={0.35} envMapIntensity={0.6} />
      </mesh>
      {/* solar panel */}
      <mesh position={[1.05, 3.1, 0]} rotation={[0, 0, -0.5]} castShadow>
        <boxGeometry args={[1.6, 0.08, 1.1]} />
        <meshStandardMaterial color="#20344d" metalness={0.55} roughness={0.3} envMapIntensity={0.9} />
      </mesh>
      {/* radiation shield */}
      <mesh position={[-0.85, 4.4, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.8, 12]} />
        <meshStandardMaterial color="#dde3de" roughness={0.5} />
      </mesh>
      {/* crossarm + anemometer */}
      <mesh position={[0, 8.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.7, 8]} />
        <meshStandardMaterial color="#aeb6b0" metalness={0.7} roughness={0.4} />
      </mesh>
      <group ref={rotor} position={[0, 9.1, 0]}>
        {[0, 1, 2].map((index) => (
          <group key={index} rotation={[0, (index * Math.PI * 2) / 3, 0]}>
            <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.84, 6]} />
              <meshStandardMaterial color="#c8cec8" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[0.84, 0, 0]}>
              <sphereGeometry args={[0.16, 10, 8]} />
              <meshStandardMaterial color="#333d3a" roughness={0.45} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0, 9.5, 0]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#e8ede8" roughness={0.35} />
      </mesh>
    </group>
  );
}

function Warehouse() {
  return (
    <group position={[-122, 1.4, 112]} rotation={[0, -0.35, 0]}>
      <mesh position-y={0.12} receiveShadow>
        <boxGeometry args={[26, 0.25, 17]} />
        <meshStandardMaterial color="#6f6a5c" roughness={0.95} envMapIntensity={0.25} />
      </mesh>
      <RoundedBox args={[22, 6.4, 13]} radius={0.4} smoothness={3} position-y={3.4} castShadow receiveShadow>
        <meshStandardMaterial color="#84796a" roughness={0.85} envMapIntensity={0.35} />
      </RoundedBox>
      <GableRoof width={23.4} height={3} depth={14.4} y={6.6} color="#414a44" />
      {/* 双开间出库门：直接升级既有 STORE-01，不叠加第二座机库。 */}
      {[-4, 4].map((doorX) => (
        <group key={doorX} position={[doorX, 2.9, 6.62]}>
          <mesh castShadow>
            <boxGeometry args={[6.5, 5, 0.3]} />
            <meshStandardMaterial color="#3c4c44" roughness={0.5} metalness={0.35} />
          </mesh>
          {[-2.3, -1.15, 0, 1.15, 2.3].map((x) => (
            <mesh key={x} position={[x, 0, 0.19]}>
              <boxGeometry args={[0.05, 4.7, 0.04]} />
              <meshStandardMaterial color="#68736c" metalness={0.34} roughness={0.58} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * A02 东支渠旁的本地提升泵 skid（fv-66y.36 程序化重制）。
 *
 * 原 fv-o6c.9 的 Blender GLB（fieldvision-pump-station.glb）实测视觉质量远不如
 * 同场景的 PumpStation：纯色 Principled BSDF vs Concrete032 PBR 贴图；20+ sub-element
 * 在 scale 3.4x 下读作"建筑群"而非泵；暖橘漆面 + 黄黑警示带与环境对撞。距灌溉相机
 * 终态 [69,1.8,-22] 仅 ~3 单位，缺陷被特写放大。
 *
 * 改为程序化组装，silhouette 明确读作 ~1.5m 高的小型农业灌溉撬装设备（非建筑）：
 *   混凝土底盘（Concrete032 PBR，同一号泵站）
 *   + 钢撬装架 4 腿 + 平台（Metal025 PBR）
 *   + 卧式电机 + 散热翅片 + 风扇罩
 *   + 联轴器 + 泵蜗壳（青铜色）+ 进/出水管
 *   + 控制箱 + 状态 LED（灌溉启动时亮绿，与 PumpStation 状态条同步）
 * 资产退役：删除 GLB 文件 + create_hero_facilities.py 脚本（见 ASSETS.md）。
 */
function HeroPumpSkid() {
  const [padColor, padNormal, padRoughness] = useMaterialMaps("Concrete032", 0.6);
  const [steelColor, steelNormal, steelRoughness] = useMaterialMaps("Metal025", 0.4);
  const progress = useFarmStore((state) => state.irrigationProgress);
  const event = deriveIrrigationEvent(progress);
  const active = event.pumpProgress > 0;
  const ledRef = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    const mat = ledRef.current;
    if (!mat) return;
    const p = event.pumpProgress;
    if (p <= 0) { mat.emissiveIntensity = 0; return; }
    const ease = p * p * (3 - 2 * p);
    mat.emissiveIntensity = ease * 3.2;
  });
  const MOTOR_Y = 0.95;
  return (
    <group position={[66.5, 0.7, -23]} rotation={[0, -0.6, 0]}>
      {/* 混凝土底盘 */}
      <mesh position-y={0.15} receiveShadow castShadow>
        <boxGeometry args={[2.4, 0.3, 1.6]} />
        <meshStandardMaterial color="#7d7a6e" map={padColor} normalMap={padNormal} roughnessMap={padRoughness} roughness={0.92} />
      </mesh>
      {/* 钢撬装架：4 腿 + 平台 */}
      {[-1.0, 1.0].flatMap((x) => [-0.6, 0.6].map((z) => (
        <mesh key={`leg-${x}-${z}`} position={[x, 0.55, z]} castShadow>
          <boxGeometry args={[0.09, 0.5, 0.09]} />
          <meshStandardMaterial color="#4a5051" map={steelColor} normalMap={steelNormal} roughnessMap={steelRoughness} roughness={0.5} metalness={0.72} envMapIntensity={0.55} />
        </mesh>
      )))}
      <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.06, 1.25]} />
        <meshStandardMaterial color="#4a5051" map={steelColor} normalMap={steelNormal} roughnessMap={steelRoughness} roughness={0.5} metalness={0.72} envMapIntensity={0.55} />
      </mesh>
      {/* 电机（卧式圆柱）+ 散热翅片 + 风扇罩 */}
      <group position={[-0.45, MOTOR_Y, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.7, 24]} />
          <meshStandardMaterial color="#384654" roughness={0.42} metalness={0.5} envMapIntensity={0.6} />
        </mesh>
        {[-0.25, -0.1, 0.05, 0.2].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.225, 0.225, 0.025, 24]} />
            <meshStandardMaterial color="#2c3845" roughness={0.5} metalness={0.5} />
          </mesh>
        ))}
        <mesh position={[-0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.22, 0.06, 24]} />
          <meshStandardMaterial color="#25303a" roughness={0.6} metalness={0.45} />
        </mesh>
      </group>
      {/* 联轴器 */}
      <mesh position={[0.05, MOTOR_Y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 16]} />
        <meshStandardMaterial color="#5a6062" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* 泵蜗壳（青铜色短圆柱 + 端盖） */}
      <mesh position={[0.25, MOTOR_Y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.28, 28]} />
        <meshStandardMaterial color="#6c5b48" roughness={0.45} metalness={0.55} envMapIntensity={0.5} />
      </mesh>
      <mesh position={[0.4, MOTOR_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
        <meshStandardMaterial color="#4d4030" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* 出水立管（向上接田面方向） */}
      <mesh position={[0.25, MOTOR_Y + 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 14]} />
        <meshStandardMaterial color="#5e6868" roughness={0.45} metalness={0.6} />
      </mesh>
      {/* 进水管（从渠道侧水平接入） */}
      <mesh position={[0.5, MOTOR_Y - 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.35, 14]} />
        <meshStandardMaterial color="#5e6868" roughness={0.45} metalness={0.6} />
      </mesh>
      {/* 控制箱 + 状态 LED（灌溉启动时亮绿） */}
      <group position={[0.95, 0.95, -0.45]}>
        <mesh castShadow>
          <boxGeometry args={[0.28, 0.45, 0.18]} />
          <meshStandardMaterial color="#3a3e3c" roughness={0.6} metalness={0.3} envMapIntensity={0.4} />
        </mesh>
        <mesh position={[0.105, 0.12, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.03, 12]} />
          <meshStandardMaterial ref={ledRef} color={active ? "#7ff0a5" : "#3a4540"} emissive={active ? "#3fdf7c" : "#000000"} emissiveIntensity={0} />
        </mesh>
      </group>
    </group>
  );
}

export function Facilities() {
  return (
    <group>
      <PumpStation />
      <Gate />
      <SceneErrorBoundary name="HeroPumpSkid"><HeroPumpSkid /></SceneErrorBoundary>
      <WeatherStation />
      <Warehouse />
    </group>
  );
}
