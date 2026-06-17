# Stage 3 — Melee — Checklist

> Full task granularity. See `Plan.md` for rationale and `../Overview.md` /
> `/CONTEXT.md` for cross-cutting decisions and terms. Tests-first for all math;
> every value verified vs the wiki (cache under `docs/warframe/`).

## A. Model & gear class

- [ ] `WeaponCategory += 'Melee'`; `WeaponClass +=` melee classes (sword,
      heavy-blade, nikana, tonfa, …) for mod-compat.
- [ ] `ModSlotKind += 'stance'`; `TriggerType += 'melee' | 'heavy' | 'slam'`.
- [ ] Extend `FireMode` with optional melee fields (`windUp?`, `heavyMultiplier?`,
      `comboCost?`, `heavyEfficiency?`, `comboString?`).
- [ ] Extend `WeaponData` (`range`, `followThrough`, `comboDuration`,
      `stancePolarity`, melee heavy/slam fields) — or fold into emitted `fireModes`.
- [ ] `Melee extends Weapon` (`src/engine/gear/melee.ts`); implements
      `HasCrit`, `HasStatus`, `MultiMode`; add `HasCombo`/`HasHeavy`/`HasSlam`/
      `HasStance` interfaces + type guards.
- [ ] `MELEE_SLOT_LAYOUT = ['stance','exilus', 8×'normal', 2×'arcane']`.
- [ ] `createWeapon` Melee branch (`factory.ts`).

## B. Data pipeline

- [ ] `build-data.mjs`: emit melee weapons — build `fireModes` (Normal / Heavy /
      Slam / Heavy Slam) from the authoritative `attacks[]` array (mind the
      Slash↔Puncture transpose); emit range/followThrough/comboDuration/
      stancePolarity; derive `heavyMultiplier` from `heavyAttackDamage`.
- [ ] Slam/heavy-slam radial → `DamageComponent` (`role:'radial'` + `FalloffSpec`,
      radius) reusing Stage 2 AoE shape.
- [ ] Verify emitted Kronen Prime + Gram Prime data vs wiki.

## C. Combo counter

- [ ] Pure combo helper: `count → tier = floor(count/20) → multiplier =
      min(1+tier,12)` (+ tests at tier boundaries 19/20/220+).
- [ ] `CombatState.stacks['combo']` carries the count; helper exposes
      `combo:tier` for registry mods and the multiplier for heavy modes.
- [ ] Combo duration (`comboDuration`) carried as metadata (decay = Stage 5).

## D. Heavy attacks

- [ ] Heavy / Heavy-Slam modes apply `× ComboMultiplier` as an intrinsic pipeline
      step (Normal modes do **not**) + tests.
- [ ] Per-hit heavy damage = heavy base × ComboMultiplier; burst rate `1/windUp`
      (attack speed does not reduce wind-up) + tests.
- [ ] Store `comboCost` + `heavyEfficiency` (data only); **defer** sustained heavy
      DPS / combo-rebuild loop to Stage 5 (documented in result/UI).

## E. Custom-effect registry

- [ ] `customEffectId?` on `ModData`; `gather` consults `CUSTOM_EFFECTS` and folds
      **final, self-scaled** outputs in **without** re-applying `rankFactor`/`perStack`.
- [ ] Registry fns (self-scaled by rank, reading combat state):
  - [ ] `conditionOverload`: +0.8 × `stacks['status:count']` → `baseDamage` (cap).
  - [ ] `bloodRush`: +0.4 × combo tier → `critChance`.
  - [ ] `weepingWounds`: +0.4 × combo tier → `statusChance`.
- [ ] Unit tests for each (rank scaling, additivity with Point Strike/Pressure
      Point equivalents, tier/stack edges) — values verified vs wiki.

## F. Follow-through / reach

- [ ] Follow-through + reach carried as weapon metadata.
- [ ] Optional `CombatState.targetCount`; when `>1`, emit follow-through-adjusted
      multi-target total `hit × (1 − FT^n)/(1 − FT)` as an extra result field + tests.
- [ ] Reach surfaced as display-only metadata (reach→enemy-count = Stage 5).

## G. Slam (full)

- [ ] Slam + Heavy-Slam modes (direct + radial reusing AoE component) + tests.
- [ ] Forced **Lifted** proc on slam radial (counts toward status types).
- [ ] Heavy Slam `× ComboMultiplier`; values from `@wfcd` verified vs wiki.

## H. Stance & combo strings

- [ ] Stance slot in the melee layout + stance-mod compatibility rules.
- [ ] `scripts/scrape-combos.mjs` (manual): wiki combo tables →
      `src/data/generated/combos.json` (committed); per-hit
      `{ damageMultiplier, forcedProcs?, hits? }`; low-confidence parses flagged.
- [ ] App/build read the committed `combos.json` only (no build-time network).
- [ ] Combo-string pipeline pass: per-hit damage = baseHit × multiplier → combo
      average-per-hit + combo DPS (attack-speed timing) + tests; forced procs → status.
- [ ] Default combo = neutral single swing when no stance/combo selected.

## I. Melee mod set

- [ ] Author melee mods (verified values): Pressure Point (`baseDamage`), Organ
      Shatter (`critDamage`), melee crit-chance / status / elemental / attack-speed
      / reach mods, + Blood Rush / Weeping Wounds / Condition Overload (registry).
- [ ] Stance mods authored (flat stat effects, if any) + their compat tags.
- [ ] Melee mod-compat filtering in `modCompat`/`slotRules`.

## J. UI

- [ ] Melee modding screen (Stance + Exilus + 8 + 2 arcane), melee mod-compat.
- [ ] Mode selector includes Normal / Heavy / Slam / Heavy Slam.
- [ ] Combo-string picker for the Normal mode + per-hit breakdown.
- [ ] Combat-state inputs (Stage-5 seam): Combo Count, status-type count, target count.

## K. Reference builds (end-to-end verification)

- [ ] **Kronen Prime** (crit/status hybrid): Blood Rush + Weeping Wounds +
      Condition Overload + combo tier + a combo string — hand-verified vs wiki.
- [ ] **Gram Prime** (heavy/slam): heavy multiplier + combo consumption + slam
      direct/radial/Lifted — hand-verified vs wiki.

## Deferred (tracked, not this stage)

- [ ] Sustained heavy DPS / combo-rebuild loop → Stage 5.
- [ ] Reach→enemy-count + true multi-target DPS → Stage 5.
- [ ] Exalted/pseudo-exalted melee → Stage 4/6; riven/incarnon melee → Stage 6.
