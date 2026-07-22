/**
 * PROTOTYPE — fv-o6c.6。一次性原型状态。
 * 一个独立的小 zustand store，让 Canvas 内的 3D 证据层与 Canvas 外的 DOM
 * 控制条（变体切换 + 相位 scrubber）共享 variant / phase，无需跨边界 context。
 * 确定方案后随原型一并移除。
 */
import { create } from "zustand";
import { PHASE_BY_KEY, type EvidencePhase } from "./phaseModel";

export type EvidenceVariant = "A" | "B" | "C";

interface EvidenceProtoState {
  enabled: boolean;
  variant: EvidenceVariant;
  phase: EvidencePhase;
  scanReveal: number; // 0..1，UAV 扫描条带渐进揭示进度（变体 A 用）
  setEnabled: (v: boolean) => void;
  setVariant: (v: EvidenceVariant) => void;
  setPhase: (p: EvidencePhase) => void;
  setScanReveal: (v: number) => void;
}

const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
const protoOn = params?.get("proto") === "evidence";
const variantParam = (params?.get("variant") ?? "A").toUpperCase();
const initialVariant: EvidenceVariant =
  variantParam === "B" || variantParam === "C" ? variantParam : "A";

export const useEvidenceProto = create<EvidenceProtoState>((set) => ({
  enabled: protoOn,
  variant: initialVariant,
  phase: "d0-scan",
  scanReveal: 0,
  setEnabled: (enabled) => set({ enabled }),
  setVariant: (variant) => {
    set({ variant });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("variant", variant);
      window.history.replaceState({}, "", url);
    }
  },
  setPhase: (phase) => set({ phase, scanReveal: PHASE_BY_KEY[phase].storeScan }),
  setScanReveal: (scanReveal) => set({ scanReveal }),
}));

/** DOM 与 Canvas 都用这个判断是否进入原型模式。 */
export function evidenceProtoEnabled(): boolean {
  return useEvidenceProto.getState().enabled;
}
