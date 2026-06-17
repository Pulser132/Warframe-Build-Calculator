# Warframe Build Calculator — Planning Overview

This is the shared, cross-cutting reference for the whole project. Every stage
plan (`docs/planning/<stage>/Plan.md`) assumes the decisions recorded here and
should **not** repeat them. If a cross-cutting decision changes, change it here.

The end goal (see `docs/planning/initial-layout/Goal.md`): a website where users
build, share, and analyze Warframe loadouts, with each mod's **damage
contribution** made visible, and a modding UI that mirrors the in-game screens.

---

## Locked decisions (from planning interview)

| Area | Decision |
|------|----------|
| Project scope | Entire project, planned as 8 sequential stages, one directory each. |
| Hosting / sharing | **Client-only.** No backend. Builds serialize into a compact, versioned code in the URL hash, plus localStorage. |
| Language | **TypeScript**, `strict` mode. |
| Build / dev | **Vite + React.** Static output. |
| Testing | **Vitest + React Testing Library.** Engine = pure unit tests; UI = component tests. |
| Lint / format | ESLint + Prettier. |
| State management | **Zustand** single store, selective subscriptions, middleware for persistence / URL-sync / undo-redo. |
| Styling | **CSS Modules + a design-token layer** (CSS custom properties). `frontend-design` plugin guides the aesthetic. |
| Share codes | Versioned, compact encoding (stable item-ID schema) compressed with an `lz-string`-style codec, stored in the URL hash. |
| Engine | Framework-agnostic **pure TS**. Modifier **bucket model** (additive within a bucket, multiplicative across buckets). Fixed, ordered pipeline. Data-driven effect descriptors for mods/buffs/arcanes; class hierarchy + interfaces for gear. Rich output object with a per-source breakdown. |
| Target / enemy model | **Phased.** Stages 1–4 compute intrinsic damage with conditional mods as toggles; Stage 5 introduces a configurable enemy (armor, health type, level scaling, faction). |
| Mod attribution | **Leave-one-out (marginal)** as the primary metric, behind a pluggable attribution interface (Shapley / ordered / multiplier-chain can be added later). |
| Data pipeline | **Build-time transform** of `@wfcd/items` into a curated, normalized internal dataset + an authored mod → effect-descriptor map; delivered code-split / lazy-loaded. |
| Plan depth | Stage 1 fully task-detailed; Stages 2–8 actionable outlines, each expanded to full task granularity immediately before it is implemented. |
| Build model | A `Build` is a container of generic **gear compartments** (`GearBuild` = item + slots + capacity), one per gear type (weapon, warframe, later companion/operator); `CombatState` is shared at the top. Mod compatibility is **gear-type aware**. See ADR 0003. |
| Frame stats | Warframe stats use a **separate resolver** (`resolveWarframe → WarframeStats`) that reuses the bucket primitive but is **not** the weapon damage pipeline. |

---

## Stage map

| # | Directory | Stage | Outcome |
|---|-----------|-------|---------|
| 1 | `initial-layout/` | Foundation & vertical slice | Scaffold + engine core + data pipeline + **one primary rifle end-to-end** (math, modding UI, per-mod contribution, minimal state). Proves the architecture. |
| 2 | `weapons-coverage/` | All gun types | Generalize to Primary/Secondary via inheritance/interfaces; trigger types, projectile/hitscan, AoE/falloff, multi-mode weapons. |
| 3 | `melee/` | Melee | Combo counter, heavy attacks, stance/follow-through, melee mod set. |
| 4 | `warframes/` | Warframe modding | Build becomes gear **compartments** (frame + weapon); aura/exilus/8/arcanes, the four ability attributes, EHP, Umbral set bonus; **frame-derived Roar magnitude + a combat-state activation toggle wired into the weapon calc** (e.g. Roar). |
| 5 | `buffs-state/` | Combat State & Target | Expandable buff/state config **and** the configurable enemy model (armor/health/level/faction → effective damage & time-to-kill). Also: **enemy-facing** ability application (damage abilities), damage-type-specific EHP / shield-gating. (The basic frame→weapon buff *magnitude* wiring moved to Stage 4.) |
| 6 | `incarnon-specials/` | Incarnon & special cases | Per-weapon special-case hooks (calc + UI); incarnon evolution selection. |
| 7 | `companions-operator/` | Companions & Operator | Sentinels/pets, operator/amp, their mods and contributions. |
| 8 | `share-persist/` | Sharing & persistence | Save/load, named builds, shareable URL build codes, import/export, migration. |

Stages are ordered to front-load the riskiest, most foundational work (the
engine). Each stage must be tested and correct before the next begins
(Goal.md, Notes).

---

## Proposed repository layout

```
scripts/
  warframe-lookup.mjs      # existing — ad-hoc data lookups (used by warframe-info skill)
  build-data.mjs           # build-time transform: @wfcd/items -> curated dataset (weapons + warframes)
  scrape-combos.mjs        # offline scraper (manual run) -> combos.json (ADR 0001)
  scrape-abilities.mjs     # NEW — offline scraper (manual run) -> abilities.json (ADR 0001)
src/
  engine/                  # PURE TypeScript, no React imports
    model/                 # types: buckets, EffectDescriptor, Build, DamageResult, ...
    gear/                  # class hierarchy + interfaces: Weapon -> Gun -> Primary/Secondary, Melee; Warframe
    warframe/              # frame-stat resolver (resolveWarframe -> WarframeStats); NOT the damage pipeline
    pipeline/              # ordered damage-calculation stages
    attribution/           # pluggable strategies; leave-one-out is the default
    index.ts               # calculateBuild(build, combatState) -> DamageResult
  data/
    generated/             # curated JSON, git-tracked: weapons.json + warframes.json (build-data.mjs); combos.json + abilities.json (offline scrapers)
    mods/                  # authored effect-descriptor maps & special-case overrides
    loaders.ts             # lazy, code-split dataset loaders
  state/                   # Zustand store, serialization, URL-sync, undo/redo
  share/                   # build-code encode/decode (versioned)
  ui/
    components/            # shared primitives (slot, mod card, tooltip, ...)
    gear/                  # in-game-style modding screens per gear type
    panels/               # damage breakdown + per-mod contribution panels
    config/               # combat-state / buff configuration menu
    styles/               # design tokens + global styles
  App.tsx, main.tsx
docs/
  warframe/                # cached game facts (managed by the warframe-info skill)
  planning/                # these planning docs
```

Co-locate tests as `*.test.ts(x)` next to the unit under test.

---

## Engine model (applies to every stage)

The damage math is the core of the product, so accuracy is paramount.

- **Source of truth for formulas:** `https://wiki.warframe.com/w/Damage` (and the
  related damage-reference pages). Numbers and bucket membership **must** be
  verified against the wiki — never from model memory. Use the `warframe-info`
  skill / `scripts/warframe-lookup.mjs` for concrete item/mod values and the wiki
  for mechanics. Goal.md, Notes: "Refer to the wiki ... This is the most
  important part of this project."
- **Bucket model.** A *bucket* is a group of modifiers that combine **additively**
  (e.g. all base-damage mods sum: Serration + a riven). Buckets then combine
  **multiplicatively** with each other (base-damage bucket × multishot bucket ×
  crit bucket × faction bucket × …). Every `EffectDescriptor` records explicitly
  whether it is additive-within-bucket or a multiplicative bucket of its own —
  satisfying Goal.md's "note which stats are additive and which are
  multiplicative." Buff-stacking nuances (e.g. which buffs are additive with each
  other vs a separate multiplier — Roar is the canonical example) must be sourced
  from the wiki and encoded in the bucket taxonomy.
- **Pipeline.** A fixed, ordered list of pure stage functions. Each stage consumes
  the running intermediate and emits a **labeled** partial result, so the UI can
  render the full chain and the attribution layer can diff it.
- **Effect descriptors (data-driven).** Mods, arcanes, and buffs are declarative
  records (`{ bucket, op, value, condition? }`), not classes. Special-case mods
  (set bonuses, conditional/stacking mods like Galvanized/Condition Overload) use
  a richer descriptor or a named custom effect function registered in a registry —
  so new special cases are added as data + a small function, never a UI rewrite
  (Goal.md, Notes).
- **Gear (OOP).** Weapons/frames/companions use a class hierarchy + interfaces
  (`Weapon -> Gun -> Primary/Secondary`, `Melee`; interfaces such as `HasCrit`,
  `HasStatus`, `HasIncarnon`, `MultiMode`). Similar gear reuses behavior; unusual
  gear overrides hooks (Goal.md: "use inheritance and interfaces").
- **Output.** `calculateBuild` returns a `DamageResult` with: per-damage-type
  values, average hit (crit-weighted), burst DPS, sustained DPS (reload-adjusted),
  status chance/effects, the labeled pipeline chain, and the per-source
  contribution breakdown.
- **Attribution.** `AttributionStrategy` interface; `leaveOneOut` is the default
  (contribution = total − total-without-source, as a DPS delta and %). The UI must
  state honestly that values need not sum to 100% (multipliers interact).

---

## Conventions

- **Facts about the game** (stats, mod values, mechanics) come only from the
  `warframe-info` skill / `scripts/warframe-lookup.mjs` / the wiki — never from
  memory. Cache results under `docs/warframe/`.
- **Additive vs multiplicative** is recorded explicitly on every modifier.
- **Engine purity:** nothing in `src/engine/` imports React, the store, or the DOM.
- **Tests first for math:** every pipeline stage and every non-trivial mod
  interaction gets a unit test with a hand-verified expected number.
- **Implementing a stage:** use the `implement-plan` skill against that stage's
  directory. Expand Stages 2–8 to full task granularity *before* implementing.
