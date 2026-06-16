# Stage 1 — Foundation & Vertical Slice — Checklist

Track progress here while running the `implement-plan` skill. See `Plan.md` for
detail and `../Overview.md` for cross-cutting decisions.

## Phase 1 — Scaffold & tooling
- [x] Vite (React + TS) initialized; reconciled with existing `package.json`
- [x] TypeScript `strict` + path aliases (`@engine`/`@data`/`@state`/`@ui`/`@share`)
- [x] Vitest + RTL + jsdom; `test`/`test:watch`/`coverage` scripts
- [x] ESLint + Prettier; `lint`/`format` scripts
- [x] Source tree created (`engine`/`data`/`state`/`share`/`ui`) with barrels + `App.tsx`
- [x] Engine-purity import guard (no React/store/DOM in `src/engine/`)
- [x] `dev`/`build`/`preview`/`test`/`lint` all run clean

## Phase 2 — Data pipeline
- [x] Curated internal schema defined (`WeaponData`/`ModData`/`ArcaneData`)
- [x] `scripts/build-data.mjs` transforms `@wfcd/items` → `src/data/generated/`; `build:data` script
- [x] Authored mod → effect-descriptor map for slice mods (values cross-checked vs wiki)
- [x] `src/data/loaders.ts` lazy/code-split loaders
- [x] Transform + mod-mapping unit tests pass

## Phase 3 — Engine model & gear hierarchy
- [x] Bucket taxonomy defined + **verified against wiki**; combine rules documented
- [x] `EffectDescriptor` + conditional/custom-effect registry shape
- [x] `Build` + `DamageResult` types
- [x] Gear hierarchy + interfaces (`Weapon→Gun→Primary`; `HasCrit`/`HasStatus`/`MultiMode`/`HasIncarnon`)
- [x] Slice rifle instantiates from curated data; compiles under `strict`

## Phase 4 — Damage pipeline
- [x] Canonical formula + stage order verified vs wiki; cached to `docs/warframe/mechanics/damage.md`
- [x] Stage: gather descriptors (mods/arcanes/active conditionals)
- [x] Stage: base-damage bucket (additive)
- [x] Stage: elementals add + combine (correct order)
- [x] Stage: multishot bucket
- [x] Stage: critical (avg crit; crit chance > 100% tiers)
- [x] Stage: status chance / effects
- [x] Stage: fire-rate → burst DPS; reload → sustained DPS
- [x] Stage: conditional/faction multiplier
- [x] `calculateBuild` assembled; returns labeled chain
- [x] Per-stage + e2e tests pass; slice build matches hand-verified wiki numbers

## Phase 5 — Attribution
- [x] `AttributionStrategy` interface
- [x] `leaveOneOut` strategy (DPS delta + %)
- [x] Recompute memoized/reused
- [x] Tests: per-mod contributions correct; conditional toggle changes attribution
- [x] "Need not sum to 100%" caveat documented

## Phase 6 — State layer
- [x] Zustand store: `Build` + actions (assign/clear/rank/polarity/forma/toggle)
- [x] Derived selector runs `calculateBuild` + attribution, recomputes on relevant change
- [x] Undo/redo middleware
- [x] Store action + derived-result tests pass

## Phase 7 — Modding screen UI
- [x] Design-token layer (palette/polarity/slot/spacing/type) via frontend-design
- [x] Primitives: `ModSlot`/`ModCard`/`PolarityBadge`/`Tooltip`
- [x] Rifle layout: aura + exilus top, 8 slots, 2 arcanes right
- [x] Mod picker (search/filter, slot+polarity aware) + click-to-assign + rank selector
- [x] Capacity used/total, polarity drain reduction, forma/polarize, soft over-capacity warning

## Phase 8 — Results & contribution UI
- [x] Damage summary panel (per-type, avg hit, burst/sustained DPS, status)
- [x] Per-mod contribution display (DPS delta + %, "may not sum to 100%" note)
- [x] Expandable pipeline chain view
- [x] Panel component tests

## Phase 9 — Minimal combat-state config
- [x] Config menu: conditional toggles + one external buff (adjustable strength)
- [x] Data-driven buff registry (new buff = registry entry only)
- [x] Buff/toggle change flows through engine → totals + attribution

## Phase 10 — Integration, verification & docs
- [x] Single integrated screen; basic responsive + keyboard a11y
- [x] E2E: known reference build numbers match (reference documented)
- [x] `README.md` updated (setup, scripts, architecture pointer, how to add a mod)
- [x] High engine coverage; `lint` + full `test` green
- [x] Stage 2 seams/assumptions noted
