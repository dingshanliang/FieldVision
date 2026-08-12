export const AUTO_REPLAY_IDLE_MS = 30_000;

interface AutoReplayState {
  now: number;
  completedAt: number | null;
  lastActivityAt: number;
  playing: boolean;
  hidden: boolean;
}

/** Pure policy gate for kiosk replay; kept separate so timing semantics stay testable. */
export function shouldAutoReplay({ now, completedAt, lastActivityAt, playing, hidden }: AutoReplayState) {
  if (completedAt === null || playing || hidden) return false;
  return now - Math.max(completedAt, lastActivityAt) >= AUTO_REPLAY_IDLE_MS;
}
