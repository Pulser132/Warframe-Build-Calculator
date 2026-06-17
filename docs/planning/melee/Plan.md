# Stage 3 — Melee

> Cross-cutting decisions live in `../Overview.md`; domain terms in
> `/CONTEXT.md`. This plan is expanded to task granularity (per the Overview's
> "expand before implementing"). Game facts (combo tiers, slam/heavy values, mod
> numbers, combo strings) are sourced from the wiki via the `warframe-info`
> skill and cached under `docs/warframe/` — **never** from memory.

**Depends on:** Stages 1–2 (engine, `FireMode`, gear hierarchy, modding UI, AoE
radial machinery, conditional/`perStack` descriptors, custom-effect registry seam).

## Goal

Add **melee weapons** with their distinct mechanics — combo counter, heavy
attacks, full slam, stance + combo strings, follow-through/reach — completing
hand-weapon coverage and battle-testing the custom-effect registry.

---

## Decisions (this stage's grilling, 2026-06-17)

1. **Calculable unit = reuse `FireMode`.** A melee weapon exposes its attacks as
   `FireMode`s (`Normal Attack`, `Heavy Attack`, `Slam`, `Heavy Slam`). Attack
   speed maps to `fireRate`. Add melee `TriggerType`s (`melee` / `heavy` /
   `slam`) and optional melee-only `FireMode` fields. **Generalize**
   `CalcInput.weapon` from `Gun` to a small interface (fire-mode access + optional
   reload/magazine); melee has no magazine/reload, so sustained DPS = burst DPS.
2. **Combo input = raw Combo Count** in `CombatState.stacks['combo']`. The engine
   derives `combo:tier = floor(count/20)` and `ComboMultiplier = min(1+tier, 12)`
   in a pure helper. The multiplier multiplies **Heavy/Heavy-Slam modes only** —
   never Normal attacks (wiki-confirmed).
3. **Wire the custom-effect registry now.** Add `customEffectId` to `ModData`;
   `gather` consults `CUSTOM_EFFECTS`. Implement Condition Overload / Blood Rush /
   Weeping Wounds as registry functions (even though `perStack` could express
   them) to validate the seam before harder mods (Galvanized, set bonuses) arrive.
   See ADR.
4. **Registry contract: functions return FINAL, self-scaled effects.** A fn reads
   `{ rank, maxRank, combat }` from `ctx` and returns already-computed
   `EffectDescriptor`s; `gather` does **not** re-apply `rankFactor`/`perStack` to
   custom outputs. Maximises flexibility (the reason to use the registry).
5. **Heavy attack: per-hit + wind-up burst; sustained deferred.** Model the heavy
   per-hit number (× heavyMultiplier × ComboMultiplier) and a burst rate
   `1/windUp` (attack speed does **not** reduce wind-up). Store `comboCost` and
   `heavyEfficiency` as data; the combo-rebuild loop / sustained heavy DPS is
   **deferred to Stage 5** (attack cadence + enemy).
6. **Follow-through / reach: single-target primary + multi-target extra.** Primary
   output stays single-target. Carry follow-through + reach as weapon metadata;
   when `CombatState` supplies a `targetCount > 1`, report a follow-through-adjusted
   multi-target total as an **extra** result field (mirrors the Stage 2 AoE
   center/rim extras). Reach→enemy-count modeling deferred to Stage 5.
7. **Full slam now.** Slam direct + Slam Radial (reusing the Stage 2 AoE radial
   component, radius + falloff) + forced **Lifted** proc, and **Heavy Slam**
   (× ComboMultiplier). Slam/heavy-slam/radial values come straight from `@wfcd`
   (`slamAttack`, `slamRadialDamage`, `slamRadius`, `heavySlamAttack`,
   `heavySlamRadialDamage`, `heavySlamRadius`, the `attacks[]` array).
8. **Stance slot + full melee mod set + combo strings.** New `'stance'`
   `ModSlotKind`; melee layout `['stance','exilus', 8×'normal', 2×'arcane']`
   (`stancePolarity` from data). Author the melee mod set. **Model combo strings**:
   the Normal-Attack mode gains a selectable Combo String; a per-hit pipeline pass
   computes the combo's average-per-hit + combo DPS; a combo-picker UI selects it.
9. **Combo-string data = offline scraper → committed dataset.** `@wfcd` has **no**
   combo data. A standalone `scripts/scrape-combos.mjs` (manual run) fetches wiki
   combo tables and emits a **git-tracked, reviewable** `src/data/generated/combos.json`;
   the build/app read only the committed file (no build-time network →
   deterministic builds). Low-confidence parses are flagged for manual review.
   See ADR.
10. **Reference builds:** **Kronen Prime** (crit/status hybrid — exercises Blood
    Rush + Weeping Wounds + Condition Overload + combo tier + a combo string) and
    **Gram Prime** (heavy/slam — heavy multiplier + combo consumption + slam
    direct/radial/Lifted). Both verified against the wiki.

---

## Data shape (from `@wfcd/items`, verified — see `docs/warframe/weapons/{kronen,gram}-prime.md`)

`@wfcd` melee records supply, directly: `fireRate` (= attack speed), `range`,
`followThrough` (single value — no heavy/normal split), the `damage` object,
`criticalChance`/`criticalMultiplier`/`procChance`, `heavyAttackDamage`,
`heavySlamAttack`/`heavySlamRadialDamage`/`heavySlamRadius`, `windUp`,
`comboDuration`, `slamAttack`/`slamRadialDamage`/`slamRadius`, `slideAttack`,
`stancePolarity`, `omegaAttenuation`, and an authoritative **`attacks[]`** array
(Normal / Slam / Heavy Slam, each with per-attack crit/status/damage/falloff).

- **`attacks[]` is authoritative for per-type damage** — top-level `damage`
  transposes Slash↔Puncture (see memory note `wfcd-slash-puncture-swap`). The
  transform emits melee `FireMode` components from `attacks[]`.
- **Combo strings are absent** → sourced via the offline scraper (decision 9).
- `heavyAttackDamage` is an absolute value; derive `heavyMultiplier =
  heavyAttackDamage / normalBaseDamage` (or carry the absolute and skip base).
  Verify against the wiki heavy formula at implement time.

---

## Engine / architecture notes

- **`Melee` class** (`src/engine/gear/melee.ts`): `extends Weapon`, sibling of
  `Gun`. Implements `HasCrit`, `HasStatus`, `MultiMode`; add melee capability
  interfaces (`HasCombo`, `HasHeavy`, `HasSlam`, `HasStance`) for feature-detect.
  Builds its `fireModes` from the curated melee data (Normal / Heavy / Slam /
  Heavy Slam). `createWeapon` (`factory.ts`) gains a `Melee` branch.
- **Model additions:** `WeaponCategory += 'Melee'`; `WeaponClass +=` melee classes
  (sword, heavy-blade, nikana, tonfa, …) for mod-compat filtering;
  `ModSlotKind += 'stance'`; `TriggerType += 'melee' | 'heavy' | 'slam'`.
  `FireMode` gains optional melee fields (`windUp?`, `heavyMultiplier?`,
  `comboCost?`, `heavyEfficiency?`, `comboString?`). `WeaponData` gains
  `range`, `followThrough`, `comboDuration`, `stancePolarity`, and melee
  damage/heavy/slam fields (or fold them into emitted `fireModes`).
- **Pipeline:**
  - Combo helper (pure): `count → tier → multiplier`. The Heavy/Heavy-Slam modes
    apply `× ComboMultiplier` as a dedicated intrinsic step (not a gathered
    bucket), reading `combat.stacks['combo']`.
  - `gather`: if a source has `customEffectId`, call `CUSTOM_EFFECTS[id](ctx)` and
    fold the returned (final) descriptors into the bucket sums **without**
    re-scaling.
  - Registry fns: `conditionOverload` (+0.8 × `stacks['status:count']` →
    `baseDamage` bucket), `bloodRush` (+0.4 × combo tier → `critChance`),
    `weepingWounds` (+0.4 × combo tier → `statusChance`) — all self-scaled by rank.
  - Combo-string pass: for the Normal mode with a selected combo string, compute
    per-hit damage = baseHit × `hit.damageMultiplier`, then the combo's
    average-per-hit and combo DPS (timing from attack speed + per-hit windup);
    forced procs feed status.
  - Follow-through extra: geometric sum `hit × (1 − FT^n)/(1 − FT)` for
    `targetCount = n`.
  - Slam: emit Slam + Heavy-Slam modes; the radial component reuses the Stage 2
    AoE `DamageComponent` (`role:'radial'` + `FalloffSpec`); Lifted as a forced
    proc on the radial.
- **DPS:** generalized input means melee `sustainedDps === burstDps` (no reload).

## UI

- Melee modding screen: Stance slot + Exilus + 8 normal + 2 arcane, melee
  mod-compat filtering, stance-mod compatibility.
- Mode selector already exists (`MultiMode`); melee adds Normal/Heavy/Slam/Heavy-Slam.
- **Combo-string picker** for the Normal mode; per-hit breakdown surfaced.
- Combat-state inputs (Stage-5 seam): Combo Count, status-type count, target count.

---

## Defer (out of scope this stage)

- Sustained heavy-attack DPS / combo-rebuild loop → Stage 5 (cadence + enemy).
- Reach→enemy-count and true multi-target DPS → Stage 5 (enemy/spacing).
- Exalted/pseudo-exalted melee tied to frames → Stage 4/6.
- Riven/incarnon melee specifics → Stage 6.
- Stance-specific forced-proc *status weighting* nuances beyond the headline
  forced proc (revisit with the Stage 5 status model if needed).
