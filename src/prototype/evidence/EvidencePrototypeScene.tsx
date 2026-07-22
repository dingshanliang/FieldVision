/**
 * PROTOTYPE — fv-o6c.6。Canvas 内的证据层，替代 RiskOverlay + SpatialEvidence。
 * 按 variant 渲染对应变体；phase / scanReveal 来自共享原型 store。
 * 确定方案后随原型一并移除。
 */
import { PHASE_BY_KEY } from "./phaseModel";
import { useEvidenceProto } from "./useEvidenceProto";
import { VariantA } from "./VariantA";
import { VariantB } from "./VariantB";
import { VariantC } from "./VariantC";

export function EvidencePrototypeScene() {
  const variant = useEvidenceProto((s) => s.variant);
  const phaseKey = useEvidenceProto((s) => s.phase);
  const scanReveal = useEvidenceProto((s) => s.scanReveal);
  const phase = PHASE_BY_KEY[phaseKey];

  if (variant === "B") return <VariantB phase={phase} />;
  if (variant === "C") return <VariantC phase={phase} />;
  return <VariantA phase={phase} scanReveal={scanReveal} />;
}
