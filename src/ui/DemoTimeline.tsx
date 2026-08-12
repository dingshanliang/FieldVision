import { Pause, Play } from "lucide-react";
import { useDemoSequence } from "../hooks/useDemoSequence";
import { SMART_FARM_CHAPTER_META } from "../state/smartFarmDirector";
import type { SmartFarmChapter } from "../state/smartFarmState";
import { useFarmStore } from "../state/useFarmStore";

export function DemoTimeline() {
  const current = useFarmStore((state) => state.smartFarmChapter);
  const playing = useFarmStore((state) => state.demoPlaying);
  const paused = useFarmStore((state) => state.paused);
  const pacing = useFarmStore((state) => state.pacing);
  const introComplete = useFarmStore((state) => state.introComplete);
  const applySmartFarmChapter = useFarmStore((state) => state.applySmartFarmChapter);
  const setPacing = useFarmStore((state) => state.setPacing);
  const setIntroComplete = useFarmStore((state) => state.setIntroComplete);
  const setDemoStep = useFarmStore((state) => state.setDemoStep);
  const { play, stop, togglePause } = useDemoSequence();
  const activeIndex = Math.max(0, SMART_FARM_CHAPTER_META.findIndex((chapter) => chapter.id === current));

  if (!introComplete) {
    const skipIntro = () => {
      setIntroComplete(true);
      setDemoStep("overview");
    };
    return (
      <div className="intro-caption">
        <span>FIELDVISION / 01</span>
        <strong>每一块田，都可以进入</strong>
        <small>Loading spatial twin</small>
        <button type="button" className="intro-skip" onClick={skipIntro} aria-label="跳过开场动画">跳过开场 →</button>
      </div>
    );
  }

  function jumpTo(chapter: SmartFarmChapter) {
    stop();
    applySmartFarmChapter(chapter);
  }

  return (
    <footer className="demo-timeline">
      <div className="demo-controls">
        {playing ? (
          <button type="button" className="play-demo" onClick={togglePause} aria-label={paused ? "继续" : "暂停"}>
            {paused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
            {paused ? "继续" : "暂停"}
          </button>
        ) : (
          <button type="button" className="play-demo" onClick={() => void play()}><Play size={15} fill="currentColor" />播放九章节</button>
        )}
        <div className="pacing-toggle" role="group" aria-label="演示节奏">
          <button type="button" className={pacing === "fast" ? "is-active" : ""} onClick={() => setPacing("fast")}>90 秒</button>
          <button type="button" className={pacing === "narration" ? "is-active" : ""} onClick={() => setPacing("narration")}>150 秒</button>
        </div>
      </div>
      <div className="timeline-track">
        <span className="timeline-fill" style={{ width: `${(activeIndex / (SMART_FARM_CHAPTER_META.length - 1)) * 100}%` }} />
        {SMART_FARM_CHAPTER_META.map((chapter, index) => (
          <button type="button" key={chapter.id} className={index <= activeIndex ? "is-active" : ""} onClick={() => jumpTo(chapter.id)}>
            <i>{String(index + 1).padStart(2, "0")}</i><span>{chapter.label}</span>
          </button>
        ))}
      </div>
      <div className="director-hint" aria-hidden="true">空格 暂停 · ←/→ 章节 · Home 总览</div>
    </footer>
  );
}
