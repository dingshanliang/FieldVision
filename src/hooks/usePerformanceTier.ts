import { useEffect, useState } from "react";

export type PerformanceTier = "low" | "medium" | "high";

function detectTier(): PerformanceTier {
  if (typeof window === "undefined") return "medium";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = window.innerWidth < 900;
  const cores = navigator.hardwareConcurrency || 4;
  if (reducedMotion || narrow || cores <= 4) return "low";
  if (cores >= 8 && window.devicePixelRatio <= 2.5) return "high";
  return "medium";
}

export function usePerformanceTier() {
  const [tier, setTier] = useState<PerformanceTier>(detectTier);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setTier(detectTier());
    motion.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      motion.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return tier;
}
