/**
 * Shared KTX2/Basis loader (fv-66y.10). Serves the GPU-native compressed
 * textures converted by scripts/textures/convert-ktx2.sh; transcoder at
 * /assets/libs/basis/ (copied from three/examples/jsm/libs/basis).
 *
 * IMPORTANT: KTX2Loader.load() throws "Missing initialization with
 * detectSupport(renderer)" if detectSupport hasn't run first. R3F's useLoader
 * calls load() DURING RENDER, before any useLayoutEffect — so a parent effect
 * is too late. useKtx2() runs detectSupport on the first render of each
 * consumer (ref-guarded, in the same render before useLoader below). detectSupport
 * is idempotent, so per-consumer repeats are harmless.
 */
import { useLoader, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import type { Texture } from "three";

export const ktx2Loader = new KTX2Loader().setTranscoderPath("/assets/libs/basis/");

type TextureTuple<Urls extends readonly string[]> = {
  -readonly [Index in keyof Urls]: Texture;
};

/** Load a fixed KTX2 set while preserving its tuple arity in the result. */
export function useKtx2<const Urls extends readonly string[]>(urls: Urls): TextureTuple<Urls> {
  const gl = useThree((state) => state.gl);
  const inited = useRef<boolean | null>(null);
  if (inited.current === null) {
    ktx2Loader.detectSupport(gl);
    inited.current = true;
  }
  const maps = useLoader(ktx2Loader, [...urls]);
  if (import.meta.env.DEV && maps.length !== urls.length) {
    throw new Error(`KTX2 set arity mismatch: requested ${urls.length}, received ${maps.length}`);
  }
  return maps as unknown as TextureTuple<Urls>;
}
