# KTX2 texture pipeline (fv-66y.10) — EXECUTED

Status: **conversion + loader swap done.** `public/assets/textures/source` went
17 MB (JPG) → **3.1 MB (KTX2)**; `public/assets` total ~22 MB → **~8.7 MB**.
The app loads `.ktx2` via three's `KTX2Loader` (transcoder at `/assets/libs/basis/`,
copied from `node_modules/three/examples/jsm/libs/basis/`).

## What was done

- `scripts/textures/convert-ktx2.sh` — reproducible converter (ETC1S for all maps;
  normals at q255, colour/roughness at q200, sRGB OETF for colour). Run with
  `toktx` from KTX-Software v4.4.2.
- `src/scene/ktx2Loader.ts` — shared `KTX2Loader` singleton; `FarmScene.tsx` calls
  `detectSupport(gl)` in a `useLayoutEffect` before loads resolve.
- Consumers swapped `useTexture` → `useLoader(ktx2Loader, …)` and `.jpg` → `.ktx2`:
  `Terrain`, `FieldParcel`, `Facilities`, `IrrigationNetwork`.
- Original JPGs removed (recoverable from git history).

## Decision log

- **UASTC rejected for normals/roughness**: ~2.3 MB/map vs ~0.3 MB ETC1S, no visible
  benefit at scene distances, blew the size budget. If normal banding shows up on
  close inspection, re-encode just `*_NormalGL` with `--encode uastc`.
- **All ETC1S**: size-optimal, the budget's hard constraint.

## Verify (real desktop browser)

```bash
pnpm build && pnpm preview      # http://127.0.0.1:4173/?perf=1
```

Confirm: scene renders normally (textures intact, no banding on ground/canal
normals under golden-hour light); perf HUD `tex`/`geo` populated; no console
errors about the Basis transcoder. If anything regresses, revert this commit —
the JPGs remain in git history.
