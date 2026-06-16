# Stradavar Prime

**Source:** Generated via `node scripts/warframe-lookup.mjs --exact "Stradavar Prime" --json`

## Base Stats (Averaged)

| Stat | Value |
|------|-------|
| Total Damage | 30 |
| Impact | 10.5 (avg) / 8 (semi-auto) |
| Puncture | 10.5 (avg) / 24 (semi-auto) |
| Slash | 9 (avg) / 48 (semi-auto) |
| Critical Chance | 24% (full-auto) / 30% (semi-auto) |
| Critical Multiplier | 2.6x (full-auto) / 2.8x (semi-auto) |
| Status Chance | 12% (full-auto) / 22% (semi-auto) |
| Fire Rate (Full-Auto Mode) | 10 shots/sec |
| Fire Rate (Semi-Auto Mode) | 3.33 shots/sec |
| Magazine Size | 90 |
| Reload Time | 2 sec |
| Mastery Rank Requirement | 12 |
| Riven Disposition | 3 |
| Accuracy | 25 |
| Noise Level | Alarming |
| Shot Type | Hit-Scan |

## Weapon Details

- **Category:** Primary
- **Type:** Rifle (Multi-Mode Assault Rifle)
- **Description:** Between measured staccato and staggering crescendo, Stradavar Prime never fails to call down a devastating finale.
- **Internal Name:** /Lotus/Weapons/Tenno/LongGuns/PrimeStradavar/PrimeStradavarGun
- **Polarities:** Madurai, Madurai, Madurai (3x)
- **Exilus Polarity:** Madurai
- **Tags:** Prime, Vaulted
- **Tradable:** No
- **Prime:** Yes
- **Vaulted:** Yes (since 2021-02-23)
- **Masterable:** Yes

## Fire Modes

### Mode 1: Full Auto Mode
- **Name:** Full Auto Mode
- **Fire Rate:** 10 shots/sec
- **Critical Chance:** 24% (0.24)
- **Critical Multiplier:** 2.6x
- **Status Chance:** 12% (0.12)
- **Damage Breakdown:**
  - Impact: 10.5
  - Puncture: 10.5
  - Slash: 9
  - **Total:** 30 damage per shot

### Mode 2: Semi-Auto Mode
- **Name:** Semi-Auto Mode
- **Fire Rate:** 3.33 shots/sec
- **Critical Chance:** 30% (0.30)
- **Critical Multiplier:** 2.8x
- **Status Chance:** 22% (0.22)
- **Damage Breakdown:**
  - Impact: 8
  - Puncture: 24
  - Slash: 48
  - **Total:** 80 damage per shot

## Raw JSON Data

```json
{
  "name": "Stradavar Prime",
  "uniqueName": "/Lotus/Weapons/Tenno/LongGuns/PrimeStradavar/PrimeStradavarGun",
  "totalDamage": 30,
  "damage": {
    "total": 30,
    "impact": 10.5,
    "puncture": 9,
    "slash": 10.5
  },
  "criticalChance": 0.23999999,
  "criticalMultiplier": 2.5999999,
  "procChance": 0.12,
  "fireRate": 10.000001,
  "masteryReq": 12,
  "type": "Rifle",
  "category": "Primary",
  "trigger": "Auto",
  "magazineSize": 90,
  "reloadTime": 2,
  "multishot": 1,
  "attacks": [
    {
      "name": "Full Auto Mode",
      "speed": 10,
      "crit_chance": 24,
      "crit_mult": 2.6,
      "status_chance": 12,
      "shot_type": "Hit-Scan",
      "damage": {
        "impact": 10.5,
        "slash": 9,
        "puncture": 10.5
      }
    },
    {
      "name": "Semi-Auto Mode",
      "speed": 3.33,
      "crit_chance": 30,
      "crit_mult": 2.8,
      "status_chance": 22,
      "shot_type": "Hit-Scan",
      "damage": {
        "impact": 8,
        "slash": 48,
        "puncture": 24
      }
    }
  ],
  "disposition": 3,
  "isPrime": true,
  "vaulted": true,
  "vaultDate": "2021-02-23",
  "masterable": true
}
```

## Key Features for Damage Calculator

- **Dual Fire Modes (2 Modes):** Selectable between two distinct attack profiles via alt-fire.
  - **Full Auto Mode:** 10 shots/sec, 30 damage per shot (balanced 35/35/30 Impact/Puncture/Slash), 24% crit/2.6x mult, 12% status.
  - **Semi-Auto Mode:** 3.33 shots/sec, 80 damage per shot (10% Impact/30% Puncture/60% Slash heavy), 30% crit/2.8x mult, 22% status.
- **Mode-Specific Scaling:** Semi-auto has significantly higher per-shot damage (80 vs 30), higher crit chance (30% vs 24%), better crit multiplier (2.8x vs 2.6x), and nearly double status chance (22% vs 12%).
- **Damage Profile Shift:** Full-auto balanced physical; semi-auto Slash-focused (48 of 80 damage), making semi-auto better for Slash procs and Bleed scaling.
- **Magazine:** 90 rounds sustains both modes well. 2 sec reload is moderate.
- **Hit-Scan:** No projectile travel time; 100% accuracy in both modes.
- **Crit Viable:** Both modes benefit from crit scaling; semi-auto edge out full-auto for crit-focused builds.
- **Status Viable:** Semi-auto significantly higher status chance (22%) makes it superior for status builds.
- **Prime Weapon:** Disposition of 3 (moderate); prime scaling on rivens is diminished compared to regular weapons.
- **Vaulted:** No longer available in relics (vaulted 2021-02-23); accessible only through secondary market or player trading.
