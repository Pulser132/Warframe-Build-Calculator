# Umbral Intensify

**Source:** `@wfcd` lookup — `node scripts/warframe-lookup.mjs --category Mods --exact "Umbral Intensify"`

## Stats (max rank 10)

- **Stat:** +44% Ability Strength (+11% Tau Resistance — not modeled)
- **Max rank:** 10
- **Base drain:** 6
- **Polarity:** Umbra
- **Rarity:** Legendary
- **Set:** `umbral` (with Umbral Vitality & Umbral Fiber)
- **`modSetValues`:** `[0.25, 0.75]`

## Set bonus scaling (corrected)

The Umbral set bonus **multiplies the mod's own stat** once **2 or more** Umbral
mods are equipped. The bonus fraction is `modSetValues[count − 2]`:

| Umbral mods equipped | Set bonus | Umbral Intensify Strength |
|---|---|---|
| 1 | — | +44% (0.44) |
| 2 | ×(1 + 0.25) | +55% (0.55) |
| 3 | ×(1 + 0.75) | +77% (0.77) |

The bonus does **not** add to the base frame stat directly — it scales the mod's
contribution, which then sums additively with other Ability-Strength mods. Verified
against community values (full 3-set Umbral Intensify ≈ +77% Strength).

Engine: routed through the custom-effect registry (`umbral-intensify`) reading
`ctx.setCounts['umbral']` — see ADR 0004 and `engine/warframe/frameCustomEffects.ts`.
