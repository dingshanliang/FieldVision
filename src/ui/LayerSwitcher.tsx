import { Droplets, Leaf, RadioTower, ScanSearch } from "lucide-react";
import type { LayerMode } from "../types/farm";
import { useFarmStore } from "../state/useFarmStore";

const layers: Array<{ id: LayerMode; label: string; icon: typeof Leaf }> = [
  { id: "natural", label: "实景", icon: Leaf },
  { id: "growth", label: "长势", icon: ScanSearch },
  { id: "moisture", label: "墒情", icon: Droplets },
  { id: "facility", label: "设施", icon: RadioTower },
];

export function LayerSwitcher() {
  const active = useFarmStore((state) => state.layerMode);
  const setLayer = useFarmStore((state) => state.setLayerMode);
  return (
    <nav className="layer-switcher" aria-label="场景图层">
      <small>空间图层</small>
      {layers.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" className={active === id ? "is-active" : ""} onClick={() => setLayer(id)}><Icon size={16} /><span>{label}</span></button>
      ))}
    </nav>
  );
}
