# Enemy Damage Modifiers & Raw Damage Testing Guide

**Source:** https://wiki.warframe.com/w/Damage (Update 36.0+)  
**Armor:** https://wiki.warframe.com/w/Armor  
**Enemy Level Scaling:** https://wiki.warframe.com/w/Enemy_Level_Scaling  
**Steel Path:** https://wiki.warframe.com/w/Steel_Path  
**Last verified:** 2026-06-18

---

## TL;DR: Raw Damage Test Recommendations

**Best Simulacrum test enemies for raw weapon damage (no modifier distortion):**

1. **Charger (standard, non-Deimos)** — IDEAL
   - Health: 80
   - Armor: 0 (explicitly stated: "all charger variations, except the Deimos Charger, do not have any armor and full damage is dealt from any angle")
   - Shield: 0
   - Overguard: 0
   - Faction: Infested (vulnerable to Slash +50%, Heat +50%)
   - Why: Unarmored, unshielded, pure health. Any displayed damage = raw damage ÷ Infested faction modifiers only.

2. **Corpus Crewman (standard)** — ACCEPTABLE (has shields)
   - Health: 90
   - Armor: 0 (not listed; no armor)
   - Shield: 120
   - Overguard: 0
   - Faction: Corpus (vulnerable to Puncture +50%, Magnetic +50%)
   - Why: Unarmored but shielded. To isolate raw health damage, must kill shields first. Then health damage is purely shield-affected only.

**Why NOT other candidates:**
- **Lancer (Grineer)**: 100 armor = all displayed damage is reduced by armor formula. Bad for raw verification.
- All other armored enemies: Armor reduces all damage, distorting raw numbers.

---

## Health Type & Damage Modifier System (Update 36.0+)

### Simplified from Damage 2.0

**Before Update 36.0 (Damage 2.0):**
- 13 distinct health types: Cloned Flesh, Ferrite Armor, Alloy Armor, Machinery, Flesh, Shield, Proto Shield, Infested, Robotic, etc.
- Each health type had a damage-type multiplier table (e.g. Cloned Flesh weak to Impact, strong to Slash, etc.)

**After Update 36.0 (Damage 3.0, 2024-06-18):**
- Consolidated to **4 health types**: Health, Armor, Shield, Overguard
- Damage modifiers (vulnerabilities/resistances) are **faction-based, not health-type-based**
- Each faction has exactly 2 vulnerabilities (×1.5) and 0 resistances to normal damage types
- Special damage types (Finisher, Void, Slash Status) have neutral modifiers

---

## Health Types (Simplified, Update 36.0+)

| Health Type | What It Is | Damage Reduction | Notes |
|---|---|---|---|
| **Health** | Base unarmored health pool | None (1.0×, neutral baseline) | Affected by faction vulnerabilities only. No intrinsic resistance or weakness. |
| **Armor** | Damage reduction layer | Formula: `DR = 90% × NetArmor / 2700` (enemies) | Reduces all damage types equally via formula. Each point of armor reduces incoming damage. |
| **Shield** | Regenerating protective barrier | — (special rules) | Absorbs damage before health. Does NOT benefit from armor. Toxin bypasses shields entirely (→ health). Regenerates after ~1-2 seconds of no damage. |
| **Overguard** | Special high-health barrier (lich/sisters/proxies) | Formula varies | Rare; primarily on Lich units and Corpus/Grineer elite proxies. |

---

## Damage Type Modifiers by Faction (Update 36.0+)

**Key rule:** All damage types are **neutral (1.0×) by default**. Only faction vulnerabilities apply +1.5×; no resistances exist on standard damage types.

### Grineer
- **Vulnerable to:** Impact (+1.5×), Corrosive (+1.5×)
- **Neutral to:** All other physical/elemental (impact, puncture, slash, cold, electricity, heat, toxin, magnetic, radiation, viral, gas, blast)
- **No resistances**

### Corpus
- **Vulnerable to:** Puncture (+1.5×), Magnetic (+1.5×)
- **Neutral to:** All other damage types
- **No resistances**

### Infested
- **Vulnerable to:** Slash (+1.5×), Heat (+1.5×)
- **Neutral to:** All other damage types
- **No resistances**

### Orokin
- **Vulnerable to:** Puncture (+1.5×), Viral (+1.5×)
- **Neutral to:** Most damage types
- **Resistant to:** Radiation (×0.5)

### Sentient
- **Vulnerable to:** Cold (+1.5×), Radiation (+1.5×)
- **Neutral to:** Most damage types
- **Resistant to:** Corrosive (×0.5)

### Tenno (Player Warframes)
- **Neutral to all damage types** (as of Update 36.0): all weaknesses and resistances neutralized
- Unique shield/health/armor types with custom scaling

---

## Armor Mechanics

### Armor Reduces All Damage Types Equally

**Enemy armor damage reduction formula:**
```
DR = 90% × (NetArmor / 2700)
Damage Multiplier = 1 − DR = 1 − (0.9 × NetArmor / 2700) = 1 − (NetArmor / 3000)
```

Alternatively:
```
Damage Multiplier = 300 / (300 + NetArmor)
```

Example: Enemy with 500 armor:
- DR = 0.9 × (500 / 2700) = 0.9 × 0.1852 = 16.67% reduction
- Damage Multiplier = 1 − 0.1667 = 0.833 (83.3% of damage gets through)
- A weapon dealing 100 raw damage inflicts ~83.3 damage to shields/health

**Armor cap:** Hard-capped at 2700 armor value (90% damage reduction = 10% multiplier).  
**Minimum armor:** New enemies start with a minimum of 200 armor.

**Key: Armor is FACTION-AGNOSTIC.** It does not interact with damage types; it uniformly reduces all incoming damage.

### Minimum Damage Per Hit

Each damage type has a minimum damage of 1 per hit. This means:
- A weapon with 5 damage types hitting an armored enemy still deals at least 5 damage (1 per type) even with high armor.
- Raw numbers under 5 will be floor-clamped to 1 per type.

---

## Shield Mechanics

### Shield Properties
- **Regeneration:** Auto-regenerates ~1–2 seconds after taking damage (no damage delay).
- **Toxin bypass:** Toxin damage ignores shields and applies directly to health (100% shield bypass).
- **Armor independence:** Shields do NOT benefit from armor; they absorb damage directly.
- **No damage-type modifiers:** Shields receive the same damage from all damage types (no vulnerability or resistance based on damage type).
- **Status effect:** Magnetic status increases damage TO shields by +75% while blocking regeneration.

### Player vs. Enemy Shields (Post-36.0)
- **Player Shields:** 25% damage reduction applied before armor.
- **Enemy Shields:** Absorb damage at face value; no reduction mechanic (damage goes straight through).

---

## Special Damage Types (Neutral to All Factions)

| Damage Type | Properties | Notes |
|---|---|---|
| **Finisher** | Applies via finishers only | Ignores armor; neutral to all factions (+1.0×) |
| **Void** | Operator/Xaku ability | Vulnerable to Zariman faction only; neutral to all others |
| **Slash Status** | Applied via Slash proc | Ignores armor; neutral modifiers. Bypasses shields (→ health). |

---

## Enemy Level Scaling (Piecewise Formulas)

**General pattern:** `Current Stat = Base Stat × (1 + Coefficient × (CurrentLevel − BaseLevel)^Exponent)`

All enemy stats scale using piecewise functions with smooth interpolation (smoothstep) between transitions at level difference 70–80.

### Health Scaling

**Grineer and Scaldra:**
- Levels 0–70 difference: `multiplier = 1 + 0.015 × (level_diff)^2.12`
- Levels 70–80: Smooth interpolation (smoothstep)
- Levels 80+: `multiplier = 1 + 10.7332 × (level_diff)^0.72`

**Corpus:**
- Levels 0–70 difference: `multiplier = 1 + 0.015 × (level_diff)^2.12`
- Levels 70–80: Smooth interpolation
- Levels 80+: `multiplier = 1 + 13.4165 × (level_diff)^0.55`

### Shield Scaling

**Corpus:**
- Levels 0–70: `multiplier = 1 + 0.02 × (level_diff)^1.76`
- Levels 70–80: Smooth interpolation
- Levels 80+: `multiplier = 1 + 2 × (level_diff)^0.76`

**Grineer and Sentient:**
- Levels 0–70: `multiplier = 1 + 0.02 × (level_diff)^1.75`
- Levels 70–80: Smooth interpolation
- Levels 80+: `multiplier = 1 + 1.6 × (level_diff)^0.75`

### Armor Scaling

**All factions (unified formula):**
- Levels 0–70 difference: `multiplier = 1 + 0.005 × (level_diff)^1.75`
- Levels 70–80: Smooth interpolation
- Levels 80+: `multiplier = 1 + 0.4 × (level_diff)^0.75`
- **Hard cap:** 2700 armor (90% damage reduction)
- **Minimum initial:** 200 armor

### Level Scaling Example (Grineer, Base Level 1 → Level 100)

Level difference = 99 (exceeds 80 threshold, use high-level formulas):

| Stat | Calculation | Result |
|---|---|---|
| Health | `1 + 10.7332 × (99)^0.72` | ≈ `1 + 10.7332 × 31.6` ≈ **340×** |
| Shield | `1 + 1.6 × (99)^0.75` | ≈ `1 + 1.6 × 18.9` ≈ **31×** |
| Armor | `1 + 0.4 × (99)^0.75` | ≈ `1 + 0.4 × 18.9` ≈ **8.5×** |

**Base level of @wfcd Enemy.json stats:** Level 1 (standard Warframe convention).

---

## Steel Path Enemy Modifiers

Steel Path enemies receive stat multipliers and a level offset:

| Stat/Offset | Multiplier | Notes |
|---|---|---|
| **Health** | 2.5× (150% increase) | Missions on Steel Path use this multiplier |
| **Shields** | 2.5× (150% increase) | Corrected in Update 36.0 (was 6.25×, unintentionally doubled) |
| **Armor** | 1.0× (no change) | Armor is NOT increased on Steel Path (changed in Update 36.0) |
| **Level offset (standard missions)** | +100 levels | Effective enemy level = base + 100 |
| **Level offset (Archwing/Railjack)** | +50 levels | — |
| **Level offset (Duviri landscape)** | +20 levels | — |

**Steel Path interaction with scaling:** Apply the level offset first (e.g., level 1 enemy becomes level 101), then apply stat multipliers, then apply level-scaling formula.

---

## For Your Calculator (Stages 1–4)

### What You Need
For **intrinsic weapon damage calculation** (Stages 1–4), only compute:
1. Base damage × mods (Serration, etc.)
2. Elemental damage % × base
3. Physical damage bucket
4. Multishot
5. Critical (average multiplier)
6. Status chance

**Do NOT include:**
- Armor reduction (stage 5+)
- Shield interactions (stage 5+)
- Faction vulnerabilities (stage 5+)

### Verification in Simulacrum
Spawn **Charger** (standard, non-Deimos).
- Display raw damage numbers without faction/armor/shield interactions.
- Charger's Infested faction is +1.5× to Slash/Heat. If your test build has no Slash or Heat component, faction does not apply (it multiplies additive factors in the final formula, not the raw pre-faction output shown in calculator).

**Caveat:** The Simulacrum displays final post-armor, post-faction damage. To verify your calculator's *intrinsic* numbers, you may need to:
1. Calculate expected final damage on Charger (raw × 1.5 if Slash or Heat present)
2. Reverse-engineer to confirm your intrinsic (raw) number
3. Or build a test case with ONLY Impact/Puncture (Grineer-neutral) on a zero-armor target for pure verification.

---

## References

- Primary source: https://wiki.warframe.com/w/Damage (Update 36.0)
- Armor formula: https://wiki.warframe.com/w/Armor
- Shield mechanics: https://wiki.warframe.com/w/Shield
- Charger stats: https://wiki.warframe.com/w/Charger
- Lancer stats: https://wiki.warframe.com/w/Grineer_Lancer
- Crewman stats: https://wiki.warframe.com/w/Corpus_Crewman
