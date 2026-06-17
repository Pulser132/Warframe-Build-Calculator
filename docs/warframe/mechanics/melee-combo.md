# Melee Combo Counter Mechanics

**Source**: https://wiki.warframe.com/w/Combo_Counter (2026-06-17)

## Combo Multiplier Tier Breakpoints

The melee combo system tracks consecutive attacks within a **5-second window**. The multiplier progression is:

| Hits Required | Multiplier |
|---|---|
| 20 | 2.0x |
| 40 | 3.0x |
| 60 | 4.0x |
| 100 | 6.0x |
| 220 | 12.0x (standard cap) |

**Special case**: Venka Prime reaches 13x at 240 hits.

## Combo Gain

- Standard melee attacks award points based on their stance multiplier: 100% stance damage multiplier = 1 point
- Blocking grants 1 point per enemy attack blocked
- Special attacks vary from baseline values

## Duration & Decay Behavior

- **Default duration**: 5 seconds without landing a hit
- **Decay behavior**: Complete reset to 0 when the 5-second window expires
- **Modified decay**: The Power Spike passive enables gradual decay instead of complete reset, losing "20 / 15 / 10 / 5" points per reset cycle depending on rank
- **Duration extension**: Mods extend the timer additively (e.g., Combo Duration, Killing Blow)

## Heavy Attack Efficiency Cap

Heavy Attack Efficiency caps at 90% reduction, meaning minimum 10% combo consumption even with stacked bonuses.
