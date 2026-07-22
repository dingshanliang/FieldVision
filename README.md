# 禾境 FieldVision

FieldVision 是一个视觉驱动的浏览器端 3D 农田数字孪生 Demo。它以一段可自动播放、可手动跳转的空间故事展示：从基地总览进入 A02 地块，通过无人机发现局部缺水，再启动泵站和灌溉网络完成恢复验证。

这不是后台管理系统，也不依赖后端、登录、数据库或真实 GIS 数据。所有业务数据均为本地 mock，三维体验是交付主体。

## 运行

环境要求：Node.js 22+、pnpm 10+。Blender 仅在重新生成三维资产时需要。

```bash
pnpm install
pnpm dev
```

打开 <http://127.0.0.1:4173>。页面加载完成后会自动播放完整演示。

生产构建：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
```

## 演示操作

- 页面打开：自动执行电影式开场和完整风险处置流程；所有章节也可独立跳转并保持设备、渠道和田块状态一致。
- 点击地块：选择空间对象并让相机飞入。
- 左侧图层：切换实景、长势、墒情和设施表达。
- 底部时间线：直接跳到基地总览、进入地块、无人机扫描、灌溉处置或恢复验证；扫描证据、设备水路因果和恢复复测会随章节联动。
- 右侧地块档案：进入作物高度视角、查看异常或启动 12 秒灌溉动画。
- 顶部播放按钮：暂停或重新播放完整演示。

推荐使用 1440×900 或 1920×1080 的 Chrome/Safari 桌面窗口进行汇报和录屏。

## 技术栈

- Vite、React、TypeScript
- Three.js、React Three Fiber、Drei
- React Three Postprocessing
- Zustand
- Blender 4.4 CLI（资产生成）
- CC0 HDRI 与 PBR 材质

## 目录

```text
src/
├── app/                 页面装配与自动演示入口
├── config/              可调视觉参数
├── data/                地块和设施 mock 数据
├── hooks/               可取消的演示时间线
├── scene/               三维场景、镜头、作物、设施、无人机与水流
├── state/               全局场景状态
├── types/               领域类型
├── ui/                  覆盖层界面
└── utils/               几何和确定性随机工具

scripts/blender/         Blender 可重复资产脚本
public/assets/           浏览器运行时资产
docs/                    原始任务书
```

## 修改数据与镜头

- 地块形状、作物、指标和镜头预设：`src/data/fields.ts`
- 设施位置与状态：`src/data/facilities.ts`
- 全局视觉和动画参数：`src/config/visual.ts`
- 完整演示节奏：`src/hooks/useDemoSequence.ts`
- 相机规则：`src/scene/CameraDirector.tsx`

地块多边形使用 `[x, z]` 场景坐标；镜头使用 `[x, y, z]`。

## 重新生成无人机

桌面版 Blender 已包含 CLI，不需要另装 CLI 版本：

```bash
/Applications/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup \
  --python scripts/blender/create_drone.py
```

输出文件为 `public/assets/models/fieldvision-drone.glb`。脚本生成非品牌化机体、四组独立旋翼、云台相机、多光谱传感器、起落架和信号灯。

## 资产与许可证

外部资产及许可证记录见 [`ASSETS.md`](./ASSETS.md)。运行时目前包含：

- ambientCG Ground 026、Ground 037、Concrete 032、Metal 025 的 1K PBR 贴图；
- 项目自身 Blender 脚本生成的无人机 GLB；
- 项目内生成的江南稻作示范区照片级全景远景，并提供程序化安全回退。

可见天空使用项目内的蓝灰清晨云层 shader；材质反射和间接环境光使用 Poly Haven Rural Landscape HDR，避免金属、水面和叶片各自呈现不一致的“模型查看器”高光。

第三方资源均为 CC0。没有使用需要登录、购买或人工接受额外条款的资产。

## 性能策略

- 作物使用 `InstancedMesh`，选择英雄地块时局部提升密度；高空镜头使用行纹理 canopy LOD，进入地块后切换为带折面叶脊的真实植株几何；
- 地形、材质和几何复用，避免逐帧创建对象；
- 自动检测高/中/低性能档；分别调整 DPR、植被密度、阴影贴图和后期处理；
- 高画质 DPR 上限为 1.75，低档固定为 1；
- 只有英雄对象和选中地块作物投射阴影；
- 运行时资产约 11 MB，PBR 贴图使用 1K；
- 后期只保留克制的 Bloom 与 Vignette；
- `prefers-reduced-motion` 下 CSS 动画会自动缩短。

后续接入大型 GLB 时，统一走 Blender 未压缩 GLB → Meshopt → KTX2，不叠加 Draco。

## 当前 mock 数据

包含 A01、A02、A03、B01、B02、B03 和 C01 七块地，以及泵站、闸门、气象站和管理站。A02 是英雄地块，初始墒情为 18%，目标为 27%。

## 接入真实数据

保持 `FieldParcel`、`Facility`、`RiskZone` 和演示状态接口不变，即可逐步替换：

- 地块 polygon → 真实 GIS 转换后的局部坐标；
- 本地指标 → 遥感、墒情和设备 API；
- 程序化设施 → 经优化的真实 GLB；
- 风险区 → 栅格分析或无人机识别结果；
- mock 时间线 → 真实任务和处置事件。

不要直接把地球坐标、原始高模或未压缩遥感文件塞进当前场景；应先建立坐标转换、LOD 和瓦片/资产加载层。
