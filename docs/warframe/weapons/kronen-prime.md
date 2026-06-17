# Kronen Prime — @wfcd/items Data Shape

Command: `node scripts/warframe-lookup.mjs --category Melee --exact "Kronen Prime" --json`

## Field Availability Report

### Attack Speed / Fire Rate
- **fireRate** (present): 1.1666667

### Range / Reach
- **range** (present): 2.5

### Follow Through
- **followThrough** (present): 0.60000002
- **No separate heavy/normal variant** — single value applies

### Damage Breakdown
- **damage** object (present): 
  - total: 212
  - impact: 21.200001
  - puncture: 169.60001
  - slash: 21.200001
  - (all secondary types are 0)
- **damagePerShot** array (present): [21.2, 21.2, 169.6, ...zeros]
- **totalDamage** (present): 212

### Crit / Status / Proc
- **criticalChance** (present): 0.22
- **criticalMultiplier** (present): 2
- **procChance** (present): 0.34000003

### Heavy Attack Fields
- **heavyAttackDamage** (present): 848
- **heavySlamAttack** (present): 848
- **heavySlamRadialDamage** (present): 636
- **heavySlamRadius** (present): 9
- **windUp** (present): 0.69999999
- **comboDuration** (present): 5

### Slam Fields
- **slamAttack** (present): 424
- **slamRadialDamage** (present): 424
- **slamRadius** (present): 8
- **slideAttack** (present): 424

### Attacks Array
- **attacks** array (present): Contains 3 attack objects
  - **Normal Attack**: name, speed (1.17), crit_chance (22), crit_mult (2), status_chance (34), damage object (impact/slash/puncture), slide value
  - **Slam Attack**: name, speed, crit_chance, crit_mult, status_chance (10), shot_type: "AoE", falloff object, damage object (impact only)
  - **Heavy Slam Attack**: name, speed, crit_chance, crit_mult, status_chance (10), shot_type: "AoE", falloff object, damage object (blast only)

### Stance Polarity
- **stancePolarity** (present): "madurai"
- **polarities** array (present): ["madurai", "naramon"] (mod slots)

### Riven Disposition
- **omegaAttenuation** (present): 0.64999998

### Combo Data
- **NO per-hit multipliers or stance combo strings** in @wfcd data
- Only `comboDuration: 5` field; no attack sequence info

### Other Fields Present
- blockingAngle: 60
- disposition: 1 (as raw value, omegaAttenuation is the disposition ratio)
- isPrime: true
- vaulted: true

## Summary

@wfcd provides a complete attack structure with:
- Normal / Slam / Heavy Slam separated into `attacks[]` array
- Per-attack damage types, crit, status, and AOE falloff
- No stance combo multipliers or per-hit damage strings (must be hand-authored)

Data shape supports direct emission without heavy transformation.
