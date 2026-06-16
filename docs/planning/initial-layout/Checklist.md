# Stage 1 — Foundation & Vertical Slice — Checklist

Track progress here while running the `implement-plan` skill. See `Plan.md` for
detail and `../Overview.md` for cross-cutting decisions.

## Phase 1 — Scaffold & tooling
- [ ] Vite (React + TS) initialized; reconciled with existing `package.json`
- [ ] TypeScript `strict` + path aliases (`@engine`/`@data`/`@state`/`@ui`/`@share`)
- [ ] Vitest + RTL + jsdom; `test`/`test:watch`/`coverage` scripts
- [ ] ESLint + Prettier; `lint`/`format` scripts
- [ ] Source tree created (`engine`/`data`/`state`/`share`/`ui`) with barrels + `App.tsx`
- [ ] Engine-purity import guard (no React/store/DOM in `src/engine/`)
- [ ] `dev`/`build`/`preview`/`test`/`lint` all run clean

## Phase 2 — Data pipeline
- [ ] Curated internal schema defined (`WeaponData`/`ModData`/`ArcaneData`)
- [ ] `scripts/build-data.mjs` transforms `@wfcd/items` → `src/data/generated/`; `build:data` script
- [ ] Authored mod → effect-descriptor map for slice mods (values cross-checked vs wiki)
- [ ] `src/data/loaders.ts` lazy/code-split loaders
- [ ] Transform + mod-mapping unit tests pass

## Phase 3 — Engine model & gear hierarchy
- [ ] Bucket taxonomy defined + **verified against wiki**; combine rules documented
- [ ] `EffectDescriptor` + conditional/custom-effect registry shape
- [ ] `Build` + `DamageResult` types
- [ ] Gear hierarchy + interfaces (`Weapon→Gun→Primary`; `HasCrit`/`HasStatus`/`MultiMode`/`HasIncarnon`)
- [ ] Slice rifle instantiates from curated data; compiles under `strict`

## Phase 4 — Damage pipeline
- [ ] Canonical formula + stage order verified vs wiki; cached to `docs/warframe/mechanics/damage.md`
- [ ] Stage: gather descriptors (mods/arcanes/active conditionals)
- [ ] Stage: base-damage bucket (additive)
- [ ] Stage: elementals add + combine (correct order)
- [ ] Stage: multishot bucket
- [ ] Stage: critical (avg crit; crit chance > 100% tiers)
- [ ] Stage: status chance / effects
- [ ] Stage: fire-rate → burst DPS; reload → sustained DPS
- [ ] Stage: conditional/faction multiplier
- [ ] `calculateBuild` assembled; returns labeled chain
- [ ] Per-stage + e2e tests pass; slice build matches hand-verified wiki numbers

## Phase 5 — Attribution
- [ ] `AttributionStrategy` interface
- [ ] `leaveOneOut` strategy (DPS delta + %)
- [ ] Recompute memoized/reused
- [ ] Tests: per-mod contributions correct; conditional toggle changes attribution
- [ ] "Need not sum to 100%" caveat documented

## Phase 6 — State layer
- [ ] Zustand store: `Build` + actions (assign/clear/rank/polarity/forma/toggle)
- [ ] Derived selector runs `calculateBuild` + attribution, recomputes on relevant change
- [ ] Undo/redo middleware
- [ ] Store action + derived-result tests pass

## Phase 7 — Modding screen UI
- [ ] Design-token layer (palette/polarity/slot/spacing/type) via frontend-design
- [ ] Primitives: `ModSlot`/`ModCard`/`PolarityBadge`/`Tooltip`
- [ ] Rifle layout: aura + exilus top, 8 slots, 2 arcanes right
- [ ] Mod picker (search/filter, slot+polarity aware) + click-to-assign + rank selector
- [ ] Capacity used/total, polarity drain reduction, forma/polarize, soft over-capacity warning

## Phase 8 — Results & contribution UI
- [ ] Damage summary panel (per-type, avg hit, burst/sustained DPS, status)
- [ ] Per-mod contribution display (DPS delta + %, "may not sum to 100%" note)
- [ ] Expandable pipeline chain view
- [ ] Panel component tests

## Phase 9 — Minimal combat-state config
- [ ] Config menu: conditional toggles + one external buff (adjustable strength)
- [ ] Data-driven buff registry (new buff = registry entry only)
- [ ] Buff/toggle change flows through engine → totals + attribution

## Phase 10 — Integration, verification & docs
- [ ] Single integrated screen; basic responsive + keyboard a11y
- [ ] E2E: known reference build numbers match (reference documented)
- [ ] `README.md` updated (setup, scripts, architecture pointer, how to add a mod)
- [ ] High engine coverage; `lint` + full `test` green
- [ ] Stage 2 seams/assumptions noted
