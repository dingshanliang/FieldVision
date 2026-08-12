import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const events: string[] = [];
  const ref = { current: null as boolean | null };
  const loader = {
    setTranscoderPath: vi.fn(),
    detectSupport: vi.fn(() => {
      events.push("detectSupport");
    }),
  };
  loader.setTranscoderPath.mockReturnValue(loader);
  return { events, ref, loader, gl: { renderer: true } };
});

vi.mock("react", () => ({
  useRef: vi.fn(() => mocks.ref),
}));

vi.mock("@react-three/fiber", () => ({
  useThree: vi.fn((selector: (state: { gl: typeof mocks.gl }) => unknown) => selector({ gl: mocks.gl })),
  useLoader: vi.fn((_loader: unknown, urls: string[]) => {
    mocks.events.push("load");
    return urls.map((url) => ({ url }));
  }),
}));

vi.mock("three/examples/jsm/loaders/KTX2Loader.js", () => ({
  KTX2Loader: class MockKtx2Loader {
    constructor() {
      return mocks.loader;
    }
  },
}));

import { useKtx2 } from "./ktx2Loader";

describe("useKtx2", () => {
  beforeEach(() => {
    mocks.events.length = 0;
    mocks.ref.current = null;
    mocks.loader.detectSupport.mockClear();
  });

  it("detects renderer support before the first texture load", () => {
    useKtx2(["/texture.ktx2"]);

    expect(mocks.events).toEqual(["detectSupport", "load"]);
    expect(mocks.loader.detectSupport).toHaveBeenCalledWith(mocks.gl);
  });

  it("does not repeat renderer detection on the next render", () => {
    useKtx2(["/texture.ktx2"]);
    mocks.events.length = 0;

    useKtx2(["/texture.ktx2"]);

    expect(mocks.events).toEqual(["load"]);
    expect(mocks.loader.detectSupport).toHaveBeenCalledTimes(1);
  });
});
