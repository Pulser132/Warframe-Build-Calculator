# Opticor

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Opticor" --json`

## Base Stats

| Stat | Value |
|------|-------|
| Total Damage (Charged) | 999.99994 (1000) |
| Impact | 100 |
| Puncture | 850 |
| Slash | 50 |
| Critical Chance | 20% (0.2) |
| Critical Multiplier | 2.5x |
| Status Chance (Proc Chance) | 20% (0.20) |
| Fire Rate | 1 shot/sec |
| Magazine Size | 5 |
| Reload Time | 2 sec |
| Mastery Rank Requirement | 14 |
| Trigger Type | Charge |
| Riven Disposition | 4 |
| Accuracy | 100 (perfect) |
| Noise Level | Alarming |
| Charge Time | 2 sec |

## Weapon Details

- **Category:** Primary
- **Type:** Corpus Laser Cannon (Charge Weapon)
- **Description:** Once charged this Corpus laser cannon dispatches a devastating blast of light energy.
- **Internal Name:** /Lotus/Weapons/Corpus/LongGuns/CrpBFG/CrpBFG
- **Polarity:** Madurai
- **Exilus Polarity:** Naramon
- **Tags:** Corpus
- **Tradable:** No
- **Prime:** No
- **Masterable:** Yes
- **Charge Mechanics:** 2-second charge time for full damage

## Raw JSON Data

```json
{
  "name": "Opticor",
  "uniqueName": "/Lotus/Weapons/Corpus/LongGuns/CrpBFG/CrpBFG",
  "totalDamage": 999.99994,
  "damage": {
    "total": 999.99994,
    "impact": 100,
    "puncture": 49.999954,
    "slash": 850
  },
  "criticalChance": 0.2,
  "criticalMultiplier": 2.5,
  "procChance": 0.19999999,
  "fireRate": 1,
  "masteryReq": 14,
  "type": "Rifle",
  "category": "Primary",
  "trigger": "Charge",
  "magazineSize": 5,
  "reloadTime": 2,
  "multishot": 1,
  "attacks": [
    {
      "name": "Charged Shot",
      "speed": 1,
      "crit_chance": 20,
      "crit_mult": 2.5,
      "status_chance": 20,
      "charge_time": 2,
      "shot_type": "Hit-Scan",
      "damage": {
        "impact": 100,
        "slash": 50,
        "puncture": 850
      }
    },
    {
      "name": "Charged Shot AoE",
      "speed": 1,
      "crit_chance": 20,
      "crit_mult": 2.5,
      "status_chance": 20,
      "shot_type": "AoE",
      "falloff": {
        "start": 0,
        "end": 6,
        "reduction": 0.6
      },
      "damage": {
        "magnetic": 400
      }
    },
    {
      "name": "Quick Shot",
      "speed": 1,
      "crit_chance": 20,
      "crit_mult": 2.5,
      "status_chance": 20,
      "shot_type": "Hit-Scan",
      "damage": {
        "impact": 50,
        "slash": 25,
        "puncture": 425
      }
    },
    {
      "name": "Quick Shot AoE",
      "speed": 1,
      "crit_chance": 20,
      "crit_mult": 2.5,
      "status_chance": 20,
      "shot_type": "AoE",
      "falloff": {
        "start": 0,
        "end": 6,
        "reduction": 0.6
      },
      "damage": {
        "magnetic": 200
      }
    }
  ],
  "polarities": ["madurai"],
  "exilusPolarity": "naramon",
  "tradable": false,
  "isPrime": false,
  "masterable": true,
  "disposition": 4
}
```

## Key Features for Damage Calculator

- **Damage Type Distribution (Charged):** 85% Puncture (850 / 1000), 10% Impact (100 / 1000), 5% Slash (50 / 1000)
- **Charge Mechanic:** 2-second charge time for full damage; Quick Shot (uncharged) deals 50% damage
- **Multi-Attack System:** Has four distinct fire modes:
  1. Charged Shot (Hit-Scan): Full 1000 damage with physical types
  2. Charged Shot AoE: Area of effect with 400 Magnetic damage + falloff
  3. Quick Shot (Hit-Scan): Uncharged 500 damage (half charged)
  4. Quick Shot AoE: Uncharged AoE with 200 Magnetic damage
- **Area of Effect:** Secondary AoE attacks provide crowd control with 6m falloff (60% reduction at max distance)
- **Innate Magnetic:** Charged shots generate 400-point magnetic AoE (elemental, not included in base damage)
- **Perfect Accuracy:** 100 accuracy means no spread/falloff beyond charge mechanics
- **Balanced Crit:** 20% crit chance with 2.5x multiplier supports both crit and status builds
- **Status Support:** 20% status chance on direct hits
- **Slow Fire Rate:** Fire rate 1 means one charged shot per second; requires charge discipline
- **High Mastery Requirement:** MR 14 gates access to this power weapon
