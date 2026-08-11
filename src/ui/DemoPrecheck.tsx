/**
 * 现场汇报预检 + 一键重置（fv-66y.9 / radar #4）。
 * 左上角状态片：就绪时显示性能档，异常时列出问题；"重置"按钮中止演示并回到
 * 稳定的基地总览。保守自动恢复：仅当章节状态漂移（reset 能修）时一次性回总览，
 * 画布/资产问题只上报（无法自动修）。
 */
import { useEffect, useRef, useState } from "react";
import { useDemoSequence } from "../hooks/useDemoSequence";
import { detectTier } from "../hooks/usePerformanceTier";
import { useFarmStore } from "../state/useFarmStore";
import { isRecoverable, precheckIssues, type PrecheckResult, type Tier } from "../utils/precheck";

function runPrecheck(): PrecheckResult {
  const s = useFarmStore.getState();
  const canvas = typeof document !== "undefined" ? document.querySelector("canvas") : null;
  const canvasOk =
    !!canvas && (canvas as HTMLCanvasElement).width > 0 && (canvas as HTMLCanvasElement).height > 0;
  const tier: Tier = detectTier();
  const issues = precheckIssues(s.demoStep, s.introComplete, canvasOk);
  return {
    ok: issues.length === 0,
    tier,
    demoStep: s.demoStep,
    introComplete: s.introComplete,
    canvas: canvasOk,
    issues,
  };
}

export function DemoPrecheck() {
  const introComplete = useFarmStore((s) => s.introComplete);
  const [result, setResult] = useState<PrecheckResult | null>(null);
  const { reset } = useDemoSequence();
  const autoRecovered = useRef(false);

  useEffect(() => {
    const check = () => setResult(runPrecheck());
    check();
    // Re-check after assets settle and on viewport changes (tier can shift).
    const t = window.setTimeout(check, 1500);
    window.addEventListener("resize", check);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", check);
    };
  }, [introComplete]);

  // Conservative auto-recover: only drift a reset can fix, and only once.
  useEffect(() => {
    if (!result || autoRecovered.current) return;
    if (result.introComplete && isRecoverable(result.issues) && result.issues.length > 0) {
      autoRecovered.current = true;
      reset();
      // Defer the re-read out of the effect body to avoid a synchronous setState cascade.
      const t = window.setTimeout(() => setResult(runPrecheck()), 0);
      return () => window.clearTimeout(t);
    }
  }, [result, reset]);

  if (!result) return null;
  const tierLabel = result.tier === "unknown" ? "" : `${result.tier} 档`;
  const handleReset = () => {
    reset();
    setResult(runPrecheck());
  };
  return (
    <div
      className="demo-precheck"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 12,
        top: 12,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 8px 5px 10px",
        background: "rgba(8,16,14,0.72)",
        color: "#cfe8dd",
        fontFamily: "ui-monospace, SFmono-Regular, Menlo, monospace",
        fontSize: 11,
        borderRadius: 6,
        border: "1px solid rgba(150,214,196,0.25)",
        pointerEvents: "auto",
      }}
    >
      <span
        className="demo-precheck__dot"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: result.ok ? "#7fd1b9" : "#e8a07f",
          boxShadow: result.ok ? "0 0 6px #7fd1b9" : "none",
        }}
      />
      <span className="demo-precheck__text">
        {result.ok ? `就绪 · ${tierLabel}`.trim() : `异常：${result.issues.join("、")}`}
      </span>
      <button
        type="button"
        className="demo-precheck__reset"
        onClick={handleReset}
        title="停止演示并回到稳定的基地总览"
        style={{
          margin: 0,
          padding: "2px 8px",
          background: "transparent",
          color: "#cfe8dd",
          fontFamily: "inherit",
          fontSize: 11,
          lineHeight: 1.4,
          border: "1px solid rgba(150,214,196,0.4)",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        重置
      </button>
    </div>
  );
}
