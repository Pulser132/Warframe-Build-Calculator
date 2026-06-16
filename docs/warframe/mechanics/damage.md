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
3. **Multishot:** pellet count = `baseMS × (1 + Σmultishot)`.
4. **Critical (average):** `avgCrit = 1 + cc × (cd − 1)` (exact for all tiers, incl. >100%).
5. **Status:** per-pellet `sc = baseSC × (1 + Σstatus)`; avg procs/shot = `multishot × sc`.
6. **Fire rate → burst DPS; reload → sustained DPS.**
7. **Faction/direct multipliers** (conditional) applied last.

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

## Quantization — deliberately OMITTED in Stage 1

Real Warframe rounds each damage type to the nearest `base/32` ("quantization").
Stage 1 skips this (sub-1% effect for our slice) and computes continuous values.
**Seam for a later stage:** add a quantization step between base+elemental and
multishot. Reference numbers below are pre-quantization.

---

## Hand-verified reference build — Braton Prime (slice e2e target)

Weapon base: Impact 1.75, Puncture 12.25, Slash 21 (**total 35**); crit 12% / 2.0×;
status 26%; fire rate 9.583334; magazine 75; reload 2.15 s; base multishot 1.

Mods (max rank): Serration +165%, Split Chamber +90% MS, Point Strike +150% CC,
Vital Sense +120% CD, Rifle Aptitude +90% SC, Infected Clip +90% Toxin,
Stormbringer +90% Electric, Speed Trigger +60% FR, Bane of Grineer +30% (vs Grineer).

Derived (pre-quantization):
- Base-damage mult = 1 + 1.65 = **2.65**
- Element% total = 0.90 + 0.90 = 1.80 → Corrosive
- Per-pellet total = 35 × (1 + 1.80) × 2.65 = 35 × 2.80 × 2.65 = **259.70**
  - Impact 4.6375 · Puncture 32.4625 · Slash 55.65 · Corrosive 166.95
- Multishot = 1 × (1 + 0.90) = **1.90**
- Crit chance = 0.12 × (1 + 1.50) = **0.30**; Crit dmg = 2.0 × (1 + 1.20) = **4.40**
- avgCrit = 1 + 0.30 × (4.40 − 1) = **2.02**
- Status/pellet = 0.26 × (1 + 0.90) = **0.494**; avg procs/shot = 1.90 × 0.494 = **0.9386**
- Fire rate = 9.583334 × (1 + 0.60) = **15.3333**
- Avg hit/shot (no faction) = 259.70 × 1.90 × 2.02 = **996.7**
- Avg hit/shot (vs Grineer, ×1.30) = **1295.7**
- **Burst DPS** (no faction) = 996.7 × 15.3333 = **≈ 15 283**
- **Burst DPS** (vs Grineer) = 1295.7 × 15.3333 = **≈ 19 868**
- magTime = 75 / 15.3333 = 4.891 s; sustain factor = 4.891 / (4.891 + 2.15) = 0.6947
- **Sustained DPS** (no faction) = 15 283 × 0.6947 = **≈ 10 617**
