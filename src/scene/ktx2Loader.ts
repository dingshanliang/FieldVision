/**
 * Shared KTX2/Basis loader (fv-66y.10). Serves the GPU-native compressed
 * textures converted by scripts/textures/convert-ktx2.sh. The transcoder lives
 * at /assets/libs/basis/ (copied from three/examples/jsm/libs/basis).
 *
 * detectSupport(renderer) must run once before any load resolves; FarmScene
 * does that in a useLayoutEffect so it lands before the worker transcodes.
 */
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

export const ktx2Loader = new KTX2Loader().setTranscoderPath("/assets/libs/basis/");
