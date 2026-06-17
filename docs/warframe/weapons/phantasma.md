# Phantasma

**Source:** 
- Base stats: `node scripts/warframe-lookup.mjs --exact "Phantasma"`
- Ramp-up mechanic: https://wiki.warframe.com/w/Phantasma

## Base Stats

| Stat | Value |
|------|-------|
| **Type** | Shotgun (Primary) |
| **Fire Rate** | 12 rounds/sec (hit-scan beam) |
| **Multishot** | 6 pellets per shot |
| **Magazine Size** | 11 |
| **Reload Time** | 0.5 seconds |
| **Critical Chance** | 2.9% |
| **Critical Multiplier** | 1.5x |
| **Status Chance** | 22.2% (beam) / 37% (secondary attacks) |

## Damage Per Shot

**Per Pellet (Primary Beam):**
- Impact: 5 damage
- Radiation: 10 damage
- **Total per pellet: 15 damage**

**Total Damage Per Shot (6 pellets):** 90 damage (before ramp-up)
- 30 Impact (5 × 6)
- 60 Radiation (10 × 6)

**Note:** In-game damage display shows total across all pellets merged together (not per-pellet).

## Damage Ramp-Up Mechanic

The Phantasma's primary beam has a unique continuous firing damage scaling:

| Parameter | Value |
|-----------|-------|
| **Starting Damage (Floor)** | 15% of max (= 2.25 per pellet, 13.5 total) |
| **Maximum Damage (Peak)** | 100% of max (= 15 per pellet, 90 total) |
| **Ramp-Up Time** | 0.6 seconds |
| **Max Ramp Multiplier** | 6.67x (100% ÷ 15%) |
| **Decay Grace Period** | 0.8 seconds (after ceasing fire before decay begins) |
| **Decay Duration** | 2 seconds (from 100% back to 15%) |

**Mechanic:** Continuously holding the trigger maintains ramped-up damage at 100%. Stopping fire triggers the decay timer: if you resume within 0.8 seconds, you keep the high damage; if you wait longer, damage decays back to 15% over 2 seconds, requiring a fresh ramp-up cycle.

**Data Reconciliation Notes:**
- @wfcd export reports `totalDamage: 15` per pellet (attack: Beam), `multishot: 6`, representing the **peak ramped damage** (100%)
- In-game Arsenal display shows the same (15/pellet = 90 total across 6 pellets) as the displayed "Damage" stat
- The **floor damage** (ramp start at 15%) is 2.25 per pellet (15 × 0.15)
- Multiplier from floor to peak: 15 ÷ 2.25 = 6.67x (matches the ramp percentage: 100% ÷ 15%)

## Secondary Fire

The Phantasma can charge secondary fire to release a plasma glob that:
1. Impacts with 15 Impact damage on hit
2. Erupts with homing cluster bomblets (3 Impact damage each on impact, 18 Radiation each on explosion)
3. Charge time: 1 second

## Mastery Requirement

- **Mastery Rank 9**
