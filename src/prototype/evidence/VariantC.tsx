/**
 * PROTOTYPE — 变体 C：时间轴证据。
 * 组织主轴 = 农业时间。空间证据退为轻量点钉，每个数据挂"属于哪天"标签，
 * 顶部叙事条 + D0..D7 时间轨是英雄。直接演示研究稿铁律：
 * 到水(D0) ≠ 水分恢复(D1) ≠ 风险解除(D7)；27% 只能在 D1 出现、0.8 亩只能在 D3。
 */
import { Html } from "@react-three/drei";
import { GEO, Pin, RiskOutline, SourceChip } from "./atoms";
import { PHASES, SOURCE_STYLE, type EvidencePhase, type PhaseDef } from "./phaseModel";

const TREND = { down: "↓", up: "↑", stable: "→" };

function dayTagFor(value: number, phase: PhaseDef, kind: "root" | "field"): string {
  if (kind === "root") return value >= 27 ? "D1" : "D0";
  return phase.day;
}

export function VariantC({ phase }: { phase: PhaseDef }) {
  const { canopy, rootVwc, fieldLevel, channel } = phase;
  return (
    <group>
      <Html position={[22, 9, -58]} center distanceFactor={96} zIndexRange={[44, 8]}>
        <div className="ep-narrative">
          <div className="ep-narrative__when">{phase.day} · {phase.time} · {phase.label}</div>
          <p>{phase.conclusion}</p>
        </div>
      </Html>

      <Html position={[18, 5.5, -50]} center distanceFactor={90} zIndexRange={[42, 7]}>
        <div className="ep-timeline">
          {PHASES.map((p, idx) => {
            const currentIdx = PHASES.findIndex((x) => x.key === phase.key);
            return (
              <span
                key={p.key}
                className={`ep-tl-node ${p.key === phase.key ? "is-active" : ""} ${idx < currentIdx ? "is-done" : ""}`}
              >
                <i>{p.day}</i>
              </span>
            );
          })}
        </div>
      </Html>

      {canopy.visible && <RiskOutline center={GEO.riskCenter} radius={GEO.riskRadius} opacity={0.55} />}
      {canopy.visible && (
        <Pin position={[GEO.riskCenter[0] - 4, GEO.riskCenter[1], GEO.riskCenter[2] + 5]} color={SOURCE_STYLE.canopy.color} height={3.4}>
          <SourceChip
            color={SOURCE_STYLE.canopy.color}
            title="冠层"
            lines={[`NDRE ${canopy.deltaPct}%`, canopy.areaMu !== null ? `${canopy.areaMu} 亩` : ""]}
            dayTag={phase.day}
          />
        </Pin>
      )}

      {rootVwc.visible &&
        GEO.rootProbes.slice(0, 2).map((pos, i) => (
          <Pin key={`rc-${i}`} position={pos} color={SOURCE_STYLE.rootVwc.color} height={3.2}>
            <SourceChip
              color={SOURCE_STYLE.rootVwc.color}
              title={`根区 P${i + 1}`}
              lines={[`VWC ${rootVwc.value}%`, TREND[rootVwc.trend]]}
              dayTag={dayTagFor(rootVwc.value, phase, "root")}
            />
          </Pin>
        ))}

      {fieldLevel.visible && (
        <Pin position={GEO.fieldTube} color={SOURCE_STYLE.fieldLevel.color} height={3.2}>
          <SourceChip
            color={SOURCE_STYLE.fieldLevel.color}
            title="田间水位"
            lines={[`${fieldLevel.cm}cm`]}
            dayTag={dayTagFor(fieldLevel.cm, phase, "field")}
          />
        </Pin>
      )}

      {channel.visible && (
        <Pin position={GEO.channelGauge} color={SOURCE_STYLE.channel.color} height={3.4}>
          <SourceChip
            color={SOURCE_STYLE.channel.color}
            title="东支渠"
            lines={[channel.arrived ? `到水 ${channel.arrivedAt}` : "未到水"]}
            dayTag="D0"
          />
        </Pin>
      )}
    </group>
  );
}

// 让 EvidencePrototypeScene 能按字面量 key 比较；保留类型导出供复用。
export type { EvidencePhase };
