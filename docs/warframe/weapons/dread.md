# Dread

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Dread" --json`

## Base Stats

| Stat | Value |
|------|-------|
| Total Damage | 336 |
| Impact | 16.8 (5%) |
| Puncture | 302.4 (90%) |
| Slash | 16.8 (5%) |
| Critical Chance | 50% (0.5) |
| Critical Multiplier | 2x |
| Status Chance (Proc Chance) | 20% (0.2) |
| Fire Rate | 1 shot/sec |
| Magazine Size | 1 |
| Reload Time | 0.7 sec |
| Mastery Rank Requirement | 5 |
| Trigger Type | Charge |
| Riven Disposition | 4 |
| Accuracy | 16.67 |
| Noise Level | Silent |
| Shot Type | Projectile |

## Weapon Details

- **Category:** Primary
- **Type:** Bow
- **Description:** Dread is the calling card of The Stalker. It fires arrows that can decapitate.
- **Internal Name:** /Lotus/Weapons/Tenno/Bows/StalkerBow
- **Polarities:** Madurai, Madurai
- **Exilus Polarity:** Naramon
- **Tags:** Stalker
- **Tradable:** No
- **Prime:** No
- **Masterable:** Yes

## Damage Falloff

No falloff specified in weapon data (projectile bow mechanics).

## Raw JSON Data

```json
{
  "name": "Dread",
  "uniqueName": "/Lotus/Weapons/Tenno/Bows/StalkerBow",
  "totalDamage": 336,
  "damage": {
    "total": 336,
    "impact": 16.8,
    "puncture": 302.4,
    "slash": 16.8
  },
  "criticalChance": 0.5,
  "criticalMultiplier": 2,
  "procChance": 0.2,
  "fireRate": 1,
  "masteryReq": 5,
  "type": "Bow",
  "category": "Primary",
  "trigger": "Charge",
  "magazineSize": 1,
  "reloadTime": 0.7,
  "disposition": 4,
  "attacks": [
    {
      "name": "Uncharged Shot",
      "speed": 1,
      "crit_chance": 50,
      "crit_mult": 2,
      "status_chance": 20,
      "shot_type": "Projectile",
      "shot_speed": 85,
      "flight": 85,
      "damage": {
        "impact": 16.8,
        "slash": 134.4,
        "puncture": 16.8
      }
    },
    {
      "name": "Charged Shot",
      "speed": 1,
      "crit_chance": 50,
      "crit_mult": 2,
      "status_chance": 20,
      "charge_time": 0.5,
      "shot_type": "Projectile",
      "shot_speed": 100,
      "flight": 100,
      "damage": {
        "impact": 16.8,
        "slash": 302.4,
        "puncture": 16.8
      }
    },
    {
      "name": "Incarnon Form Charged Shot",
      "speed": 1.5,
      "crit_chance": 50,
      "crit_mult": 3,
      "status_chance": 30,
      "charge_time": 0.6,
      "shot_type": "Projectile",
      "shot_speed": 0,
      "damage": {
        "impact": 100,
        "slash": 100,
        "heat": 200
      }
    }
  ],
  "polarities": ["madurai", "madurai"],
  "exilusPolarity": "naramon",
  "tradable": false,
  "isPrime": false,
  "masterable": true
}
```

## Key Features for Damage Calculator

- **Mixed Physical Damage:** 90% Puncture (302.4 / 336), 5% Impact, 5% Slash — typical bow damage distribution
- **Three Attack Modes:** Uncharged Shot (168 dmg), Charged Shot (336 dmg, 0.5s charge), and Incarnon Form Charged Shot (400 dmg, 0.6s charge, 3x crit multiplier)
- **Crit-Dominant:** 50% base crit chance with 2x multiplier (3x in Incarnon form); exceptional for critical builds
- **Status Support:** 20% base status chance (30% in Incarnon)
- **Projectile Physics:** Lower shot speeds (85 m/s uncharged, 100 m/s charged) typical of bow mechanics
- **No AoE:** Single-target projectile
- **Silent:** Suitable for stealth gameplay

## Suitability for Charge Mechanic Isolation

**POOR:** Dread has THREE distinct attack modes, including an Incarnon Form that introduces a weapon augmentation mechanic outside standard charge behavior. The Incarnon form adds Heat innate elemental damage, changes crit multiplier to 3x, and modifies charge time to 0.6s. This complexity makes it unsuitable for cleanly isolating the charge mechanic. Additionally, mixed physical damage distribution (5% Impact, 90% Puncture, 5% Slash) is more complex than pure elemental. The presence of quick-fire (Uncharged Shot) alongside charge modes also blurs the isolation of charge mechanics.
