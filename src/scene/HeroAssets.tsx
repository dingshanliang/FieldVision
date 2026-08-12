import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

/**
 * A02 hero 资产集合（fv-o6c.9，Blender 自制 GLB，第二批）。
 *  - 涵洞：置于渠边机耕路过水处；
 *  - 稻株簇：A02 近景前景的英雄水稻丛（克隆 3 丛），近景镜头读到稻穗/叶片细节。
 * 全部加法放置，不替换既有程序化设施/作物。资产由 scripts/blender/create_hero_assets_2.py 生成。
 *
 * 尺度修正（fv-3py）：Blender 生成器里的 cube() 参数实际作为 half-extents 使用，导出的
 * CanalInlet / Culvert 已经是米级模型；这里历史上又分别放大 3.2× / 2.4×，让相邻的两个
 * 水工构筑物叠成约 27×21×9m 的浅黄体块，在总览里误读成大型建筑。
 *
 * CanalInlet 与 GroundDetails 的程序化 HeroIrrigationInlet 功能重复，直接退役；Culvert 保留
 * 机耕路过水语义，但缩回约 5.4×4.2×1.85m，并让底部贴地，形成低矮的田间箱涵轮廓。
 */
const CULVERT_URL = "/assets/models/fieldvision-culvert.glb";
const RICE_URL = "/assets/models/fieldvision-rice-cluster.glb";

const RICE_CLUMPS: Array<{ pos: [number, number, number]; rot: number }> = [
  { pos: [14, 1.3, -58], rot: 0.4 },
  { pos: [21, 1.3, -63], rot: 2.1 },
  { pos: [9, 1.3, -53], rot: 3.6 },
];

function Culvert() {
  const { scene } = useGLTF(CULVERT_URL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const concrete = new Color("#55584f");
    const concreteShadow = new Color("#343a35");
    const packedEarth = new Color("#4b4636");
    clone.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const materials = sourceMaterials.map((source) => {
        if (!(source instanceof MeshStandardMaterial)) return source;
        const material = source.clone();
        material.color.copy(
          source.name.includes("earth")
            ? packedEarth
            : source.name.includes("shadow")
              ? concreteShadow
              : concrete,
        );
        material.roughness = Math.max(material.roughness, 0.94);
        material.metalness = 0;
        material.envMapIntensity = 0.22;
        return material;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0]!;
    });
    return clone;
  }, [scene]);
  return (
    <group position={[63, 0.48, -13]} rotation={[0, 1.15, 0]} scale={0.48}>
      <primitive object={model} />
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

/**
 * 性能分级（fv-o6c.13）：hero 资产按档降级，保护低端帧率。
 *  - high：涵洞 + 稻株簇（全套近景细节）；
 *  - medium：涵洞（跳过 3 丛克隆稻株，省 mesh）；
 *  - low：无 hero GLB（进水口节制闸由程序化 HeroIrrigationInlet 呈现，灌溉叙事不依赖 GLB）。
 * 资产均异步加载（~1MB GLB，不计入 JS bundle）。
 */
export function HeroAssets() {
  const tier = usePerformanceTier();
  // 每个 hero GLB 各自包边界（fv-66y.14）：单个资产 404/解码失败只降级它自己，
  // 不杀全局。fallback=null 即静默缺失——演示流程的旁白/字幕仍能继续。
  return (
    <group>
      {tier !== "low" && <SceneErrorBoundary name="Culvert"><Culvert /></SceneErrorBoundary>}
      {tier === "high" && <SceneErrorBoundary name="RiceClusters"><RiceClusters /></SceneErrorBoundary>}
    </group>
  );
}

useGLTF.preload(CULVERT_URL);
useGLTF.preload(RICE_URL);
