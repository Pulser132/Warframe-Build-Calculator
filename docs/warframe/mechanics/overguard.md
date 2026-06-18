# Overguard Mechanics

**Source**: https://wiki.warframe.com/w/Overguard  
**Game version**: Update 36+ (Damage 3.0)  
**Last verified**: 2026-06-18

## What is Overguard?

Overguard is a special defensive buffer that:
- Grants immunity to most crowd control effects (stuns, knockdowns, confusion, mind control, ragdoll, blind)
- Functions as an outermost defensive layer—must be depleted *before* damage can reach shields or health
- Does NOT regenerate once depleted
- Blocks status procs from applying to affected units, with exceptions (see below)

## Which Enemies Have Overguard

- **All Eximus units** (except Archwing, Warden, and Prosecutor variants) — base 12 Overguard
- Ancient Protector / Corrupted Ancient (grants 9× their health to nearby allies)
- Nox, Kuva Trokarian, Thrax units
- Archons in Archon Hunts (small amounts when protected by abilities)
- Various specialized enemy types

## Overguard Amount & Scaling Formula

**Base value**: 12 Overguard for all Eximus units

**Scaling with level**: Uses a piecewise formula with smooth interpolation (smoothstep) between levels 46–50:

**For level difference 0–45** (Current Level − 1 < 45):
```
multiplier = 1 + 0.0015 × (CurrentLevel − 1)^4
```

**For level difference 50+** (Current Level − 1 > 50):
```
multiplier = 1 + 260 × (CurrentLevel − 1)^0.9
```

**For levels 46–50:** Linear interpolation via smoothstep function between the two formulas.

**Final Overguard = Base × Multiplier = 12 × multiplier**

### Worked Example: Level 100 Eximus

Since 100 − 1 = 99 > 50, use the high-level formula:
```
multiplier = 1 + 260 × (99)^0.9
multiplier = 1 + 260 × 63.10
multiplier ≈ 1 + 16,406 = 16,407
```

**Final Overguard = 12 × 16,407 ≈ 196,884**

At level 100, an Eximus unit has approximately **196,884 Overguard** (before faction/Void/Magnetic amplification).

Overguard scales **independently** from enemy health/shields; it is not tied to base health values. It represents a separate damage pool.

## Damage Interaction Rules

- **Armor**: Overguard is **NOT affected** by armor damage reduction. It takes full damage regardless of enemy armor value.
- **Void damage**: Deals 50% additional damage to Overguard (1.5× multiplier).
- **Magnetic status**: Amplifies Overguard damage (100% on first stack, up to 325% maximum with full stacks).
- **Toxin**: Does NOT bypass Overguard (unlike shields). Toxin interacts normally.
- **Faction modifiers** (×1.5 damage bonuses): No mention in wiki; interaction unclear—assume they apply normally.
- **Slash/Heat DoT**: No explicit mention; assume they apply normally to Overguard.
- **Cold procs** (up to 4 stacks) and **Void procs**: Can bypass the crowd control immunity while Overguard is active, but do not bypass the Overguard layer itself.

## Status Procs & Crowd Control

- Overguard **completely blocks** crowd control effects (stuns, knockdowns, confusion, mind control, ragdoll, blind) while active.
- **Exceptions**: Cold procs (up to 4 stacks) and Void procs can apply despite the immunity.
- Once Overguard is depleted, normal status procs apply to the underlying shields/health.

## Layer Ordering

**Defensive layer stack** (outermost to innermost):
1. **Overguard** (depleted first)
2. **Shields**
3. **Health**

When Overguard is depleted on players, a 0.5-second invulnerability gate prevents excess damage from leaking into shields/health.

## Notes for Damage Calculator

- Treat Overguard as a separate damage pool that must be fully depleted before shields/health take damage.
- Apply the level-scaling formula independently for each enemy.
- Account for Void damage amplification (+50%) and Magnetic status amplification (base 100%, scales to 325%).
- Armor does NOT reduce Overguard damage.
- Overguard provides crowd control immunity, so crowd control effects are wasted against active Overguard.
- Do not assume faction modifiers or DoT interactions without explicit wiki confirmation.
