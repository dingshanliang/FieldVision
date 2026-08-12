# Asset register

All downloaded runtime assets in this repository are CC0. Attribution is not legally required, but sources are recorded for auditability and replacement.

| Asset | Source | License | Runtime use | Downloaded |
|---|---|---|---|---|
| Rural Landscape 1K HDR | [Poly Haven](https://polyhaven.com/a/rural_landscape) | [CC0](https://polyhaven.com/license) | Runtime image-based lighting and material reflections; the visible sky remains procedural | 2026-07-19 |
| Ground 026 1K JPG | [ambientCG](https://ambientcg.com/view?id=Ground026) | [CC0](https://docs.ambientcg.com/license/) | Dry outer terrain | 2026-07-19 |
| Ground 037 1K JPG | [ambientCG](https://ambientcg.com/view?id=Ground037) | [CC0](https://docs.ambientcg.com/license/) | Field soil and damp canal edges | 2026-07-19 |
| Concrete 032 1K JPG | [ambientCG](https://ambientcg.com/view?id=Concrete032) | [CC0](https://docs.ambientcg.com/license/) | Pump station and canal structures | 2026-07-19 |
| Metal 025 1K JPG | [ambientCG](https://ambientcg.com/view?id=Metal025) | [CC0](https://docs.ambientcg.com/license/) | Gate and mechanical details | 2026-07-19 |
| Jiangnan Rice Horizon v1 | Project-generated with OpenAI ImageGen; art direction and prompt by the FieldVision project | Generated output used by its creator under the applicable OpenAI terms | Local photographic horizon cylinder for the Jiangnan rice demonstration area; runtime WebP at `public/assets/environment/jiangnan-rice-horizon-v1.webp` (cwebp q90, source PNG retained only during visual A/B) | 2026-07-22 |
| Hero Pump Skid (fv-66y.36 程序化) | In-scene procedural component (`src/scene/Facilities.tsx:HeroPumpSkid`) using Concrete032 + Metal025 PBR sets | Project-owned (self-authored) | A02 东支渠旁近景本地提升泵 skid（混凝土底盘 + 钢撬装架 + 电机/泵壳/管道 + 控制箱 LED）。退役历史：fv-o6c.9 Blender GLB（fieldvision-pump-station.glb，纯色材质 + scale 3.4x 读作建筑群）已删除，改为 PBR 程序化组装以同一号泵站材质语言 | 2026-08-12 |
| Hero Canal Inlet GLB | Project-generated via Blender script `scripts/blender/create_hero_assets_2.py` (fv-o6c.9) | Project-owned (self-authored) | A02 进水口节制闸（翼墙+闸板+启闭机+标尺+警示带）；`public/assets/models/fieldvision-canal-inlet.glb` | 2026-07-23 |
| Hero Culvert GLB | Project-generated via Blender script `scripts/blender/create_hero_assets_2.py` (fv-o6c.9) | Project-owned (self-authored) | 渠边机耕路箱涵（barrel+八字翼墙+消力池+路堤）；`public/assets/models/fieldvision-culvert.glb` | 2026-07-23 |
| Hero Rice Cluster GLB | Project-generated via Blender script `scripts/blender/create_hero_assets_2.py` (fv-o6c.9) | Project-owned (self-authored) | A02 近景前景英雄水稻丛（分蘖+叶片+稻穗）；`public/assets/models/fieldvision-rice-cluster.glb` | 2026-07-23 |
| Utility Vehicle GLB | Project-generated via Blender script `scripts/blender/create_utility_vehicle.py` (fv-66y.12, Blender 自制) | Project-owned (self-authored) | 机耕路比例锚点农用 utility truck（chassis+cab+cargo bed+4 轮+防滚架+大灯/尾灯）；`public/assets/models/fieldvision-utility-vehicle.glb` | 2026-08-12 |
| Field Worker GLB | Project-generated via Blender script `scripts/blender/create_field_worker.py` (fv-66y.20, Blender 自制) | Project-owned (self-authored) | A02 英雄镜头农事人员（弯腰检查姿态 + 田间终端 + 根区探针），替代基本几何人偶；`public/assets/models/fieldvision-field-worker.glb` | 2026-08-12 |

## Processing policy

- Source packages are reduced to the maps used by the browser build.
- Geometry assets will be exported from Blender as uncompressed GLB, then receive one Meshopt pass.
- Color/emissive textures use ETC1S where visual comparison permits. Normals/ORM default to ETC1S (q255 for normals to preserve directional precision); bump a specific map to UASTC only if banding appears (fv-66y.10).
- Draco and Meshopt are alternatives. This project does not stack both compression schemes.
