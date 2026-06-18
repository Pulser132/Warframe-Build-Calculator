# Umbral Fiber

**Source:** `@wfcd` lookup — `node scripts/warframe-lookup.mjs --category Mods --exact "Umbral Fiber"`

## Stats (max rank 10)

- **Stat:** +100% Armor (+11% Tau Resistance — not modeled)
- **Max rank:** 10, **drain:** 6, **polarity:** Umbra, **rarity:** Legendary
- **Set:** `umbral`; **`modSetValues`:** `[0.30, 0.80]`

## Set bonus scaling (corrected)

The set bonus multiplies the mod's own stat at **2+** Umbral mods
(`modSetValues[count − 2]`):

| Umbral mods | Set bonus | Umbral Fiber Armor |
|---|---|---|
| 1 | — | +100% (1.00) |
| 2 | ×(1 + 0.30) | +130% (1.30) |
| 3 | ×(1 + 0.80) | +180% (1.80) |

Engine: custom-effect `umbral-fiber` reading `ctx.setCounts['umbral']` (ADR 0004).
