# Repository Guidelines

## Beads Issue Tracker

Use Beads (`bd`) only for durable work that already has an issue, must survive the current session, or is explicitly requested. Current-turn scratch work stays in the session plan. Run `bd prime` only when Beads context is needed or stale.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Do not create Beads for adjacent findings unless they are accepted as durable follow-up work; otherwise report them without expanding the current task.
- Keep persistent project knowledge in Beads via `bd remember`; do not create ad hoc memory files.
- Do not commit, push, pull/rebase, or run Dolt remote sync unless the user explicitly asks for that remote or Git action.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## FieldVision — project overview

禾境 FieldVision is a **browser-only, visually-driven 3D farmland digital-twin demo** (React + Vite + TypeScript + React Three Fiber + Three.js + Zustand + GSAP). The cinematic 3D scene *is* the product — there is no backend, login, database, or real GIS dependency; all data is local mock. The **A02 hero parcel** carries the primary risk-discovery → drone scan → irrigation response → recovery story.

Read `docs/CODEX_TASK_3D_FARMLAND_DEMO.md` (scope/visual priorities) and `CONTEXT.md` (domain language: Base, Field Parcel, Hero Parcel, Observation, Risk Zone, Facility, Recovery) before sensitive changes.

### Layout

- `src/app/` — page assembly + autoplay entry (`App.tsx`).
- `src/scene/` — the 3D world: `FarmCanvas`/`FarmScene`, `CameraDirector`, `Drone`/`SafeDrone`, `Terrain`, `CropInstances`, `IrrigationNetwork`, `Facilities`, `FieldParcel`, `EvidenceMap`/`SpatialEvidence`, atmosphere & LOD.
- `src/state/` — Zustand store (`useFarmStore.ts`) + domain models (`evidenceModel`, `irrigationEvent`, `recoveryModel`). Unit-tested with Vitest.
- `src/ui/` — overlay UI (timeline, detail panel, layer switcher, top bar, presenter controls).
- `src/data/` — mock fields/facilities. `src/config/visual.ts` — tunable visual/animation params. `src/hooks/` — demo timeline + perf-tier detection. `src/utils/` — geometry + deterministic noise. `src/types/farm.ts` — domain types.
- `public/assets/` — browser-ready runtime assets (CC0 PBR textures, generated GLB). `scripts/blender/` — reproducible asset authoring. `docs/` — task book, PRD, acceptance criteria.

### Development commands

```bash
pnpm install
pnpm dev          # dev server at http://127.0.0.1:4173 (autoplays the demo on load)
pnpm test         # vitest run (unit tests live under src/state/*.test.ts)
pnpm typecheck    # tsc -b
pnpm lint         # eslint .
pnpm build        # tsc -b && vite build
pnpm preview      # serve the production build on :4173
```

Requires Node 22+ and pnpm 10+. While iterating, run the smallest relevant check. Before handoff, run the applicable typecheck, lint, and build checks for implementation changes; use a real browser when the task changes visible behavior.

### Architecture & editing rules

- **The store is the spine.** `useFarmStore` (Zustand) drives camera, layers, demo step, irrigation/scan/recovery progress, and per-field status. Both UI and 3D scene subscribe to it — do not duplicate scene state into component state. `applyDemoState(step)` resolves a step to a full preset via `getDemoStatePreset`; `resetDemo()` restores initial state.
- **Coordinates:** field polygons use `[x, z]` scene coords; camera/positions use `[x, y, z]`. Never feed raw lat/lon or earth coordinates into the scene — convert first (see README "接入真实数据").
- **Performance tiers** are auto-detected (`usePerformanceTier`); adjust DPR / crop density / shadow maps / postprocessing per tier, not globally. Keep per-frame object creation out of the render loop (reuse geometry/materials). Crops use `InstancedMesh`; only hero/selected objects cast shadows.
- **Strict TS is on:** `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`. Indexed access returns `T | undefined` and unused vars fail the build. Module resolution is `Bundler`.
- **Assets:** authoring under `scripts/`, browser-ready under `public/assets/`. External assets must be CC0 (or clearly licensed) and recorded in `ASSETS.md` before use. For large GLBs: Blender uncompressed GLB → Meshopt → KTX2 (do not stack Draco).

### Gotchas

- Autoplay fires ~1.2s after the intro completes; append **`?qa=1`** to the URL to disable autoplay so screenshot/automation scripts can drive state directly. In dev, `window.__farmStore` exposes the store for QA jumps.
- Dev/preview server binds **`127.0.0.1:4173`** (not `localhost:5173`).
- Regenerating 3D assets uses the desktop Blender CLI: `/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/blender/<script>.py` — only needed when re-authoring assets.
- Recommended acceptance viewport: 1440×900 or 1920×1080 in Chrome/Safari desktop.

## FieldVision delivery rules

- Read `docs/CODEX_TASK_3D_FARMLAND_DEMO.md` before changing product scope or visual priorities.
- The cinematic 3D scene is the product. Do not let dashboard UI, CRUD, GIS, or backend work displace the A02 camera dive, drone scan, and irrigation recovery flow.
- When the task targets hero-scene completion, placeholders are not an acceptable final state. Prefer Blender-authored or carefully built procedural assets with believable scale, edges, materials, shadows, and motion.
- External assets must have a clear license and be recorded in `ASSETS.md` before use.
- Keep raw/authoring scripts under `scripts/`; keep browser-ready assets under `public/assets/`.
- Run checks applicable to the changed code and acceptance criteria. Use a real browser for visible 3D or UI changes; stop once the scoped acceptance passes.
