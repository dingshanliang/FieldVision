/**
 * 章节字幕带（fv-66y.13）。把演示"动了但不告诉观众"补上：底部 lower-third
 * 单句字幕，跟随 demoStep / recoveryPhase 切换。recoveryPhase !== "none" 时
 * 复用 recoveryModel.ts 已写好但此前无人渲染的 narrative 文案（fv-o6c.11）。
 *
 * 设计要点：
 *  - 每次文本变更通过 React key 触发 CSS 入场动画（caption-in），避免动画 stale。
 *  - introComplete === false 时不渲染（让 intro-caption 独占开场画面）。
 *  - recovered 阶段 recoveryPhase === "none" 是 setDemoStep → runRecovery 之间
 *    ~1.1s 短窗，用 "arrived" 文案填补，避免字幕闪断。
 *  - present 模式由挂载方决定是否渲染（见 App.tsx）。
 */
import { useFarmStore } from "../state/useFarmStore";
import { phaseEvidence } from "../state/recoveryModel";
import type { DemoStep } from "../types/farm";

const STEP_CAPTIONS: Partial<Record<DemoStep, string>> = {
  overview: "基地总览 · 每一块田，都可以进入",
  "select-field": "锁定 A02 东侧 · 镜头进入地块",
  "inspect-risk": "冠层指数连续偏低 · 切换图层查看长势异常",
  "drone-scan": "无人机复飞确认 · 沿扫描带采集多光谱证据",
  irrigation: "泵站启动 · 水流沿东支渠推进至 A02",
};

interface Caption {
  key: string;
  text: string;
}

function useChapterCaption(): Caption | null {
  const demoStep = useFarmStore((s) => s.demoStep);
  const recoveryPhase = useFarmStore((s) => s.recoveryPhase);
  const introComplete = useFarmStore((s) => s.introComplete);
  if (!introComplete) return null;
  if (demoStep === "recovered") {
    // 到水后的恢复相位驱动 narrative；arrived 短窗填补 setDemoStep→runRecovery 之间空档。
    const phase = recoveryPhase === "none" ? "arrived" : recoveryPhase;
    return { key: `recovered-${phase}`, text: phaseEvidence(phase).narrative };
  }
  const text = STEP_CAPTIONS[demoStep];
  return text ? { key: demoStep, text } : null;
}

export function ChapterCaption() {
  const caption = useChapterCaption();
  if (!caption) return null;
  return (
    <div key={caption.key} className="chapter-caption" role="status" aria-live="polite">
      {caption.text}
    </div>
  );
}
