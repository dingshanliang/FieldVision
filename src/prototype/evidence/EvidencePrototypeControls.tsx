/**
 * PROTOTYPE — fv-o6c.6。DOM 控制条（Canvas 外）。
 * 负责：标记原型、强制取景 A02 证据机位、按相位驱动真实场景 store、
 * 变体切换 + 农业时间相位 scrubber、注入 ep-* 样式。
 * 确定方案后随原型一并移除。
 */
import { useEffect } from "react";
import { useFarmStore } from "../../state/useFarmStore";
import { PHASES } from "./phaseModel";
import { useEvidenceProto, type EvidenceVariant } from "./useEvidenceProto";

const VARIANTS: { key: EvidenceVariant; name: string; axis: string }[] = [
  { key: "A", name: "正射遥感主导", axis: "组织主轴 = 连续冠层指数图" },
  { key: "B", name: "分轨证据", axis: "组织主轴 = 来源分离" },
  { key: "C", name: "时间轴证据", axis: "组织主轴 = 农业时间" },
];

function nextVariantKey(current: EvidenceVariant, dir: 1 | -1): EvidenceVariant {
  const idx = Math.max(0, VARIANTS.findIndex((v) => v.key === current));
  const next = VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length];
  return (next ?? VARIANTS[0]!).key;
}

export function EvidencePrototypeControls() {
  const enabled = useEvidenceProto((s) => s.enabled);
  const variant = useEvidenceProto((s) => s.variant);
  const phaseKey = useEvidenceProto((s) => s.phase);
  const setVariant = useEvidenceProto((s) => s.setVariant);
  const setPhase = useEvidenceProto((s) => s.setPhase);

  const setIntroComplete = useFarmStore((s) => s.setIntroComplete);
  const selectField = useFarmStore((s) => s.selectField);
  const setDemoStep = useFarmStore((s) => s.setDemoStep);
  const setViewMode = useFarmStore((s) => s.setViewMode);
  const setScanProgress = useFarmStore((s) => s.setScanProgress);
  const setIrrigationProgress = useFarmStore((s) => s.setIrrigationProgress);

  // 进入原型：跳过 intro，把相机取景到 A02 证据验收机位 [66,52,-20]→[23,4,-66]。
  // 必须把 viewMode 设成非 overview，否则 CameraDirector 会先命中 overview 分支飞回远景。
  useEffect(() => {
    if (!enabled) return;
    setIntroComplete(true);
    selectField("A02");
    setViewMode("field-aerial");
    setDemoStep("drone-scan");
  }, [enabled, setIntroComplete, selectField, setViewMode, setDemoStep]);

  // 相位 → 真实场景 store（作物变色 / 渠道进水与相位一致）。
  useEffect(() => {
    if (!enabled) return;
    const phase = PHASES.find((p) => p.key === phaseKey);
    if (!phase) return;
    setScanProgress(phase.storeScan);
    setIrrigationProgress(phase.storeIrrigation);
  }, [enabled, phaseKey, setScanProgress, setIrrigationProgress]);

  // ←/→ 切换变体（输入框聚焦时不拦截）。
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowLeft") setVariant(nextVariantKey(variant, -1));
      if (e.key === "ArrowRight") setVariant(nextVariantKey(variant, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, variant, setVariant]);

  if (!enabled) return null;
  const activeVariant = VARIANTS.find((v) => v.key === variant) ?? VARIANTS[0]!;

  return (
    <>
      <style>{CSS}</style>
      <div className="ep-badge">PROTOTYPE · fv-o6c.6 · 多源证据语言（确定方案后移除）</div>

      <div className="ep-switcher">
        <button type="button" aria-label="上一变体" onClick={() => setVariant(nextVariantKey(variant, -1))}>‹</button>
        <div className="ep-switcher__label">
          <strong>{activeVariant.key} · {activeVariant.name}</strong>
          <span>{activeVariant.axis}</span>
        </div>
        <button type="button" aria-label="下一变体" onClick={() => setVariant(nextVariantKey(variant, 1))}>›</button>
      </div>

      <div className="ep-scrubber">
        <div className="ep-scrubber__title">农业时间相位（共享 · 三变体同相位同数据）</div>
        <div className="ep-scrubber__row">
          {PHASES.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`ep-phase ${p.key === phaseKey ? "is-active" : ""}`}
              onClick={() => setPhase(p.key)}
            >
              <span className="ep-phase__day">{p.day}</span>
              <span className="ep-phase__label">{p.label}</span>
            </button>
          ))}
        </div>
        <div className="ep-scrubber__hint">
          提示：27% 根区 VWC 只在 <b>D1</b> 出现；0.8 亩残余面积只在 <b>D3</b> 出现；到水(D0) ≠ 恢复(D1) ≠ 解除(D7)。
        </div>
      </div>
    </>
  );
}

const CSS = `
.ep-badge{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:60;font:600 11px/1 ui-monospace,monospace;letter-spacing:.04em;color:#1a1a1a;background:#ffd54a;padding:6px 12px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.18)}
.ep-switcher{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:10px;background:rgba(18,22,20,.86);color:#f4f1ea;padding:8px 14px;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.4);backdrop-filter:blur(8px)}
.ep-switcher button{width:34px;height:34px;border:none;border-radius:9px;background:rgba(255,255,255,.1);color:#fff;font-size:20px;cursor:pointer}
.ep-switcher button:hover{background:rgba(255,255,255,.2)}
.ep-switcher__label{min-width:188px;text-align:center}
.ep-switcher__label strong{display:block;font:600 14px/1.2 ui-sans-serif,system-ui;color:#fff}
.ep-switcher__label span{display:block;font:400 11px/1.4 ui-sans-serif,system-ui;color:#b9c2bd;margin-top:2px}
.ep-scrubber{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:60;width:min(880px,92vw);background:rgba(18,22,20,.82);color:#f4f1ea;padding:10px 14px;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.4);backdrop-filter:blur(8px)}
.ep-scrubber__title{font:600 11px/1 ui-sans-serif,system-ui;color:#b9c2bd;letter-spacing:.03em;margin-bottom:8px}
.ep-scrubber__row{display:flex;gap:6px}
.ep-phase{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 4px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:rgba(255,255,255,.04);color:#d7ddd8;cursor:pointer}
.ep-phase:hover{background:rgba(255,255,255,.1)}
.ep-phase.is-active{background:rgba(255,213,74,.22);border-color:#ffd54a;color:#fff}
.ep-phase__day{font:700 12px/1 ui-monospace,monospace;color:#ffd54a}
.ep-phase__label{font:500 10px/1.25 ui-sans-serif,system-ui;text-align:center}
.ep-scrubber__hint{margin-top:8px;font:400 11px/1.5 ui-sans-serif,system-ui;color:#aeb8b3}
.ep-scrubber__hint b{color:#ffd54a}
.ep-chip{background:rgba(16,20,18,.9);color:#f4f1ea;padding:7px 10px;border-radius:10px;font:500 11px/1.35 ui-sans-serif,system-ui;box-shadow:0 6px 18px rgba(0,0,0,.45);pointer-events:none;min-width:118px}
.ep-chip__head{display:flex;align-items:center;gap:6px;margin-bottom:3px}
.ep-chip__head strong{font-size:11px;color:#fff}
.ep-chip__head em{font-style:normal;font-size:10px;color:#b9c2bd}
.ep-dot{width:9px;height:9px;border-radius:50%;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.15)}
.ep-line{display:block;font-size:11px;color:#d7ddd8}
.ep-line--meta{color:#9da6a1;font-size:10px;margin-top:2px}
.ep-day{margin-left:auto;font:700 10px/1 ui-monospace,monospace;background:#ffd54a;color:#1a1a1a;padding:2px 6px;border-radius:5px}
.ep-chip--hero{min-width:168px}
.ep-chip--ground em{color:#b9c2bd}
.ep-chip--ref{display:inline-flex;align-items:center;gap:6px;font-size:10px}
.ep-narrative{background:rgba(16,20,18,.92);color:#fff;padding:10px 14px;border-radius:12px;max-width:300px;box-shadow:0 8px 24px rgba(0,0,0,.5);pointer-events:none;border-left:3px solid #ffd54a}
.ep-narrative__when{font:700 11px/1.3 ui-monospace,monospace;color:#ffd54a;margin-bottom:4px}
.ep-narrative p{font:500 12px/1.5 ui-sans-serif,system-ui;margin:0;color:#e7ece8}
.ep-timeline{display:flex;align-items:center;gap:6px;background:rgba(16,20,18,.9);padding:8px 12px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.45);pointer-events:none}
.ep-tl-node{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18)}
.ep-tl-node i{font:700 10px/1 ui-monospace,monospace;font-style:normal;color:#b9c2bd}
.ep-tl-node.is-done{background:rgba(63,122,58,.5);border-color:#3f7a3a}
.ep-tl-node.is-done i{color:#cfe8d0}
.ep-tl-node.is-active{background:#ffd54a;border-color:#ffd54a;transform:scale(1.18)}
.ep-tl-node.is-active i{color:#1a1a1a}
`;
