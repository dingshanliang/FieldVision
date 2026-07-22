/**
 * PROTOTYPE — 变体 B：分轨证据。
 * 组织主轴 = 来源分离。不填色图，四类证据各自独立、颜色/图标/chip 互不合并，
 * 空间上彼此分开并用细线连回风险区。最直接回答"农技专家不会认为来源混乱"，
 * 代价是画面元素多、需要克制信息量。
 */
import { GEO, Pin, RiskOutline, SourceChip, Connector } from "./atoms";
import { SOURCE_STYLE, type PhaseDef } from "./phaseModel";

const TREND = { down: "↓ 偏低", up: "↑ 回升", stable: "→ 稳定" };

export function VariantB({ phase }: { phase: PhaseDef }) {
  const { canopy, rootVwc, fieldLevel, channel } = phase;
  return (
    <group>
      {canopy.visible && <RiskOutline center={GEO.riskCenter} radius={GEO.riskRadius} />}

      {canopy.visible && (
        <Pin position={[GEO.riskCenter[0] - 6, GEO.riskCenter[1], GEO.riskCenter[2] + 6]} color={SOURCE_STYLE.canopy.color} height={5}>
          <SourceChip
            color={SOURCE_STYLE.canopy.color}
            title={SOURCE_STYLE.canopy.label}
            lines={[
              `相对同品种对照 ${canopy.deltaPct}%`,
              ...(canopy.areaMu !== null ? [`连续低值区 ${canopy.areaMu} 亩`] : []),
              `${phase.day} ${phase.time}`,
            ]}
          />
        </Pin>
      )}

      {rootVwc.visible &&
        GEO.rootProbes.map((pos, i) => (
          <group key={`probe-${i}`}>
            {Connector([pos[0], pos[1] + 4.2, pos[2]], GEO.riskCenter, SOURCE_STYLE.rootVwc.color)}
            <Pin position={pos} color={SOURCE_STYLE.rootVwc.color} height={4}>
              <SourceChip
                color={SOURCE_STYLE.rootVwc.color}
                title={`根区探头 P${i + 1}`}
                lines={[`VWC ${rootVwc.value}% · ${rootVwc.depthCm}cm`, TREND[rootVwc.trend]]}
              />
            </Pin>
          </group>
        ))}

      {fieldLevel.visible && (
        <group>
          {Connector([GEO.fieldTube[0], GEO.fieldTube[1] + 4.2, GEO.fieldTube[2]], GEO.riskCenter, SOURCE_STYLE.fieldLevel.color)}
          <Pin position={GEO.fieldTube} color={SOURCE_STYLE.fieldLevel.color} height={4}>
            <SourceChip
              color={SOURCE_STYLE.fieldLevel.color}
              title={SOURCE_STYLE.fieldLevel.label}
              lines={[`田间水位 ${fieldLevel.cm}cm`, fieldLevel.cm < 0 ? "低于田面" : "田面浅水"]}
            />
          </Pin>
        </group>
      )}

      {channel.visible && (
        <Pin position={GEO.channelGauge} color={SOURCE_STYLE.channel.color} height={4.4}>
          <SourceChip
            color={SOURCE_STYLE.channel.color}
            title={SOURCE_STYLE.channel.label}
            lines={[`水位 ${channel.cm}cm`, channel.arrived ? `已到水 ${channel.arrivedAt}` : "未到水"]}
          />
        </Pin>
      )}
    </group>
  );
}
