# Blood Rush Mod

**Source**: `node scripts/warframe-lookup.mjs --category Mods --exact "Blood Rush"` and https://wiki.warframe.com/w/Blood_Rush (2026-06-17)

## Stats

- **Max Rank**: 10
- **Max Rank Bonus**: +40% Critical Chance
- **Polarity**: Madurai
- **Scaling**: Per **combo multiplier tier**, not per combo count

## Scaling Formula

**Crit Chance = Weapon Crit Chance × [1 + Mod Crit Bonus + Blood Rush Bonus × (Combo Multi - 1)] + Static Crit Bonus**

Where:
- Weapon Crit Chance is the base weapon critical chance
- Mod Crit Bonus is the sum of all non-Blood-Rush crit mods (e.g., Point Strike, True Steel)
- Blood Rush Bonus is 0.4 (40%) at max rank, scaled by (Combo Multi - 1)
- Static Crit Bonus is from sources like Arcane Avenger

## Combination with Other Crit Sources

Blood Rush combines **additively** with other mod bonuses like Point Strike:
- All non-static crit mods stack together in the "Mod Crit Bonus" portion
- Static bonuses (Arcane Avenger, etc.) stack separately and additively
- The key: Blood Rush's bonus multiplies only the weapon's base critical chance, while other mod bonuses are added together first before multiplication

## Example Calculation

Weapon with 20% base crit, maxed True Steel (+1.2), and Blood Rush (+0.4) at 4.0x combo multiplier:
- 20% × (1 + 1.2 + 0.4 × (4.0 - 1)) = 20% × (1 + 1.2 + 1.2) = 20% × 3.4 = 68% crit chance
