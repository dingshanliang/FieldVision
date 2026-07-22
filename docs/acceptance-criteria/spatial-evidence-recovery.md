# Acceptance Criteria: 空间证据与恢复验证

> Source: `docs/prd/a02-explainable-recovery-and-hero-realism.md` 4.1、4.2、4.3、4.6、4.7
> Generated: 2026-07-22
> Functional Points: 5
> Scenarios: 15 (Happy: 5 | Error: 5 | Boundary: 5)

## 1. 渐进式无人机扫描

### AC-01: 扫描经过后才显露异常
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | scanProgress drives directional RiskOverlay reveal; 1440x900 browser evidence captured

Given A02 已选中且异常扫描尚未开始
When 无人机扫描带沿航线覆盖 A02
Then 已扫描区域逐步显露分析纹理和异常边界，未扫描区域保持自然状态，扫描完成后异常范围稳定

### AC-01-E1: 无人机模型不可用仍能扫描
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | SafeDrone error boundary and local geometric fallback preserve SpatialEvidence flow

Given 无人机 GLB 加载失败
When 进入发现异常章节
Then 地面扫描带、分析结果和异常证据仍可完成，不阻断后续灌溉

### AC-01-B1: 直接跳转发现异常显示完成态
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | inspect-risk canonical preset sets scanProgress=1; browser direct jump showed complete evidence

Given 用户从时间线直接进入发现异常
When 章节规范状态应用
Then 无人机位于扫描区域附近，扫描结果达到可读完成态且不会等待完整自动航线

## 2. 空间化采集证据

### AC-02: 异常区标注提供判断依据
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | browser snapshot showed 演示模拟, 08:42, 多光谱无人机, 18%, -12%, 92% linked to A02-R1

Given A02 异常已经识别
When 镜头观察异常区
Then 空间标注同时显示“演示模拟”、采集时间、多光谱无人机、墒情 18%、同品种长势 -12% 和置信度，并与异常区保持视觉关联

### AC-02-E1: 标注不可遮挡核心异常区
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | world-space offset placard and connector kept anomaly center visible in 1440x900 and 1024x768 screenshots

Given 相机角度导致标注可能覆盖异常中心
When 标注投影到屏幕
Then 标注通过偏移或连线保持可读，异常中心仍可见

### AC-02-B1: 1024×768 使用紧凑证据
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | 1024x768 screenshot kept compact evidence and field panel readable without overlap

Given 视口为 1024×768
When 异常证据显示
Then 至少保留“演示模拟”、采集时间、墒情 18% 和长势 -12%，且不与右侧地块面板重叠到无法阅读

## 3. 异常原因空间关联

### AC-03: 异常区与东支渠被同时定位
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | spatial dashed link connects A02-R1 to east branch and visible diagnosis names supply shortage

Given 扫描完成
When 系统给出“东支渠末端供水不足”假设
Then A02 东侧低值区、东支渠末端和对应控制设施按同一视觉节奏高亮，并显示一条简短因果说明

### AC-03-E1: 不展示无证据诊断
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | evidenceMetadata exposes only the defined water-supply diagnosis; unit test passed

Given 当前 Mock 只包含缺水证据
When 异常原因显示
Then 不出现病虫害、土壤化学成分或设备故障编号等未定义结论

### AC-03-B1: 切回实景隐藏分析叠层
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | SpatialEvidence is gated by growth layer while Zustand business state remains unchanged

Given 异常图层正在显示
When 用户切换到实景图层或返回总览
Then 分析纹理与因果高亮隐藏，但 A02 的业务状态保持不被意外重置

## 4. 湿润锋与作物滞后恢复

### AC-04: 水从渠口有方向地扩散
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | deriveEvidenceState tests prove directional wetting and lagged crop recovery; FieldParcel and CropInstances consume separate progress

Given A02 进水口已经到水
When 灌溉进度继续增加
Then 地表湿润锋从进水口向异常区推进，浅水反光先出现，作物颜色和指标随后恢复，整块田不会瞬间变绿

### AC-04-E1: 处置取消后停止继续恢复
**Type**: Error Case | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | chapter canonical transitions reset irrigation progress atomically; store test passed

Given 湿润锋正在推进
When 用户复位或跳转到较早章节
Then 湿润范围、作物颜色和数值立即回到目标章节状态，不继续后台增长

### AC-04-B1: 低性能档保留方向性
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | low tier consumes same evidence model; only visual density is degraded

Given 性能档为 low
When 湿润锋推进
Then 可以降低几何和反射细节，但仍从渠口向异常区渐进，不退化为全局变色

## 5. 恢复前后验证

### AC-05: 同机位证明风险解除
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | 1440x900 recovery screenshot used the scan camera and showed prior ring, 18% to 27%, 23.6 to 0.8 mu, risk resolved

Given 灌溉完成且 A02 达到复测状态
When 进入恢复验证章节
Then 相机回到异常识别验证机位，自动展示处置前与复测后的空间对比，并显示复测时间、18%→27%、异常面积收敛和“风险已解除”

### AC-05-E1: 对比层缺失仍显示复测证据
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | verification data is independent of optional world-space ring/postprocessing and remains in FieldDetailPanel

Given 浏览器无法创建对比纹理或后期层
When 进入恢复验证
Then 场景保持恢复后状态，并显示复测数据与风险解除回执，不出现空白或报错

### AC-05-B1: 减少动态模式缩短但保留验证
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | prefers-reduced-motion CSS removes long animation while static before/after evidence remains visible

Given 用户开启 `prefers-reduced-motion`
When 恢复对比播放
Then 擦拭或残影动画缩短，但处置前参照、复测后状态和关键数值均可被读取

## Self-Check Report

| Check | Status | Notes |
|---|---|---|
| Happy paths exist | PASS | 五个证据与恢复功能点均覆盖 |
| Write errors covered | PASS | 资产、投影、取消、对比降级已覆盖 |
| Boundaries covered | PASS | 直接跳转、小屏、图层、性能和减少动态已覆盖 |
| Permissions covered | N/A | 无权限系统 |
| State transitions covered | PASS | 扫描、异常、灌溉、复测状态均覆盖 |
| Idempotency considered | PASS | 依赖章节规范状态与取消行为 |
| Concurrency addressed | PASS | 处置取消后禁止旧序列继续写入 |

---

## Verification Report

> Verified: 2026-07-22
> Total: 15 | PASS: 15 | FAIL: 0 | PARTIAL: 0 | SKIP: 0

| AC | Status | Evidence |
|----|--------|----------|
| AC-01 | ✅ PASS | scanProgress drives directional RiskOverlay reveal; 1440x900 browser evidence captured |
| AC-01-B1 | ✅ PASS | inspect-risk canonical preset sets scanProgress=1; browser direct jump showed complete evidence |
| AC-01-E1 | ✅ PASS | SafeDrone error boundary and local geometric fallback preserve SpatialEvidence flow |
| AC-02 | ✅ PASS | browser snapshot showed 演示模拟, 08:42, 多光谱无人机, 18%, -12%, 92% linked to A02-R1 |
| AC-02-B1 | ✅ PASS | 1024x768 screenshot kept compact evidence and field panel readable without overlap |
| AC-02-E1 | ✅ PASS | world-space offset placard and connector kept anomaly center visible in 1440x900 and 1024x768 screenshots |
| AC-03 | ✅ PASS | spatial dashed link connects A02-R1 to east branch and visible diagnosis names supply shortage |
| AC-03-B1 | ✅ PASS | SpatialEvidence is gated by growth layer while Zustand business state remains unchanged |
| AC-03-E1 | ✅ PASS | evidenceMetadata exposes only the defined water-supply diagnosis; unit test passed |
| AC-04 | ✅ PASS | deriveEvidenceState tests prove directional wetting and lagged crop recovery; FieldParcel and CropInstances consume separate progress |
| AC-04-B1 | ✅ PASS | low tier consumes same evidence model; only visual density is degraded |
| AC-04-E1 | ✅ PASS | chapter canonical transitions reset irrigation progress atomically; store test passed |
| AC-05 | ✅ PASS | 1440x900 recovery screenshot used the scan camera and showed prior ring, 18% to 27%, 23.6 to 0.8 mu, risk resolved |
| AC-05-B1 | ✅ PASS | prefers-reduced-motion CSS removes long animation while static before/after evidence remains visible |
| AC-05-E1 | ✅ PASS | verification data is independent of optional world-space ring/postprocessing and remains in FieldDetailPanel |

### Summary

- PASS: 15
- FAIL: 0
- PARTIAL: 0
- SKIP: 0
