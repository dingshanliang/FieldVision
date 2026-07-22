import { useGLTF } from "@react-three/drei";
import { heroIrrigationInlet } from "../data/fields";

/**
 * A02 hero 资产集合（fv-o6c.9，Blender 自制 GLB，第二批）。
 *  - 渠口节制闸：置于东支渠入 A02 进水口，灌溉章节镜头可见；
 *  - 涵洞：置于渠边机耕路过水处；
 *  - 稻株簇：A02 近景前景的英雄水稻丛（克隆 3 丛），近景镜头读到稻穗/叶片细节。
 * 全部加法放置，不替换既有程序化设施/作物。资产由 scripts/blender/create_hero_assets_2.py 生成。
 */
const INLET_URL = "/assets/models/fieldvision-canal-inlet.glb";
const CULVERT_URL = "/assets/models/fieldvision-culvert.glb";
const RICE_URL = "/assets/models/fieldvision-rice-cluster.glb";

const RICE_CLUMPS: Array<{ pos: [number, number, number]; rot: number }> = [
  { pos: [14, 1.3, -58], rot: 0.4 },
  { pos: [21, 1.3, -63], rot: 2.1 },
  { pos: [9, 1.3, -53], rot: 3.6 },
];

function CanalInlet() {
  const { scene } = useGLTF(INLET_URL);
  return (
    <group position={[heroIrrigationInlet.x, 1.0, heroIrrigationInlet.z]} rotation={[0, -0.35, 0]} scale={3.2}>
      <primitive object={scene} />
    </group>
  );
}

function Culvert() {
  const { scene } = useGLTF(CULVERT_URL);
  return (
    <group position={[63, 0.9, -13]} rotation={[0, 1.15, 0]} scale={2.4}>
      <primitive object={scene} />
    </group>
  );
}

function RiceClusters() {
  const { scene } = useGLTF(RICE_URL);
  // 克隆同一场景用于多丛（共享几何/材质，节省内存）。
  const clumps = RICE_CLUMPS.map(() => scene.clone());
  return (
    <group>
      {clumps.map((clump, i) => (
        <group key={i} position={RICE_CLUMPS[i]!.pos} rotation={[0, RICE_CLUMPS[i]!.rot, 0]} scale={2.0}>
          <primitive object={clump} />
        </group>
      ))}
    </group>
  );
}

export function HeroAssets() {
  return (
    <group>
      <CanalInlet />
      <Culvert />
      <RiceClusters />
    </group>
  );
}

useGLTF.preload(INLET_URL);
useGLTF.preload(CULVERT_URL);
useGLTF.preload(RICE_URL);
