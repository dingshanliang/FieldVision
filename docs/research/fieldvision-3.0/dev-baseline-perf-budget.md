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
| `models/` | 1.5 MB | `fieldvision-drone.glb` 603K + 3.0 hero 资产（fv-o6c.9 Blender 自制）：泵 skid 281K、渠口 124K、涵洞 69K、稻株簇 524K。异步加载，不计入 JS bundle。 |

**最大优化机会**：17 MB 源 JPG → KTX2（ETC1S/UASTC）通常可压到 1/4–1/3，且 GPU 直采省显存。资产路线 fv-o6c.2 已强制 KTX2，本基线确认其优先级最高。（当前无 KTX2 编码器，列为工具安装跟进。）

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

### 1.4 FieldVision 3.0 新视觉层分级（fv-o6c.13）
| 组件 | high | medium | low |
| --- | --- | --- | --- |
| WorldLod 连续世界（fv-o6c.10） | 110 中景条带 + 双村庄 + 远田 | 70 条带 + 双村庄 + 远田 | 36 条带（无村庄/远田） |
| HeroAssets（fv-o6c.9） | 渠口 + 涵洞 + 3 丛稻株 | 渠口 + 涵洞 | 仅渠口 |
| EvidenceMap/SpatialEvidence（fv-o6c.11） | 全（NDRE 图 + 分源点钉 + 日标签） | 全 | 全（轻量 DOM/着色器） |
| 导演系统 PresenterControls（fv-o6c.12） | 全（键控 + HUD + 双节奏） | 全 | 全（纯 DOM/逻辑） |
| 时间跳切卡 TimeCutCard | 全 | 全 | 全 |

降级原则不变：只减细节，不破坏五段故事顺序与证据因果。

## 2. 运行时测量（真实 Chrome，agent-browser rAF 采样）

本机 high 档（cores≥8）、localhost、总览稳态：
- **avgFps 60.3 / p10Fps 57.8**（90 帧采样，稳定贴近 vsync 60）。
- **loadMs 714**（navigation loadEventEnd - startTime，localhost）。

> 说明：本机为 high 档基准；medium/low 档帧率需在对应设备实测（降级策略见 1.3/1.4 保证不破坏故事顺序）。draw calls / GPU 显存需暴露 `renderer.info` 的调试钩子（当前未暴露，列为可选 instrumentation）。

## 2b. 仍可选跟进的 DevTools 项
- 五段镜头逐段 fps（medium/low 设备各一遍）。
- `renderer.info` draw calls / 显存（需加调试钩子）。
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

## 5. 运行时 instrumentation 与测量协议（fv-66y.3 · 2026-08-12）

> 本节兑现 §2 末尾与 §2b 列出的「`renderer.info` 调试钩子未暴露」跟进项。

### 5.1 交付：`?perf=1` 实时 HUD
- URL 带 `?perf=1` 时挂载 `<PerfProbe/>`（Canvas 内，每帧采样帧时、每 500ms 读 `gl.info`）与 `<PerfHud/>`（右下角固定覆盖层）。无该参数时**挂载跳过**，零运行时成本。
- HUD 字段：`frames`（心跳，>0 即证明 R3F 循环在驱动探针）/ `fps` / `p10 fps` / `draw`（draw calls）/ `tris` / `tex` / `geo` / `prog`。
- fps/p10 计算抽成纯函数 `computeFpsStats`，由 `src/scene/perfStats.test.ts` 单测（稳态 60Hz、10% 卡顿拉低 p10、空窗/零和返回 0 不产生 Infinity）。
- 同时把实时 sample 暴露到 `window.__perf`，便于在控制台读取/录制。

### 5.2 在真实汇报机上测量（协议）
1. `pnpm build && pnpm preview`，Chrome/Safari 打开 `http://127.0.0.1:4173/?perf=1`，窗口 1440×900（high 档）。
2. **low 档**：窗口宽 <900px，或系统开启 `prefers-reduced-motion`。**medium 档**：`hardwareConcurrency` 5–7 的设备。
3. 逐章节读 HUD（overview → enter → drone-scan → irrigation → recovery）：draw calls 与 fps 随章节变化，需分章节记录。
4. 与 §3.2 预算对照：high draw ≤120 / ≥50fps；medium draw ≤80 / ≥30fps；low ≥24fps。

### 5.3 本次会话已确定量（确定性，机器无关）
- JS bundle：raw **1.55 MB**，gzip **459 KB**。⚠️ 较 §1.1 的 400 KB 基线漂移 +59 KB，且已**超出 §3.1 的 450 KB 预算 +9 KB**——属本分支既有状态（fv-66y.3 instrumentation 增量 <1 KB gzip）。建议作为独立的 code-splitting/依赖审计 follow-up，不在本票范围。
- 资产 `public/assets`：原 22 MB → **~8.7 MB**。textures/source 17 MB（未压缩 JPG）→ **3.1 MB（KTX2/ETC1S）**（fv-66y.10 已执行：`scripts/textures/convert-ktx2.sh` + KTX2Loader swap；JPG 已删，见 git 历史）。environment 3.5 MB、models 1.5 MB、basis transcoder ~0.6 MB。已贴近 §3.1「≤8 MB」目标。

### 5.4 诚实状态
instrumentation（§2/§2b 的 renderer.info 钩子）**已交付且单测覆盖**；实时 fps/draw 的权威数值须在真实桌面浏览器按 §5.2 采集。尝试在内嵌 in-app browser guest 中采样时，其 WebGL rAF 循环未驱动（`frames` 心跳恒为 0，且该 guest 的 evaluate/screenshot 被禁），进一步印证测量须在真实浏览器进行，该 guest 亦非汇报目标机。

