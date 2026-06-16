# Vaykor Hek

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Vaykor Hek" --json`

## Base Stats

| Stat | Value |
|------|-------|
| Total Damage | 75 |
| Impact | 11.25 |
| Puncture | 15 |
| Slash | 48.75 |
| Pellet Count (Multishot) | 7 |
| Per-Pellet Damage | ~10.71 |
| Critical Chance | 25% (0.25) |
| Critical Multiplier | 2x |
| Status Chance (Proc Chance) | 10.7% (0.107) |
| Fire Rate | 3 shots/sec |
| Magazine Size | 8 |
| Reload Time | 2.25 sec |
| Mastery Rank Requirement | 12 |
| Trigger Type | Semi-automatic |
| Riven Disposition | 4 |
| Accuracy | 9.09 |
| Noise Level | Alarming |
| Shot Type | Hit-Scan (Pellet Shotgun) |

## Weapon Details

- **Category:** Primary
- **Type:** Shotgun
- **Description:** Forged in the fires of rebel struggle, this shotgun is a force for liberation.
- **Internal Name:** /Lotus/Weapons/Syndicates/SteelMeridian/LongGuns/SMHek
- **Polarities:** Vazarin, Madurai
- **Exilus Polarity:** Naramon
- **Tags:** Syndicate, Steel Meridian
- **Tradable:** Yes
- **Prime:** No
- **Masterable:** Yes

## Damage Falloff

- **Start Distance:** 10m
- **End Distance:** 25m
- **Reduction:** 0.7333x (26.67% penalty at maximum falloff distance)

## Raw JSON Data

```json
{
  "name": "Vaykor Hek",
  "uniqueName": "/Lotus/Weapons/Syndicates/SteelMeridian/LongGuns/SMHek",
  "damagePerShot": [11.25, 48.75, 15.000004, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "totalDamage": 75,
  "damage": {
    "total": 75,
    "impact": 11.25,
    "puncture": 15.000004,
    "slash": 48.75,
    "heat": 0,
    "cold": 0,
    "electricity": 0,
    "toxin": 0,
    "blast": 0,
    "radiation": 0,
    "gas": 0,
    "magnetic": 0,
    "viral": 0,
    "corrosive": 0,
    "void": 0,
    "tau": 0,
    "cinematic": 0,
    "shieldDrain": 0,
    "healthDrain": 0,
    "energyDrain": 0,
    "true": 0
  },
  "criticalChance": 0.25,
  "criticalMultiplier": 2,
  "procChance": 0.10714287,
  "fireRate": 3.0000002,
  "masteryReq": 12,
  "type": "Shotgun",
  "category": "Primary",
  "trigger": "Semi",
  "magazineSize": 8,
  "reloadTime": 2.25,
  "multishot": 7,
  "attacks": [
    {
      "name": "Normal Attack",
      "speed": 3,
      "crit_chance": 25,
      "crit_mult": 2,
      "status_chance": 10.7,
      "shot_type": "Hit-Scan",
      "falloff": {
        "start": 10,
        "end": 25,
        "reduction": 0.7333
      },
      "damage": {
        "impact": 11.25,
        "slash": 15,
        "puncture": 48.75
      }
    }
  ],
  "disposition": 4,
  "isPrime": false,
  "masterable": true
}
```

## Key Features for Damage Calculator

- **Pellet Shotgun:** Multishot of 7 pellets per trigger pull. Total per-shot damage is 75 (distributed across 7 pellets = 10.71 damage per pellet). Each pellet independently applies crit/status rolls.
- **Damage Distribution:** 65% Slash (48.75 / 75), 20% Puncture (15 / 75), 15% Impact (11.25 / 75). Slash-focused for scaling.
- **Crit-Viable:** 25% crit chance with 2x multiplier makes crit builds effective; each pellet rolls independently.
- **Status Scaling:** 10.7% base proc chance; with 7 pellets, effective proc is higher per shot. Benefits from status mods.
- **Falloff:** Range starts at 10m and ends at 25m (15m range band). Significant damage dropoff for spread mechanics.
- **Semi-Auto:** Manual trigger pull; 3 shots/sec fire rate scales with attack speed mods.
- **Standard Pellet Shotgun:** Not slug; pure multi-pellet weapon with hit-scan delivery, no projectile travel.
