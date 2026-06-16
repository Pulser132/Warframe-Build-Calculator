# Lanka

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Lanka" --json`

## Base Stats

| Stat | Value |
|------|-------|
| Total Damage | 525 |
| Impact | 0 |
| Puncture | 0 |
| Slash | 0 |
| Electricity (Innate) | 525 |
| Critical Chance (Uncharged) | 20% (0.2) |
| Critical Chance (Charged) | 25% (0.25) |
| Critical Multiplier | 2x |
| Status Chance (Proc Chance) | 25% (0.25) |
| Fire Rate | 0 (Charge-based) |
| Magazine Size | 10 |
| Reload Time | 2 sec |
| Mastery Rank Requirement | 10 |
| Trigger Type | Charge |
| Riven Disposition | 3 |
| Accuracy | 100 |
| Noise Level | Alarming |
| Shot Type | Projectile |

## Weapon Details

- **Category:** Primary
- **Type:** Sniper Rifle (Long Gun)
- **Description:** The Lanka fires a high velocity projectile through magnetic induction.
- **Internal Name:** /Lotus/Weapons/ClanTech/Energy/Railgun
- **Polarity:** Madurai
- **Exilus Polarity:** Madurai
- **Tags:** Corpus
- **Tradable:** No
- **Prime:** No
- **Masterable:** Yes

## Damage Falloff

- **Start Distance:** 400m
- **End Distance:** 600m
- **Reduction:** 0.5x (50% penalty at maximum falloff distance)

## Raw JSON Data

```json
{
  "name": "Lanka",
  "uniqueName": "/Lotus/Weapons/ClanTech/Energy/Railgun",
  "totalDamage": 525,
  "damage": {
    "total": 525,
    "impact": 0,
    "puncture": 0,
    "slash": 0,
    "electricity": 525
  },
  "criticalChance": 0.2,
  "criticalMultiplier": 2,
  "procChance": 0.25,
  "fireRate": 0,
  "masteryReq": 10,
  "type": "Sniper",
  "category": "Primary",
  "trigger": "Charge",
  "magazineSize": 10,
  "reloadTime": 2,
  "disposition": 3,
  "attacks": [
    {
      "name": "Partially Charged Shot",
      "crit_chance": 20,
      "crit_mult": 2,
      "status_chance": 25,
      "charge_time": 0.3,
      "shot_type": "Projectile",
      "shot_speed": 200,
      "flight": 200,
      "falloff": {
        "start": 400,
        "end": 600,
        "reduction": 0.5
      },
      "damage": {
        "electricity": 200
      }
    },
    {
      "name": "Charged Shot",
      "crit_chance": 25,
      "crit_mult": 2,
      "status_chance": 25,
      "charge_time": 1,
      "shot_type": "Projectile",
      "shot_speed": 250,
      "flight": 250,
      "damage": {
        "electricity": 525
      }
    }
  ],
  "polarities": ["madurai"],
  "exilusPolarity": "madurai",
  "tradable": false,
  "isPrime": false,
  "masterable": true
}
```

## Key Features for Damage Calculator

- **Pure Elemental Damage:** 100% Electricity (525 / 525) — no physical damage splits, cleanest elemental baseline
- **Charge-Based Scaling:** Damage scales with charge level (200 at 0.3s → 525 at full 1s charge), perfect for isolating charge mechanics
- **Two Charge States:** Partially Charged (0.3s, 200 dmg, 20% crit) and Fully Charged (1s, 525 dmg, 25% crit)
- **Crit-Focused:** Base 20% crit chance that increases to 25% when fully charged; 2x multiplier
- **Status Viable:** 25% status chance enables status builds
- **Projectile Physics:** High shot speed (250m/s when charged) with falloff from 400m–600m
- **No AoE:** Single-target hitscan-equivalent projectile
- **No Alt-Fire:** Two attack modes are charge levels of the same fire mode, not distinct alt modes

## Suitability for Charge Mechanic Isolation

**MODERATE:** Lanka has a single charge trigger with no AoE or alt modes, but includes two charge levels (0.3s partial and 1s full charge), which adds slight complexity. The pure Electricity damage and clean charge progression make it excellent for demonstrating how charge affects damage output. The crit chance bonus at full charge adds a secondary scaling mechanism.
