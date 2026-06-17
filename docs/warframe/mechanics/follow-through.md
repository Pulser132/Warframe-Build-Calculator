# Follow-Through Multi-Target Damage Reduction

**Source**: https://wiki.warframe.com/w/Melee (2026-06-17)

## Default Follow-Through Values

Follow-through values vary by weapon class (0.4 to 1.0). Example: Skana has a Follow Through stat of 0.6.

## Damage Reduction Formula

Successive targets receive diminishing damage:

**Proportion of weapon damage = FT^(n - 1)**

where n is the hit order (1st, 2nd, 3rd target, etc.) and FT is the Follow Through stat.

Example with 0.6 follow-through hitting three targets:
- 1st target: 100% (0.6^0 = 1.0)
- 2nd target: 60% (0.6^1 = 0.6)
- 3rd target: 36% (0.6^2 = 0.36)

## Heavy vs. Normal Attacks

The wiki does not specify different follow-through mechanics between heavy and normal attacks.

## Exclusions

Follow-Through does **not** affect:
- Slam Attacks (including Heavy Slam Attacks)
- Slide Attacks
- Projectile-based attacks
