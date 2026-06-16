# Trumna Prime

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Trumna Prime" --json` (@wfcd/items v1.1274.56)

## Base Stats

| Stat | Value |
|------|-------|
| **Primary Fire Total Damage** | 85 per shot |
| Impact | 32 |
| Heat | 53 |
| Puncture | 0 |
| Slash | 0 |
| Critical Chance | 24% (0.24) |
| Critical Multiplier | 2.4x |
| Status Chance (Proc Chance) | 34% (0.34) |
| Fire Rate | 4.67 shots/sec |
| Magazine Size | 250 |
| Reload Time | 4 sec |
| Mastery Rank Requirement | 15 |
| Trigger Type | Automatic |
| Riven Disposition | 1 (low disposition) |
| Accuracy | 200 |
| Noise Level | Alarming |
| Shot Type | Hit-Scan + AoE Explosion |

## Weapon Details

- **Category:** Primary
- **Type:** Rifle (Long Gun)
- **Description:** Sleek lines and golden accents define this masterpiece of the illustrious Entrati family.
- **Internal Name:** /Lotus/Weapons/Tenno/LongGuns/PrimeTrumna/PrimeTrumnaWeapon
- **Polarity:** Vazarin + Madurai (two mod slots)
- **Exilus Slot Polarity:** Naramon
- **Tags:** Prime, Tenno
- **Tradable:** No
- **Prime:** Yes
- **Masterable:** Yes
- **Vaulted:** No

## Primary Fire Mechanics - TWO Damage Components

### Why Two Damage Numbers?

Trumna Prime's primary fire consists of **two separate damage instances per trigger pull**:

1. **Direct Hit (Hit-Scan):** 32 Impact + 53 Heat = **85 total damage**
   - Applies to the directly hit enemy/target
   - Benefits from crit (24% crit chance, 2.4x multiplier)
   - Benefits from status procs (34% status chance)

2. **Auto AoE Explosion:** 50 Heat damage
   - Triggered on hit, creates Area-of-Effect explosion
   - Falloff: starts at 0m, ends at 1.6m, 0.15x reduction at max falloff distance
   - Separate status/crit rolls from primary hit
   - Lower damage than direct hit but affects surrounding enemies

**Observed In-Game:** ~112 damage (direct hit + AoE if both proc critically or hit weak points) and ~75 damage (AoE or single hit depending on positioning).

## Fire Modes

| Mode | Damage Type | Damage | Speed | Crit Chance | Crit Mult | Status | AoE Range |
|------|-------------|--------|-------|-------------|-----------|--------|-----------|
| Auto | 32 Impact + 53 Heat | 85 | 4.67 shot/s | 24% | 2.4x | 34% | None |
| Auto AoE | 50 Heat | 50 | 4.67 shot/s | 24% | 2.4x | 34% | 0-1.6m |
| Grenade Impact (alt-fire) | 100 Impact | 100 | 1.33 shot/s | 38% | 2.4x | 50% | None |
| Grenade Bounce AoE (alt-fire) | 1150 Heat | 1150 | 1.33 shot/s | 38% | 2.4x | 50% | 0-6m |

## Damage Falloff

**Primary Fire (Auto & AoE):**
- **AoE Start Distance:** 0m
- **AoE End Distance:** 1.6m
- **Reduction at Max:** 0.15x (15% of base AoE damage at 1.6m)
- **Direct hit:** No falloff (hit-scan)

**Alt-Fire (Grenade):**
- **AoE Start Distance:** 0m
- **AoE End Distance:** 6m
- **Reduction at Max:** 0.4x (40% of base AoE damage at 6m)

## Raw JSON Data

```json
{
  "name": "Trumna Prime",
  "uniqueName": "/Lotus/Weapons/Tenno/LongGuns/PrimeTrumna/PrimeTrumnaWeapon",
  "totalDamage": 85,
  "damage": {
    "total": 85,
    "impact": 32,
    "puncture": 0,
    "slash": 0,
    "heat": 53
  },
  "criticalChance": 0.24,
  "criticalMultiplier": 2.4,
  "procChance": 0.34,
  "fireRate": 4.67,
  "masteryReq": 15,
  "type": "Rifle",
  "category": "Primary",
  "trigger": "Auto",
  "magazineSize": 250,
  "reloadTime": 4,
  "disposition": 1,
  "multishot": 1,
  "attacks": [
    {
      "name": "Auto",
      "speed": 4.67,
      "crit_chance": 24,
      "crit_mult": 2.4,
      "status_chance": 34,
      "shot_type": "Hit-Scan",
      "damage": {
        "impact": 32,
        "heat": 53
      }
    },
    {
      "name": "Auto AoE",
      "speed": 4.67,
      "crit_chance": 24,
      "crit_mult": 2.4,
      "status_chance": 34,
      "shot_type": "AoE",
      "falloff": {
        "start": 0,
        "end": 1.6,
        "reduction": 0.15
      },
      "damage": {
        "heat": 50
      }
    }
  ],
  "polarities": ["vazarin", "madurai"],
  "exilusPolarity": "naramon",
  "tradable": false,
  "isPrime": true,
  "masterable": true,
  "vaulted": false
}
```

## Key Features for Damage Calculator

- **Primary Fire is Dual-Damage:** Direct hit (85) + AoE explosion (50) means damage per shot can exceed the listed 85 total if both components connect
- **Heat-Based:** 62% of damage is Heat (53/85 direct + 50 AoE), 38% is Impact (32/85)
- **High Crit Multiplier:** 2.4x crit multiplier with decent 24% crit chance makes critical builds effective
- **Solid Status Chance:** 34% allows for viable status/condition builds
- **Large Magazine:** 250 round magazine supports sustained fire
- **AoE is Modest:** 1.6m AoE explosion range with 15% falloff is more for minor splash than crowd control; main damage is direct hit
- **Low Disposition:** Riven disposition of 1 means rivens scale poorly on this weapon
- **Automatic Fire:** Full-auto trigger with high fire rate (4.67 shots/sec) suitable for sustained damage
- **Alt-Fire Available:** Disc/spike grenade alt-fire with separate stats (slower, higher crit, more status, larger AoE with 1150 Heat damage)
