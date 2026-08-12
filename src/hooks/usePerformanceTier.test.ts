import { afterEach, describe, expect, it, vi } from "vitest";
import { detectTier } from "./usePerformanceTier";

function stubDevice({
  reducedMotion = false,
  width = 1440,
  cores = 8,
  pixelRatio = 2,
}: {
  reducedMotion?: boolean;
  width?: number;
  cores?: number;
  pixelRatio?: number;
} = {}) {
  vi.stubGlobal("window", {
    innerWidth: width,
    devicePixelRatio: pixelRatio,
    location: { search: "" },
    matchMedia: vi.fn(() => ({ matches: reducedMotion })),
  });
  vi.stubGlobal("navigator", { hardwareConcurrency: cores });
}

describe("detectTier", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses medium when browser capabilities are unavailable", () => {
    expect(detectTier()).toBe("medium");
  });

  it.each([
    { device: { reducedMotion: true }, reason: "reduced motion" },
    { device: { width: 899 }, reason: "narrow viewport" },
    { device: { cores: 4 }, reason: "four or fewer CPU cores" },
  ])("uses low for $reason", ({ device }) => {
    stubDevice(device);
    expect(detectTier()).toBe("low");
  });

  it("uses high for a wide, capable device at the pixel-ratio boundary", () => {
    stubDevice({ width: 900, cores: 8, pixelRatio: 2.5 });
    expect(detectTier()).toBe("high");
  });

  it.each(["high", "medium", "low"] as const)("allows deterministic %s-tier acceptance", (tier) => {
    stubDevice();
    window.location.search = `?tier=${tier}`;
    expect(detectTier()).toBe(tier);
  });

  it.each([{ cores: 7 }, { pixelRatio: 2.6 }])("uses medium for balanced device %j", (device) => {
    stubDevice(device);
    expect(detectTier()).toBe("medium");
  });
});
