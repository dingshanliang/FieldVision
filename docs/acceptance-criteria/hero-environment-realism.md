# Acceptance Criteria: 英雄环境写实

> Source: `docs/prd/a02-explainable-recovery-and-hero-realism.md` 4.8、4.9、4.10
> Generated: 2026-07-22
> Functional Points: 3
> Scenarios: 11 (Happy: 3 | Error: 3 | Boundary: 5)

## 1. 地域可信的多层远景

### AC-01: 总览形成三层稻作区纵深
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | 1440x900 overview and A02 presets show a photo horizon with village/tree belt, field plane, layered hills and matching dawn haze

Given 页面以 1440×900 高画质进入基地总览
When 观察完整地平线和 A02 俯冲路径
Then 画面包含近树带、中远村田层和远山/天际至少三个深度层，色温、雾和光向与清晨主场景一致

### AC-01-E1: 本地资产失败使用可接受备用层
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | SafePhotographicHorizon catches local texture failure and falls back to TreeLine without runtime network dependency

Given 任一远景资源加载失败
When 场景继续渲染
Then 使用本地备用远景或隐藏对应层，不依赖运行时外网且不产生控制台错误

### AC-01-B1: 不出现明显程序化轮廓
**Type**: Boundary | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | Browser review of overview, ground and irrigation presets shows no repeated ball-tree, cone-tree or synthetic ridge silhouette

Given 观察开场总览和 A02 面向地平线的近景
When 检查树线与山体主轮廓
Then 不出现规律重复的球冠、锥体、防风林直线、交叉树片或塑料质感山体

### AC-01-B2: 外部资产许可完整
**Type**: Boundary | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | ASSETS.md records the generated horizon prompt category, generation method, rights and project path

Given 新增任何照片、纹理、HDRI、GLB 或图集
When 交付验收
Then `ASSETS.md` 记录来源、作者/站点、许可证和项目内路径；自制资产明确标注生成方式

## 2. 生产痕迹与尺度锚点

### AC-02: 英雄路径具备现实尺度参照
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | Browser review confirms vehicle, worker, power lines, water gauge, road ruts and mud/silt traces along the hero route

Given 镜头从总览飞入 A02 并转向泵站和渠道
When 观察道路、渠道和设施
Then 至少可见农用车辆或作业人员、供电杆线、水尺/渠道编号、机耕路轮迹和泥水维护痕迹，且位置符合道路与设施使用逻辑

### AC-02-E1: 小物不会抢夺英雄地块注意力
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | Scale anchors use subdued farm colors and do not obscure A02 or primary controls in preset screenshots

Given 所有尺度锚点均已显示
When 以开场和 A02 预设机位观看
Then 小物没有高亮发光、大面积高饱和色或遮挡主要交互对象

### AC-02-B1: 低性能档保留关键尺度参照
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | Low-tier render path retains FarmUtilityVehicle, HeroIrrigationInlet gauge and FarmRoads while omitting only worker and utility line

Given 性能档为 low
When 进入 A02
Then 可以隐藏远处人员和次要杂物，但至少保留车辆/设施尺度、水尺和道路轮迹中的关键参照

### AC-02-B2: 尺度符合现实直觉
**Type**: Boundary | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | 1440x900 and 1024x768 visual review confirms plausible person, vehicle, road, channel and facility scale and grounding

Given 人、车辆、水尺、杆线、渠道和泵站同时可见
When 比较彼此比例与接地位置
Then 不出现人物高于车辆、车辆宽于道路、杆线穿田或小物悬浮/深埋等明显比例错误

## 3. A02 英雄资产近景质量

### AC-03: 0–20 米镜头具备结构和材质细节
**Type**: Happy Path | **Priority**: P0
**Status**: ✅ PASS | 2026-07-22 | A02 ground and irrigation browser shots show crop blades, gate structure, concrete inlet, culvert mouth, gauge, silt and cast shadows

Given 相机进入 A02 作物高度、渠口和泵站近景
When 观察闸门、涵洞、渠边、泵站可见面和近景稻株
Then 可见结构连接、粗糙度差异、泥渍/水渍/轻微锈蚀、边缘磨损和接地阴影，不以纯色方块充当英雄资产

### AC-03-E1: 预设外视角不暴露空壳
**Type**: Error Case | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | Free-camera inspection from east and west sides found complete facility faces and connections without empty shells or floating parts

Given 用户自由浏览到预设镜头之外
When 观察英雄设施背面和连接处
Then 不出现完全空壳、消失主面、明显穿插或悬浮资产

### AC-03-B1: 1024×768 保持英雄对象清晰
**Type**: Boundary | **Priority**: P1
**Status**: ✅ PASS | 2026-07-22 | All five chapters were visually checked at 1024x768 with recognizable hero objects and no severe UI collision

Given 视口为 1024×768
When 逐段进入 A02、异常和灌溉章节
Then 英雄对象仍可识别，远景和尺度锚点不与主要 UI 形成严重视觉冲突

## Self-Check Report

| Check | Status | Notes |
|---|---|---|
| Happy paths exist | PASS | 远景、尺度锚点、英雄资产均覆盖 |
| Write errors covered | PASS | 资源失败、视觉抢占和外视角已覆盖 |
| Boundaries covered | PASS | 轮廓、许可、性能、比例和分辨率已覆盖 |
| Permissions covered | N/A | 无权限系统 |
| State transitions covered | N/A | 本模块主要为环境视觉 |
| Idempotency considered | N/A | 无写操作 |
| Concurrency addressed | N/A | 无共享写操作 |

---

## Verification Report

> Verified: 2026-07-22
> Total: 11 | PASS: 11 | FAIL: 0 | PARTIAL: 0 | SKIP: 0

| AC | Status | Evidence |
|----|--------|----------|
| AC-01 | ✅ PASS | 1440x900 overview and A02 presets show a photo horizon with village/tree belt, field plane, layered hills and matching dawn haze |
| AC-01-B1 | ✅ PASS | Browser review of overview, ground and irrigation presets shows no repeated ball-tree, cone-tree or synthetic ridge silhouette |
| AC-01-B2 | ✅ PASS | ASSETS.md records the generated horizon prompt category, generation method, rights and project path |
| AC-01-E1 | ✅ PASS | SafePhotographicHorizon catches local texture failure and falls back to TreeLine without runtime network dependency |
| AC-02 | ✅ PASS | Browser review confirms vehicle, worker, power lines, water gauge, road ruts and mud/silt traces along the hero route |
| AC-02-B1 | ✅ PASS | Low-tier render path retains FarmUtilityVehicle, HeroIrrigationInlet gauge and FarmRoads while omitting only worker and utility line |
| AC-02-B2 | ✅ PASS | 1440x900 and 1024x768 visual review confirms plausible person, vehicle, road, channel and facility scale and grounding |
| AC-02-E1 | ✅ PASS | Scale anchors use subdued farm colors and do not obscure A02 or primary controls in preset screenshots |
| AC-03 | ✅ PASS | A02 ground and irrigation browser shots show crop blades, gate structure, concrete inlet, culvert mouth, gauge, silt and cast shadows |
| AC-03-B1 | ✅ PASS | All five chapters were visually checked at 1024x768 with recognizable hero objects and no severe UI collision |
| AC-03-E1 | ✅ PASS | Free-camera inspection from east and west sides found complete facility faces and connections without empty shells or floating parts |

### Summary

- PASS: 11
- FAIL: 0
- PARTIAL: 0
- SKIP: 0
