/**
 * PROTOTYPE — fv-o6c.6 多源证据与真实遥感语言。
 * 一次性原型代码，确定方案后整体移除或重写。勿当作生产契约。
 *
 * 农业时间相位模型。三变体共享同一组相位与同一份数据，仅视觉语言不同。
 * 这套相位本身就是研究稿 (agronomy-evidence-semantics) 的铁律可视化：
 *  - 27% 根区 VWC 属于 D1 根区复测，绝不在 D0 09:06 到水时出现；
 *  - 0.8 亩残余面积属于 D3 冠层复飞，绝不在到水或 D1 出现；
 *  - 到水(D0) ≠ 水分恢复(D1) ≠ 风险解除(D7)。
 */
export type EvidencePhase =
  | "d0-scan"
  | "d0-confirm"
  | "d0-arrived"
  | "d1-root"
  | "d3-reflight"
  | "d7-resolved";

export interface PhaseDef {
  key: EvidencePhase;
  day: string;
  time: string;
  label: string;
  /** 业务大白话结论（变体 C 叙事条使用；所有变体共享同一口径）。 */
  conclusion: string;
  /** 映射回真实场景 store，让作物变色 / 渠道进水与相位一致。 */
  storeScan: number;
  storeIrrigation: number;
  canopy: { visible: boolean; deltaPct: number; areaMu: number | null };
  rootVwc: { visible: boolean; value: number; depthCm: number; trend: "down" | "up" | "stable" };
  fieldLevel: { visible: boolean; cm: number };
  channel: { visible: boolean; cm: number; arrived: boolean; arrivedAt: string | null };
}

export const PHASES: PhaseDef[] = [
  {
    key: "d0-scan",
    day: "D0",
    time: "08:42",
    label: "初飞 · 长势异常待核验",
    conclusion: "A02 东侧冠层指数连续低于同品种对照，启动地面水分核验。",
    storeScan: 0.92,
    storeIrrigation: 0,
    canopy: { visible: true, deltaPct: -12, areaMu: 23.6 },
    rootVwc: { visible: false, value: 18, depthCm: 10, trend: "down" },
    fieldLevel: { visible: false, cm: -16 },
    channel: { visible: false, cm: 0, arrived: false, arrivedAt: null },
  },
  {
    key: "d0-confirm",
    day: "D0",
    time: "08:46",
    label: "地面复核 · 供水不足已确认",
    conclusion: "根区水分低于本田块管理下限；东支渠末端未按计划到水，供水不足已确认。",
    storeScan: 1,
    storeIrrigation: 0,
    canopy: { visible: true, deltaPct: -12, areaMu: 23.6 },
    rootVwc: { visible: true, value: 18, depthCm: 10, trend: "down" },
    fieldLevel: { visible: true, cm: -16 },
    channel: { visible: true, cm: 0, arrived: false, arrivedAt: null },
  },
  {
    key: "d0-arrived",
    day: "D0",
    time: "09:06",
    label: "东支渠到水 · 田间补水开始",
    conclusion: "09:06 东支渠到水，田间补水开始。到水只证明处置到达，不等于恢复。",
    storeScan: 1,
    storeIrrigation: 0.66,
    canopy: { visible: true, deltaPct: -12, areaMu: 23.6 },
    rootVwc: { visible: true, value: 18, depthCm: 10, trend: "down" },
    fieldLevel: { visible: true, cm: -14 },
    channel: { visible: true, cm: 18, arrived: true, arrivedAt: "09:06" },
  },
  {
    key: "d1-root",
    day: "D1",
    time: "08:40",
    label: "根区复测 · 水分条件已恢复",
    conclusion: "D1 根区水分回到管理区间，转入作物恢复观察。冠层恢复需更多时间。",
    storeScan: 1,
    storeIrrigation: 0.9,
    canopy: { visible: true, deltaPct: -9, areaMu: 21 },
    rootVwc: { visible: true, value: 27, depthCm: 10, trend: "up" },
    fieldLevel: { visible: true, cm: 2 },
    channel: { visible: true, cm: 18, arrived: true, arrivedAt: "09:06" },
  },
  {
    key: "d3-reflight",
    day: "D3",
    time: "10:20",
    label: "冠层复飞 · 恢复趋势形成",
    conclusion: "D3 同条件复飞：连续低值区收敛至 0.8 亩，恢复趋势形成。",
    storeScan: 1,
    storeIrrigation: 1,
    canopy: { visible: true, deltaPct: -4, areaMu: 0.8 },
    rootVwc: { visible: true, value: 27, depthCm: 10, trend: "stable" },
    fieldLevel: { visible: true, cm: 2 },
    channel: { visible: true, cm: 18, arrived: true, arrivedAt: "09:06" },
  },
  {
    key: "d7-resolved",
    day: "D7",
    time: "09:05",
    label: "连续复测通过 · 风险已解除",
    conclusion: "连续复测通过，供水不足风险已解除。",
    storeScan: 1,
    storeIrrigation: 1,
    canopy: { visible: true, deltaPct: -1, areaMu: 0.4 },
    rootVwc: { visible: true, value: 27, depthCm: 10, trend: "stable" },
    fieldLevel: { visible: true, cm: 2 },
    channel: { visible: true, cm: 18, arrived: true, arrivedAt: "09:06" },
  },
];

export const PHASE_BY_KEY: Record<EvidencePhase, PhaseDef> = Object.fromEntries(
  PHASES.map((p) => [p.key, p]),
) as Record<EvidencePhase, PhaseDef>;

/** 三变体共享的来源色谱与图标，保证"来源=颜色=图标"一一对应，杜绝混源。 */
export const SOURCE_STYLE = {
  canopy: { color: "#e07a3c", label: "冠层 · UAV 多光谱 NDRE" },
  rootVwc: { color: "#4a90d9", label: "根区墒情 · 土壤探头" },
  fieldLevel: { color: "#3aa6a0", label: "田间水位 · 观察管" },
  channel: { color: "#8a6fd1", label: "渠道水位 · 东支渠水尺" },
} as const;
