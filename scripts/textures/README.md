# KTX2 texture pipeline (fv-66y.10)

Goal: take `public/assets/textures/source/` (≈17 MB of 1K JPGs) to KTX2/Basis so the
runtime asset total moves from ~22 MB toward the ≤8 MB budget
(`docs/research/fieldvision-3.0/dev-baseline-perf-budget.md` §3.1/§5.3), with GPU-native
decode (no per-frame transcode of JPG on the main thread).

## Why not auto-run

`toktx`/`basisu`/`gltf-transform` are not installed, and the consumer-side swap
(KTX2Loader transcoder path + `detectSupport` + per-map colour space) is **runtime**
behaviour that the repo's delivery rules require verifying in a real browser
("Use a real browser for visual acceptance"). The in-app-browser guest available to
the auto-run cannot screenshot/evaluate, so the convert+swap is operator-bound here.

## 1. Convert (operator)

```bash
brew install ktx                 # macOS; else grab KTX-Software from KhronosGroup
bash scripts/textures/convert-ktx2.sh
```

`convert-ktx2.sh` writes `*.ktx2` next to each source JPG with type-correct settings:
colour → ETC1S/sRGB, normal + roughness → UASTC/linear (precision; normals must not
band). Verify `du -sh public/assets/textures/source` before vs after.

## 2. Wire the loader (operator — runtime change, verify in a real browser)

a. Serve the Basis transcoder once. Copy `node_modules/three/examples/jsm/libs/basis/basis_transcoder.js`
   and `basis_transcoder.wasm` under `public/assets/libs/basis/`.

b. Create a shared loader at Canvas level (new small component inside `<Canvas>`, or in
   `FarmCanvas`) — once per renderer:
   ```ts
   import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
   const ktx2 = new KTX2Loader().setTranscoderPath("/assets/libs/basis/");
   ktx2.detectSupport(gl);          // gl from useThree
   ```
   Provide it via context or a module singleton.

c. In each consumer — `src/scene/IrrigationNetwork.tsx` (`useWaterNormal`,
   `useChannelMaps`), `src/scene/Terrain.tsx`, `src/scene/FieldParcel.tsx`,
   `src/scene/Facilities.tsx` — swap `useTexture([…jpg])` → `useLoader(ktx2, […ktx2])`.
   Keep the existing per-map colour-space rules (colour maps → `SRGBColorSpace`,
   normal/roughness stay linear) and `RepeatWrapping` repeat values.

d. `pnpm typecheck && pnpm lint && pnpm build`, then open `http://127.0.0.1:4173/?perf=1`
   in a real desktop browser and confirm:
   - no banding/dithering on normal maps (UASTC held up);
   - colour/contrast matches the JPG path (no sRGB/linear flip);
   - tiling still repeats cleanly on canal/terrain ribbons;
   - `tex`/`geo` in the perf HUD and total `public/assets` size both dropped.

## 3. Record

Once shipped, note the KTX2 derivatives + transcoder license in `ASSETS.md`
(sources unchanged — still ambientCG CC0).
