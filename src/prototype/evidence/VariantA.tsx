/**
 * PROTOTYPE — 变体 A：正射遥感主导。
 * 组织主轴 = 连续冠层指数图。UAV NDRE 假彩色正射图是英雄，地面证据退为
 * 田边一条汇总 chip。最像"真实遥感产品"，但来源信息密度集中在图层本身。
 */
import { Html } from "@react-three/drei";
import { GEO, NdreOverlay, ReferenceStrip } from "./atoms";
import { SOURCE_STYLE, type PhaseDef } from "./phaseModel";

function anomalyFrom(deltaPct: number) {
  return Math.max(0, Math.min(1, Math.abs(deltaPct) / 12));
}

export function VariantA({ phase, scanReveal }: { phase: PhaseDef; scanReveal: number }) {
  const { canopy, rootVwc, fieldLevel, channel } = phase;
  const groundLines: string[] = [];
  if (rootVwc.visible) groundLines.push(`根区 VWC ${rootVwc.value}% · ${rootVwc.depthCm}cm`);
  if (fieldLevel.visible) groundLines.push(`田间水位 ${fieldLevel.cm}cm`);
  if (channel.visible) groundLines.push(`东支渠 ${channel.cm}cm${channel.arrived ? ` · 到水 ${channel.arrivedAt}` : " · 未到水"}`);

  return (
    <group>
      <NdreOverlay
        position={GEO.riskCenter}
        size={GEO.riskRadius * 2.1}
        reveal={canopy.visible ? scanReveal : 0}
        anomaly={anomalyFrom(canopy.deltaPct)}
      />
      <ReferenceStrip position={GEO.referenceCenter} size={GEO.referenceSize} />

      <Html position={[GEO.riskCenter[0], 7.5, GEO.riskCenter[2]]} center distanceFactor={72} zIndexRange={[40, 6]}>
        <div className="ep-chip ep-chip--hero">
          <div className="ep-chip__head">
            <span className="ep-dot" style={{ background: SOURCE_STYLE.canopy.color }} />
            <strong>{SOURCE_STYLE.canopy.label}</strong>
          </div>
          <span className="ep-line">相对同品种对照 {canopy.deltaPct}%</span>
          {canopy.areaMu !== null && <span className="ep-line">连续低值区 {canopy.areaMu} 亩</span>}
          <span className="ep-line ep-line--meta">{phase.day} {phase.time} · 演示模拟</span>
        </div>
      </Html>

      {groundLines.length > 0 && (
        <Html position={[6, 5.5, -50]} center distanceFactor={70} zIndexRange={[38, 5]}>
          <div className="ep-chip ep-chip--ground">
            <div className="ep-chip__head"><em>地面核验 · 多源汇总</em></div>
            {groundLines.map((line) => (
              <span key={line} className="ep-line">{line}</span>
            ))}
          </div>
        </Html>
      )}
    </group>
  );
}
