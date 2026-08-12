import { SMART_FARM_CHAPTER_META } from "../state/smartFarmDirector";
import { useFarmStore } from "../state/useFarmStore";

export function ChapterCaption() {
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const introComplete = useFarmStore((state) => state.introComplete);
  if (!introComplete) return null;
  const meta = SMART_FARM_CHAPTER_META.find((candidate) => candidate.id === chapter);
  if (!meta) return null;
  return (
    <div key={chapter} className="chapter-caption" role="status" aria-live="polite">
      {meta.label} · {meta.outcome}
    </div>
  );
}
