# Stage 5 — Combat State & Target — Checklist

> Two phases (see `Plan.md`). Ship **Phase A** before **Phase B**. Game numbers
> come from the wiki via `warframe-info`, cached under `docs/warframe/` — never
> from memory. Every formula gets a hand-verified unit test.

## Phase A — Combat State & Buffs

### Registry
- [ ] Add `STATE_REGISTRY` (`'toggle' | 'stack' | 'buff'`); each entry declares
      control, group, `visibleWhen?`, and contribution.
- [ ] Generalize `BUFF_REGISTRY` into `buff`-kind entries (allow non-frame-derived
      magnitude + multiple bucket contributions).
- [ ] Migrate `conditions` (incl. the inline Grineer toggle) and arcane-discovered
      `stacks` onto the registry; keep the three `CombatState` fields as runtime
      values.

### Buckets / stacking (ADR 0005)
- [ ] Split additive (typed `Bucket` union) vs multiplicative (declared
      `MultiplierBucketDef` map); replace `BucketSums.faction/directDamage` with
      `multipliers: Record<string,number>`.
- [ ] `gather` folds buff contributions into `multipliers`;
      `conditionalMultiplierStage` multiplies the map in declared order (+ tests).

### Reference catalog (wiki-sourced, hand-verified)
- [ ] Roar → faction bucket, additive with **Bane** (same-bucket-adds test).
- [ ] **Eclipse** → new independent multiplier bucket (data-only) — ⚠️ verify
      mechanics/cap vs wiki first.
- [ ] **Galvanized Diffusion** → `perStack` into multishot (secondary weapon test)
      — ⚠️ verify stack value/count.
- [ ] Combo Count stack (existing) covered.
- [ ] Record the **deferred catalog** list.

### UI
- [ ] Registry-driven `ConfigMenu`: collapsible groups, text filter, per-kind
      controls (stepper for stacks, slider for Combo), `visibleWhen` visibility.
- [ ] Component tests for grouping, filter, and a frame-derived-vs-manual buff.

## Phase B — Target / Enemy

### Verify-first (refresh stale caches)
- [ ] Re-verify & refresh `enemy-damage-modifiers.md` (faction tables, **enemy
      armor DR formula**, level-scaling per stat, Steel Path multipliers).
- [ ] Re-verify the **Overguard** level-scaling formula (cached transcription is
      inconsistent); refresh `overguard.md`.
- [ ] Confirm what **base level** the `@wfcd` enemy stats represent.

### Data
- [ ] `scripts/build-enemies.mjs`: `@wfcd/items` Enemy.json → git-tracked
      `src/data/generated/enemies.json` (all 638): base stats direct, faction
      inferred from `uniqueName` (+ override map), layers from `resistances[]`.

### Engine (`engine/target/`, pure)
- [ ] `enemyArmorDR(netArmor)` (distinct from player `ARMOR_K`) + armor strip
      (`netArmor = base × (1−strip)`) (+ tests).
- [ ] `scaleEnemy(base, baseLevel, targetLevel)` per-stat curves + Steel Path
      multipliers (+ tests vs wiki points).
- [ ] `overguardLevelScale(level)`; Overguard pool absorbed first, face value,
      armor-ignored.
- [ ] `applyTarget(intrinsic, target)`: faction mods → Shield (Toxin bypass /
      Magnetic bonus) → armored Health → min-1 floor; Overguard pool first.
- [ ] Outputs: effective damage/hit, effective DPS, **direct-only TTK**, enemy EHP,
      status-application figures.

### UI (`ui/target/`)
- [ ] `TargetState` on the store (+ actions), serializable.
- [ ] Target panel: featured-preset picker (backed by full dataset) + overrides
      (level / Steel Path / armor-strip % / faction / Eximus) + custom block.
- [ ] Effective-damage / DPS / TTK / enemy-EHP readout + status-application panel;
      TTK labeled "excludes status DoT".
- [ ] vs-target leave-one-out attribution as an optional second mode.

### Carried over from Stage 3 (melee defers)
- [ ] Sustained heavy-attack DPS: combo-rebuild loop (Normal-hit cadence at attack
      speed + `comboCost`/`heavyEfficiency` + wind-up) → sustained heavy DPS feeding
      TTK (+ tests).
- [ ] Reach → enemy-count: derive swing target-count from Reach + enemy spacing;
      feed the Follow-Through multi-target total (replaces manual `targetCount`)
      (+ tests).

### Reference cases
- [ ] Vulkar Wraith vs **Charger** (raw/faction) — hand-computed test.
- [ ] Kronen Prime vs **Bombard**, with/without armor strip — hand-computed test.

## Deferred (record, do not implement here)
- [ ] Status-DoT-integrated TTK · Overguard damage-type quirks · Corrosive-proc
      strip automation · wider buff catalog · enemy-facing damage abilities.
