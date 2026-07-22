import { Html, Line } from "@react-three/drei";
import { type ReactNode } from "react";
import { useFarmStore } from "../state/useFarmStore";
import { deriveEvidenceState } from "../state/evidenceModel";
import { groundConfirmed, phaseEvidence, SOURCE_STYLE, type RecoveryPhase } from "../state/recoveryModel";

/**
 * A02 多源证据标注（fv-o6c.11 混合方案）。
 * 四类来源用各自颜色点钉物理分开、绝不合并，每个数据挂"属于哪天"标签；
 * 恢复叙事只在 D1 及之后出现，诚实区分到水(D0)/根区恢复(D1)/冠层复飞(D3)。
 */
const RISK_CENTER: [number, number, number] = [23, 2.9, -66];
const ROOT_PROBES: [number, number, number][] = [
  [16, 2.9, -60],
  [29, 2.9, -67],
  [22, 2.9, -75],
];
const FIELD_TUBE: [number, number, number] = [9, 2.9, -57];
const CHANNEL_GAUGE: [number, number, number] = [61, 2.9, -33];

// 风险区虚线轮廓（A02-R1, r=18），模块级常量避免每帧重建。
const RISK_RING: [number, number, number][] = Array.from({ length: 49 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2;
  return [RISK_CENTER[0] + Math.cos(a) * 18, RISK_CENTER[1], RISK_CENTER[2] + Math.sin(a) * 18];
});

const TREND_LABEL: Record<"down" | "up" | "stable", string> = { down: "↓ 偏低", up: "↑ 回升", stable: "→ 稳定" };
const PHASE_RANK: Record<RecoveryPhase, number> = { none: 0, arrived: 1, "d1-root": 2, "d3-reflight": 3, resolved: 4 };

function Pin({ position, color, height = 4, children }: { position: [number, number, number]; color: string; height?: number; children?: ReactNode }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, height, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[0, height + 0.35, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.4} />
      </mesh>
      {children && (
        <Html position={[0, height + 1.1, 0]} center distanceFactor={66} zIndexRange={[36, 6]}>
          {children}
        </Html>
      )}
    </group>
  );
}

function SourceChip({ color, title, lines, dayTag }: { color: string; title: string; lines: string[]; dayTag?: string }) {
  return (
    <div className="evidence-chip">
      <div className="evidence-chip__head">
        <span className="evidence-dot" style={{ background: color }} />
        <strong>{title}</strong>
        {dayTag && <em className="evidence-day">{dayTag}</em>}
      </div>
      {lines.filter(Boolean).map((line) => (
        <span key={line} className="evidence-line">{line}</span>
      ))}
    </div>
  );
}

export function SpatialEvidence() {
  const scanProgress = useFarmStore((s) => s.scanProgress);
  const irrigationProgress = useFarmStore((s) => s.irrigationProgress);
  const recoveryPhase = useFarmStore((s) => s.recoveryPhase);
  const layerMode = useFarmStore((s) => s.layerMode);
  const demoStep = useFarmStore((s) => s.demoStep);

  const evidence = deriveEvidenceState(scanProgress, irrigationProgress, recoveryPhase);
  const phase = phaseEvidence(recoveryPhase);
  const analysisVisible = (layerMode === "growth" || ["inspect-risk", "drone-scan", "irrigation", "recovered"].includes(demoStep)) && evidence.scanReveal >= 0.5;
  const showGround = analysisVisible && groundConfirmed(evidence.scanReveal) && evidence.riskEvidenceStrength > 0.04;
  const showDiagnosis = showGround && PHASE_RANK[recoveryPhase] < PHASE_RANK["d1-root"];
  const showRecovery = analysisVisible && PHASE_RANK[recoveryPhase] >= PHASE_RANK["d1-root"];

  return (
    <group visible={demoStep !== "overview" && demoStep !== "intro" && demoStep !== "select-field"}>
      {analysisVisible && (
        <Line points={RISK_RING} color={SOURCE_STYLE.canopy.color} lineWidth={1.5} dashed dashSize={1.6} gapSize={1.1} transparent opacity={0.7} />
      )}

      {showGround && (
        <>
          {ROOT_PROBES.map((pos, i) => (
            <group key={`probe-${i}`}>
              <Line points={[[pos[0], pos[1] + 4, pos[2]], RISK_CENTER]} color={SOURCE_STYLE.rootVwc.color} lineWidth={1} transparent opacity={0.4} />
              <Pin position={pos} color={SOURCE_STYLE.rootVwc.color} height={4}>
                <SourceChip
                  color={SOURCE_STYLE.rootVwc.color}
                  title={`根区探头 P${i + 1}`}
                  lines={[`VWC ${phase.rootVwc.value}% · 10cm`, TREND_LABEL[phase.rootVwc.trend]]}
                  dayTag={phase.rootVwc.dayTag}
                />
              </Pin>
            </group>
          ))}

          <Pin position={FIELD_TUBE} color={SOURCE_STYLE.fieldLevel.color} height={4}>
            <SourceChip
              color={SOURCE_STYLE.fieldLevel.color}
              title={SOURCE_STYLE.fieldLevel.label}
              lines={[`田间水位 ${phase.fieldLevel.cm}cm`, phase.fieldLevel.cm < 0 ? "低于田面" : "田面浅水"]}
              dayTag={phase.fieldLevel.dayTag}
            />
          </Pin>

          <Pin position={CHANNEL_GAUGE} color={SOURCE_STYLE.channel.color} height={4.4}>
            <SourceChip
              color={SOURCE_STYLE.channel.color}
              title={SOURCE_STYLE.channel.label}
              lines={[`水位 ${phase.channel.cm}cm`, phase.channel.arrived ? `已到水 ${phase.channel.arrivedAt}` : "未到水"]}
              dayTag={phase.channel.dayTag}
            />
          </Pin>
        </>
      )}

      {showDiagnosis && (
        <>
          <Line points={[RISK_CENTER, [58, 2.4, -35]]} color="#dca266" lineWidth={1.2} dashed dashSize={1.2} gapSize={0.8} transparent opacity={0.6} />
          <Html position={[49, 16, -43]} center distanceFactor={82} zIndexRange={[28, 3]}>
            <div className="cause-marker"><span>供水诊断</span><strong>东支渠末端供水不足</strong></div>
          </Html>
        </>
      )}

      {showRecovery && (
        <Html position={[12, 10.5, -56]} center distanceFactor={78} zIndexRange={[32, 4]}>
          <div className="verification-slip">
            <div><span>处置前 · D0</span><strong>18%</strong><small>异常 23.6 亩</small></div>
            <i aria-hidden="true" />
            <div><span>{phase.dayLabel} 复测</span><strong>{phase.rootVwc.value}%</strong><small>残余 {phase.canopy.areaMu} 亩</small></div>
            {PHASE_RANK[recoveryPhase] >= PHASE_RANK.resolved ? <em>风险已解除</em> : <em>恢复观察中</em>}
          </div>
        </Html>
      )}
    </group>
  );
}
