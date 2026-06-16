# Hind

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Hind" --json`

## Base Stats

| Stat | Value |
|------|-------|
| Total Damage | 30 |
| Impact | 7.5 |
| Puncture | 15 |
| Slash | 7.5 |
| Critical Chance (Burst Mode) | 7% (0.07) |
| Critical Multiplier (Burst Mode) | 1.5x |
| Status Chance (Burst Mode) | 15% (0.15) |
| Fire Rate (Burst Mode) | 6.25 shots/sec |
| Magazine Size | 65 |
| Reload Time | 2 sec |
| Mastery Rank Requirement | 0 |
| Trigger Type | Burst |
| Riven Disposition | 5 |
| Accuracy | 33.33 |
| Noise Level | Alarming |
| Shot Type | Hit-Scan |

## Weapon Details

- **Category:** Primary
- **Type:** Rifle (Grineer Burst)
- **Description:** A powerful mid-range rifle used by Grineer shock troops, the Hind fires in five round bursts.
- **Internal Name:** /Lotus/Weapons/Grineer/LongGuns/BurstRifle/GrnBurstRifle
- **Polarity:** Madurai
- **Exilus Polarity:** Naramon
- **Tags:** Grineer
- **Tradable:** No
- **Prime:** No
- **Masterable:** Yes
- **Burst Rounds:** 5 rounds per burst

## Raw JSON Data

```json
{
  "name": "Hind",
  "uniqueName": "/Lotus/Weapons/Grineer/LongGuns/BurstRifle/GrnBurstRifle",
  "totalDamage": 30,
  "damage": {
    "total": 30,
    "impact": 7.5,
    "puncture": 15,
    "slash": 7.5
  },
  "criticalChance": 0.07,
  "criticalMultiplier": 1.5,
  "procChance": 0.14999998,
  "fireRate": 6.2500005,
  "masteryReq": 0,
  "type": "Rifle",
  "category": "Primary",
  "trigger": "Burst",
  "magazineSize": 65,
  "reloadTime": 2,
  "multishot": 1,
  "attacks": [
    {
      "name": "Burst Mode",
      "speed": 5,
      "crit_chance": 7,
      "crit_mult": 1.5,
      "status_chance": 15,
      "shot_type": "Hit-Scan",
      "damage": {
        "impact": 7.5,
        "slash": 15,
        "puncture": 7.5
      }
    },
    {
      "name": "Semi-Auto Mode",
      "speed": 2.5,
      "crit_chance": 15,
      "crit_mult": 2,
      "status_chance": 10,
      "damage": {
        "impact": 12,
        "slash": 36,
        "puncture": 12
      }
    }
  ],
  "polarities": ["madurai"],
  "exilusPolarity": "naramon",
  "tradable": false,
  "isPrime": false,
  "masterable": true,
  "disposition": 5
}
```

## Key Features for Damage Calculator

- **Damage Type Distribution:** 50% Puncture (15 / 30), 25% Impact (7.5 / 30), 25% Slash (7.5 / 30)
- **Burst Fire Mode:** Primary mode fires in 5-round bursts with fireRate 5 (burst trigger speed), enabling rapid multi-hit damage
- **Dual Fire Modes:** Also has hidden Semi-Auto Mode with higher per-shot crit (15%) but lower speed (2.5). Damage changes to 12 Impact / 36 Slash / 12 Puncture per shot
- **Low Crit Profile:** Burst mode has only 7% crit chance and 1.5x multiplier, making it status-oriented (15% status chance)
- **Status Viable:** 15% status chance in burst mode supports status/elemental builds better than crit builds
- **High Disposition:** Riven disposition of 5 means high Riven scaling potential
- **Magazine:** 65 rounds supports sustained burst fire
- **Zero Mastery Requirement:** Accessible early-game weapon
- **Balanced Damage:** Even split across physical damage types
