# Stage 1 — Foundation & Vertical Slice

> Read `docs/planning/Overview.md` first — it holds all cross-cutting decisions
> (stack, engine model, conventions) that this plan assumes and does not repeat.

## Goal of this stage

Stand up the project and prove the **entire architecture** on the thinnest
possible slice: **one simple primary rifle, end-to-end.** That means real,
wiki-verified damage math through the pure engine, the in-game-style modding UI
(aura + exilus + 8 mod slots + 2 arcane slots), the per-mod **damage
contribution** display, and just enough combat-state config to prove the
expandable pattern. Everything later (more weapons, frames, melee, enemy model,
sharing) builds on the seams established here.

**Definition of done:** a user can open the app, mod a single rifle exactly as
in-game (assign/rank mods, see capacity/polarity), and see (a) accurate damage &
DPS numbers that match a hand-verified reference build, and (b) how much each
equipped mod contributes — all computed by a framework-agnostic, fully
unit-tested engine.

### Slice weapon & mod set

**Slice weapon: Vulkar Wraith** — a hitscan, single-fire-mode, semi-automatic
crit+status sniper rifle. It exercises every damage bucket (base/elemental/
multishot/crit/status/fire-rate) without dragging in AoE, incarnon, or multi-mode
complexity (those are Stages 2 & 6), and its semi-auto trigger maps directly onto
the Stage 1 per-shot + fire-rate → DPS pipeline. Source its exact stats and mod
values via the `warframe-info` skill during implementation and cache to
`docs/warframe/weapons/vulkar-wraith.md`. (Torid/Vinquibus are intentionally
avoided here — they are multi-mode/incarnon/dual-slot, belonging to later stages,
though their cached docs are useful references.)

Representative mods (one per bucket, to exercise the whole pipeline):

| Bucket exercised | Mod |
|---|---|
| Base damage (additive) | Serration |
| Multishot | Split Chamber |
| Critical chance | Point Strike |
| Critical damage | Vital Sense |
| Status chance | Rifle Aptitude |
| Elementals (combine → Corrosive) | Infected Clip (Toxin) + Stormbringer (Electric) |
| Fire rate (DPS) | Speed Trigger |
| Conditional / faction (toggle) | Bane of Grineer |
| Exilus slot demo | any rifle exilus (e.g. utility) |
| Aura slot demo | any rifle aura (slot proof; need not add weapon damage) |

---

## Phase 1 — Project scaffold & tooling

**Goal:** a running, linted, tested React+TS app with the agreed structure.

- [ ] Initialize Vite (React + TypeScript template) in the repo root; reconcile
      with the existing `package.json` (keep `@wfcd/items`, `type: module`).
- [ ] Enable TypeScript `strict` mode and sensible path aliases (`@engine`,
      `@data`, `@state`, `@ui`, `@share`).
- [ ] Add Vitest + React Testing Library + jsdom; wire `test`, `test:watch`,
      `coverage` scripts.
- [ ] Add ESLint + Prettier (TS + React + hooks rules) and `lint` / `format`
      scripts.
- [ ] Create the source tree from the Overview layout (`engine/`, `data/`,
      `state/`, `share/`, `ui/`) with index barrels and a placeholder `App.tsx`.
- [ ] Add an engine-purity guard (ESLint rule / import boundary) forbidding React,
      store, or DOM imports inside `src/engine/`.
- [ ] Add `.gitignore` entries as needed; confirm `dev`, `build`, `preview`,
      `test`, `lint` all run clean.

**Acceptance:** `npm run dev` serves a blank app; `npm test` and `npm run lint`
pass on an empty suite.

## Phase 2 — Data pipeline (`scripts/build-data.mjs`)

**Goal:** a build-time transform turns `@wfcd/items` into a curated, normalized
internal dataset, plus an authored mod → effect-descriptor map for the slice mods.

- [ ] Define the **curated internal schema** (TS types in `src/data` / shared
      model): `WeaponData` (base damage by type, crit chance/mult, status, fire
      rate, magazine, reload, polarities, slot polarities, disposition, mastery),
      `ModData` (name, polarity, drain, rank count, rarity, slot compatibility,
      effect descriptors), `ArcaneData`.
- [ ] Write `scripts/build-data.mjs`: read the bundled `@wfcd/items` JSON (reuse
      the file-loading approach from `scripts/warframe-lookup.mjs`), select only
      the slice weapon + the slice mods, normalize to the curated schema, and emit
      to `src/data/generated/` (one file per category). Add an `npm run build:data`
      script and document re-running it.
- [ ] Build the **mod → effect-descriptor mapping** for the slice mods. `@wfcd`
      gives human-readable stat strings (e.g. "+165% Damage"); author the
      structured descriptors (`{ bucket, op, value, condition? }`) for each slice
      mod by hand, cross-checking values via the `warframe-info` skill / wiki.
      Record the bucket each maps to.
- [ ] Add `src/data/loaders.ts` with lazy/code-split loaders for the curated data.
- [ ] Unit-test the transform (given a known `@wfcd` record → expected curated
      record) and the mod-mapping (string/known mod → expected descriptor).

**Acceptance:** `npm run build:data` regenerates `src/data/generated/`; loaders
return typed curated objects; transform tests pass.

## Phase 3 — Engine model & gear hierarchy

**Goal:** the pure-TS type system and gear OOP the pipeline will run on.

- [ ] Define the **bucket taxonomy** (`src/engine/model/buckets.ts`): enumerate
      buckets (base damage, each elemental, multishot, crit chance, crit damage,
      fire rate, faction/conditional, direct-damage multiplier, status chance,
      …). **Verify membership and additive-vs-multiplicative behavior against
      `https://wiki.warframe.com/w/Damage`** before finalizing. Document each
      bucket's combine rule in code comments.
- [ ] Define `EffectDescriptor` (`{ bucket, op: 'add'|'mul', value, condition? }`)
      and the conditional/custom-effect registry shape for special cases.
- [ ] Define `Build` (selected gear + slot assignments {mod, rank} + chosen
      conditional toggles) and `DamageResult` (per-type damage, average hit, burst
      DPS, sustained DPS, status stats, labeled pipeline chain, contribution
      breakdown).
- [ ] Implement the **gear class hierarchy + interfaces**: `Weapon` (abstract) →
      `Gun` → `Primary`; interfaces `HasCrit`, `HasStatus`, `MultiMode`,
      `HasIncarnon` (define now, implement later). Only `Primary` is concrete this
      stage; design the seams for Secondary/Melee/Warframe.

**Acceptance:** types compile under `strict`; the gear hierarchy instantiates the
slice rifle from curated data.

## Phase 4 — Damage pipeline (the core math)

**Goal:** `calculateBuild(build, combatState) -> DamageResult`, wiki-accurate and
exhaustively unit-tested.

- [ ] **Verify the canonical formula and stage order against the wiki** and record
      the reference (cache notes to `docs/warframe/mechanics/damage.md` via the
      `warframe-info` skill). Capture: base-damage modding, elemental addition &
      combination order, multishot, critical (including average-crit and >100%
      crit-chance tiers), status chance/effects, fire rate → DPS, conditional/
      faction multipliers, and reload-adjusted sustained DPS.
- [ ] Implement each pipeline stage as a **pure function** that consumes the
      running intermediate and emits a **labeled** partial (so the chain is
      renderable and diffable):
  - [ ] gather descriptors from equipped mods/arcanes (+ active conditionals)
  - [ ] base-damage bucket (additive) applied
  - [ ] elemental buckets: add elements, then combine basic→combined in correct order
  - [ ] multishot bucket
  - [ ] critical bucket (average crit multiplier; handle crit chance > 100%)
  - [ ] status chance / status-effect computation
  - [ ] fire-rate → burst DPS; reload → sustained DPS
  - [ ] conditional/faction multiplier bucket
- [ ] Assemble `calculateBuild` from the ordered stages; return the full
      `DamageResult` including the labeled chain.
- [ ] **Unit-test every stage** with hand-verified expected numbers, plus an
      end-to-end test of the full slice build whose totals match a value
      hand-derived from the wiki. Cover edge cases (no mods; crit chance > 100%;
      two elements combining; conditional on vs off).

**Acceptance:** the slice reference build's computed numbers match the
hand-verified wiki figures within rounding; all stage + e2e tests pass.

## Phase 5 — Attribution (headline feature)

**Goal:** per-source damage contribution via a pluggable strategy.

- [ ] Define `AttributionStrategy` interface (`attribute(build, state, calc) ->
      per-source contributions`).
- [ ] Implement `leaveOneOut`: for each equipped source, recompute with it removed;
      contribution = total − total_without, exposed as a DPS delta and a %.
- [ ] Memoize / reuse `calculateBuild` so the N extra evaluations are cheap.
- [ ] Unit-test: a representative build's per-mod contributions are correct and
      ordered; toggling a conditional changes attribution as expected.

**Acceptance:** contributions are returned for every equipped mod; tests pass; the
"need not sum to 100%" caveat is documented in code.

## Phase 6 — State layer (Zustand)

**Goal:** the build document and reactive recompute.

- [ ] Create the Zustand store: current `Build` (selected rifle, 12 slot
      assignments, conditional toggles, minimal combat state) + actions
      (assign/clear mod, set rank, set polarity/forma a slot, toggle conditional).
- [ ] Add a derived selector that runs `calculateBuild` + attribution and exposes
      `DamageResult` to the UI, recomputing only on relevant changes.
- [ ] Add undo/redo middleware (history of build states).
- [ ] Unit-test store actions and that the derived result updates correctly.

**Acceptance:** dispatching actions updates the derived `DamageResult`; undo/redo
works; tests pass.

## Phase 7 — UI: in-game-style modding screen

**Goal:** mod the rifle exactly as in-game.

- [ ] Establish the **design-token layer** (`src/ui/styles`): palette, polarity
      colors, slot sizing, spacing, typography. Use the `frontend-design` plugin to
      set an intentional Warframe-ish aesthetic (not a default-looking dashboard).
- [ ] Build shared primitives: `ModSlot`, `ModCard` (name, drain, polarity, rank),
      `PolarityBadge`, `Tooltip`.
- [ ] Build the **rifle modding layout**: aura slot + exilus slot up top, 8 mod
      slots in a grid below, 2 arcane slots on the right — matching the in-game
      arrangement Goal.md describes.
- [ ] Build the **mod picker** (searchable/filterable list from curated data,
      respecting slot compatibility + polarity) and click-to-assign; **mod rank
      selector** per equipped mod.
- [ ] Show **mod capacity**: used/total (assume a reactor; capacity configurable),
      polarity drain reduction, and forma/polarize-a-slot; soft-warn when over
      capacity (theorycrafting tool — warn, don't hard-block).

**Acceptance:** a user can assign, rank, and remove mods across all 12 slots; the
layout reads as the in-game screen; capacity/polarity update live.

## Phase 8 — UI: results & per-mod contribution

**Goal:** make the math visible.

- [ ] **Damage summary panel**: per-type damage, average hit, burst DPS, sustained
      DPS, status chance/effects.
- [ ] **Per-mod contribution display**: each equipped mod shows its leave-one-out
      contribution (DPS delta + %), with the honest "may not sum to 100%" note.
      Sort/highlight the biggest contributors.
- [ ] **Pipeline chain view** (expandable): the labeled stage-by-stage breakdown
      from `DamageResult`, so users can see additive-vs-multiplicative steps.
- [ ] Component tests for the panels rendering a known `DamageResult`.

**Acceptance:** changing a mod visibly updates totals and contributions; the chain
view matches the engine's stages.

## Phase 9 — UI: minimal combat-state config (prove expandability)

**Goal:** the seed of the Stage 5 configuration menu.

- [ ] Build a small **config menu** with: the conditional-mod toggles (e.g. Bane
      faction on/off) and **one external buff** modeled as a data-driven entry
      (e.g. a Roar-style damage buff with an adjustable strength) feeding a bucket.
- [ ] Drive it from a **buff registry** (data-driven) so Stage 5 can add buffs
      without touching UI plumbing (Goal.md: "Make sure this is easily
      expandable").
- [ ] Verify a buff/toggle change flows through the engine and into both totals and
      attribution.

**Acceptance:** toggling the conditional and adjusting the external buff changes
the computed result; adding a new buff requires only a registry entry.

## Phase 10 — Integration, verification & docs

**Goal:** a coherent, verified slice and a foundation others can build on.

- [ ] Wire all panels into a single screen; basic responsive layout and keyboard
      accessibility for slots/picker.
- [ ] **End-to-end verification**: reproduce a known community/wiki build of the
      slice rifle and confirm the headline numbers match (document the reference).
- [ ] Update `README.md`: setup, scripts (`dev`/`test`/`lint`/`build:data`),
      architecture pointer to `docs/planning/Overview.md`, and how to add a mod.
- [ ] Confirm coverage on `src/engine/` is high; `lint` + full `test` green.
- [ ] Note any seams/assumptions that Stage 2 must honor (e.g. `MultiMode`,
      `HasIncarnon` interfaces left unimplemented).

**Acceptance:** the Definition of Done at the top is fully met; CI scripts pass.

---

## Out of scope for Stage 1 (handled later)

- Secondary/melee/companion/operator/warframe gear (Stages 2–4, 7).
- The full enemy/target model — armor, health types, level scaling (Stage 5).
- Incarnon evolutions, multi-mode weapons, riven mods, weapon special cases
  (Stages 2 & 6).
- Build sharing/persistence beyond the in-memory store + undo (Stage 8).
- Additional attribution strategies (Shapley/ordered/chain) — interface only.
