# Asset register

All downloaded runtime assets in this repository are CC0. Attribution is not legally required, but sources are recorded for auditability and replacement.

| Asset | Source | License | Runtime use | Downloaded |
|---|---|---|---|---|
| Rural Landscape 1K HDR | [Poly Haven](https://polyhaven.com/a/rural_landscape) | [CC0](https://polyhaven.com/license) | Runtime image-based lighting and material reflections; the visible sky remains procedural | 2026-07-19 |
| Ground 026 1K JPG | [ambientCG](https://ambientcg.com/view?id=Ground026) | [CC0](https://docs.ambientcg.com/license/) | Dry outer terrain | 2026-07-19 |
| Ground 037 1K JPG | [ambientCG](https://ambientcg.com/view?id=Ground037) | [CC0](https://docs.ambientcg.com/license/) | Field soil and damp canal edges | 2026-07-19 |
| Concrete 032 1K JPG | [ambientCG](https://ambientcg.com/view?id=Concrete032) | [CC0](https://docs.ambientcg.com/license/) | Pump station and canal structures | 2026-07-19 |
| Metal 025 1K JPG | [ambientCG](https://ambientcg.com/view?id=Metal025) | [CC0](https://docs.ambientcg.com/license/) | Gate and mechanical details | 2026-07-19 |
| Jiangnan Rice Horizon v1 | Project-generated with OpenAI ImageGen; art direction and prompt by the FieldVision project | Generated output used by its creator under the applicable OpenAI terms | Local photographic horizon cylinder for the Jiangnan rice demonstration area; `public/assets/environment/jiangnan-rice-horizon-v1.png` | 2026-07-22 |
| Hero Pump Skid GLB | Project-generated via Blender script `scripts/blender/create_hero_facilities.py` (fv-o6c.9, Blender 自制) | Project-owned (self-authored) | A02 东支渠旁近景 hero 提升泵 skid；`public/assets/models/fieldvision-pump-station.glb` | 2026-07-23 |

## Processing policy

- Source packages are reduced to the maps used by the browser build.
- Geometry assets will be exported from Blender as uncompressed GLB, then receive one Meshopt pass.
- Color/emissive textures use ETC1S where visual comparison permits; normal and ORM textures use UASTC.
- Draco and Meshopt are alternatives. This project does not stack both compression schemes.
