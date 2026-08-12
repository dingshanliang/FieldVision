import { describe, expect, it } from "vitest";
import { AUTO_REPLAY_IDLE_MS, shouldAutoReplay } from "./autoReplay";

describe("auto replay policy", () => {
  const base = {
    now: 100_000,
    completedAt: 60_000,
    lastActivityAt: 60_000,
    playing: false,
    hidden: false,
  };

  it("restarts only after the demo and user have both been idle for 30 seconds", () => {
    expect(shouldAutoReplay(base)).toBe(true);
    expect(shouldAutoReplay({ ...base, lastActivityAt: base.now - AUTO_REPLAY_IDLE_MS + 1 })).toBe(false);
    expect(shouldAutoReplay({ ...base, completedAt: base.now - AUTO_REPLAY_IDLE_MS + 1 })).toBe(false);
  });

  it("never interrupts playback or restarts in a hidden tab", () => {
    expect(shouldAutoReplay({ ...base, playing: true })).toBe(false);
    expect(shouldAutoReplay({ ...base, hidden: true })).toBe(false);
    expect(shouldAutoReplay({ ...base, completedAt: null })).toBe(false);
  });
});
