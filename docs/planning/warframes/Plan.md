# Stage 4 — Warframe Modding

> Cross-cutting decisions live in `../Overview.md`; domain terms in `/CONTEXT.md`.
> This plan is expanded to task granularity (per the Overview's "expand before
> implementing"). Game facts (frame base stats, ability scaling, mod numbers, set
> bonuses, EHP formula) are sourced from `@wfcd` / the wiki via the `warframe-info`
> skill and cached under `docs/warframe/` — **never** from memory.

**Depends on:** Stages 1–3 (engine, bucket model, `gather`, custom-effect registry
seam + ADR 0002, modding UI primitives, combat-state config, capacity logic).
**Produces** the frame's Emitted Buff magnitude + activation toggle that the weapon
calc consumes — pulling the frame→weapon buff link **into this stage** (it was
previously slated for Stage 5; see Overview update).

## Goal

Add the **Warframe** as a second modded compartment: its modding screen, base
stats, the four ability attributes, **EHP**, and — crucially — the
**ability-driven buff that modifies weapon damage** (Roar), whose magnitude is
derived from the frame's Ability Strength and toggled on/off in combat state.

---

## Decisions (this stage's grilling, 2026-06-17)

1. **Multi-compartment build model (ADR 0003).** `Build` becomes a container of
   generic `GearBuild = { itemId, slots, reactor, baseCapacity }` compartments —
   `{ weapon, warframe: GearBuild | null }` — with `CombatState` shared at the top.
   The store gains compartment-scoped mutations + an "active compartment". Slot /
   modding / capacity primitives are reused unchanged. Companion/operator are future
   compartments (Stage 7); multi-compartment share codes are Stage 8.
2. **Roar is frame-derived + combat-toggled.** The calculator computes Roar's
   magnitude from the **equipped frame's modding** (`base 0.5 × AbilityStrength`).
   `CombatState` no longer stores a buff *strength*; it stores **which Emitted Buffs
   are active** (an on/off toggle). When Roar is on, the weapon calc reads the
   frame-derived magnitude and feeds the existing **faction** bucket. This pulls the
   frame→weapon wiring into Stage 4 (Overview updated).
3. **Ability = source of truth; registry = catalog; manual-override fallback.** An
   ability is authored data (`{ id, baseStrength, scaling, bucket, … }`). The buff
   registry becomes the catalog of what abilities can emit. The combat-state toggle
   resolves its magnitude from the equipped frame **when a frame with that ability is
   equipped**; otherwise the toggle exposes a **manual magnitude** (squadmate's Roar
   / un-modeled sources). Roar-only this stage.
4. **Separate frame-stat resolver, reusing the bucket primitive.** `resolveWarframe`
   sums frame-stat buckets (`abilityStrength`, `abilityDuration`, `abilityRange`,
   `abilityEfficiency`, `health`, `shield`, `armor`, `energy`, `sprintSpeed`) and
   emits a `WarframeStats` object. It is **not** the weapon damage pipeline (which
   stays untouched), but it reuses the additive-within-bucket helper so
   "additive vs multiplicative" is expressed consistently.
5. **All four ability attributes; efficiency capped.** Compute Strength / Duration /
   Range / Efficiency (all additive) so trade-off mods read correctly (Blind Rage
   +str/−eff, Overextended +range/−str, Transient Fortitude +str/−dur, Fleeting
   Expertise +eff/−dur, Narrow Minded +dur/−range). Apply the **efficiency cap
   (175%)** and any other wiki-confirmed clamps. Duration/Range are display + feed
   ability outputs (e.g. Roar duration), gating nothing yet.
6. **All abilities authored for display; only buff-emitting abilities wired.** Every
   ability is shown with its strength-scaled numbers, but only **Roar** produces an
   engine output. Damage abilities (Rhino Stomp) and survivability abilities (Iron
   Skin) display only — their application to enemies / EHP-via-ability is **deferred
   to Stage 5** (enemy/damage-type model).
7. **Set bonuses via `setCounts` ctx, registry-routed (ADR 0004).** Mods gain an
   authored `set` id. The effect context gains a precomputed `setCounts:
   Record<string, number>` (count of equipped set members, **per compartment**),
   computed once per resolve. **Umbral** mods route through the custom-effect registry
   (`customEffectId`) and read `setCounts['umbral']` → base stat + count-appropriate
   set bonus. The registry is **shared** by the weapon `gather` and the frame
   resolver. Cross-gear sets deferred.
8. **EHP = generic aggregate + components.** Show armor → damage-reduction %, health
   EHP (`health × (1 + armor/300)`, wiki-verified), shield, and a generic total
   (effective-health + shield), labeled "generic / no incoming damage type".
   Damage-type-specific EHP, shield-gating, and ability-granted survivability
   (Iron Skin / overguard) are **deferred to Stage 5**.
9. **Frame & mod data from `@wfcd`; ability scaling from an offline scraper.**
   Frame base stats + ability metadata come from `@wfcd` via `build-data.mjs`
   (new `warframes.json`). Frame mod stats come from `@wfcd` (existing `mods.json`),
   with **authored effect descriptors** in `descriptors.ts`. Ability **numeric
   scaling** (which `@wfcd` lacks) comes from a standalone, manually-run
   `scripts/scrape-abilities.mjs` → git-tracked, reviewable
   `src/data/generated/abilities.json`, low-confidence parses flagged for manual
   review (follows ADR 0001 — offline scraper, deterministic builds; hand-authoring
   is the documented fallback). The ability→buff/bucket **mapping** is authored in TS
   (like mod→effect descriptors), not scraped.
10. **Weapons lose the Aura slot.** Guns have no Aura slot in-game; the Stage 1 gun
    layout's aura slot was a simplification. Gun layout → `['exilus', 8×'normal',
    2×'arcane']`; **`'aura'` becomes Warframe-only**. (Melee keeps `'stance'`.)
11. **Reference build: Rhino Prime.** A strength-stacked, Umbral-inclusive Roar build,
    verified against the wiki. Exercises ability-strength stacking, the efficiency
    cap, the Umbral set bonus at 1/2/3 members, Roar magnitude, EHP, and the
    cross-compartment buff toggle.

---

## Data shape

### Warframe (from `@wfcd`, verify at implement time — see `docs/warframe/`)

`@wfcd` Warframe records supply: `health`, `shield`, `armor`, `power` (= energy),
`sprintSpeed`, `masteryReq`, `passiveDescription`, and an `abilities[]` array of
`{ name, description, imageName }` (**names/descriptions only — no numbers**).
Polarity fields (`auraPolarity`, `exilusPolarity`, `polarities`) must be **verified
per frame** — base Rhino did not populate them, so Rhino Prime's must be checked and
defaulted to `none` when absent.

- **Ability scaling is absent** → sourced via the offline scraper (decision 9) into
  `abilities.json`. The committed file is the only source the build/app read (no
  build-time network → deterministic builds, per ADR 0001).
- `build-data.mjs` emits a curated `warframes.json` (a frame roster of base stats +
  ability metadata); all ~118 frames' base stats ship so the picker is populated.

### Ability scaling (scraped → `abilities.json`)

Per ability: base magnitude(s) and which attribute each scales on (Roar: damage
bonus ← Strength, duration ← Duration, range ← Range). The engine **mapping** (Roar
→ `faction` bucket, scaling kind) is authored in TS.

### Frame mods (from `@wfcd` + authored descriptors)

Ability-attribute mods (Intensify, Transient Fortitude, Blind Rage, Overextended,
Streamline, Fleeting Expertise, Narrow Minded, Stretch, Continuity, Power Drift,
Cunning Drift), the **Umbral set** (Umbral Intensify/Vitality/Fiber, each with a
`set: 'umbral'` id), survivability mods (Vitality, Steel Fiber, Redirection), an
aura (e.g. Steel Charge / Corrosive Projection / Growing Power), and a frame arcane.
Numbers + set-bonus values from the wiki.

---

## Engine / architecture notes

- **`Warframe` gear class** (`src/engine/gear/warframe.ts`): a sibling of `Weapon` in
  the gear hierarchy (not a `Weapon` — it has no fire modes). Provides its
  `slotLayout` (`['aura','exilus', 8×'normal', 2×'arcane']`) and base stats.
  Capability interfaces as useful (`HasAbilities`, `HasAura`). `createWeapon` / a
  generalized `createGear` factory gains a `Warframe` branch.
- **Model additions:** generic `GearBuild`; `Build = { weapon, warframe }` (ADR
  0003). `ModData` gains `set?: string`. Frame-stat **buckets** added to the bucket
  taxonomy (kept distinct from damage buckets). Effect context gains `setCounts`
  (ADR 0004).
- **Frame-stat resolver** (`resolveWarframe(warframeBuild) → WarframeStats`):
  - Gather frame mod effects into frame-stat buckets (additive); apply the
    **efficiency cap** and clamps.
  - Consult `customEffectId` (shared registry) with the extended ctx for Umbral set
    bonuses, reading `ctx.setCounts['umbral']`.
  - Compute EHP (decision 8) and ability outputs.
  - Ability outputs: for each authored ability, `magnitude = base × abilityStrength`
    (+ duration/range from their attributes). Roar's output is the Emitted Buff
    magnitude.
- **Set-counts tally** (pure helper): count equipped mods per `set` id within a
  compartment → `setCounts`. Computed once and threaded into both the weapon `gather`
  ctx and the frame-resolver ctx.
- **Buff link / combat state:**
  - `CombatState.buffs` becomes a set of **active toggles** (id + optional manual
    magnitude), not a user strength.
  - When Roar is toggled on, the weapon calc resolves the magnitude from the equipped
    frame's `WarframeStats.abilityBuffs['roar']` (or the manual override when no
    frame source) and feeds the **faction** bucket via the existing descriptor path.
  - The buff registry (`engine/buffs.ts`) becomes the **catalog** of emittable
    buffs + their bucket/scaling, decoupled from a manual strength slider.
- **Mod compatibility (gear-type aware):** promote `weaponModGroup(WeaponLike)` →
  `gearModGroup(gear)` returning `'warframe' | 'rifle' | 'shotgun' | 'pistol' |
  'melee'`. Warframe mods (aura/exilus/normal/arcane frame pools) fit **only** the
  frame compartment; weapon mods only weapon compartments. This also closes a latent
  leak: today all auras/arcanes return `true` for any group.
- **Weapon-aura removal (decision 10):** drop `'aura'` from the gun `slotLayout`;
  migrate `makeInitialBuild`, `EMPTY_BUILD`, capacity, and gun tests. `'aura'` slot
  kind is now produced only by the Warframe layout.

## UI

- **Compartment switcher** (segmented control: *Warframe | Weapon*) selecting the
  active compartment; the modding screen renders the active compartment's layout +
  mod pool from shared primitives.
- **Warframe modding screen:** Aura + Exilus + 8 normal + 2 arcanes, frame mod-pool
  filtering, frame polarities, capacity (aura provides capacity, doubled on match).
- **Frame panel** (sibling of the weapon damage panel): `WarframeStats` — the four
  ability attributes, EHP + components (armor DR%, health, shield, total), and Roar's
  **emitted magnitude** at the current strength.
- **Combat-state config:** **Roar on/off toggle** (replacing the old strength
  slider), reading the frame-derived magnitude with the manual-override fallback.

---

## Tasks

- [x] **Build model (ADR 0003):** `GearBuild`; `Build = { weapon, warframe }`;
      migrate `EMPTY_BUILD` / `makeInitialBuild` / store actions to be
      compartment-addressed; "active compartment" in the store; default-equip the
      reference frame (clearable to `null`). Tests for compartment mutations + undo.
- [x] **Weapon-aura removal (decision 10):** gun `slotLayout` → no aura; migrate
      initial build / capacity / gun tests; `'aura'` becomes Warframe-only.
- [x] **Data pipeline:** `build-data.mjs` emits `warframes.json` (roster base stats +
      ability metadata); `loadWarframes()` + extended `Dataset`. Tests for the
      transform.
- [x] **Ability scraper (ADR 0001 pattern):** `scripts/scrape-abilities.mjs` →
      committed `abilities.json` (Roar verified; low-confidence flagged). Loader merge.
- [x] **`Warframe` gear class + factory branch;** slot layout; capability interfaces.
- [x] **Frame-stat resolver:** `resolveWarframe → WarframeStats`; ability-attribute
      buckets (additive) + efficiency cap; EHP. Unit tests with hand-verified numbers.
- [x] **Set bonuses (ADR 0004):** `set?` on `ModData`; `setCounts` tally helper +
      ctx extension; Umbral mods via the registry; shared registry across gather +
      frame resolver. Tests at 1/2/3 members.
- [x] **Ability modeling:** authored ability→buff/bucket mapping; Roar magnitude =
      `base × strength` (+ duration/range display). Tests.
- [x] **Buff link:** `CombatState.buffs` → active toggles; buff registry as catalog;
      weapon calc resolves Roar magnitude from the frame (manual-override fallback).
      Cross-compartment integration test (toggle on → faction bucket; off → gone;
      manual path).
- [x] **Mod compatibility:** `gearModGroup` + `'warframe'` group; frame mod pools;
      close the aura/arcane cross-gear leak. Tests.
- [x] **Frame mod set:** author the frame mods + Umbral set + an aura + an arcane
      (numbers from the wiki, cached under `docs/warframe/`).
- [x] **UI:** compartment switcher; Warframe modding screen; frame panel (stats / EHP
      / emitted Roar); Roar toggle in combat config. Component tests.
- [x] **Reference build — Rhino Prime:** verify ability strength, efficiency cap,
      Umbral set bonus (1/2/3), Roar magnitude, EHP, and the cross-compartment toggle
      against the wiki. Cache in `docs/warframe/warframes/rhino-prime.md`.

## Defer (out of scope this stage)

- Damage-type-specific EHP, shield-gating, ability-granted survivability (Iron
  Skin / overguard) → Stage 5 (enemy / damage-type model).
- Damage abilities applied to enemies (Rhino Stomp, etc.) → Stage 5.
- Additional Emitted Buffs beyond Roar (Eclipse, Vex Armor, …) → later.
- Cross-gear set bonuses (sets spanning multiple compartments) → when a multi-gear
  set is implemented.
- Exalted / pseudo-exalted weapons, augments, ability-duration uptime mechanics →
  Stage 6.
- Companion / operator compartments → Stage 7; multi-compartment share codes →
  Stage 8.
