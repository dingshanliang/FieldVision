import { ArrowDownToLine, ChevronRight, Droplets, ScanLine } from "lucide-react";
import { fieldById } from "../data/fields";
import { useDemoSequence } from "../hooks/useDemoSequence";
import { useFarmStore } from "../state/useFarmStore";
import { deriveEvidenceState, evidenceMetadata } from "../state/evidenceModel";
import { deriveIrrigationEvent } from "../state/irrigationEvent";

export function FieldDetailPanel() {
  const selectedId = useFarmStore((state) => state.selectedFieldId);
  const statuses = useFarmStore((state) => state.fieldStatuses);
  const progress = useFarmStore((state) => state.irrigationProgress);
  const scanProgress = useFarmStore((state) => state.scanProgress);
  const setViewMode = useFarmStore((state) => state.setViewMode);
  const setLayerMode = useFarmStore((state) => state.setLayerMode);
  const { irrigate } = useDemoSequence();
  if (!selectedId) return null;
  const field = fieldById[selectedId];
  if (!field) return null;
  const evidence = deriveEvidenceState(scanProgress, progress);
  const irrigation = deriveIrrigationEvent(progress);
  const recoveredMoisture = Math.round(field.moisture + (field.moistureTarget - field.moisture) * evidence.cropRecoveryProgress);
  const status = statuses[selectedId];
  const statusLabel = status === "recovered" ? "风险已解除" : status === "processing" ? "正在处置" : status === "risk" ? "需要关注" : "运行正常";

  return (
    <aside className="field-panel" aria-live="polite">
      <div className="panel-kicker"><span>地块档案</span><em className={`field-state field-state--${status}`}>{statusLabel}</em></div>
      <div className="panel-title"><div><strong>{field.id}</strong><h2>{field.name}</h2></div><span>{field.areaMu}<small>亩</small></span></div>
      <div className="crop-line"><LeafGlyph /><span>{field.cropLabel}</span><i />{field.growthStage}</div>
      <div className="metric-pair">
        <div><small>土壤墒情</small><strong>{recoveredMoisture}<sup>%</sup></strong><span className={recoveredMoisture >= 25 ? "positive" : "warning"}>{recoveredMoisture >= 25 ? "已恢复" : "低于目标"}</span></div>
        <div><small>长势指数</small><strong>{(field.growthIndex + evidence.cropRecoveryProgress * 0.07).toFixed(2)}</strong><span>{evidence.cropRecoveryProgress > 0.8 ? "复测回升" : "近 7 日"}</span></div>
      </div>
      {field.id === "A02" && status !== "recovered" && (
        <div className={`risk-note ${status === "processing" ? "risk-note--processing" : ""}`}><ScanLine size={17} /><p><strong>{status === "processing" ? "灌溉恢复中" : "局部缺水风险"}</strong><span>{status === "processing" ? irrigation.stage === "wetting" ? "A02 已到水，湿润锋正从东侧渠口推进。" : "泵站与东支渠按供水顺序联动。" : "长势低于同品种平均值 12%，东支渠末端供水不足。"}</span></p></div>
      )}
      {field.id === "A02" && status === "recovered" && (
        <div className="recovery-proof">
          <span><small>处置前</small><strong>18%</strong></span>
          <i />
          <span><small>{evidenceMetadata.reviewedAt} 复测</small><strong>27%</strong></span>
          <em>异常面积 23.6 → 0.8 亩</em>
        </div>
      )}
      <div className="panel-actions">
        <button type="button" onClick={() => setViewMode("field-ground")}><ArrowDownToLine size={16} />进入地块</button>
        <button type="button" onClick={() => setLayerMode("growth")}><ScanLine size={16} />查看异常</button>
      </div>
      {field.id === "A02" && (
        <button type="button" className="primary-action" onClick={() => void irrigate()} disabled={progress > 0 && progress < 1}>
          <Droplets size={17} />{progress > 0 && progress < 1 ? `灌溉进行中 ${Math.round(progress * 100)}%` : progress >= 1 ? "重新播放灌溉" : "启动灌溉演示"}<ChevronRight size={16} />
        </button>
      )}
    </aside>
  );
}

function LeafGlyph() { return <span className="leaf-glyph" aria-hidden="true">◇</span>; }
