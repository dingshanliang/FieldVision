import { ArrowDownToLine, ChevronRight, Droplets, ScanLine } from "lucide-react";
import { fieldById } from "../data/fields";
import { useDemoSequence } from "../hooks/useDemoSequence";
import { useFarmStore } from "../state/useFarmStore";
import { phaseEvidence } from "../state/recoveryModel";

export function FieldDetailPanel() {
  const selectedId = useFarmStore((state) => state.selectedFieldId);
  const statuses = useFarmStore((state) => state.fieldStatuses);
  const progress = useFarmStore((state) => state.irrigationProgress);
  const recoveryPhase = useFarmStore((state) => state.recoveryPhase);
  const setViewMode = useFarmStore((state) => state.setViewMode);
  const setLayerMode = useFarmStore((state) => state.setLayerMode);
  const { irrigate } = useDemoSequence();
  if (!selectedId) return null;
  const field = fieldById[selectedId];
  if (!field) return null;

  const isA02 = field.id === "A02";
  const phase = phaseEvidence(recoveryPhase);
  // A02 的墒情/冠层走恢复相位；其他地块用静态档案值。
  const rootVwc = isA02 ? phase.rootVwc.value : field.moisture;
  const status = statuses[selectedId];
  const statusLabel = status === "recovered" ? "风险已解除" : status === "processing" ? "正在处置" : status === "risk" ? "需要关注" : "运行正常";
  const moistureOk = rootVwc >= field.moistureTarget - 2;
  const showRecovery = isA02 && ["d1-root", "d3-reflight", "resolved"].includes(recoveryPhase);

  return (
    <aside className="field-panel" aria-live="polite">
      <div className="panel-kicker"><span>地块档案</span><em className={`field-state field-state--${status}`}>{statusLabel}</em></div>
      <div className="panel-title"><div><strong>{field.id}</strong><h2>{field.name}</h2></div><span>{field.areaMu}<small>亩</small></span></div>
      <div className="crop-line"><LeafGlyph /><span>{field.cropLabel}</span><i />{field.growthStage}</div>
      <div className="metric-pair">
        <div>
          <small>土壤墒情{isA02 ? " · 根区 10cm" : ""}</small>
          <strong>{rootVwc}<sup>%</sup></strong>
          <span className={moistureOk ? "positive" : "warning"}>
            {isA02 ? (moistureOk ? `已恢复 · ${phase.rootVwc.dayTag}` : `偏低 · ${phase.rootVwc.dayTag}`) : moistureOk ? "正常" : "偏低"}
          </span>
        </div>
        <div>
          <small>长势指数{isA02 ? " · NDRE" : ""}</small>
          <strong>{isA02 ? `${phase.canopy.deltaPct}%` : field.growthIndex.toFixed(2)}</strong>
          <span>{isA02 ? `相对对照 · ${phase.dayLabel}` : "近 7 日"}</span>
        </div>
      </div>
      {isA02 && status === "risk" && (
        <div className="risk-note"><ScanLine size={17} /><p><strong>局部缺水风险</strong><span>冠层指数连续低于同品种平均值 12%，地面核验确认东支渠末端供水不足。</span></p></div>
      )}
      {isA02 && status === "processing" && (
        <div className="risk-note risk-note--processing"><ScanLine size={17} /><p><strong>灌溉处置中</strong><span>泵站与东支渠按供水顺序联动；到水当天只确认水到田，不代表已恢复。</span></p></div>
      )}
      {showRecovery && (
        <div className="recovery-proof">
          <span><small>处置前 · D0</small><strong>18%</strong></span>
          <i />
          <span><small>{phase.dayLabel} 根区复测</small><strong>{phase.rootVwc.value}%</strong></span>
          <em>冠层低值区 23.6 → {phase.canopy.areaMu} 亩（D3 复飞）</em>
        </div>
      )}
      <div className="panel-actions">
        <button type="button" onClick={() => setViewMode("field-ground")}><ArrowDownToLine size={16} />进入地块</button>
        <button type="button" onClick={() => setLayerMode("growth")}><ScanLine size={16} />查看异常</button>
      </div>
      {isA02 && (
        <button type="button" className="primary-action" onClick={() => void irrigate()} disabled={progress > 0 && progress < 1}>
          <Droplets size={17} />{progress > 0 && progress < 1 ? `灌溉进行中 ${Math.round(progress * 100)}%` : progress >= 1 ? "重新播放灌溉" : "启动灌溉演示"}<ChevronRight size={16} />
        </button>
      )}
    </aside>
  );
}

function LeafGlyph() { return <span className="leaf-glyph" aria-hidden="true">◇</span>; }
