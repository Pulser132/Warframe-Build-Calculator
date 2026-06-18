# Roar (Rhino Ability)

**Source:** CONTEXT.md (project domain language); Damage.md (faction bucket integration)

## Base ability stats

- **Base damage bonus:** +50% (as a multiplier of Ability Strength)
- **Scaling with Ability Strength:** damage bonus = `0.5 × (1 + AbilityStrengthMods)`
  - Example: 100% base strength + 30% Intensify = 130% strength; Roar bonus = `0.5 × 1.30 = 0.65 = +65%`
- **Base duration:** documented in ability scraper (Stage 4 action item)
- **Base range:** documented in ability scraper (Stage 4 action item)

## Damage interaction (faction bucket)

Roar shares the **faction damage bucket** with Bane mods:
- Roar and Bane add **additively**: `1 + Bane% + Roar%`
- The combined sum then multiplies final damage **once** (separate from other multipliers)
- Example: Bane of Grineer (+30%) + Roar (+65%) = `1 + 0.30 + 0.65 = 1.95×` faction multiplier

## Ability attributes affected

- **Ability Strength** (scales damage bonus, +50% base)
- **Ability Duration** (scales ability active duration, value TBD)
- **Ability Range** (scales ability radius, value TBD)
- **Ability Efficiency** (affects energy cost, value TBD)

---

**Status:** Base facts cached; numeric values for duration/range/efficiency from ability scraper pending (Stage 4).
