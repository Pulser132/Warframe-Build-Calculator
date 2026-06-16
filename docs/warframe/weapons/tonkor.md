# Tonkor

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Tonkor" --json`

## Base Stats

| Stat | Value |
|------|-------|
| Total Damage | 725 |
| Direct/Impact Damage | 75 (Puncture, per projectile hit) |
| Radial/Explosion Damage | 650 (Blast AoE) |
| Slash | 75 |
| Blast | 650 |
| Critical Chance | 25% (0.25) |
| Critical Multiplier | 2.5x |
| Status Chance (Proc Chance) | 10% (0.10) |
| Fire Rate | 3.17 shots/sec |
| Magazine Size | 1 |
| Reload Time | 1.7 sec |
| Mastery Rank Requirement | 5 |
| Trigger Type | Semi-automatic |
| Riven Disposition | 4 |
| Accuracy | 100 |
| Noise Level | Alarming |
| Projectile Speed | 40 m/s |

## Weapon Details

- **Category:** Primary
- **Type:** Launcher (Grenade Launcher)
- **Description:** Hurl mayhem and destruction with this Grineer grenade launcher.
- **Internal Name:** /Lotus/Weapons/Grineer/LongGuns/GrnGrenadeLauncher/GrnGrenadeLauncher
- **Polarity:** Naramon (Exilus)
- **Tags:** Grineer
- **Tradable:** No
- **Prime:** No
- **Masterable:** Yes
- **Build Cost:** 60,000 Credits
- **Build Time:** 86,400 seconds (1 day)

## Damage Breakdown

### Direct Impact
- **Name:** Grenade Impact
- **Damage Type:** Puncture (75)
- **Fire Rate:** 3.17 shots/sec
- **Crit Chance:** 25% (2.5x multiplier)
- **Status Chance:** 10%
- **Shot Type:** Projectile (flight time 40m/s)

### Radial AoE Explosion
- **Name:** Grenade Explosion
- **Damage Type:** Blast (650)
- **Fire Rate:** 3.17 shots/sec
- **Crit Chance:** 25% (2.5x multiplier)
- **Status Chance:** 10%
- **Shot Type:** AoE (Area of Effect)
- **AoE Radius:** 7m (from start 0 to end 7)
- **Falloff Start:** 0m
- **Falloff End:** 7m
- **Falloff Reduction:** 0.7x (30% damage penalty at max radius)

## Raw JSON Data

```json
{
  "name": "Tonkor",
  "uniqueName": "/Lotus/Weapons/Grineer/LongGuns/GrnGrenadeLauncher/GrnGrenadeLauncher",
  "damagePerShot": [0, 75, 0, 0, 0, 0, 0, 650, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "totalDamage": 725,
  "damage": {
    "total": 725,
    "impact": 0,
    "puncture": 0,
    "slash": 75,
    "heat": 0,
    "cold": 0,
    "electricity": 0,
    "toxin": 0,
    "blast": 650,
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
  "criticalMultiplier": 2.5,
  "procChance": 0.10000002,
  "fireRate": 3.1666667,
  "masteryReq": 5,
  "type": "Launcher",
  "category": "Primary",
  "trigger": "Semi",
  "magazineSize": 1,
  "reloadTime": 1.7,
  "multishot": 1,
  "attacks": [
    {
      "name": "Grenade Impact",
      "speed": 3.17,
      "crit_chance": 25,
      "crit_mult": 2.5,
      "status_chance": 10,
      "shot_type": "Projectile",
      "shot_speed": 40,
      "flight": 40,
      "damage": {
        "puncture": 75
      }
    },
    {
      "name": "Grenade Explosion",
      "speed": 3.17,
      "crit_chance": 25,
      "crit_mult": 2.5,
      "status_chance": 10,
      "shot_type": "AoE",
      "falloff": {
        "start": 0,
        "end": 7,
        "reduction": 0.7
      },
      "damage": {
        "blast": 650
      }
    }
  ],
  "disposition": 4,
  "isPrime": false,
  "masterable": true
}
```

## Key Features for Damage Calculator

- **Dual-Damage Mechanics:** Direct impact on hit (75 Puncture) + radial explosion on detonation (650 Blast).
- **Two Attacks Array:** Separate entries in attacks array for impact vs. explosion allow independent crit/status rolls on each component.
- **AoE Radius:** 7m radius falloff zone (0m start to 7m end); damage scales from full at center to 0.7x at 7m (70% at edge).
- **Self-Damage:** No explicit self-damage flag in the data. Per game mechanics, Tonkor historically allows self-damage but this weapon is not flagged as such in the JSON (check in-game for current status).
- **High Burst Damage:** 725 total damage with 2.5x crit multiplier allows high single-hit damage builds.
- **Projectile-Based:** 40 m/s flight speed; grenades travel and detonate on impact or timeout. Not instant hit-scan.
- **Low Magazine:** 1-round magazine; semi-auto fire requires manual reload between shots. Tactical limitation.
- **Blast-Heavy:** 650 of 725 damage (90%) is Blast element in the AoE; scales excellently with Blast mods and procs (stagger).
