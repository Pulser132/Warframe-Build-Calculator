# Overguard Mechanics

**Source**: [Warframe Wiki - Overguard](https://wiki.warframe.com/w/Overguard), [Warframe Wiki - Eximus](https://wiki.warframe.com/w/Eximus)  
**Last verified**: 2026-06-18  
**Game version**: Update 36+ (Damage 3.0)

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

**Scaling with level**: Uses a piecewise formula with smooth interpolation between levels 45–50:

- **Levels 1–45**: `multiplier = 1 + 0.0015(level - 1)^4`
- **Levels 50+**: `multiplier = 1 + 260(level - 1)^0.9`

**Final Overguard** = `12 × multiplier`

Example: A level 100 Eximus would have approximately `12 × (1 + 260(99)^0.9)` ≈ 12 × 1219 ≈ 14,628 Overguard.

Overguard scales **independently** from enemy health/shields; it is not tied to base health values.

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
