# Gram Prime — @wfcd/items Data Shape

Command: `node scripts/warframe-lookup.mjs --category Melee --exact "Gram Prime" --json`

## Field Availability Report

### Attack Speed / Fire Rate
- **fireRate** (present): 0.80000007

### Range / Reach
- **range** (present): 2.9000001

### Follow Through
- **followThrough** (present): 0.60000002
- **No separate heavy/normal variant** — single value applies

### Damage Breakdown
- **damage** object (present):
  - total: 300
  - impact: 60
  - puncture: 225
  - slash: 15
  - (all secondary types are 0)
- **damagePerShot** array (present): [60, 15, 225, ...zeros]
- **totalDamage** (present): 300

### Crit / Status / Proc
- **criticalChance** (present): 0.31999999
- **criticalMultiplier** (present): 2.5999999
- **procChance** (present): 0.31999999

### Heavy Attack Fields
- **heavyAttackDamage** (present): 1800
- **heavySlamAttack** (present): 300
- **heavySlamRadialDamage** (present): 900
- **heavySlamRadius** (present): 9
- **windUp** (present): 1.1
- **comboDuration** (present): 5

### Slam Fields
- **slamAttack** (present): 900
- **slamRadialDamage** (present): 600
- **slamRadius** (present): 8
- **slideAttack** (present): 600

### Attacks Array
- **attacks** array (present): Contains 3 attack objects
  - **Normal Attack**: name, speed (0.8), crit_chance (32), crit_mult (2.6), status_chance (32), damage object (impact/slash/puncture), slide value
  - **Slam Attack**: name, speed, crit_chance, crit_mult, status_chance (10), shot_type: "AoE", falloff object, damage object (impact only)
  - **Heavy Slam Attack**: name, speed, crit_chance, crit_mult, status_chance (10), shot_type: "AoE", falloff object, damage object (blast only)

### Stance Polarity
- **stancePolarity** (present): "vazarin"
- **polarities** array (present): ["madurai", "madurai"] (mod slots)

### Riven Disposition
- **omegaAttenuation** (present): 0.75

### Combo Data
- **NO per-hit multipliers or stance combo strings** in @wfcd data
- Only `comboDuration: 5` field; no attack sequence info

### Other Fields Present
- blockingAngle: 55
- disposition: 1 (as raw value, omegaAttenuation is the disposition ratio)
- isPrime: true
- vaulted: true

## Summary

@wfcd provides identical structure to Kronen Prime:
- Normal / Slam / Heavy Slam separated into `attacks[]` array
- Per-attack damage types, crit, status, and AOE falloff
- No stance combo multipliers or per-hit damage strings (must be hand-authored)

Data shape supports direct emission without heavy transformation.
