# 监督式自主智慧农场最终验收记录

> 分支：`feat/demo-enrichment-next`
> 验收日期：2026-08-13
> 权威环境：production build + 真实桌面 Chrome；Safari 为最终跨浏览器冒烟
> 当前结论：AC-01 至 AC-24 全部通过；Chrome 完整矩阵与 Safari production 冒烟均已完成

## 1. 交付结论

本轮已把九章节故事、双节奏、监督式确认、无人农机、空地巡田、泵闸执行和 D1/D3 复测连成同一套可重复状态机。Chrome 中，150 秒讲解由真实浏览器暂停、继续并点击确认后完整回库；90 秒快览连续运行 3 次，页面逐轮比对章节、任务数、活动设备数、真实 scene object/mesh/geometry 数与最终状态，并在每轮结束后隔离检测迟到写入，最终返回：

```text
FieldVision QA PASS · fast ×3 · return-overview · verified
```

Safari 在真实桌面 production build 上完成 90 秒快览，并返回：

```text
FieldVision QA PASS · fast ×1 · return-overview · verified
```

同一 production build 另以 Safari 手动验证 150 秒入口：播放后暂停 3 秒，界面保持 `已暂停`，继续后直接进入第 06 章并真实点击“确认执行”，页面形成 `Confirmation Receipt · 演示者入口`。页面加载、播放、暂停、确认和完成全程无可见阻断错误或 fallback。

## 2. 工程门禁

| 门禁 | 结果 | 证据 |
|---|---:|---|
| `pnpm test` | PASS | 17 files / 80 tests |
| `pnpm typecheck` | PASS | `tsc -b --pretty false`，0 errors |
| `pnpm lint` | PASS | `eslint .`，0 errors |
| `pnpm build` | PASS | Vite production build 完成 |
| 主 JS | PASS | 428.13 KB gzip，门禁 ≤ 450 KB |
| `public/assets` | PASS | 7,451,909 bytes，门禁 ≤ 10 MB |
| 三个智慧农机 GLB | PASS | 333,096 bytes；拖拉机 170,400、机器人 78,720、维护设备 83,976 bytes |

## 3. Chrome 浏览器矩阵

| 路径 | 尺寸 / 档位 | 结果 | 关键证据 |
|---|---|---:|---|
| 九章节讲解 | 1440×900 / high | PASS | 暂停 3 秒状态不变；真实点击确认生成 presenter receipt；最终回库 |
| 九章节快览连续三次 | 1440×900 / high | PASS | 三轮均为 848 objects / 701 meshes / 523 geometries；隔离期 0 写入、旧序列 0 写入 |
| 五类英雄镜头 | 1920×1080 / high | PASS | 作业场、无人拖拉机、A02 无人机、泵闸、D3 五张原始尺寸截图 |
| 九章节跳转 | 1024×768 / medium | PASS | 01–09 全部留图；标签、确认卡、详情和控制区无严重遮挡 |
| 五段业务闭环 | 1440×900 / low | PASS | 总览、无人作业、A02、灌溉、恢复全部留图且因果不变 |
| 键盘与减少动态 | 1440×900 / forced reduced motion | PASS | 方向键、Home 和 Enter 确认均可用，关键状态不跳过 |

可追溯截图：

- `evidence/chrome-1920-high-02-operations-yard.webp`
- `evidence/chrome-1920-high-03-tractor.webp`
- `evidence/chrome-1920-high-04-a02-uav.webp`
- `evidence/chrome-1920-high-07-irrigation.webp`
- `evidence/chrome-1920-high-08-d3-verified.webp`
- `evidence/chrome-1024-medium-01.webp` 至 `09.webp`
- `evidence/chrome-1440-low-01-overview.webp`、`03-autonomous.webp`、`05-a02.webp`、`07-irrigation.webp`、`08-recovery.webp`
- `evidence/chrome-1440-narration-paused.webp`
- `evidence/chrome-1440-narration-presenter-confirmed.webp`
- `evidence/chrome-1440-narration-return-overview.webp`
- `evidence/chrome-1440-keyboard-reduced-confirmed.webp`
- `evidence/chrome-1440-high-fast-3x-audited.webp`
- `evidence/safari-1440-high-fast-return-overview.webp`
- `evidence/safari-1440-high-presenter-confirmed.webp`

### 性能采样

| 档位 / 场景 | 平均 FPS | P10 FPS | 运行时资源 | 结论 |
|---|---:|---:|---|---:|
| high / 无人作业 | 60.0 | 59.5 | geometry 480；texture 67；真实 GLB hero + baked support LOD | PASS |
| medium / 无人作业 | 60.0 | 59.5 | geometry 399；texture 67；真实 GLB hero + baked support LOD | PASS |
| low / 无人作业 | 59.9 | 59.5 | geometry 284；真实 GLB 动态节点 + baked static LOD | PASS |

high 的可比扫描场景基线 P10 为 58.8 FPS，本轮无人作业 P10 为 59.5 FPS；geometry 480 低于对应基线峰值 455 + 40 的上限。medium 为 399，低于基线峰值 373 + 32；low 为 284，低于基线峰值 267 + 20。Chrome 应用源 console errors 为 0。用户浏览器中的 Immersive Translate 扩展产生过一次版本不匹配错误；来源为扩展，不计入应用 console。

## 4. AC-01 至 AC-24

| AC | 状态 | 自动化 / 状态证据 | 浏览器证据与说明 |
|---|---:|---|---|
| AC-01 | PASS | 双节奏共享同一九章节定义和状态预设 | 150 秒人工确认讲解与 `fast ×3` 均到回库/verified |
| AC-02 | PASS | Canonical Chapter Snapshot 单测覆盖直接跳转 | Chrome 直接跳转 03、06、08 后 3D/UI/任务同步恢复 |
| AC-03 | PASS | 暂停门禁与基于真实 elapsed 的业务计时 | production 暂停 3 秒，章节、无人机位置/阶段、三台农机位置/朝向/执行部件旋转及 HUD 逐值一致 |
| AC-04 | PASS | B03 领域数据断言为夏大豆播种—苗期 | 无人作业截图显示“B03 无人补播任务走廊” |
| AC-05 | PASS | 非当日设备不进入任务状态 | 总览仅保留停放设备，无跨季节设备同时运行 |
| AC-06 | PASS | 作业场设施契约测试 | 总览可见作业场、无人机机库、RTK、边缘控制和补能语义 |
| AC-07 | PASS | high/medium/low 节点与标签上限测试 | 三档强制路径均保留气象、定位、A02 与水利关键节点 |
| AC-08 | PASS | 章节驱动任务走廊显隐 | 03、06、08 章节分别聚焦补播、A02 安全边界与复测航线 |
| AC-09 | PASS | 拖拉机运动模型覆盖自检、转场、作业、地头转弯和回执 | Chrome high 可见 B03 拖拉机与补播苗情 |
| AC-10 | PASS | 巡检与维护路线边界单测 | 设备沿服务路线/维护带运行，不进入不匹配作物区 |
| AC-11 | PASS | B03 拖拉机障碍停止、人工接管状态测试 | 其他无依赖任务继续运行，异常不扩散为全场停机 |
| AC-12 | PASS | 实体机库局部坐标统一换算为共享世界锚点 | production 采样依次出现开盖自检、起飞爬升、返航进近、垂直降落、充电；最终距机库 4.4e-16 m |
| AC-13 | PASS | 固定观测与无人机证据模型测试 | D1/D3 截图显示固定观测、UAV NDRE 和待处置/解除状态 |
| AC-14 | PASS | 自动确认倒计时和演示来源回执测试 | 快览完整自运行经过同一确认入口 |
| AC-15 | PASS | 手动/自动确认进入同态授权状态测试 | 150 秒路径真实点击，生成 `Confirmation Receipt · 演示者入口` 并继续完成 |
| AC-16 | PASS | 目标/设备/路线/参数/安全边界变更使回执失效测试 | 失效后任务停在重新确认前 |
| AC-17 | PASS | 泵站→主闸→主渠→支闸→支渠→进水口顺序测试 | 快览与讲解均完成到 `verified` |
| AC-18 | PASS | Operation Completion 与 Verified Outcome 分离测试 | D1/D3 前风险保持待验证 |
| AC-19 | PASS | D1/D3 规则测试 | 复测截图显示 18%→27%、-12%→-1% 与风险解除 |
| AC-20 | PASS | 三档共用业务状态，降级只影响视觉容量 | medium 九章节与 low 五段矩阵保留确认、水利和复测闭环 |
| AC-21 | PASS | QA report 比较业务态和真实 scene/renderer 计数，并设 500ms 写入隔离窗 | 三轮均为 848/701/523；隔离期 0 store mutations，0 late writes；A02 recovered、水利 verified |
| AC-22 | PASS | 预算单测与 production build | 428.13 KB gzip；assets 7,451,909 bytes；新增农机 GLB 333,096 bytes |
| AC-23 | PASS | Chrome 多尺寸、多档、双节奏与严格三次资源审计通过 | Safari production `fast ×1` 完整到 `return-overview · verified`；另验证手动播放、暂停/继续与演示者确认并归档截图；无可见阻断错误 |
| AC-24 | PASS | reduced-motion 使镜头立即到位；关键状态不跳过 | 强制减少动态下，ArrowRight、Home 与 Enter 确认真实通过 |

## 5. 已知限制与后续动作

1. medium/low 是在同一台机器上强制走降级渲染路径，不等同于真实低端 GPU 性能数据。
2. high/medium 后处理启用时，部分 draw/triangles 调试计数会被渲染管线重置；性能判断以 FPS/P10 和可用 geometry 计数为准。
3. Safari 自动化环境存在显著后台计时节流，因此验收时持续保持窗口前台；最终业务状态与页面标题均通过。WebKit 不提供稳定的 renderer 计数，单次 Safari 路径只承担跨浏览器业务冒烟，资源不累计仍由 Chrome `fast ×3` 的严格 scene/renderer 对比负责。
