# Rhino Prime

**Source:** @wfcd `warframes.json` (lookup: Rhino Prime)

## Base stats

- **Health:** 270
- **Shield:** 455
- **Armor:** 290
- **Energy:** 100
- **Sprint speed:** 1.0× (baseline)

## Default ability attributes (unmodded)

All Warframes have default ability attributes of **100%** unless a passive modifies them:
- **Ability Strength:** 100%
- **Ability Duration:** 100%
- **Ability Range:** 100%
- **Ability Efficiency:** 100%

Rhino Prime has **no passive** that modifies these defaults, so they remain at 100%.

## Passive ability

**Emit a shockwave dealing [damage] after landing from a great height.**

(Numeric scaling deferred to ability scraper.)

## Active abilities

1. **Rhino Charge** — charges towards a target, goring victims
2. **Iron Skin** — hardens skin, gaining Overguard; damage taken converted to overguard
3. **Roar** — grants nearby Warframes increased damage (base +50% × Ability Strength, faction bucket)
4. **Rhino Stomp** — stomps with force, tumbling enemies in stasis

(Numeric scaling and interaction formulas deferred to ability scraper and Stage 5.)

## Mod polarities (from `@wfcd`)

- **Aura slot:** `null` — `@wfcd` does **not** populate Rhino Prime's `auraPolarity`
  (defaults to `none` in the engine).
- **Exilus slot:** `null` (not populated → `none`).
- **Normal slots (`polarities`):** `[vazarin, vazarin, naramon]` (the rest unpolarized).
- **Arcane slots:** no polarity.

## Reference build (Stage 4) — verified

A strength-stacked, Umbral-inclusive Roar build. Frame compartment:
Corrosive Projection (aura), Power Drift (exilus), Umbral Intensify + Umbral
Vitality + Umbral Fiber + Intensify (normal), Molt Augmented (arcane).

Ability Strength (additive, all maxed):

| Source | Strength |
|---|---|
| Umbral Intensify (3-set: 0.44 × 1.75) | +77% |
| Intensify | +30% |
| Power Drift (exilus) | +15% |
| Molt Augmented (arcane, max stacks) | +60% |
| **Total** | **282% (2.82×)** |

- **Roar emitted** = 0.5 × 2.82 = **+141%** (faction bucket; adds with Bane).
- **Health** (Umbral Vitality 3-set, +180%) = 270 × 2.80 = **756**.
- **Armor** (Umbral Fiber 3-set, +180%) = 290 × 2.80 = **812**.
- **Armor DR** = 812 / 1112 = **73.0%**; **Health EHP** = 756 × (1 + 812/300) ≈ **2802**;
  **Total EHP** = 2802 + 455 shield ≈ **3257**.
- **Efficiency** unchanged at 100% (the cap at 175% is exercised separately by
  Streamline + Fleeting Expertise → clamped).

These numbers are asserted in `src/state/warframe.test.ts` (reference build) and
`src/engine/warframe/resolve.test.ts` (set bonus + EHP units).

---

**Cache source:** `node scripts/warframe-lookup.mjs --exact "Rhino Prime"`; base stats
verified at lookup time. Rhino Prime is the Stage-4 reference frame.
