/**
 * A02 恢复相位与多源证据的生产契约（fv-o6c.11）。
 *
 * 农业时间轴：无人机发现冠层异常 → 地面+渠道证据确认供水不足 →
 * 设备与水路逐级到水 → 当日只确认水到田 → 次日(D1)确认根区水分恢复 →
 * 后续(D3)同条件复飞确认冠层低值收敛 → 风险解除。
 *
 * 铁律（来自 agronomy-evidence-semantics 研究 + fv-o6c.17 敲定值）：
 *  - 到水(D0) ≠ 水分恢复(D1) ≠ 风险解除(D7)；
 *  - 根区 VWC 27% 只在 D1 出现，0.8 亩残余面积只在 D3 出现；
 *  - 作物变绿由恢复相位驱动，不当日随灌溉完成（修掉旧的同日恢复 bug）；
 *  - 四类证据来源互不合并，颜色/图标一一对应。
 *  全部数值标注"演示模拟"，优先趋势/相对对照/证据状态，不伪精确。
 */

/** 恢复相位。none = 尚未到水（扫描/灌溉处置阶段）。 */
export type RecoveryPhase = "none" | "arrived" | "d1-root" | "d3-reflight" | "resolved";

export const RECOVERY_PHASES: RecoveryPhase[] = ["none", "arrived", "d1-root", "d3-reflight", "resolved"];

export interface SourceStyle {
  color: string;
  label: string;
}

/** 来源 → 颜色/标签（来源=颜色=图标，杜绝混源）。 */
export const SOURCE_STYLE: Record<"canopy" | "rootVwc" | "fieldLevel" | "channel", SourceStyle> = {
  canopy: { color: "#e07a3c", label: "冠层 · UAV 多光谱 NDRE" },
  rootVwc: { color: "#4a90d9", label: "根区墒情 · 土壤探头" },
  fieldLevel: { color: "#3aa6a0", label: "田间水位 · 观察管" },
  channel: { color: "#8a6fd1", label: "渠道水位 · 东支渠水尺" },
};

export interface PhaseEvidence {
  /** 冠层（UAV NDRE，相对同品种对照）。 */
  canopy: { deltaPct: number; areaMu: number; anomaly: number };
  /** 根区土壤探头 VWC（10 cm，演示模拟）。 */
  rootVwc: { value: number; trend: "down" | "up" | "stable"; dayTag: string };
  /** 田间观察管水位（基准田面）。 */
  fieldLevel: { cm: number; dayTag: string };
  /** 东支渠水尺水位与到水。 */
  channel: { cm: number; arrived: boolean; arrivedAt: string | null; dayTag: string };
  /** 作物变绿进度 0..1（相位驱动，不当日完成）。 */
  cropRecovery: number;
  /** NDRE 图层残余异常强度 0..1（地图随相位冷却）。 */
  canopyAnomalyStrength: number;
  /** 业务大白话叙事（时间跳切卡 / 面板用）。 */
  narrative: string;
  /** 该相位的时间锚点标签。 */
  dayLabel: string;
}

/**
 * 各相位的证据快照。地面复核（root 18% / field -16cm / channel 未到水）在
 * 扫描确认阶段即可见；到水、恢复、复测按农业时间依次出现。
 */
const PHASE_EVIDENCE: Record<RecoveryPhase, PhaseEvidence> = {
  none: {
    canopy: { deltaPct: -12, areaMu: 23.6, anomaly: 1 },
    rootVwc: { value: 18, trend: "down", dayTag: "D0" },
    fieldLevel: { cm: -16, dayTag: "D0" },
    channel: { cm: 0, arrived: false, arrivedAt: null, dayTag: "D0" },
    cropRecovery: 0,
    canopyAnomalyStrength: 1,
    narrative: "A02 东侧冠层指数连续低于同品种对照，地面水分核验确认供水不足。",
    dayLabel: "D0",
  },
  arrived: {
    canopy: { deltaPct: -12, areaMu: 23.6, anomaly: 1 },
    rootVwc: { value: 18, trend: "down", dayTag: "D0" },
    fieldLevel: { cm: -14, dayTag: "D0" },
    channel: { cm: 18, arrived: true, arrivedAt: "09:06", dayTag: "D0" },
    cropRecovery: 0,
    canopyAnomalyStrength: 1,
    narrative: "09:06 东支渠到水，田间补水开始。到水只证明处置到达，不等于恢复。",
    dayLabel: "D0",
  },
  "d1-root": {
    canopy: { deltaPct: -9, areaMu: 21, anomaly: 0.75 },
    rootVwc: { value: 27, trend: "up", dayTag: "D1" },
    fieldLevel: { cm: 2, dayTag: "D1" },
    channel: { cm: 18, arrived: true, arrivedAt: "09:06", dayTag: "D0" },
    cropRecovery: 0.5,
    canopyAnomalyStrength: 0.72,
    narrative: "次日 D1 根区水分回到管理区间，转入作物恢复观察。冠层恢复仍需时间。",
    dayLabel: "D1",
  },
  "d3-reflight": {
    canopy: { deltaPct: -4, areaMu: 0.8, anomaly: 0.33 },
    rootVwc: { value: 27, trend: "stable", dayTag: "D1" },
    fieldLevel: { cm: 2, dayTag: "D1" },
    channel: { cm: 18, arrived: true, arrivedAt: "09:06", dayTag: "D0" },
    cropRecovery: 0.85,
    canopyAnomalyStrength: 0.3,
    narrative: "D3 同条件复飞：连续低值区收敛至 0.8 亩，恢复趋势形成。",
    dayLabel: "D3",
  },
  resolved: {
    canopy: { deltaPct: -1, areaMu: 0.4, anomaly: 0.08 },
    rootVwc: { value: 27, trend: "stable", dayTag: "D1" },
    fieldLevel: { cm: 2, dayTag: "D1" },
    channel: { cm: 18, arrived: true, arrivedAt: "09:06", dayTag: "D0" },
    cropRecovery: 1,
    canopyAnomalyStrength: 0.06,
    narrative: "连续复测通过，供水不足风险已解除。",
    dayLabel: "D7",
  },
};

export function phaseEvidence(phase: RecoveryPhase): PhaseEvidence {
  return PHASE_EVIDENCE[phase] ?? PHASE_EVIDENCE.none;
}

/** 地面三类证据是否已进入"确认"阶段（扫描完成后到水前展示）。 */
export function groundConfirmed(scanReveal: number): boolean {
  return scanReveal >= 0.82;
}
