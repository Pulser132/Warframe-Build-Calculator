# Weeping Wounds Mod

**Source**: `node scripts/warframe-lookup.mjs --category Mods --exact "Weeping Wounds"` and https://wiki.warframe.com/w/Weeping_Wounds (2026-06-17)

## Stats

- **Max Rank**: 5
- **Max Rank Bonus**: +40% Status Chance per Combo Multiplier
- **Polarity**: Madurai
- **Scaling**: Per **combo multiplier tier**, not per combo count

## Scaling Formula

**Status Chance = Weapon Status Chance × [1 + Mod Status Bonus + 0.4 × (Combo Multi - 1)]**

Where:
- Weapon Status Chance is the base weapon status chance
- Mod Status Bonus is the sum of all other status mods (e.g., Voltaic Strike, Pathogen Rounds)
- 0.4 (40%) is the bonus per multiplier tier above 1x
- At 1x combo: no bonus; at 2x: +40%; at 3x: +80%; etc.

## Combination with Base Status Chance

The weapon's base status chance is multiplied by the entire bracketed modifier. All status mods stack additively inside the bracket.

## Example Calculation

Weapon with 20% base status, maxed Weeping Wounds (0.4), and Voltaic Strike (0.6) at 4.0x combo multiplier:
- 20% × [1 + 0.6 + 0.4 × (4.0 - 1)] = 20% × [1 + 0.6 + 1.2] = 20% × 2.8 = 56%
