import { create } from "zustand";
import type { DemoStep, FieldStatus, LayerMode, ViewMode } from "../types/farm";

interface FarmState {
  selectedFieldId: string | null;
  hoveredFieldId: string | null;
  viewMode: ViewMode;
  layerMode: LayerMode;
  demoStep: DemoStep;
  demoPlaying: boolean;
  introComplete: boolean;
  irrigationProgress: number;
  droneFollowing: boolean;
  fieldStatuses: Record<string, FieldStatus>;
  selectField: (id: string | null) => void;
  setHoveredField: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setLayerMode: (mode: LayerMode) => void;
  setDemoStep: (step: DemoStep) => void;
  setDemoPlaying: (playing: boolean) => void;
  setIntroComplete: (complete: boolean) => void;
  setIrrigationProgress: (progress: number) => void;
  setDroneFollowing: (following: boolean) => void;
  setFieldStatus: (id: string, status: FieldStatus) => void;
  resetDemo: () => void;
}

const initialStatuses: Record<string, FieldStatus> = {
  A01: "normal", A02: "risk", A03: "normal", B01: "normal", B02: "processing", B03: "attention", C01: "normal",
};

export const useFarmStore = create<FarmState>((set) => ({
  selectedFieldId: null,
  hoveredFieldId: null,
  viewMode: "overview",
  layerMode: "natural",
  demoStep: "intro",
  demoPlaying: false,
  introComplete: false,
  irrigationProgress: 0,
  droneFollowing: false,
  fieldStatuses: initialStatuses,
  selectField: (selectedFieldId) => set({ selectedFieldId }),
  setHoveredField: (hoveredFieldId) => set({ hoveredFieldId }),
  setViewMode: (viewMode) => set({ viewMode }),
  setLayerMode: (layerMode) => set({ layerMode }),
  setDemoStep: (demoStep) => set({ demoStep }),
  setDemoPlaying: (demoPlaying) => set({ demoPlaying }),
  setIntroComplete: (introComplete) => set({ introComplete }),
  setIrrigationProgress: (irrigationProgress) => set({ irrigationProgress }),
  setDroneFollowing: (droneFollowing) => set({ droneFollowing }),
  setFieldStatus: (id, status) => set((state) => ({ fieldStatuses: { ...state.fieldStatuses, [id]: status } })),
  resetDemo: () => set({
    selectedFieldId: null,
    hoveredFieldId: null,
    viewMode: "overview",
    layerMode: "natural",
    demoStep: "overview",
    demoPlaying: false,
    irrigationProgress: 0,
    droneFollowing: false,
    fieldStatuses: initialStatuses,
  }),
}));

// Dev-only handle for visual QA automation (screenshot scripts can jump to any state).
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __farmStore?: typeof useFarmStore }).__farmStore = useFarmStore;
}
