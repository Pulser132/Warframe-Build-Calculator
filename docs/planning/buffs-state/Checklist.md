# Stage 5 — Combat State & Target — Checklist

> Two phases (see `Plan.md`). Ship **Phase A** before **Phase B**. Game numbers
> come from the wiki via `warframe-info`, cached under `docs/warframe/` — never
> from memory. Every formula gets a hand-verified unit test.

## Phase A — Combat State & Buffs

### Registry
- [x] Add `STATE_REGISTRY` (`'toggle' | 'stack' | 'buff'`); each entry declares
      control, group, `visibleWhen?`, and contribution. → `engine/state/registry.ts`
- [x] Generalize `BUFF_REGISTRY` into `buff`-kind entries (allow non-frame-derived
      magnitude + multiple bucket contributions). → buff entries in `STATE_REGISTRY`;
      `buffs.ts` now re-derives `getBuffDef`/`listBuffs`/`buffEffects` from it.
- [x] Migrate `conditions` (incl. the inline Grineer toggle) and arcane-discovered
      `stacks` onto the registry; keep the three `CombatState` fields as runtime
      values. → Grineer toggle is a registry entry; arcane/mod stacks via
      `discoverStackEntries`.

### Buckets / stacking (ADR 0005)
- [x] Split additive (typed `Bucket` union) vs multiplicative (declared
      `MultiplierBucketDef` map); replace `BucketSums.faction/directDamage` with
      `multipliers: Record<string,number>`. → `engine/model/buckets.ts`, `gather.ts`.
- [x] `gather` folds buff contributions into `multipliers`;
      `conditionalMultiplierStage` multiplies the map in declared order (+ tests).
      → `stages.ts`; `multiplierBuckets.test.ts`.

### Reference catalog (wiki-sourced, hand-verified)
- [x] Roar → faction bucket, additive with **Bane** (same-bucket-adds test). →
      `multiplierBuckets.test.ts` (×1.8).
- [x] **Eclipse** → new independent multiplier bucket (data-only). Verified vs wiki:
      +100% at 100% Strength, its own multiplier, no damage-side cap
      (`docs/warframe/abilities/eclipse.md`). Test: ×2.6 with Bane (independent).
- [x] **Galvanized Diffusion** → `perStack` into multishot (secondary weapon test).
      Verified: +110% base, +30%/stack ×4 (`docs/warframe/mods/galvanized-diffusion.md`).
- [x] Combo Count stack (existing) covered. → registry slider + `combo.test.ts`.
- [x] Record the **deferred catalog** list. → `DEFERRED_BUFF_CATALOG` in registry.

### UI
- [x] Registry-driven `ConfigMenu`: collapsible groups, text filter, per-kind
      controls (stepper for stacks, slider for Combo), `visibleWhen` visibility.
- [x] Component tests for grouping, filter, and a frame-derived-vs-manual buff.

## Phase B — Target / Enemy

### Verify-first (refresh stale caches)
- [x] Re-verify & refresh `enemy-damage-modifiers.md` (faction tables, **enemy
      armor DR formula** `0.9×netArmor/2700` capped 90%, per-stat level scaling,
      Steel Path ×2.5 hp/shield, +100 lvl). Refreshed 2026-06-18.
- [x] Re-verify the **Overguard** level-scaling formula (now internally consistent);
      refreshed `overguard.md`. Encoded in `overguardLevelScale` (coefficients
      isolated for easy correction; Overguard quirks deferred).
- [x] Confirm what **base level** the `@wfcd` enemy stats represent → **level 1**.

### Data
- [x] `scripts/build-enemies.mjs` (+ `npm run build:enemies`): `@wfcd/items`
      Enemy.json → git-tracked `src/data/generated/enemies.json` (638 raw →
      **479 unique**): base stats direct, faction inferred from `uniqueName`
      segment (+ field fallbacks), armor subtype from `resistances[]`.

### Engine (`engine/target/`, pure)
- [x] `enemyArmorDR(netArmor)` (distinct from player `ARMOR_K`) + `armorDamageMultiplier`
      + armor strip `netArmorAfterStrip` (+ tests).
- [x] `scaleEnemy` per-stat curves (faction-aware health/shield; unified armor) +
      Steel Path (+ tests). `factions.ts` modifier table.
- [x] `overguardLevelScale(level)`; Overguard pool absorbed first, face value,
      armor-ignored.
- [x] `applyTarget(intrinsic, target, enemy)`: faction mods → Shield (Toxin
      bypass; Magnetic-vs-shield is a *status* effect → deferred with status DoT)
      → armored Health → min-1 floor; Overguard pool first.
- [x] Outputs: effective damage/hit, effective DPS, **direct-only TTK**, enemy EHP,
      status-application figures.

### UI (`ui/target/`)
- [x] `TargetState` on the store (+ actions), serializable, undoable.
- [x] Target panel: featured-preset picker (backed by full dataset) + overrides
      (level / Steel Path / armor-strip % / faction / Eximus) + custom block.
- [x] Effective-damage / DPS / TTK / enemy-EHP readout + status-application panel;
      TTK labeled "excludes status DoT".
- [x] vs-target leave-one-out attribution as an optional second mode
      (`AttributionInput.scalarOf` → effective DPS).

### Carried over from Stage 3 (melee defers)
- [x] Sustained heavy-attack DPS: combo-rebuild loop (`sustainedHeavyLoop`:
      Normal-hit cadence at modified attack speed + `comboCost`/`heavyEfficiency`
      + wind-up) → `result.heavyLoop` (+ tests).
- [x] Reach → enemy-count: `reachTargetCount` derives swing target-count from
      Reach + enemy spacing; feeds Follow-Through (supersedes manual `targetCount`
      when a spacing is set) (+ tests).

### Reference cases
- [x] Vulkar Wraith vs **Charger** (raw/faction) — hand-computed test.
- [x] Kronen Prime vs **Bombard**, with/without armor strip — hand-computed test.

## Deferred (record, do not implement here)
- [x] Recorded: Status-DoT-integrated TTK · Overguard damage-type quirks (Void/
      Magnetic amplification, faction/DoT on Overguard) · Magnetic-vs-shield bonus
      (a status effect) · Corrosive-proc strip automation · wider buff catalog
      (`DEFERRED_BUFF_CATALOG`) · enemy-facing damage abilities.
