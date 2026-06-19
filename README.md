# Warframe Build Calculator

A client-only web app for building Warframe loadouts and seeing **exactly where
your damage comes from** — each equipped mod's contribution is computed by a
framework-agnostic, fully unit-tested damage engine.

**Current state (Stages 1–5 complete).** The engine spans **every primary &
secondary gun, melee weapon, and Warframe** in the game: equip gear in an
in-game-style modding screen, switch fire modes / combo strings, configure the
**combat state** (buffs, combo count, stacks), and evaluate the build against a
configurable **enemy/target** (armor, shields, overguard, level & Steel-Path
scaling, faction). The results column splits into a **Build** view (intrinsic
damage/DPS, the pipeline chain, per-mod contributions) and a **vs Target** view
(effective damage, time-to-kill, enemy EHP). Every trigger type
(auto/semi/burst/charge), beam (held-continuous), shotgun (per-pellet status +
pellet multishot), AoE with linear falloff, and multi-mode weapons are modeled —
each matching a hand-verified wiki reference. See `docs/planning/Overview.md` for
the full architecture and the 8-stage roadmap.

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
    model/firemode.ts  FireMode: the calculable unit (trigger/delivery/components)
    gear/      class hierarchy: Weapon → Gun → Primary | Secondary (+ interfaces)
    pipeline/  ordered pure-function damage stages → calculateBuild(weapon, mode)
               triggers.ts (fire-rate → effective rate), mechanics.ts (falloff,
               shotgun P(≥1), proc weighting)
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

## How to add a weapon, a fire mode, or a mod

**Weapons are not hand-authored.** `npm run build:data` maps **every** Primary +
Secondary gun from `@wfcd/items` generically: each record's `attacks[]` becomes
one or more `FireMode`s (single-mode → one; genuine multi-mode → N; AoE → one mode
with a direct + a radial component), with trigger, pellet count, `shot_type`,
`charge_time`, and `falloff` read straight off the record. So a new weapon usually
needs **nothing** — it appears in the picker after the dump updates. The only
non-dump mechanics are burst count/delay (`BURST_META`) and beam ramp
(`BEAM_RAMP`) in `scripts/build-data.mjs`; add an entry there if a new burst/beam
weapon needs precise numbers.

A weapon whose behavior the generic mapping can't express (chaining beams,
status-ramp shotguns, grenade+cloud) is a **Stage 6 special case** — handled by the
custom-effect registry, never by hand-editing weapon data.

**Fire modes** are derived automatically from `attacks[]`; the multi-mode switcher
and per-mode results follow with no extra work.

**Mods _are_ hand-authored** (the dump only gives stat strings):

1. Add the exact `uniqueName` to `MOD_UNIQUE_NAMES` in `scripts/build-data.mjs`
   (find values via `node scripts/warframe-lookup.mjs --exact --category Mods
   "<name>"`), then run `npm run build:data`.
2. Author its structured effect(s) in `src/data/mods/descriptors.ts`, keyed by the
   mod's slug `id`: `{ bucket, value, element?, condition?, perStack? }` at **max
   rank**. The `compat` tag (Rifle/Pistol/Shotgun) filters it to the right weapon
   class automatically (`state/modCompat.ts`).
3. The picker, capacity, pipeline, and attribution pick it up automatically.
   Special-case mods register a function in `engine/model/registry.ts`.

## Verifying the math

The Stage 1 slice (9 mods on Vulkar Wraith) is hand-derived in
`docs/warframe/mechanics/damage.md` and asserted end-to-end in
`src/engine/pipeline/calculate.test.ts`. Stage 2 adds one reference weapon **per
mechanic** in `src/engine/pipeline/weapons.test.ts`, each anchored to its cached
fixture (`docs/warframe/weapons/*.md`): Glaxion Vandal (beam), Vaykor Hek
(shotgun), Tonkor (AoE/falloff), Lex Prime (secondary), Hind (burst), Lanka
(charge), Stradavar Prime (multi-mode). The trigger/falloff/shotgun formulas are
unit-tested against the locked `docs/warframe/mechanics/*.md` worked examples
(`triggers.test.ts`, `mechanics.test.ts`), and the data transform against the
fixtures (`src/data/transform.test.ts`). Run `npm test`.

## Status

Stages 1–5 complete: guns (all types), melee, Warframe modding, combat-state /
buffs, and the enemy/target model (effective damage + TTK). Stages 6–8 (incarnon
& special cases, companions & operator, sharing & persistence) remain — they build
on the seams established here; see `docs/planning/initial-layout/STAGE-NOTES.md`
for what those stages must honor.
