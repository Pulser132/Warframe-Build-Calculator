# Stage 3 — Melee — Checklist

> Full task granularity. See `Plan.md` for rationale and `../Overview.md` /
> `/CONTEXT.md` for cross-cutting decisions and terms. Tests-first for all math;
> every value verified vs the wiki (cache under `docs/warframe/`).

## A. Model & gear class

- [x] `WeaponCategory += 'Melee'`; `WeaponClass +=` melee classes (sword,
      heavy-blade, nikana, tonfa, …) for mod-compat.
- [x] `ModSlotKind += 'stance'`; `TriggerType += 'melee' | 'heavy' | 'slam'`.
- [x] Extend `FireMode` with optional melee fields (`windUp?`, `heavyMultiplier?`,
      `comboCost?`, `heavyEfficiency?`, `comboString?`) (+ `comboScaled?`,
      `forcedProcs?` on components, `ComboString`/`ComboHit` types).
- [x] Extend `WeaponData` (`range`, `followThrough`, `comboDuration`,
      `stancePolarity`, `comboStrings`); melee heavy/slam folded into emitted `fireModes`.
- [x] `Melee extends Weapon` (`src/engine/gear/melee.ts`); implements
      `HasCrit`, `HasStatus`, `MultiMode`, `HasCombo`/`HasHeavy`/`HasSlam`/
      `HasStance`/`HasReach` interfaces + type guards (fire-mode machinery lifted
      to `Weapon` so `Gun`/`Melee` are siblings).
- [x] `MELEE_SLOT_LAYOUT = ['stance','exilus', 8×'normal', 2×'arcane']`.
- [x] `createWeapon` Melee branch (`factory.ts`).

## B. Data pipeline

- [x] `build-data.mjs`: emit melee weapons — build `fireModes` (Normal / Heavy /
      Slam / Heavy Slam) from the authoritative `attacks[]` array (no Slash↔Puncture
      swap); emit range/followThrough/comboDuration/stancePolarity; derive
      `heavyMultiplier` from `heavyAttackDamage` (218 melee weapons emitted).
- [x] Slam/heavy-slam radial → `DamageComponent` (`role:'radial'` + `FalloffSpec`,
      radius) reusing the Stage 2 AoE shape.
- [x] Verify emitted Kronen Prime + Gram Prime data vs wiki (manual check +
      `meleeCalc.test.ts` assertions).

## C. Combo counter

- [x] Pure combo helper (`pipeline/combo.ts`): `count → tier = floor(count/20) →
      multiplier = min(1+tier,12)` (+ tests at 19/20/40/60/100/220+).
- [x] `CombatState.stacks['combo']` carries the count; helper exposes the tier for
      registry mods and the multiplier for heavy modes.
- [x] Combo duration (`comboDuration`) carried as metadata (decay = Stage 5).

## D. Heavy attacks

- [x] Heavy / Heavy-Slam modes apply `× ComboMultiplier` as an intrinsic pipeline
      step (Normal/Slam modes do **not**) + tests.
- [x] Per-hit heavy damage = heavy base × ComboMultiplier; burst rate `1/windUp`
      (attack speed does not reduce wind-up) + tests.
- [x] Store `comboCost` + `heavyEfficiency` (data only); sustained heavy DPS /
      combo-rebuild loop **deferred** to Stage 5 (documented in code + UI note).

## E. Custom-effect registry

- [x] `customEffectId?` on `ModData`; `gather` consults `CUSTOM_EFFECTS` and folds
      **final, self-scaled** outputs in **without** re-applying `rankFactor`/`perStack`.
- [x] Registry fns (self-scaled by rank, reading combat state):
  - [x] `conditionOverload`: +0.8 × `stacks['status:count']` → `baseDamage` (cap 16).
  - [x] `bloodRush`: +0.4 × combo tier → `critChance`.
  - [x] `weepingWounds`: +0.4 × combo tier → `statusChance`.
- [x] Unit tests for each (rank scaling, additivity with True Steel / Pressure
      Point, tier/stack edges, no-double-scaling) — values verified vs wiki.

## F. Follow-through / reach

- [x] Follow-through + reach carried as weapon metadata.
- [x] Optional `CombatState.targetCount`; when `>1`, emit follow-through-adjusted
      multi-target total `hit × (1 − FT^n)/(1 − FT)` as an extra result field + tests.
- [x] Reach surfaced as display-only metadata (reach→enemy-count = Stage 5).

## G. Slam (full)

- [x] Slam + Heavy-Slam modes (direct + radial reusing the AoE component) + tests.
- [x] Forced **Lifted** proc on slam radial (carried as `forcedProcs`; counts
      toward status types via the Condition Overload status-count input).
- [x] Heavy Slam `× ComboMultiplier`; values from `@wfcd` verified vs wiki.

## H. Stance & combo strings

- [x] Stance slot in the melee layout + stance-mod compatibility rules
      (`stanceMatchesClass`).
- [x] `scripts/scrape-combos.mjs` (manual): wiki combo tables →
      `src/data/generated/combos.json`; per-hit `{ damageMultiplier, forcedProcs?,
      hits? }`; low-confidence parses flagged; `--write` guards the curated file.
- [x] App/build read the committed `combos.json` only (merged in `loaders.ts`; no
      build-time network).
- [x] Combo-string pipeline pass (`pipeline/melee.comboStringBreakdown`): per-hit
      damage = baseHit × multiplier → combo average-per-hit + combo DPS
      (attack-speed timing) + tests; forced procs surfaced.
- [x] Default combo = neutral single swing when no stance/combo selected.

## I. Melee mod set

- [x] Author melee mods (verified values): Pressure Point / Primed Pressure Point
      (`baseDamage`), Organ Shatter (`critDamage`), True Steel (`critChance`),
      Melee Prowess (`statusChance`), elemental (Fever Strike / Molten Impact /
      North Wind / Shocking Touch), Fury (attack speed), Spoiled Strike, Primed
      Reach, + Blood Rush / Weeping Wounds / Condition Overload (registry).
- [x] Stances authored (Gemini Cross, Sovereign Outcast, Tempo Royale, Cleaving
      Whirlwind) with `slot: 'stance'` + class compat tags.
- [x] Melee mod-compat filtering in `modCompat` (`melee` group + stance class gate).

## J. UI

- [x] Melee modding screen (Stance + Exilus + 8 + 2 arcane via the gear class's
      `slotLayout`), melee mod-compat in the picker (`weaponClass` threaded).
- [x] Mode selector includes Normal / Heavy / Slam / Heavy Slam (existing MultiMode UI).
- [x] Combo-string picker for the Normal mode + per-hit breakdown in DamageSummary.
- [x] Combat-state inputs (Stage-5 seam): Combo Count, status-type count, target
      count in the ConfigMenu (melee only).

## K. Reference builds (end-to-end verification)

- [x] **Kronen Prime** (crit/status hybrid): Blood Rush + Weeping Wounds +
      Condition Overload + combo tier + a combo string — hand-verified vs wiki
      (`meleeCalc.test.ts`: crit 0.66, status 0.952, CO base-mult ratio).
- [x] **Gram Prime** (heavy/slam): heavy multiplier ×6 + combo multiplier + slam
      direct/radial/Lifted — hand-verified vs wiki (`meleeCalc.test.ts`).

## Deferred (tracked, not this stage)

- [ ] Sustained heavy DPS / combo-rebuild loop → Stage 5.
- [ ] Reach→enemy-count + true multi-target DPS → Stage 5.
- [ ] Exalted/pseudo-exalted melee → Stage 4/6; riven/incarnon melee → Stage 6.
- [ ] True Steel "×2 for Heavy Attacks" nuance (base value modeled; heavy×2 deferred).
