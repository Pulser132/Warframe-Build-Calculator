# Stage 2 — All Gun Types

> Read `docs/planning/Overview.md` first — it holds all cross-cutting decisions
> (stack, engine model, bucket contract, conventions) that this plan assumes and
> does not repeat. Read `../initial-layout/STAGE-NOTES.md` for the seams Stage 1
> left in place; this stage fills several of them.

**Depends on:** Stage 1 — engine core, bucket pipeline, gear hierarchy
(`Weapon → Gun → Primary`), `createWeapon` factory, data pipeline, modding UI,
attribution, Zustand store.

## Goal of this stage

Generalize the single-rifle vertical slice into **all primary and secondary
firearms**, proving the inheritance/interface design (Goal.md: "use inheritance
and interfaces to make development more modular"). After this stage the engine
and UI handle every *gun* the game has — every trigger type, hitscan and
projectile delivery, AoE with falloff, beams, shotguns, and weapons with more
than one fire mode — leaving only melee (Stage 3), frames (Stage 4), the enemy
model (Stage 5), and incarnon/riven/special cases (Stage 6) for later.

**Definition of done:** a user can pick any primary or secondary gun, mod it in
the same in-game-style screen as the Stage 1 rifle, switch between its fire modes
where it has them, and see accurate per-mode damage/DPS and per-mod
contributions — with beam, shotgun, AoE, and trigger-type mechanics each matching
a hand-verified wiki reference, all computed by the pure, fully unit-tested
engine. The Stage 1 rifle's numbers are unchanged by the refactor.

### Slice weapons & mod set

Stage 1 proved one weapon (Vulkar Wraith). Stage 2 proves one weapon **per new
mechanic**. The picks below each isolate exactly one mechanic.

> **These are test-reference weapons, not the app's data source.** The
> application loads **all** primary/secondary guns from the `build:data` dump of
> `@wfcd/items` (Phase 8) — weapon stats are **never hand-authored**. The
> cached `docs/warframe/weapons/*.md` files are *verification fixtures*: they
> anchor hand-verified expected numbers for these specific weapons' unit tests,
> nothing more. We do **not** research weapons one by one; the dump already
> carries the mechanic fields (`trigger`, `multishot`/pellets, `attacks[]` with
> `falloff`/`shot_type`/charge, beam fire rate), so the pipeline maps them
> generically. Manual wiki lookup is reserved for *mechanics/formulas* (Phase 1),
> which aren't in the dump.

| Mechanic to isolate | Weapon | Locked key stats (base form) | Notes |
|---|---|---|---|
| Secondary class, semi-auto hitscan | **Lex Prime** | 180 dmg (144 Pu/18 Im/18 Sl), 25%/2.0× crit, 25% status, 2.08 fps, mag 8, reload 2.35 | Has an Incarnon adapter — model **base** form only (Incarnon = Stage 6). |
| Auto trigger (continuous) | **Soma Prime** | 12 dmg, 30%/3.0× crit, 10% status, 15 fps, mag 200, reload 3 | Clean auto. Also Incarnon-capable → base form only. (Braton Prime already cached as an alt.) |
| Burst trigger | **Hind** | 5-round burst, 30 dmg, 7%/1.5× crit, 15% status, in-burst 6.25 fps, mag 65, reload 2 | Has a hidden **semi-auto** alt-mode → doubles as a light multi-mode case. |
| Charge trigger | **Lanka** | 525 dmg (100% innate Electric), ~25%/2.0× crit, 25% status, ~1 s full charge, mag 10, semi/charge | Swapped in for Opticor (Opticor has AoE + quick-shot + innate Magnetic — not clean). Single mode, no AoE. |
| Beam (held-continuous) | **Glaxion Vandal** | 29 dmg (100% innate Cold), 14% crit, 38% status, 12 ticks/s | Plain non-chaining beam. |
| Shotgun (per-pellet status + pellet multishot) | **Vaykor Hek** | 75 dmg (49 Sl/15 Pu/11 Im), **7 pellets**, 25%/2.0× crit, **10.7% status/pellet**, 3 fps, mag 8, reload 2.25, falloff 10→25 m ×0.733 | Standard pellet shotgun, hitscan. |
| Projectile + AoE + falloff | **Tonkor** | direct **75 Puncture** + radial **650 Blast**, **7 m** radius, falloff 0→7 m (see convention flag below) | Projectile (40 m/s); self-*stagger* only, not modeled. |
| Multi-mode | **Stradavar Prime** (2 modes) | Auto: 30 dmg, 24%/2.6× crit, 12% status, 10 fps · Semi: 80 dmg, 30%/2.8× crit, 22% status, 3.33 fps | Clean two-mode, both hitscan. |

> **Incarnon note (cross-cutting):** many classic weapons (Lex/Soma/Braton
> Prime, Dread, …) now ship Incarnon adapters. Stage 2 models each weapon's
> **base form**; Incarnon evolutions are Stage 6. The data pipeline must take the
> base `attacks`, not the Incarnon alt.

Reuse the Stage 1 mod set where it applies; add the **secondary** mod set
(Hornet Strike, Barrel Diffusion, Lethal Torrent, Pistol Pestilence, etc.) and
the **shotgun** mod set (Point Blank, Hell's Chamber, Blunderbuss, etc.). One
mod per bucket is enough to exercise each weapon — the buckets themselves were
proven in Stage 1; this stage proves they survive the new *delivery* mechanics.

---

## Phase 1 — Mechanics (RESEARCHED & LOCKED)

The new formulas were verified against the wiki up front (the risk in this stage
is mechanics, not plumbing) and cached with worked examples in
`docs/warframe/mechanics/`: `triggers.md`, `beams.md`, `shotguns.md`,
`aoe-falloff.md`. These are the contracts the engine implements — they are
**done**, not TODO. Summary of the locked rules:

- **Modified fire rate** = `baseFR × (1 + Σ fire-rate bonuses)`. Global floor
  **0.05 rps**; **semi-auto cap 10 rps**; charge-time cap 10× base.
- **Burst** → effective rps:
  `EffFR = burstCount / ( 1/FR + (burstCount − 1) × burstDelay )`. Fire-rate mods
  scale the *in-burst* rate only; burst delay is unaffected by net-negative FR.
- **Charge** → `modChargeTime = baseChargeTime / (1 + modBonus)`; **bows**
  `EffFR = 1/modChargeTime`, **other charge weapons**
  `EffFR = 1/(modChargeTime + 1/modFR)`. (Lanka is "other".)
- **Continuous/beam**: tick rate = modified fire rate; **0.5 ammo per tick**.
  Damage **ramps from ~20% to 100% over 0.6 s** of continuous fire (per-weapon
  start %, e.g. Phage 70%) — model the ramp, and report both peak DPS and the
  ramp note (full TTK handling is Stage 5).
- **Beam status — CORRECTED:** the legacy **0.6× per-tick status multiplier no
  longer exists**. Each tick rolls at the **full displayed status chance**;
  multishot merges into one instance (`tickDamage × multishot`,
  `tickStatus × multishot`, which may exceed 100%). Do **not** apply 0.6×.
- **Shotgun**: displayed status & crit are **per pellet**; multishot adds pellets
  (`basePellets × (1 + Σmultishot)`). Expected procs/shot
  `= pellets × (forced + statusPerPellet)`; **`P(≥1 proc) = 1 − (1 − s)^N`**;
  proc-type weighting = `elementDamage / totalDamage`.
- **AoE falloff is linear**:
  `factor(d) = 1 − ((d − start)/(end − start)) × maxReduction`, clamped to 1.0
  below `start` and to `(1 − maxReduction)` above `end`. Radial default is 90%
  reduction at the rim (Tonkor 70%, Zarr 50%). No headshot bonus; status rolls
  per enemy. **Self-damage is now self-*stagger* — not modeled.**
- **Projectile vs hitscan**: confirmed to **not** change Stage 2 damage numbers
  (affects only time-to-target → Stage 5 TTK). It is gear metadata, not a
  pipeline input.

> **⚠ Data-convention flag to resolve in Phase 8:** the `@wfcd/items`
> `falloff.reduction` field is the **remaining multiplier at max distance**
> (Vulkar `0.5` = 50% left; Vaykor Hek `0.733` = 73% left), whereas the wiki
> quotes falloff as the **fraction removed**. Tonkor reads `reduction: 0.7` in
> the data but the wiki says "70% reduction" — these disagree. Pin down the field
> semantics per the cached weapon JSON (Vulkar/Vaykor confirm "remaining
> multiplier") and convert consistently; add a transform unit test for it.

**Acceptance:** met — every new mechanic has a cached note with a worked example
the unit tests assert against; the beam-status correction is recorded.

## Phase 2 — Gear hierarchy: extract `Gun`, add `Secondary`, add fire modes

**Goal:** generalize the OOP so the only per-weapon-type code is the genuinely
different behavior. Honor the Stage 1 seam: `createWeapon` is the single branch
point.

- [ ] Pull shared firearm behavior up from `Primary` into `Gun` (ammo, reload,
      magazine, fire-rate→DPS scaffolding, crit/status capability wiring). Leave
      `Primary` and the new `Secondary` as thin subclasses differing only in mod
      compatibility / slot rules.
- [ ] Add `Secondary` and register it in the `createWeapon` factory branch;
      confirm the Stage 1 rifle still instantiates and computes identically.
- [ ] Introduce a **`FireMode`** unit: the calculable thing the pipeline runs on
      (base damage, trigger type, multishot vector, crit/status, fire-rate/charge,
      AoE descriptor, ammo). A weapon owns one or more `FireMode`s. Single-mode
      weapons own exactly one — the common path stays simple.
- [ ] Model trigger/delivery as **strategy objects or interface methods**
      (`TriggerBehavior`, `DeliveryBehavior`) hung off `FireMode`, so weapon
      classes stay thin and beams/shotguns don't become subclasses.
- [ ] Implement the **`MultiMode`** interface (a Stage 1 seam): expose the list of
      fire modes; the pipeline computes each independently.
- [ ] Capability interfaces: confirm `HasCrit`/`HasStatus` still apply per
      `FireMode`; ensure a mode can opt out (e.g. a status-only alt-fire).

**Acceptance:** types compile under `strict`; the Stage 1 rifle's `DamageResult`
is byte-identical to before the refactor (regression test); a `Secondary`
instantiates from curated data.

## Phase 3 — Trigger types in the pipeline (fire rate → DPS)

**Goal:** correct burst/sustained DPS for every trigger type, since DPS is the
headline output and triggers are where it diverges.

- [ ] Add a pure, labeled stage converting a `FireMode`'s trigger into an
      **effective fire rate**, using the Phase 1 formulas:
  - auto/semi: modified FR directly (apply the **10 rps semi-auto cap** and the
    0.05 rps floor);
  - **burst**: `burstCount / (1/FR + (burstCount−1)×burstDelay)` (Hind: 5-round);
  - **charge** (non-bow): `1/(modChargeTime + 1/modFR)`, `modChargeTime =
    baseCharge/(1+modBonus)` (Lanka).
- [ ] Feed effective fire rate into burst DPS and reload-adjusted sustained DPS,
      reusing the Stage 1 sustained-DPS logic. Verify magazine/ammo interaction
      per trigger (esp. charge mag-of-5-ish, burst consuming N rounds/pull).
- [ ] **Unit-test each trigger type** against the Phase 1 worked examples (auto,
      semi w/ cap, burst, charge), plus edge cases (1-round "burst", zero reload,
      FR mods pushing semi past the cap).

**Acceptance:** auto/semi/burst/charge reference numbers match the cached
`triggers.md` examples within rounding; the semi-auto cap is enforced; tests pass.

## Phase 4 — Beam weapons

**Goal:** the per-tick continuous-fire model, the highest-risk new mechanic.

- [ ] Add a `held-continuous` trigger/delivery behavior: damage is per tick, tick
      rate = effective fire rate, DPS = per-tick damage × tick rate, **0.5 ammo
      per tick**.
- [ ] Apply the **full** displayed status chance per tick (the legacy 0.6×
      multiplier is gone — see Phase 1), with multishot merging into one instance
      (`tickStatus × multishot`, may exceed 100%). **No new bucket is required**
      (Overview: don't invent buckets) — beams reuse the Stage 1 status bucket.
- [ ] Model the **damage ramp** (≈20%→100% over 0.6 s, per-weapon start %):
      expose peak DPS plus the ramp note; defer ramp-aware TTK to Stage 5.
- [ ] **Unit-test** a beam reference build (Glaxion Vandal) end-to-end: per-tick
      damage, peak beam DPS, per-tick status & procs/sec — vs `beams.md`'s worked
      example. Test that a beam mode and a non-beam mode on the same engine both
      stay correct.

**Acceptance:** Glaxion Vandal's per-tick damage, DPS, and procs/sec match the
cached figures (full per-tick status, no 0.6×); non-beam regression tests pass.

## Phase 5 — Shotguns

**Goal:** per-pellet status and pellet-based multishot, distinct from rifle
multishot.

- [ ] Model **pellet count** as the multishot vector (`basePellets × (1 +
      Σmultishot)`; Vaykor Hek base 7) and apply **status & crit per pellet**.
      Expose both expected procs/shot (`pellets × statusPerPellet`) and
      **`P(≥1 proc) = 1 − (1 − s)^N`** in the `DamageResult`; proc-type weighting
      = `elementDamage / totalDamage`.
- [ ] Confirm the average-hit math composes correctly with multishot mods (Hell's
      Chamber etc.) — crit rolls per pellet, so avg hit reuses the Stage 1
      `avgCrit` per pellet × pellet count.
- [ ] **Unit-test** Vaykor Hek: per-pellet damage, total pellet count, expected
      procs/shot, `P(≥1)`, and average hit — vs the cached `shotguns.md` example.

**Acceptance:** Vaykor Hek's pellet damage, multishot, expected procs and
`P(≥1 proc)` match the cached reference; tests pass.

## Phase 6 — Projectile / hitscan delivery + AoE & falloff

**Goal:** AoE damage with falloff, and delivery metadata.

- [ ] Add the `DeliveryBehavior` distinction (hitscan vs projectile) as gear
      metadata; confirm it does **not** alter Stage 2 damage numbers (Phase 1
      finding) — it is recorded for Stage 5 TTK.
- [ ] Model an **AoE `FireMode`** (Tonkor: 75 Puncture direct + 650 Blast radial,
      7 m): a weapon may have a **direct/impact** component and a **radial**
      component as separate calculable hits. Apply the **linear falloff**
      `factor(d) = 1 − ((d−start)/(end−start)) × maxReduction` (clamped),
      exposing peak (center) and minimum (rim) damage in the `DamageResult`.
- [ ] **Resolve the `falloff.reduction` convention** (Phase 1 flag) when mapping
      data: treat it as the *remaining multiplier* per the Vulkar/Vaykor JSON, and
      reconcile against the wiki's "% reduced" for the AoE radius (Tonkor).
- [ ] Summarize AoE for DPS as an explicit **center / rim pair**, not a single
      number — favor honesty over a misleading peak-only figure.
- [ ] **Unit-test** Tonkor: direct vs radial components, center damage, rim
      damage, and falloff interpolation at a sample radius; plus the
      reduction-convention conversion.

**Acceptance:** Tonkor reports correct direct, center-radial, and rim damage with
linear falloff; the reduction-convention is converted correctly and tested; the
hitscan/projectile flag is carried through.

## Phase 7 — Multi-mode weapons (engine)

**Goal:** weapons with several fire modes produce one `DamageResult` per mode.

- [ ] Have `calculateBuild` compute a `DamageResult` **per fire mode** for
      `MultiMode` weapons, keyed by mode, with attribution run per mode.
- [ ] Confirm mods apply correctly per mode (shared loadout, per-mode stats) and
      that conditional toggles/buffs flow into every mode.
- [ ] **Unit-test** a multi-mode reference weapon: each mode's headline numbers
      match the wiki; switching modes changes nothing in the underlying build.

**Acceptance:** a multi-mode weapon returns a labeled result per mode; each
matches its wiki reference; single-mode weapons return exactly one (unchanged).

## Phase 8 — Data pipeline & effect-map extension

**Goal:** the dump drives the app — generalize Stage 1's single-weapon selection
to **all primary & secondary guns**, mapped generically (no per-weapon authoring).

- [ ] Broaden `scripts/build-data.mjs` from "the slice weapon" to **all Primary +
      Secondary guns** in `@wfcd/items`. Map the mechanic fields **generically**
      from each record — `trigger`, `multishot`/pellet count, the `attacks[]`
      array (fire modes), `falloff`, `shot_type` (hitscan/projectile), charge
      time, beam fire rate — into the curated `WeaponData` schema (add fields;
      keep Stage-1-compatible). No weapon is special-cased here.
- [ ] **Take the base `attacks`, not Incarnon alts** (many primes ship adapters) —
      Incarnon is Stage 6. Map every weapon's `attacks[]` into the per-mode
      structure generically (single-mode → one mode; multi-mode → N).
- [ ] **Normalize `falloff.reduction` as "remaining multiplier"** (Vulkar/Vaykor
      JSON confirm this) and reconcile against the wiki's "% reduced" for radial
      AoE — add a dedicated transform unit test for the conversion.
- [ ] Author **secondary** and **shotgun** mod descriptors in
      `src/data/mods/descriptors.ts` (mods *are* hand-authored — the dump gives
      stat strings, we author structured descriptors), cross-checking values via
      `warframe-info`. Reuse Stage 1 buckets; flag any genuinely new bucket.
- [ ] Re-run `npm run build:data`; confirm loaders return typed objects across the
      full gun list; **unit-test** the transform against the cached fixtures for
      one weapon per mechanic (multi-mode mapping, AoE direct/radial split,
      pellet/beam fields, falloff conversion) — these fixtures are the contract.

> Any gun whose behavior the generic mapping *can't* express (chaining beams,
> status-ramp shotguns, grenade+cloud) is a **Stage 6 special case**, handled by
> the custom-effect registry — never by hand-editing weapon data.

**Acceptance:** `build:data` regenerates `src/data/generated/` with every slice
weapon; new mod descriptors load; transform tests pass.

## Phase 9 — UI: gear-type generalization & fire-mode switching

**Goal:** the modding screen works for every gun and exposes fire modes.

- [ ] Generalize the Stage 1 modding screen so weapon **type drives mod
      compatibility / slot rules** (secondary vs primary vs shotgun mods filtered
      in the picker); reuse `ModSlot`/`ModCard`/capacity logic unchanged.
- [ ] Add a **weapon picker** spanning primaries + secondaries (categorized),
      replacing the Stage 1 single-rifle assumption.
- [ ] Add a **fire-mode switcher** for `MultiMode` weapons; the results panels and
      attribution re-bind to the selected mode. Single-mode weapons show no
      switcher.
- [ ] Show **delivery/AoE** info in the results panel where relevant: beam tick
      DPS, shotgun pellet count, AoE center/edge damage and falloff.
- [ ] Component tests: picker filters by type; mode switcher swaps the rendered
      `DamageResult`; AoE/beam/shotgun panels render their extra fields.

**Acceptance:** any primary or secondary can be selected and modded in-screen;
multi-mode weapons switch modes live; mechanic-specific stats are visible.

## Phase 10 — Reference verification, regression & docs

**Goal:** a verified, coherent multi-weapon stage that doesn't regress Stage 1.

- [ ] **Verify reference builds** end-to-end against known community/wiki numbers:
      a shotgun, a beam, a secondary, an AoE weapon, and a multi-mode weapon.
      Document each reference.
- [ ] **Regression:** confirm the Stage 1 rifle build is unchanged; engine
      coverage stays high; `lint` + full `test` green.
- [ ] Update `README.md` (how to add a new weapon type / fire mode / mod set) and
      **append to `../initial-layout/STAGE-NOTES.md`** (or add a Stage 2 notes
      file): what's now implemented (`Secondary`, `MultiMode`, trigger/delivery
      strategies, beam/shotgun/AoE) and what remains a seam for Stages 3–6.

**Acceptance:** the Definition of Done is fully met; all reference builds match
the wiki; Stage 1 regression and CI scripts pass.

---

## Architecture notes

- Push trigger/fire-mode and ammo/reload behavior into **strategy objects /
  interface methods** so weapon classes stay thin; beams and shotguns are
  *behaviors on a `FireMode`*, not new subclasses.
- Each fire mode is a self-contained calculable unit producing its own
  `DamageResult`; the UI aggregates/toggles modes.
- The Stage 1 **bucket model survives** beams/shotguns/AoE unchanged — research
  confirmed **no new bucket is needed** (beam multishot/status reuse existing
  buckets; pellets are the shotgun multishot vector; AoE is delivery, not a
  bucket). Keep honoring "don't invent buckets."
- Projectile travel and self-damage are **metadata only** this stage; they feed
  Stage 5 (TTK) and are not damage-pipeline inputs.

## Out of scope for Stage 2 (handled later)

- Melee, warframes, companions/operator (Stages 3, 4, 7).
- The enemy/target model — armor, health types, level scaling, faction-vs-type,
  and therefore *true* time-to-kill and projectile-travel timing (Stage 5).
- Incarnon evolutions, riven mods, and per-weapon special cases — including
  chaining beams (Amprex), status-ramp shotguns (Kohm), and grenade+cloud
  weapons (Torid) (Stage 6).
- Build sharing/persistence beyond the Stage 1 store + undo (Stage 8).
- Additional attribution strategies (Shapley/ordered/chain) — interface only.

## Carry-over notes

- **Quantization is already implemented** in Stage 1 (`quantizeStage`, applied to
  the per-shot base before multishot/crit). Stage 2 must simply route beams and
  shotguns through it correctly: quantize the **per-tick** base (beam) and the
  **per-shot** base before pellet-multishot (shotgun) — no new quantization work,
  just verify the existing stage runs ahead of the new multishot vectors.
- The weapon **aura slot** simplification from Stage 1 carries forward unchanged.
