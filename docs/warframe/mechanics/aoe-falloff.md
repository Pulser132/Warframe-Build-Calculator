# AoE / Damage Falloff

**Sources:**
- https://wiki.warframe.com/w/Damage_Falloff
- https://wiki.warframe.com/w/Area_of_Effect
- Fetched: 2026-06-16

## Falloff is LINEAR

Damage falloff (both projectile-distance falloff and radial AoE falloff) is a
**linear interpolation** between a peak and a minimum:
- **Full damage** at or below the **falloff start distance** (100%).
- **Linear decrease** between the start and end distances.
- **Minimum (floor) damage** at or beyond the **end distance** (a fixed % of peak).

## Standard data fields

1. **Falloff Start Distance** - distance up to which damage = 100%.
2. **Falloff End Distance** - distance at/after which damage = the minimum %.
3. **Reduction / Minimum Multiplier** - the floor damage as a fraction of peak.
   - Phrased either as "max reduction %" (how much is removed at the end) or as a
     "minimum damage %" (what remains at the end). They are complements:
     `minimum% = 1 - max_reduction%`.

### Projectile falloff examples (min % varies by weapon)
- Redeemer: 6.25% min ... Bronco: 75% min.
- Sniper rifles: ~50% min, 400-600 m falloff range.
- Universal hard distance limits: ~300 m (hitscan), ~1000 m (sniper).

### Radial AoE falloff (center -> edge)
- Default radial falloff: **90% reduction** at the outer edge (i.e. 10% damage at
  the rim, 100% at center).
- Weapon-specific: Zarr uses **50%** reduction, Tonkor uses **70%** reduction.
- **No headshot multiplier** applies to radial/AoE damage.
- Status: each enemy in the radius rolls status **independently**.

## Interpolation formula

For a hit at distance `d` between `start` and `end`, with `max_reduction` the
fraction removed at the end:
```
factor(d) = 1 - ( (d - start) / (end - start) ) x max_reduction        for start < d < end
factor(d) = 1                                                           for d <= start
factor(d) = 1 - max_reduction   (= minimum%)                            for d >= end

Damage(d) = Base Damage x factor(d)
```

For radial AoE, substitute start = 0 (peak at center) and end = blast radius.

## Worked example (projectile falloff)

Base damage = 200, falloff 10-30 m, max reduction = 80% (=> minimum 20%):
```
d <= 10m : factor = 1.00 -> 200 damage
d = 15m  : factor = 1 - (5/20)x0.80 = 1 - 0.20 = 0.80 -> 160 damage
d = 20m  : factor = 1 - (10/20)x0.80 = 1 - 0.40 = 0.60 -> 120 damage
d >= 30m : factor = 0.20 -> 40 damage
```

## Worked example (radial AoE)

Grenade, center damage = 500, blast radius = 5 m, default 90% reduction:
```
center (0m) : factor = 1.00 -> 500
2.5m        : factor = 1 - (2.5/5)x0.90 = 1 - 0.45 = 0.55 -> 275
edge (5m)   : factor = 1 - 0.90 = 0.10 -> 50
```

## Self-damage / stagger (note only, not modeled deeply)

The falloff page does NOT document self-damage. Current game behavior (from the
AoE page): AoE weapons cause **self-stagger** (flinch/knockback to the user) rather
than the old self-damage. Two falloff-related bugs to be aware of:
- Condition Overload's damage bonus ignores damage falloff.
- Incarnon Genesis base-damage evolutions ignore damage falloff.
