# Acceptance Criteria: 演示因果状态

> Source: `docs/prd/a02-explainable-recovery-and-hero-realism.md` 4.4、4.5、4.11
> Generated: 2026-07-22
> Functional Points: 4
> Scenarios: 12 (Happy: 4 | Error: 4 | Boundary: 4)

## 1. 统一处置事件模型

### AC-01: 单一进度推导全部处置状态
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | src/state/irrigationEvent.test.ts ordered single-model test passed

Given A02 从风险状态开始且灌溉进度为 0
When 演示进度单调推进至完成
Then 泵站、闸门、主渠、东支渠、A02 进水口、湿润锋和复测状态均由同一事件模型推导，且不使用互不关联的独立计时器

### AC-01-E1: 非法进度被安全约束
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | invalid progress clamping test passed

Given 调用方传入小于 0、大于 1 或非有限进度
When 事件模型计算处置状态
Then 输出保持在合法范围且不产生 `NaN`、倒退水位或无法识别的阶段

### AC-01-B1: 阶段边界保持连续
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | monotonic stage-boundary assertions passed

Given 进度位于相邻设备阶段的切换边界前后
When 连续采样状态
Then 已完成阶段不会回退，下一阶段从 0 连续开始，并保持严格的泵站→闸门→主渠→东支渠→进水口顺序

## 2. 设备与水路因果顺序

### AC-02: 观众可见设备启动顺序
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | 1440x900 real browser irrigation snapshot showed ordered gate/main/branch/inlet receipts; 0 console errors

Given 演示进入灌溉处置章节
When 处置从 0 播放到 A02 到水
Then 场景和回执依次表现泵站启动、闸门开启、主渠到水、东支渠到水、A02 进水口到水，任一后续节点不得早于前置节点

### AC-02-E1: 子视觉缺失不阻断主序列
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | main sequence is derived independently of optional particles and Html receipts; typecheck and browser run passed

Given 粒子、水尺或次要标注不可用
When 灌溉处置继续播放
Then 相机、设备状态、水面推进和章节状态仍可完成，不抛出运行时错误

### AC-02-B1: 低性能档保持相同因果顺序
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | all tiers consume deriveIrrigationEvent; low tier changes visual density only

Given 性能档为 low
When 播放灌溉处置
Then 可以减少粒子和小物，但设备、渠道和到水顺序与 high 档一致

## 3. 章节规范状态

### AC-03: 任意章节可直接进入
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | canonical preset and atomic store transition tests passed

Given 用户处于任意演示状态
When 依次跳转基地总览、进入地块、发现异常、灌溉处置和恢复验证
Then 每一章节应用明确的规范状态，UI 数值、设施状态、扫描覆盖、水位、作物颜色和风险状态相互一致

### AC-03-E1: 跳转会取消旧序列
**Type**: Error Case | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | useDemoSequence abort controller cancels the only active sequence before new state writes

Given 自动演示或灌溉动画正在播放
When 用户跳转章节、复位或重新播放
Then 旧序列立即取消且不再写入状态，新章节不被旧动画覆盖

### AC-03-B1: 直接进入恢复验证得到完整结果
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | recovered canonical preset test proves 27 percent target, full scan, recovered state

Given 用户从基地总览直接点击恢复验证
When 章节状态应用完成
Then A02 显示复测完成、墒情 27%、风险解除、渠道处置完成和恢复后的作物状态

## 4. 重复演示稳定性

### AC-04: 连续三次播放结果一致
**Type**: Happy Path | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | deterministic pure event model and canonical reset tested; no accumulated state

Given 页面资产已经加载
When 完整演示连续播放三次且每次从复位开始
Then 三次的设备顺序、最终状态和关键数值一致

### AC-04-E1: 快速重复点击不会并发播放
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | single module-scoped AbortController is aborted before play or irrigate; playing state prevents duplicate UI trigger

Given 用户快速重复触发播放或灌溉
When 新序列开始
Then 同时最多存在一个活动序列，按钮状态和最终结果不会抖动或重复累计

### AC-04-B1: 返回总览清除临时视觉
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | overview canonical preset clears progress and scan; store transition test passed

Given 扫描、灌溉或恢复对比正在显示
When 用户返回基地总览
Then 临时标注、扫描带和对比层被清除，基地返回可再次演示的稳定初始状态

## Self-Check Report

| Check | Status | Notes |
|---|---|---|
| Happy paths exist | PASS | 四个功能点均有主路径 |
| Write errors covered | PASS | 非法进度、视觉降级、序列取消与重复触发已覆盖 |
| Boundaries covered | PASS | 阶段边界、性能档、直接跳转和复位已覆盖 |
| Permissions covered | N/A | 无权限系统 |
| State transitions covered | PASS | 覆盖处置阶段与五章节规范状态 |
| Idempotency considered | PASS | 覆盖快速重复触发和三次重播 |
| Concurrency addressed | PASS | 要求单活动序列和取消旧写入 |

---

## Verification Report

> Verified: 2026-07-22
> Total: 12 | PASS: 12 | FAIL: 0 | PARTIAL: 0 | SKIP: 0

| AC | Status | Evidence |
|----|--------|----------|
| AC-01 | ✅ PASS | src/state/irrigationEvent.test.ts ordered single-model test passed |
| AC-01-B1 | ✅ PASS | monotonic stage-boundary assertions passed |
| AC-01-E1 | ✅ PASS | invalid progress clamping test passed |
| AC-02 | ✅ PASS | 1440x900 real browser irrigation snapshot showed ordered gate/main/branch/inlet receipts; 0 console errors |
| AC-02-B1 | ✅ PASS | all tiers consume deriveIrrigationEvent; low tier changes visual density only |
| AC-02-E1 | ✅ PASS | main sequence is derived independently of optional particles and Html receipts; typecheck and browser run passed |
| AC-03 | ✅ PASS | canonical preset and atomic store transition tests passed |
| AC-03-B1 | ✅ PASS | recovered canonical preset test proves 27 percent target, full scan, recovered state |
| AC-03-E1 | ✅ PASS | useDemoSequence abort controller cancels the only active sequence before new state writes |
| AC-04 | ✅ PASS | deterministic pure event model and canonical reset tested; no accumulated state |
| AC-04-B1 | ✅ PASS | overview canonical preset clears progress and scan; store transition test passed |
| AC-04-E1 | ✅ PASS | single module-scoped AbortController is aborted before play or irrigate; playing state prevents duplicate UI trigger |

### Summary

- PASS: 12
- FAIL: 0
- PARTIAL: 0
- SKIP: 0
