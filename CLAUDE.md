# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

## 项目是什么

FieldVision（禾境）是一个纯浏览器端的 3D 农田数字孪生 **演示 Demo**，没有后端、登录、数据库或真实 GIS 数据——所有业务数据都是本地 mock，三维电影式体验本身就是交付物。核心叙事：基地总览 → 进入 A02 英雄地块 → 无人机扫描发现缺水风险区 → 泵站+灌溉网络处置 → 恢复验证。

## 常用命令

```bash
pnpm install        # Node 22+，pnpm 10+
pnpm dev            # 开发服务器，http://127.0.0.1:4173
pnpm typecheck      # tsc -b（solution-style tsconfig，必须用它而非裸 tsc --noEmit）
pnpm lint           # eslint .
pnpm build          # tsc -b && vite build
pnpm preview        # 预览生产构建，同端口 4173
```

没有配置测试框架；改动后跑 `pnpm typecheck && pnpm lint && pnpm build`，视觉验收用真实浏览器。

重新生成无人机模型（需要桌面版 Blender）：

```bash
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup \
  --python scripts/blender/create_drone.py
# 输出：public/assets/models/fieldvision-drone.glb
```

## 架构：状态驱动的场景，而非组件驱动

理解本项目的关键是这条单向数据流：

```
useDemoSequence（异步时间线） → useFarmStore（zustand 唯一状态源） → CameraDirector / 场景组件 / UI 覆盖层（纯订阅响应）
```

- **`src/state/useFarmStore.ts`** — 全部全局状态：`selectedFieldId`、`viewMode`、`layerMode`、`demoStep`、`fieldStatuses`、`irrigationProgress` 等。场景组件和 UI 都不持有叙事状态，只订阅 store。
- **`src/hooks/useDemoSequence.ts`** — 演示编排。`play()`/`irrigate()` 是 async 函数，通过模块级 `AbortController` 保证可取消（任何用户操作先 abort 旧序列再启动新序列）。改演示节奏 = 改这里的 `wait()` 时长和 store 调用顺序。
- **`src/scene/CameraDirector.tsx`** — 唯一控制相机的地方。订阅 store 中的 `viewMode`/`demoStep`/`selectedFieldId`，从 `field.cameraPresets` 查镜头并调用 `CameraControls.setLookAt()`。不要在其他组件里直接动相机。
- **`src/data/fields.ts` / `facilities.ts`** — mock 数据即配置：地块多边形、指标、镜头预设都在这里。坐标约定：**多边形是 `[x, z]` 场景坐标，镜头是 `[x, y, z]`**。
- **`src/types/farm.ts`** — `FieldParcel` / `Facility` / `RiskZone` / `DemoStep` 等接口是接入真实数据时的稳定契约，替换 mock 时保持这些接口不变。
- **`src/config/visual.ts`** — 可调视觉/动画常量（雾、太阳强度、Bloom、无人机速度等）。
- **`src/hooks/usePerformanceTier.ts`** — 高/中/低性能档检测；`FarmCanvas` 据此设置 DPR（高档上限 1.75，低档固定 1），场景据此调植被密度、阴影和后期。

`src/scene/` 下每个文件对应一个场景域：`FarmScene`（装配）、`Terrain`、`Farmland`/`FieldParcel`（地块）、`CropInstances`（InstancedMesh 作物）、`RiskOverlay`、`IrrigationNetwork`、`Facilities`、`Drone`、`Atmosphere`。`src/ui/` 是 HTML 覆盖层（TopBar、LayerSwitcher、FieldDetailPanel、DemoTimeline）。

## 约定与规则

- **电影式 3D 场景是产品本体。** 不要让后台管理、CRUD、GIS、后端工作挤占 A02 相机俯冲、无人机扫描、灌溉恢复这条主线（详见 `docs/CODEX_TASK_3D_FARMLAND_DEMO.md` 和 `AGENTS.md`）。
- **性能纪律**：作物用 `InstancedMesh`；复用几何/材质，禁止逐帧创建对象；只有英雄对象和选中地块作物投影；后期只保留克制的 Bloom + Vignette。
- **资产管线**：原始/制作脚本放 `scripts/`，浏览器就绪资产放 `public/assets/`。外部资产必须 CC0 等明确许可并登记到 `ASSETS.md` 才能使用。大型 GLB 管线：Blender 未压缩 GLB → Meshopt → KTX2，**不叠加 Draco**。
- **接真实数据时**：保持 `src/types/farm.ts` 的接口不变逐步替换 mock；不要直接把地球坐标、原始高模、未压缩遥感文件塞进场景——先建坐标转换、LOD 和资产加载层。
- 领域术语（Base、Field Parcel、Hero Parcel、Risk Zone、Irrigation Response、Recovery 等）定义见 `CONTEXT.md`，沟通和命名时对齐这套语言。
