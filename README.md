# Warframe Build Calculator

A client-only web app for building Warframe loadouts and seeing **exactly where
your damage comes from** — each equipped mod's contribution is computed by a
framework-agnostic, fully unit-tested damage engine.

**Stage 1 (this milestone)** proves the whole architecture on a thin vertical
slice: one primary rifle (**Braton Prime**) modded as in-game — aura + exilus +
8 mod slots + 2 arcane slots — with wiki-accurate damage math, per-mod
leave-one-out attribution, an expandable pipeline breakdown, and a minimal
combat-state config. See `docs/planning/Overview.md` for the full architecture
and the 8-stage roadmap.

## Quick start

```bash
npm install
npm run dev          # serve the app (Vite)
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server. |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/`. |
| `npm run preview` | Preview the production build. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Watch mode. |
| `npm run coverage` | Coverage report (engine/data/state/share). |
| `npm run lint` | ESLint (incl. the engine-purity import guard). |
| `npm run format` | Prettier. |
| `npm run build:data` | Regenerate `src/data/generated/` from `@wfcd/items`. |

## Architecture

Framework-agnostic engine, decoupled from React and the store.

```
src/
  engine/      PURE TypeScript — no React/store/DOM (enforced by ESLint)
    model/     types: buckets, EffectDescriptor, Build, DamageResult, registry
    gear/      class hierarchy: Weapon → Gun → Primary (+ capability interfaces)
    pipeline/  ordered pure-function damage stages → calculateBuild()
    attribution/  pluggable strategies; leave-one-out is the default
    buffs.ts   data-driven external-buff registry (Roar)
  data/        curated dataset (generated from @wfcd) + authored mod descriptors
  state/       Zustand store, resolve glue, capacity, undo/redo, selectors
  ui/          design tokens, primitives, modding screen, panels, config menu
```

- **Damage math** lives only in `src/engine` and is verified against
  `https://wiki.warframe.com/w/Damage/Calculation` (cached in
  `docs/warframe/mechanics/damage.md`). **Bucket model:** modifiers add within a
  bucket and multiply across buckets; each `EffectDescriptor` records whether it
  is additive-within-bucket or a separate multiplier.
- **Attribution** is leave-one-out (marginal DPS). Contributions **need not sum
  to 100%** — buckets multiply, so mods amplify each other. This is stated
  honestly in the UI.

## How to add a mod

1. Add its exact `uniqueName` to `SLICE_MOD_UNIQUE_NAMES` in
   `scripts/build-data.mjs` (find values via
   `node scripts/warframe-lookup.mjs --exact --category Mods "<name>"`), then run
   `npm run build:data` to regenerate `src/data/generated/mods.json`.
2. Author its structured effect(s) in `src/data/mods/descriptors.ts`, keyed by the
   mod's slug `id`: `{ bucket, value, element?, condition?, perStack? }`. Values
   are at **max rank** — the engine scales by the equipped rank. Cross-check the
   value against the wiki.
3. That's it — the picker, capacity, pipeline, and attribution pick it up
   automatically. Special-case mods (set bonuses, Condition Overload) instead
   register a function in `engine/model/registry.ts` (`CUSTOM_EFFECTS`).

## Verifying the math

The slice reference build (9 mods on Braton Prime) is hand-derived from the wiki
in `docs/warframe/mechanics/damage.md` and asserted end-to-end in
`src/engine/pipeline/calculate.test.ts` (burst ≈ 15,283 DPS unbuffed,
≈ 19,868 vs Grineer with Bane). Run `npm test`.

## Status

Stage 1 complete. Stages 2–8 (more weapons, melee, warframes, enemy model,
incarnon/specials, companions, sharing) build on the seams established here — see
`docs/planning/initial-layout/STAGE-NOTES.md` for what Stage 2 must honor.
