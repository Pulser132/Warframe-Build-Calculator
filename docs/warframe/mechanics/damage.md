# Warframe Gun Damage Formula — Canonical Reference (Stage 1)

**Sources (verified):**
- https://wiki.warframe.com/w/Damage
- https://wiki.warframe.com/w/Damage/Calculation  ← authoritative formula quoted below
- https://wiki.warframe.com/w/Critical_Hit
- https://wiki.warframe.com/w/Status_Effect
- https://wiki.warframe.com/w/Elemental_Damage

> ⚠️ A first automated lookup placed elemental damage *outside* the base-damage
> (Serration) multiplier. That was **wrong** and has been corrected here against
> `Damage/Calculation`. Serration **does** amplify elemental damage.

---

## The authoritative pre-crit formula (quoted)

> **Arsenal Total Damage = Base Damage × [1 + Elemental Bonuses + Physical Bonuses]
> × (1 + Damage Bonuses) × [Base multishot × (1 + Multishot Bonuses)]**

> "Faction bonuses ... only multiply final quantized values."

> "Average Shot = Total Damage × (1 + Modded Crit Chance × (Modded Crit Multiplier − 1))"

So the **buckets** and their combine rules are:

| Bucket | Members (slice mods) | Combine within bucket | Combine across |
|---|---|---|---|
| **Base damage** | Serration (+165%), Rifle Amp aura (+27%) | additive: `1 + ΣΧ` | multiplies the (base+elemental) subtotal |
| **Elemental %** | Infected Clip Toxin (+90%), Stormbringer Electric (+90%) | additive *as a fraction of base*, per element, then elements **combine** | inside the base-damage multiply |
| **Physical %** | (none in slice) | additive per physical type | inside the base-damage multiply |
| **Multishot** | Split Chamber (+90%) | additive: `baseMS × (1 + ΣΧ)` | multiplies pellet count |
| **Crit chance** | Point Strike (+150%) | additive: `baseCC × (1 + ΣΧ)` | feeds avg-crit |
| **Crit damage** | Vital Sense (+120%) | additive: `baseCD × (1 + ΣΧ)` | feeds avg-crit |
| **Status chance** | Rifle Aptitude (+90%) | additive: `baseSC × (1 + ΣΧ)` | per-pellet |
| **Fire rate** | Speed Trigger (+60%) | additive: `baseFR × (1 + ΣΧ)` | DPS only |
| **Faction** | Bane of Grineer (+30%), **Roar** | additive *with each other*: `1 + ΣΧ` | **separate** final multiplier (conditional) |
| **Direct/arcane** | Primary Merciless (+30%/stack) | additive: `1 + ΣΧ` | **separate** final multiplier (conditional) |

**Key nuances:**
- Serration multiplies elementals (they are inside the `× (1 + Damage Bonuses)` factor).
- **Roar shares the *faction* bucket** — Roar and Bane add *together* (`1 + Bane + Roar`),
  then that sum multiplies once. (Canonical "Roar is faction damage" interaction.)
- Faction & arcane buckets are **conditional** (toggled by combat state in Stage 1).

## Stage order (pure-function pipeline)

1. Gather effect descriptors from equipped mods/arcanes + active conditionals.
2. **Base+elemental subtotal:** `perType`, with elementals = `element% × baseTotal`,
   physical = base; then combine elements (see below); then `× (1 + ΣbaseDamageMods)`.
3. **Quantization:** round each type to the nearest `base/32` (see below), before
   any further multipliers.
4. **Multishot:** pellet count = `baseMS × (1 + Σmultishot)`.
5. **Critical (average):** `avgCrit = 1 + cc × (cd − 1)` (exact for all tiers, incl. >100%).
6. **Status:** per-pellet `sc = baseSC × (1 + Σstatus)`; avg procs/shot = `multishot × sc`.
7. **Fire rate → burst DPS; reload → sustained DPS.**
8. **Faction/direct multipliers** (conditional) applied last.

## Elemental combination

| Components | Combined |
|---|---|
| Heat + Cold | Blast |
| Heat + Toxin | Gas |
| Heat + Electricity | Radiation |
| Cold + Toxin | Viral |
| Cold + Electricity | Magnetic |
| **Toxin + Electricity** | **Corrosive** (slice) |

Combination follows mod **load order** (top-left → bottom-right). For the slice
(only Toxin + Electricity) the result is unambiguously **Corrosive**.

## Critical: average multiplier incl. > 100%

`avgCrit = 1 + critChance × (critDamage − 1)` is the exact expected multiplier for
**all** crit chances. A hit at crit *tier n* deals `× (1 + n·(cd − 1))`
(n = white/orange/red = 1/2/3); since `E[n] = critChance`, the expectation reduces
to the formula above. The per-tier multipliers are exposed for display only.

## DPS

- **Burst DPS** = `avgHitPerShot × multishot × fireRate` where
  `avgHitPerShot = perPelletTotal × avgCrit × factionMult`.
- **Sustained DPS** = `burst × magTime / (magTime + reload)`,
  `magTime = magazine / fireRate`.

## Quantization — IMPLEMENTED

Warframe rounds each physical/elemental damage type to the nearest **1/32 of the
weapon's unmodded base damage**, *before* multiplying further (multishot / crit /
faction). Quantum = `baseTotal / 32`; per type: `round(value / quantum) × quantum`.
Full rule + worked example: `docs/warframe/mechanics/quantization.md`
(source: `https://wiki.warframe.com/w/Damage/Calculation`).

The quantization is applied **inside** the base-damage factor — i.e. on the
elemental/physical values *before* the `× (1 + ΣbaseDamage)` (Serration) multiply.
The engine rounds `baseElementalStage`'s output (which already folds in that
multiply) against a quantum scaled the same way — `quantum = (baseTotal / 32) ×
(1 + ΣbaseDamage)` — which is exactly equivalent (`round(x/q)·q` then `×m` equals
rounding `x·m` to multiples of `q·m`). Quantization can round **up or down**, so it
nudges the headline numbers a few tenths of a percent either way (largest with few
mods, where each type spans only a handful of quanta). Reference numbers below are
**post-quantization** (what the game shows).

---

## Hand-verified reference build — Vulkar Wraith (slice e2e target)

Weapon base: Impact 245.7, Puncture 27.3, Slash 0 (**total 273**); crit 20% / 2.0×;
status 25%; fire rate 2; magazine 8; reload 3 s; base multishot 1.

Mods (max rank): Serration +165%, Split Chamber +90% MS, Point Strike +150% CC,
Vital Sense +120% CD, Rifle Aptitude +90% SC, Infected Clip +90% Toxin,
Stormbringer +90% Electric, Speed Trigger +60% FR, Bane of Grineer +30% (vs Grineer).

Derived:
- Base-damage mult = 1 + 1.65 = **2.65**
- Element% total = 0.90 + 0.90 = 1.80 → Corrosive
- Per-pellet subtotal (pre-quant) = 273 × (1 + 1.80) × 2.65 = 273 × 2.80 × 2.65 = **2025.66**
  - Impact 651.105 · Puncture 72.345 · Corrosive 1302.21 (no Slash)
- **Quantization:** quantum = (273 / 32) × 2.65 = 8.53125 × 2.65 = 22.60781. Round each:
  - Impact 651.105 → 29 × 22.60781 = **655.627**
  - Puncture 72.345 → 3 × 22.60781 = **67.823**
  - Corrosive 1302.21 → 58 × 22.60781 = **1311.253**
  - Per-pellet total (quantized) = **2034.703**
- Multishot = 1 × (1 + 0.90) = **1.90**
- Crit chance = 0.20 × (1 + 1.50) = **0.50**; Crit dmg = 2.0 × (1 + 1.20) = **4.40**
- avgCrit = 1 + 0.50 × (4.40 − 1) = **2.70**
- Status/pellet = 0.25 × (1 + 0.90) = **0.475**; avg procs/shot = 1.90 × 0.475 = **0.9025**
- Fire rate = 2 × (1 + 0.60) = **3.2**
- Avg hit/shot (no faction) = 2034.703 × 1.90 × 2.70 = **10 438.0**
- Avg hit/shot (vs Grineer, ×1.30) = **13 569.4**
- **Burst DPS** (no faction) = 10 438.0 × 3.2 = **≈ 33 402**
- **Burst DPS** (vs Grineer) = 13 569.4 × 3.2 = **≈ 43 422**
- magTime = 8 / 3.2 = 2.5 s; sustain factor = 2.5 / (2.5 + 3) = 0.4545
- **Sustained DPS** (no faction) = 33 402 × 0.4545 = **≈ 15 183**

## Per-hit damage by crit tier (this build)

A damage number shown in-game is **per pellet** (one number per multishot
instance), *before* any faction multiplier, and **post-quantization**. The
quantized pre-crit per-pellet total is **2034.70**; each crit tier scales it by
`1 + n·(CM − 1)` with CM = 4.40, so `(CM − 1) = 3.40` per tier:

| Tier | Colour | Multiplier | Per-pellet total | Impact / Puncture / Corrosive | Reachable? |
|---|---|---|---|---|---|
| 0 (non-crit) | white | ×1.00 | **2034.70** | 655.63 / 67.82 / 1311.25 | yes — 50% of hits |
| 1 (crit) | yellow | ×4.40 | **8952.69** | 2884.76 / 298.42 / 5769.51 | yes — 50% of hits |
| 2 (orange crit) | orange | ×7.80 | 15 870.68 | 5113.89 / 529.02 / 10 227.77 | **no** — needs CC ≥ 100% |
| 3 (red crit) | red | ×11.20 | 22 788.68 | 7343.02 / 759.62 / 14 686.04 | **no** — needs CC ≥ 200% |

**Which tiers this build actually achieves:** modded crit chance is **50%**, so a
pellet is either tier 0 (white, prob 0.50) or tier 1 (yellow, prob 0.50). Orange
(tier 2) needs ≥ 100% crit chance and red (tier 3) needs ≥ 200%, so this build
**cannot** produce orange/red crits — those rows are shown only to illustrate the
tier formula. The crit-tier count for a chance `cc` is `floor(cc)` guaranteed
tiers plus a `frac(cc)` chance of one more (here `floor(0.5)=0`, `+50%` for tier 1).

Per **trigger pull** (multishot 1.90 ≈ two pellets, each rolling crit
independently) the screen shows two numbers; common outcomes:
- both white: 2 × 2034.70
- one white + one yellow: 2034.70 + 8952.69
- both yellow: 2 × 8952.69
- expected per shot = 2034.70 × 1.90 × 2.70 = **10 438.0** (matches `avgHitPerShot`)

Vs Grineer (Bane +30%) every number above is multiplied by **1.30** (e.g. a yellow
crit pellet reads 8952.69 × 1.30 = **11 638.5**).
