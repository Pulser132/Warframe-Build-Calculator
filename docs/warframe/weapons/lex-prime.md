# Lex Prime

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Lex Prime" --json`

## Base Stats

| Stat | Value |
|------|-------|
| Total Damage | 180 |
| Impact | 18 |
| Puncture | 144 |
| Slash | 18 |
| Critical Chance | 25% (0.25) |
| Critical Multiplier | 2x |
| Status Chance (Proc Chance) | 25% (0.25) |
| Fire Rate | 2.08 shots/sec |
| Magazine Size | 8 |
| Reload Time | 2.35 sec |
| Mastery Rank Requirement | 8 |
| Trigger Type | Semi-automatic |
| Riven Disposition | 4 |
| Accuracy | 16 |
| Noise Level | Alarming |
| Shot Type | Hit-Scan |

## Weapon Details

- **Category:** Secondary
- **Type:** Pistol (Prime)
- **Description:** The Lex Prime is a powerful, accurate pistol that has a low Fire Rate and Magazine Capacity. Very efficient at long range.
- **Internal Name:** /Lotus/Weapons/Tenno/Pistols/PrimeLex/PrimeLex
- **Polarity:** Madurai
- **Exilus Polarity:** Naramon
- **Tags:** Prime, Never Vaulted
- **Tradable:** No
- **Prime:** Yes
- **Masterable:** Yes
- **Vaulted:** No

## Raw JSON Data

```json
{
  "name": "Lex Prime",
  "uniqueName": "/Lotus/Weapons/Tenno/Pistols/PrimeLex/PrimeLex",
  "totalDamage": 180,
  "damage": {
    "total": 180,
    "impact": 18,
    "puncture": 17.999994,
    "slash": 144
  },
  "criticalChance": 0.25,
  "criticalMultiplier": 2,
  "procChance": 0.25,
  "fireRate": 2.0833335,
  "masteryReq": 8,
  "type": "Pistol",
  "category": "Secondary",
  "trigger": "Semi",
  "magazineSize": 8,
  "reloadTime": 2.3499999,
  "multishot": 1,
  "attacks": [
    {
      "name": "Normal Attack",
      "speed": 2.08,
      "crit_chance": 25,
      "crit_mult": 2,
      "status_chance": 25,
      "shot_type": "Hit-Scan",
      "damage": {
        "impact": 18,
        "slash": 18,
        "puncture": 144
      }
    },
    {
      "name": "Incarnon Form",
      "speed": 0.67,
      "crit_chance": 35,
      "crit_mult": 3,
      "status_chance": 44,
      "shot_type": "Projectile",
      "shot_speed": 110,
      "flight": 110,
      "falloff": {
        "start": 10,
        "end": 18,
        "reduction": 0.3333
      },
      "damage": {
        "impact": 400,
        "radiation": 800
      }
    }
  ],
  "polarities": ["madurai"],
  "exilusPolarity": "naramon",
  "tradable": false,
  "isPrime": true,
  "vaulted": false,
  "masterable": true
}
```

## Key Features for Damage Calculator

- **Damage Type Distribution:** 80% Puncture (144 / 180), 10% Impact (18 / 180), 10% Slash (18 / 180)
- **Crit-Focused:** 25% crit chance with 2x multiplier makes critical hits valuable for damage scaling
- **Status Viable:** 25% status chance allows for status builds with proper mods
- **Multiple Fire Modes:** Has Incarnon Form which significantly changes performance (slower fire rate 0.67, but higher crit multiplier 3x, different damage type with Radiation innate)
- **Semi-Auto Trigger:** Single-shot precision weapon with low fire rate but high accuracy (16), fire rate scales with attack speed mods
- **Accuracy:** 16 means good long-range performance with minimal falloff
- **Prime Status:** Never vaulted, tradable components available
