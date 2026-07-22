# FieldVision 3.0 交付文档

> 版本: 3.0 · 分支: feat/a02-evidence-realism · 收口: 2026-07-23 (fv-o6c.15)
> 状态：五个方向全部实现并通过真实浏览器验收；可作为正式汇报 Demo 使用。
> 关联：地图 `bd show fv-o6c`；验收记录 `acceptance-record.md`；性能基线 `dev-baseline-perf-budget.md`。

## 1. FieldVision 3.0 是什么

纯浏览器端 3D 农田数字孪生**演示 Demo**（无后端/登录/数据库）。核心叙事：基地总览 → 进入 A02 英雄地块 → 无人机扫描发现缺水风险区 → 泵站+灌溉网络处置 → 农业真实时间轴上的恢复验证。3.0 把"可信度"做到位：真实尺度环境、有证据的异常判断、有因果的处置、可验证的恢复。

## 2. 五个方向的实现与决策

| 方向 | 票据 | 决策 | 实现 |
| --- | --- | --- | --- |
| 多源证据与遥感语言 | fv-o6c.6/.11 | 混合方案：NDRE 正射图为空间英雄 + 地面三源分色点钉（不混源）+ D1/D3 日标签 | `EvidenceMap`（NDRE 着色器）+ `SpatialEvidence`（分源点钉）+ `recoveryModel`（相位驱动证据） |
| 农业真实时间轴 | fv-o6c.3/.17 | 有效分蘖期浅水/间歇灌溉；D0→D7 多阶段复测；27% 属 D1、0.8亩属 D3 | 相位驱动作物恢复（修同日恢复 bug）+ `TimeCutCard`（次日 D1 / D3 跳切）+ 敲定 mock 数值 |
| 连续农田世界 | fv-o6c.5/.10 | 分层 LOD（近/中/远，色温暖→冷、密度递减） | `WorldLod`（中景相邻田 + 远景村庄 + 远田色带），全 InstancedMesh + 雾化收敛 |
| 导演化现场演示 | fv-o6c.7/.12 | 演讲者控制层 + 快览/讲解双节奏 | `PresenterControls`（空格暂停/←→章节/Home 总览 + HUD）+ `useDemoSequence` 暂停感知 + 双节奏时长 |
| A02 实景资产化 | fv-o6c.2/.4/.9 | Blender 自制 GLB+KTX2 为全档权威；3DGS 推迟 | 4 个 Blender 自制 hero GLB（泵 skid/渠口/涵洞/稻株簇）+ 管线脚本 + ASSETS.md |

## 3. 如何运行

```bash
pnpm install && pnpm dev     # http://127.0.0.1:4173
pnpm typecheck && pnpm lint && pnpm build && pnpm test   # 质量门禁（vitest 11/11）
```

- 自动播放：加载后自动开始五段演示（`?qa=1` 关闭自动播放，供 QA/截图驱动状态）。
- 演讲者键控：`空格` 暂停/继续 · `←/→` 上一/下一章节 · `Home` 回安全总览。
- 节奏：底部 `快览`(~33s) / `讲解`(~75s) 切换。
- 图层：左侧 实景/长势/墒情/设施 切换；长势层显示 NDRE + 分源证据。
- 重新生成 hero 资产（需桌面 Blender）：`scripts/blender/create_hero_facilities.py`、`create_hero_assets_2.py`。

## 4. 关键架构（状态驱动）

```
useDemoSequence（暂停感知 + 双节奏 + 时间跳切） → useFarmStore（zustand 唯一源，含 recoveryPhase/pacing/paused）
  → CameraDirector / 场景组件（EvidenceMap, SpatialEvidence, WorldLod, HeroAssets, CropInstances…）/ UI 覆盖层
```
- 证据/恢复由 `recoveryPhase`（none→arrived→d1-root→d3-reflight→resolved）驱动，分四源（UAV 冠层 / 根区 VWC / 田间水位 / 渠道水尺），来源=颜色=图标一一对应。
- 接口契约稳定（`src/types/farm.ts`）；替换 mock 接真实数据时保持接口不变。

## 5. 性能与资产

- 构建：JS 1.46MB（gzip ~403KB）；资产 `public/assets` 21MB（textures 17MB 未压为最大优化点）。
- 性能分级（high/medium/low）：DPR、作物 InstancedMesh 上限、阴影、后期、WorldLod、HeroAssets 均按档降级；降级只减细节，不破坏故事顺序与证据因果（详见 `dev-baseline-perf-budget.md`）。
- 外部资产全部 CC0 或项目自制，登记于 `ASSETS.md`。

## 6. 已知跟进（不阻塞交付）

- **合并回 dev + push（fv-o6c.16）**：需用户明确授权。
- **纹理 KTX2 压缩**（17MB→~5MB）：需安装 KTX2 编码器（toktx/gltf-pack/gltf-transform），未授权。
- **DevTools 精确 fps/显存/加载测量**（fv-o6c.1 instrumentation）：需一次专注的 DevTools 会话。
- **hero 资产电影级精修**：可由导演镜头进一步拉近或美术深化（可选）。
- 声景（风/虫鸟/无人机/泵/水）：本轮不做（现有 PRD 列为后续改进包）。

## 7. 交付清单（commit on feat/a02-evidence-realism，未 push）

证据原型 · 证据生产化 · 性能基线 · 连续世界 · 导演系统 · hero 资产(×2 批) · 性能分级 · 验收记录 · 本交付文档。
