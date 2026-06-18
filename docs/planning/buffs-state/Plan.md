# Stage 5 — Combat State & Target

> Cross-cutting decisions live in `../Overview.md`; domain terms in `/CONTEXT.md`.
> This plan is expanded to task granularity (per the Overview's "expand before
> implementing"). Game facts (faction modifiers, armor/level-scaling formulas,
> Overguard, buff stacking) are sourced from the wiki via the `warframe-info`
> skill and cached under `docs/warframe/` — **never** from memory.

**Depends on:** Stages 1–4 (engine, bucket model, `gather`, `CombatState` as a
real engine input, `BUFF_REGISTRY` + frame-derived Roar, generic `computeEhp`,
the seed `ConfigMenu`).

## Goal

Two linked systems Goal.md calls for:

1. The **expandable combat-state configuration menu** — the full version of the
   Stage 1/4 seed ("Make sure this is easily expandable").
2. The **configurable Target (enemy) model** that turns **Intrinsic Damage**
   into **Effective Damage / time-to-kill**.

**Split into two phases (large stage):**

- **Phase A — Combat State & Buffs** (feeds *intrinsic* damage). Ship first.
- **Phase B — Target / Enemy** (a *post-intrinsic* layer). Ship second.

They share `CombatState`/the store and the config surface, so they stay one stage
in one directory. Phase A is smaller and unblocks the registry/UI; Phase B's TTK
wants Phase A's finished buff numbers.

---

## What Stages 3–4 already delivered (scope correction)

The original outline said "promote `CombatState` to a first-class engine input"
and "generalized data-driven buff registry" — **both already shipped**:
`CombatState` is already an input to `calculateBuild` (combo, stacks, buffs,
targetCount), and `BUFF_REGISTRY` + `gather` already drive Roar through the
faction bucket. So the **real remaining work** is narrower:

- Phase A: *unify* the three parallel state mechanisms into one registry, encode
  explicit stacking rules (incl. a genuinely independent multiplier bucket), and
  replace the hardcoded seed UI with a registry-driven menu.
- Phase B: essentially greenfield — only the *generic* `computeEhp` exists.

---

## Decisions (this stage's grilling, 2026-06-18)

### Structure

1. **One directory, two phases, A before B.** `Plan.md`/`Checklist.md` carry both
   phases; Phase A ships before Phase B.

### Phase A — Combat State & Buffs

2. **One unified `STATE_REGISTRY` with a `kind` discriminator** —
   `'toggle' | 'stack' | 'buff'`. Each entry declares its **control**, its
   **group**, an optional **`visibleWhen`** predicate, and **what it contributes**
   (bucket(s) + fold rule). The three `CombatState` fields (`conditions`,
   `stacks`, `buffs`) remain the serializable **runtime values**; their
   **definitions** all move into the registry. The Grineer faction toggle stops
   being inline JSX and becomes a `toggle` entry; arcane-discovered stacks still
   work but the registry can also declare standalone stacks.

3. **Data-driven multiplicative buff buckets; typed additive core.** The additive
   core buckets (base, elemental, physical, crit, status, fire-rate, multishot)
   stay the typed `Bucket` union. The conditional/multiplicative buff buckets stop
   being the hardcoded `['faction','directDamage']` and become a
   **`Record<string, number>` of named multiplier buckets**, each **declared in
   the registry** (id, label, order, "members add then the bucket multiplies").
   A buff entry names the multiplier bucket it feeds; **same id ⇒ members add,
   different id ⇒ independent multiplier.** A brand-new multiplier category
   (Eclipse) is then a bucket declaration + a buff entry — **no engine-type
   change.** `conditionalMultiplierStage` iterates the map in declared order.
   **See ADR 0005.**

4. **Bounded reference catalog** (exercise every kind + both stacking behaviors,
   then stop — completeness grows as data forever after):
   - **Roar** (`buff`, frame-derived) → **faction** bucket, *additive* with Bane.
   - **Bane** mods (existing conditional) → folded into the registry as the
     additive partner proving "same bucket ⇒ add".
   - **Eclipse** (`buff`, frame-derived, Mirage) → a **new independent multiplier
     bucket** — proves decision 3 end-to-end. ⚠️ Eclipse's exact mechanics
     (light/shadow split, whether it is truly its own multiplier, its cap) **must
     be wiki-verified at implement time** — do not assume.
   - **Galvanized Diffusion** (`stack`, kill-driven, *secondary* multishot) →
     `perStack` into the existing **multishot** bucket. Its test exercises a
     secondary weapon. ⚠️ confirm stack count/value vs wiki.
   - **Combo Count** (existing `stack`) → read directly.
   - Record a **deferred catalog** (Nourish/viral, Arcane Avenger, Volt's Shield,
     full Galvanized set, squad arcanes, …) so they're not forgotten.

5. **Registry-driven config menu.** Groups declared on each entry (*Frame &
   ability buffs*, *Squad / external buffs*, *Weapon & arcane stacks*, *Enemy &
   conditionals*, *Melee state*), each a **collapsible** section (the "expandable"
   requirement). A **text filter** over labels/descriptions (the "searchable"
   requirement — cheap, registry-driven, scales for free). Controls per `kind`:
   `toggle` → checkbox; `buff` → checkbox + strength **slider** only when
   magnitude is manual/variable (hidden when frame-derived, as today); `stack` →
   **stepper** (− / value / +), **except Combo Count** which stays a slider
   (a 12-notch stepper is clumsy). The `usesStatusCount`-style visibility becomes
   a declared `visibleWhen` predicate.

### Phase B — Target / Enemy

6. **Modern faction model only.** Model the Damage 3.0 (U36+) system: four
   **Health Layers** (Health / Shield / Armor / Overguard) + **faction-based**
   damage-type modifiers (each faction ~2 vulnerabilities at ×1.5). **No legacy
   13-health-type modeling** — it's a live-service game; legacy is dead content.
   Rewrite the Plan's old legacy-health-type list accordingly.

7. **Re-verify the cached enemy doc FIRST.** `docs/warframe/mechanics/enemy-damage-modifiers.md`
   is dated 2024-06-18 (two years stale). Re-verify the faction vulnerability
   tables, the **enemy armor DR formula** (the cached `90% × NetArmor/2700`
   conflicts with the player `armor/(armor+300)` curve — confirm the enemy one),
   the per-stat **level-scaling formulas**, **Steel Path** multipliers, and the
   **Overguard** level-scaling formula (the cached `docs/warframe/mechanics/overguard.md`
   transcription is internally inconsistent — its quoted level formula doesn't
   reproduce its own worked example). Refresh the caches before encoding numbers.

8. **Generate the enemy dataset from `@wfcd/items` — do not hand-author.**
   `@wfcd/items` ships `Enemy.json` (638 enemies, every one with base
   `health`/`shield`/`armor`). A build-time transform `scripts/build-enemies.mjs`
   (mirroring `build-data.mjs`) emits a git-tracked `src/data/generated/enemies.json`
   covering all 638:
   - base stats: direct from `@wfcd`.
   - **faction: inferred from `uniqueName`** path (`/Enemies/<Faction>/…` →
     Grineer 224, Corpus 196 (+16 champions), Infested 44, Orokin 22, Sentient 11,
     …), falling back to the explicit `faction` field, with a small override map
     for the ~46 ambiguous (Acolytes, Stalker, Railjack/SpaceBattles, …).
   - **layer composition** tagged from the `resistances[]` array (armor subtype
     Ferrite/Alloy, shield presence).
   - **gaps:** `@wfcd` has **no base level** (confirm what level the base stats
     represent — wiki, decision 7) and **no Overguard** (handled by decision 11).

9. **Separate `engine/target/` post-intrinsic stage.** A pure
   `applyTarget(intrinsic: DamageResult, target: TargetState) → TargetResult`.
   The intrinsic `DamageResult` is **untouched** (Stages 1–4 stay byte-valid as
   the intrinsic view); vs-target numbers are a layer the UI shows alongside.

10. **Routing depth (Phase B):**
    1. **Faction damage-type modifiers** per type (×1.5 vulnerabilities).
    2. **Two sequential pools: Shield → Health.** Enemy shields take face value,
       get **no armor benefit** and no faction-type modifiers, with the two real
       exceptions modeled — **Toxin bypasses shields** (→ health) and **Magnetic
       +bonus vs shields**. Health: **armor mitigation** (net armor after strip)
       then health depletes; **min-1-per-type floor** applies.
    3. Outputs: **effective damage per hit, effective DPS, TTK, EHP**.

11. **Overguard = a toggle + formula, absorbed first at face value.** Model an
    **"Eximus / Overguard" toggle** on the Target that adds a pool
    `= 12 × overguardLevelScale(level)`, depleted **before** Shield/Health,
    **armor-ignored**, face value. **Defer** Overguard's damage-type quirks
    (Void +50%, Magnetic amplification, and whether faction ×1.5 / status DoT
    apply — all unconfirmed). This avoids needing per-enemy Overguard data.

12. **Armor mitigation + strip.** Encode `enemyArmorDR(netArmor)` as a single
    named function **distinct** from the player `ARMOR_K` path (leave frame EHP
    untouched). Armor strip is a **0–100% Target control**: `netArmor = baseArmor
    × (1 − strip)`. Corrosive-*proc*-driven strip is wired to a stack input but
    its exact proc-stacking automation is **deferred** (the % slider covers the
    important cases).

13. **Level scaling + Steel Path.** Each enemy carries base stats + base level; a
    pure `scaleEnemy(base, baseLevel, targetLevel)` applies the current per-stat
    scaling curves (health/armor/shield scale differently). A **target-level
    input** (1–9999) feeds it; **Steel Path is a toggle** applying its stat
    multipliers on top; **faction is independently overridable** (faction drives
    only the modifier table, not the stats).

14. **TTK = direct damage only; status *application* surfaced separately; DoT
    deferred.** TTK = effective layered pool ÷ effective sustained direct DPS.
    Surface the already-computed `statusProcChance` / `avgProcsPerShot` /
    `procTypeWeights` **vs the target** as an informational panel — **not** folded
    into TTK. Full status-DoT-integrated TTK (Slash/Heat/Toxin timelines) is the
    highest-value **deferred** follow-on. **UI caveat:** label TTK
    "direct-damage TTK — excludes status DoT".

15. **Target selector UI = featured presets → editable overrides → custom.** The
    picker is backed by the full generated dataset (pick any enemy); a curated
    **featured subset** is surfaced first — **Charger** (pure health), **Lancer**
    (armored health), **Crewman** (shielded), a **shield+armor** unit, and an
    **Overguard** unit — covering every routing path. Picking a preset populates
    the block; **overrides** layer on top (level, Steel Path, armor-strip %,
    faction). A fully **manual stat block** is an advanced escape hatch.
    `TargetState` lives on the store (sibling of `CombatState`), serializable for
    Stage 8 sharing.

16. **Attribution: intrinsic stays primary; add a vs-target mode in Phase B.**
    Leave-one-out keeps diffing intrinsic DPS by default; the same
    `AttributionStrategy` machinery also diffs **effective** DPS when a Target is
    selected, surfaced as an optional "contribution vs this target" view (where
    armor-strip / faction mods finally show their real worth).

17. **Reference verification cases (hand-computed, tested):**
    - **Vulkar Wraith vs Charger** (pure health, 0 armor, Infested) — isolates
      faction vulnerability + raw effective damage, no armor/shield noise.
    - **Kronen Prime vs Bombard** (300 health + 500 Alloy armor, Grineer) at a
      stated level, **with and without armor strip** — exercises armor
      mitigation, the strip control, faction mods, and the min-1 floor.

### Phase B — carried over from Stage 3 (melee defers → "cadence + enemy")

18. **Sustained heavy-attack DPS (cadence + combo-rebuild loop).** Stage 3
    modelled only the heavy *per-hit* (× heavyMultiplier × ComboMultiplier) plus a
    `1/windUp` burst rate, and deferred the loop here. Model the heavy cadence:
    Normal hits rebuild Combo Count at attack speed, a heavy consumes `comboCost`
    (with `heavyEfficiency`), wind-up gates each heavy — yielding a **sustained
    heavy DPS** that feeds effective DPS / TTK against the Target.

19. **Reach → enemy-count (multi-target DPS).** Stage 3 carried Reach as metadata
    and a *manual* `targetCount`, deferring the derivation here. Derive how many
    enemies a swing hits from **Reach** + an **enemy-spacing** assumption (a
    Target-model input), feeding the existing Follow-Through multi-target total
    automatically instead of the manual count.

---

## Data shape

### Phase A — registry

```ts
type StateKind = 'toggle' | 'stack' | 'buff';

interface MultiplierBucketDef {       // decision 3 — declared, not a typed field
  id: string;                         // 'faction' | 'directDamage' | 'eclipse' | …
  label: string;
  order: number;                      // multiply-in order in the pipeline
}

interface StateEntry {
  id: string;
  kind: StateKind;
  group: string;                      // collapsible UI group
  control: 'toggle' | 'stepper' | 'slider';
  visibleWhen?: (ctx) => boolean;     // replaces inline usesStatusCount logic
  // contribution: bucket(s) + fold rule; `buff` may target a MultiplierBucketDef.
}
```

`BucketSums` keeps its typed additive fields but replaces `faction`/`directDamage`
with `multipliers: Record<string, number>`. `gather` folds buff contributions into
that map; `conditionalMultiplierStage` multiplies the map in declared order.

### Phase B — target

```ts
interface EnemyData {                 // generated: src/data/generated/enemies.json
  id: string; name: string;
  faction: 'Grineer' | 'Corpus' | 'Infested' | 'Orokin' | 'Sentient' | string;
  baseLevel: number;                  // confirmed vs wiki (decision 7)
  health: number; shield: number; armor: number;
  armorType?: 'Ferrite' | 'Alloy';    // from resistances[]
}

interface TargetState {               // on the store, sibling of CombatState
  enemyId: string;                    // or 'custom'
  level: number;
  steelPath: boolean;
  armorStripPct: number;              // 0..1
  factionOverride?: string;
  overguard: boolean;                 // Eximus toggle
  custom?: Partial<EnemyData>;        // advanced manual block
}

interface TargetResult {              // applyTarget output
  perTypeEffective: DamageMap;
  effectiveHitAverage: number;
  effectiveDps: number;
  ttkSeconds: number;                 // direct-only
  enemyEhp: { overguard: number; shield: number; health: number; armor; total };
  statusApplication: { procsPerSecond: number; weights: Record<DamageType, number> };
}
```

---

## Engine / architecture notes

- **`engine/model/buckets.ts`**: split the additive (typed) vs multiplicative
  (declared map) buckets; add `MultiplierBucketDef`s.
- **`engine/state/`** (new): `STATE_REGISTRY` + a resolver that turns equipped
  sources + `CombatState` into the contributions `gather` consumes. `BUFF_REGISTRY`
  generalizes into the `buff`-kind entries.
- **`engine/pipeline/gather.ts` / `stages.ts`**: fold buff contributions into
  `multipliers`; `conditionalMultiplierStage` iterates the declared map.
- **`engine/target/`** (new): `enemies` loader, `scaleEnemy`, `enemyArmorDR`,
  `overguardLevelScale`, `applyTarget`. Pure; no React/store.
- **`engine/warframe/ehp.ts`**: untouched — enemy armor math lives in `target/`.
- **`scripts/build-enemies.mjs`** (new): `@wfcd/items` → `enemies.json`.
- **`state/`**: add `TargetState` + actions; `attribution` gains an effective-DPS
  scalar source.

## UI

- **`ui/config/ConfigMenu.tsx`**: rebuilt registry-driven — collapsible groups,
  text filter, per-kind controls, `visibleWhen`.
- **`ui/target/`** (new): Target panel — featured-preset picker (backed by full
  dataset), level / Steel Path / armor-strip / faction / Eximus overrides, custom
  block. An effective-damage / DPS / TTK / enemy-EHP readout + a status-application
  panel. TTK labeled "excludes status DoT".
- **Attribution panel**: optional "contribution vs this target" toggle.

---

## Defer (out of scope this stage)

- **Status-DoT-integrated TTK** (Slash/Heat/Toxin timelines) — highest-value
  follow-on; needs a status-timeline subsystem.
- **Overguard damage-type quirks** (Void/Magnetic amplification, faction/DoT on
  Overguard).
- **Corrosive-proc armor-strip automation** (manual % slider stands in).
- **The wider buff catalog** (Nourish, Arcane Avenger, Volt's Shield, full
  Galvanized set, squad arcanes) — each "add a registry entry".
- **Damage abilities vs enemies** (frame abilities that *deal* damage) and
  damage-type-specific frame survivability — revisit with later stages.
