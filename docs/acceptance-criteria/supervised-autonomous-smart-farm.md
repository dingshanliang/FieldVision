# Acceptance Criteria：监督式自主智慧农场演示

> Source: `docs/prd/supervised-autonomous-smart-farm.md`
> Generated: 2026-08-12
> Status: COMPLETE — AC-01…AC-24 passed in the final production acceptance matrix
> Evidence authority: production build + real desktop browser + focused automated checks
> Detailed record: `docs/research/fieldvision-smart-farm/final-acceptance-record.md`

## User Story 1：观众理解同一清晨的智慧农场任务

- **As a** 现场观众
- **I want to** 从基地上线进入一条连续的九章节故事
- **so that** 我能理解多类设备如何在同一清晨协同，而不是观看互不相关的模型展示

### AC-01：两种节奏共享完整九章节

**Priority:** P0

**Scenario:** 快览与讲解保留相同业务闭环
**Given:** 页面已加载且任务状态已复位
**When:** 分别播放 90 秒快览和约 150 秒讲解
**Then:** 两次播放均依次经过基地上线、任务计划、无人作业、空地巡田、A02 异常、监督式决策、水利执行、D1/D3 复测和回库总览

### AC-02：章节可直接恢复规范状态

**Priority:** P0

**Scenario:** 演示者从任意状态跳转章节
**Given:** 任一设备或处置任务正在运行
**When:** 演示者直接进入另一个章节
**Then:** 3D、UI、任务、确认、进度和结果共同恢复为该章节的 Canonical Chapter Snapshot

### AC-03：暂停冻结业务时间

**Priority:** P0

**Scenario:** 讲解期间暂停演示
**Given:** 无人设备或灌溉任务正在推进
**When:** 演示者点击暂停
**Then:** 任务进度、设备位移和业务状态停止变化，而低干扰环境微动可继续

## User Story 2：观众看到可信的当日农事组合

- **As a** 农业业务观众
- **I want to** 看到与地域、季节和作物阶段一致的并行任务
- **so that** 我不会把 Demo 误认为跨季节农机展

### AC-04：B03 承载初夏补播任务

**Priority:** P0

**Scenario:** 查看 B03 当前任务
**Given:** 时间锚定为长江中下游 6 月上旬
**When:** 演示进入 B03 无人作业
**Then:** B03 显示夏大豆播种—苗期和补播任务，不再显示油菜苗期

### AC-05：非当日设备保持停放

**Priority:** P1

**Scenario:** 基地总览展示作业场
**Given:** 当日任务只有补播、巡检、维护和 A02 处置
**When:** 相机经过智慧作业场
**Then:** 只有折叠整地机和平板拖车作为无标签静态轮廓存在，不出现插秧、植保和收割设备同时运行

## User Story 3：观众一眼识别智慧作业场与感知网络

- **As a** 现场观众
- **I want to** 在总览中识别设备归属、支撑设施和当前协同关系
- **so that** 我能理解基地为何“智慧”，同时仍把农田和设备作为视觉主体

### AC-06：现有管理站升级为统一作业场

**Priority:** P0

**Scenario:** 基地上线时查看西北管理站
**Given:** 场景处于基地总览
**When:** 智慧基础设施依次上线
**Then:** 现有管理站呈现出库、停放/补能、无人机机库、RTK、边缘控制和例外检修语义，且没有新增第二座大型机库

### AC-07：支撑节点保持代表性密度

**Priority:** P1

**Scenario:** 不同性能档显示感知网络
**Given:** high、medium、low 分别进入基地总览
**When:** 支撑网络可见
**Then:** 三档分别保留约 15、10、6 个代表节点，HTML 标签不超过 8、5、3，且关键气象、定位、A02 墒情和水利节点不会全部消失

### AC-08：空间信息随任务收敛

**Priority:** P0

**Scenario:** 从总览进入执行章节
**Given:** 总览曾短暂显示基地拓扑
**When:** 当前任务开始执行
**Then:** 空间显示收敛为当前任务走廊，并按 0–20m 动作、20–80m 路线、80m 以上轮廓控制信息密度

## User Story 4：观众理解无人农机正在完成真实任务

- **As a** 现场观众
- **I want to** 看到无人拖拉机、巡检机器人和维护设备执行不同任务
- **so that** 我能从动作和回执判断它们不是无目的移动模型

### AC-09：无人拖拉机完成可信补播

**Priority:** P0

**Scenario:** B03 补播从转场推进到完成
**Given:** 值守员已确认 B03 补播任务
**When:** 无人拖拉机进入批准作业区
**Then:** 场景依次表现 RTK 检查、机具落地、条带覆盖、地头减速抬机具与灯泡转弯，并形成覆盖率和机具状态回执

### AC-10：地面设备遵守空间边界

**Priority:** P0

**Scenario:** 巡检和维护任务并行运行
**Given:** 巡检机器人分配到 A03/B02 边缘且维护设备分配到泵站维护带
**When:** 两个任务推进
**Then:** 巡检机器人只沿可通行服务路线运行，维护设备不进入作物区，二者均不压过田埂或穿越不匹配作物

### AC-11：障碍触发停止与人工接管

**Priority:** P0

**Scenario:** 无人拖拉机遇到无法自主处理的障碍
**Given:** B03 补播正在执行且其他任务不存在共享危险区
**When:** 系统注入模拟障碍事件
**Then:** 拖拉机减速停止并请求人工接管，而无依赖的无人机、巡检和维护任务继续安全运行

## User Story 5：观众理解无人机与地面感知协同复核

- **As a** 现场观众
- **I want to** 看到无人机从自动机库完成巡田和 A02 复核
- **so that** 我能理解空地协同证据如何形成，而不是把扫描动画当作自动诊断

### AC-12：无人机任务具有完整起降闭环

**Priority:** P1

**Scenario:** 无人机执行 A02 复核
**Given:** 自动机库和无人机处于待命状态
**When:** A02 复核任务开始
**Then:** 机库开盖、自检、起飞、航测、返航、降落和充电状态依次可见

### AC-13：A02 风险来自多源证据

**Priority:** P0

**Scenario:** 无人机完成 A02 多光谱复核
**Given:** A02 固定墒情或水位 Observation 已提示偏差
**When:** 航测结果与固定观测共同进入证据模型
**Then:** 场景形成待处置 Risk Zone，但不把单一指数或单点读数写成确定病因

## User Story 6：演示者清楚控制监督式自主边界

- **As a** 现场演示者
- **I want to** 在自动播放和讲解模式中使用同一远程确认入口
- **so that** 观众能看懂人的责任，而两种演示方式保持相同业务状态

### AC-14：自动播放可见地模拟确认

**Priority:** P0

**Scenario:** 自动播放进入 A02 监督式决策
**Given:** 处置目标、设备、预计时长和风险边界已显示
**When:** 自动播放完成确认倒计时
**Then:** 界面明确显示“模拟值守员点击确认”，并生成带演示来源的 Confirmation Receipt

### AC-15：讲解模式手动确认进入同态状态

**Priority:** P0

**Scenario:** 演示者手动确认同一方案
**Given:** 讲解模式停留在未确认的 A02 处置方案
**When:** 演示者点击确认执行
**Then:** 任务进入与自动确认相同的已授权状态，差异只保留在 Confirmation Receipt 来源

### AC-16：关键变更使确认失效

**Priority:** P0

**Scenario:** 已确认任务发生关键变化
**Given:** A02 处置已有有效 Confirmation Receipt
**When:** 目标地块、设备、路线、参数或安全边界被模拟修改
**Then:** 原确认立即失效，任务停止在重新确认前，不继续执行旧方案

## User Story 7：观众看到有因果且经过验证的 A02 结果

- **As a** 现场观众
- **I want to** 跟随水从泵站到 A02，并看到 D1/D3 复测
- **so that** 我能区分设备完成、到水、恢复和风险解除

### AC-17：智能水利严格按依赖顺序执行

**Priority:** P0

**Scenario:** 已确认的 A02 处置开始
**Given:** 下游安全检查通过且 Confirmation Receipt 有效
**When:** 自主灌溉任务推进
**Then:** 泵站、主闸、主渠、支闸、支渠和 A02 进水口严格按依赖顺序动作并回传状态

### AC-18：Operation Completion 不提前解除风险

**Priority:** P0

**Scenario:** 水利设备完成批准动作
**Given:** A02 已到水但 D1/D3 复测尚未完成
**When:** 灌溉任务进入 Operation Completion
**Then:** 风险仍保持待验证状态，不因动画结束或设备回执自动解除

### AC-19：D1/D3 形成 Verified Outcome

**Priority:** P0

**Scenario:** 固定观测和无人机复飞达到目标
**Given:** D1 根区观测已改善且 D3 多光谱复飞已完成
**When:** 多源结果满足恢复规则
**Then:** A02 形成 Verified Outcome、Risk Zone 解除，并保留处置前后证据

## User Story 8：演示在目标设备上稳定交付

- **As a** 现场演示者
- **I want to** 在不同性能档、尺寸和支持浏览器中稳定播放
- **so that** 正式汇报不会因资源、重复播放或降级路径而中断

### AC-20：性能降级保留业务因果

**Priority:** P0

**Scenario:** medium 或 low 档播放完整故事
**Given:** 场景按性能档减少英雄、节点、标签、阴影和后期效果
**When:** 演示从基地上线运行至 Verified Outcome
**Then:** 无人作业、模拟确认、水利执行和 D1/D3 复测仍按相同状态模型完成

### AC-21：重复播放不累计状态

**Priority:** P0

**Scenario:** 连续三次播放 90 秒快览
**Given:** production 页面和全部资产已加载
**When:** 每次从复位开始连续播放三次
**Then:** 三次章节顺序、关键数值、对象数量、最终任务结果和回库状态一致，且旧序列不再写入

### AC-22：资源预算保持在门禁内

**Priority:** P0

**Scenario:** production 构建完成
**Given:** 全部智慧农场资产已纳入构建
**When:** 检查产物体积和运行时资源增量
**Then:** 主 JS 不超过 450 KB gzip、`public/assets` 不超过 10 MB、本轮新增资产不超过 3.2 MB，并满足各档设备与标签上限

### AC-23：真实浏览器矩阵通过

**Priority:** P0

**Scenario:** 执行最终浏览器验收
**Given:** 所有 P0/P1 功能已实现且 production build 可用
**When:** 按 PRD 第 13 节执行 Chrome 多尺寸/多档和 Safari 冒烟路径
**Then:** 所有必测路径无阻断错误、Chrome console 为 0 errors，截图和状态证据可追溯到对应场景

### AC-24：可访问控制保持可用

**Priority:** P1

**Scenario:** 使用键盘和减少动态效果
**Given:** 用户启用 `prefers-reduced-motion` 并仅使用键盘
**When:** 用户播放、暂停、切换章节和确认任务
**Then:** 所有关键控制具有可见焦点和可读名称，镜头运动被缩短但确认、异常和结果状态不被跳过

## Gate Policy

每张实现票必须：

1. 运行与改动最相关的单元或集成测试；
2. 运行 `pnpm typecheck`、`pnpm lint`、`pnpm build`；
3. 在 1440×900 production Chrome 验证该票对应业务路径；
4. 记录控制台错误、截图/状态证据和未覆盖项；
5. 不把普通说明文案、装饰性 copy 或大范围截图快照作为测试契约。

最终完成要求所有 P0 和 P1 场景通过。Safari 只在最终批次执行完整 90 秒冒烟；Chrome 是自动化和性能证据的权威浏览器。

## Verification Record Template

| AC | Status | Automated evidence | Browser evidence | Notes |
|---|---|---|---|---|
| AC-01…AC-22 | PASS | 80 tests；typecheck/lint/build；双节奏及三次重播自检 | Chrome 多尺寸、多档、关键章节截图与性能采样 | 详见最终验收记录 |
| AC-23 | PASS | Chrome 矩阵与严格三次资源审计通过 | Safari production 90 秒快览完整到 `return-overview · verified` | Safari 单次路径为跨浏览器业务冒烟，资源累计以 Chrome 三次审计为准 |
| AC-24 | PASS | reduced-motion 与控制角色验证 | Chrome 键盘入口和可读名称可用 | 详见最终验收记录 |
