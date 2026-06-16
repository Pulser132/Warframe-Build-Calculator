# Vulkar Wraith

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Vulkar Wraith" --json`

## Base Stats

| Stat | Value |
|------|-------|
| Total Damage | 273 |
| Impact | 245.7 |
| Puncture | 27.3 |
| Slash | 0 |
| Critical Chance | 20% (0.2) |
| Critical Multiplier | 2x |
| Status Chance (Proc Chance) | 25% (0.25) |
| Fire Rate | 2 shots/sec |
| Magazine Size | 8 |
| Reload Time | 3 sec |
| Mastery Rank Requirement | 7 |
| Trigger Type | Semi-automatic |
| Riven Disposition | 5 (highly dispositioned) |
| Accuracy | 13.33 |
| Noise Level | Alarming |
| Shot Type | Hit-Scan |

## Weapon Details

- **Category:** Primary
- **Type:** Sniper Rifle (Long Gun)
- **Description:** A blood-red variant of this devastating sniper rifle
- **Internal Name:** /Lotus/Weapons/Grineer/LongGuns/GrineerSniperRifle/VulkarWraith
- **Polarity:** Madurai (both standard and Exilus slot)
- **Tags:** Wraith, Baro (Baro Ki'Teer item), Grineer
- **Tradable:** Yes
- **Prime:** No
- **Masterable:** Yes

## Damage Falloff

- **Start Distance:** 400m
- **End Distance:** 600m
- **Reduction:** 0.5x (50% penalty at maximum falloff distance)

## Raw JSON Data

```json
{
  "name": "Vulkar Wraith",
  "uniqueName": "/Lotus/Weapons/Grineer/LongGuns/GrineerSniperRifle/VulkarWraith",
  "totalDamage": 273,
  "damage": {
    "total": 273,
    "impact": 245.7,
    "puncture": 27.3,
    "slash": 0
  },
  "criticalChance": 0.2,
  "criticalMultiplier": 2,
  "procChance": 0.25,
  "fireRate": 2,
  "masteryReq": 7,
  "type": "Sniper",
  "category": "Primary",
  "trigger": "Semi",
  "magazineSize": 8,
  "reloadTime": 3,
  "disposition": 5,
  "attacks": [
    {
      "name": "Normal Attack",
      "speed": 2,
      "crit_chance": 20,
      "crit_mult": 2,
      "status_chance": 25,
      "shot_type": "Hit-Scan",
      "falloff": {
        "start": 400,
        "end": 600,
        "reduction": 0.5
      },
      "damage": {
        "impact": 245.7,
        "puncture": 27.3
      }
    }
  ],
  "polarities": ["madurai"],
  "exilusPolarity": "madurai",
  "tradable": true,
  "isPrime": false,
  "masterable": true
}
```

## Key Features for Damage Calculator

- **Damage Type Distribution:** 90% Impact (245.7 / 273), 10% Puncture (27.3 / 273), 0% Slash
- **Crit-Focused:** 20% crit chance with 2x multiplier makes critical hits valuable
- **Status Viable:** 25% status chance allows for status builds with proper mods
- **Falloff:** Damage scales linearly from 400m to 600m with 0.5x reduction applied at end range
- **High Disposition:** Riven disposition of 5 means rivens scale well on this weapon
- **Semi-Auto Fire:** Single-shot trigger suitable for precision play, fire rate scales with attack speed mods
