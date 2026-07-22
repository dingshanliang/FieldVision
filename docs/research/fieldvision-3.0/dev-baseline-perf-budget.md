# FieldVision 3.0 开发基线与性能预算

> Ticket: fv-o6c.1 · 分支: feat/a02-evidence-realism · 日期: 2026-07-22
> 目的：从当前 dev 基线记录真实指标，给实景资产、连续世界、导演镜头定可执行预算。
> 这是测量与预算文档，不改产品行为。

## 1. 当前基线（已测量）

### 1.1 构建产物（`pnpm build`）
- JS bundle: **1.45 MB**（gzip **400 KB**）——Three.js + R3F + postprocessing 占大头。
- CSS: 24 KB（gzip 8 KB）。
- 首屏关键路径：单个 index.js + 字体子集（Manrope/Newsreader 拉丁子集 ~25 KB）。

### 1.2 资产体积（`public/assets`，共 **21 MB**）
| 子目录 | 体积 | 说明 |
| --- | --- | --- |
| `textures/source/` | **17 MB** | 1K 源 JPG（Color/Normal/Roughness 三件套），**未压缩、未转 KTX2**。最大单文件 2.4 MB（Ground037 Normal）。 |
| `environment/` | 3.5 MB | `rural_landscape_1k.hdr` 1.6 MB、`jiangnan-rice-horizon-v1.png` 2 MB。 |
| `models/` | 592 KB | `fieldvision-drone.glb`（Meshopt+KTX2 已处理）。 |

**最大优化机会**：17 MB 源 JPG → KTX2（ETC1S/UASTC）通常可压到 1/4–1/3，且 GPU 直采省显存。资产路线 fv-o6c.2 已强制 KTX2，本基线确认其优先级最高。

### 1.3 性能分级（`usePerformanceTier`）
- **low**：`prefers-reduced-motion` 或窄屏或 `hardwareConcurrency ≤ 4`。
- **high**：`cores ≥ 8` 且 `devicePixelRatio ≤ 2.5`。
- **medium**：其余。

各档既有上限（`FarmCanvas` / `CropInstances`，即事实预算）：
| 维度 | high | medium | low |
| --- | --- | --- | --- |
| DPR | [1, 1.75] | [1, 1.4] | [1, 1] |
| 作物 InstancedMesh 上限 | 14000（选中）/ 9500 | 5200 | 2600 |
| 作物密度系数 | 1.0 | 0.5 | 0.24 |
| 阴影投影 | 选中田或 high 档 | 同 | 关闭 |
| 后期 Bloom+Vignette | ✓ | ✓ | ✗ |
| DepthOfField | 近景章节 | 近景章节 | ✗ |

## 2. 待补测量（需真实 Chrome DevTools 会话）
本基线已落硬件/体积/分级三项；以下需一次专注的 DevTools 性能会话（agent-browser 不便取精确 fps/VRAM），列为 fv-o6c.1 的 instrumentation 跟进：
- 五段镜头（overview / 俯冲 / 扫描 / 灌溉 / 复测）逐段 fps 与帧时间（high/medium/low 各一遍）。
- GPU 显存与 draw calls（`renderer.info`）。
- 冷启动加载时间（字体 + HDR + 地平线 + drone GLB）。
- 长动画/连续跳转的内存增长（leak 巡检）。

## 3. 建议预算（3.0 目标）

### 3.1 体积预算
- 资产总体积目标：**≤ 8 MB**（当前 21 MB）。主要靠 textures KTX2 化（17 → ~5 MB）。
- 单张纹理：Color/Normal ≤ 1K 且 KTX2 后 ≤ 300 KB；Roughness 可降到 512。
- environment：HDR 降到 `512` 或换 LUT (~400 KB)；地平线 PNG → WebP/KTX2 ≤ 800 KB。
- JS bundle：维持 gzip ≤ 450 KB；新增导演/证据代码已在该范围内。

### 3.2 运行预算（保守，待 DevTools 校准）
- high 档：五段镜头稳定 **≥ 50 fps**；draw calls ≤ 120；首屏可交互 ≤ 4 s（4G 模拟）。
- medium 档：≥ 30 fps；draw calls ≤ 80；后期保留。
- low 档：≥ 24 fps；关闭后期与远景粒子；故事顺序不破坏。

### 3.3 纪律（与 CLAUDE.md 一致）
- 作物只许 InstancedMesh；禁止逐帧创建几何/材质。
- 只有英雄对象与选中地块作物投影。
- 后期只保留克制 Bloom + Vignette；DoF 仅近景章节。
- 新增大资产（GLB/纹理/HDRI）必须：明确许可 + 登记到 ASSETS.md + 走 KTX2（GLB：Meshopt+KTX2，不叠 Draco）。

## 4. 结论
当前 dev 基线在体积上的最大风险是 **17 MB 未压缩源纹理**；运行分级逻辑与作物/后期降级策略已成型且与故事顺序解耦。3.0 资产与连续世界实现（fv-o6c.9/10）应把"纹理 KTX2 化 + 体积 ≤ 8 MB"作为硬预算，运行 fps 等精确指标待 DevTools 会话补齐后定稿。
