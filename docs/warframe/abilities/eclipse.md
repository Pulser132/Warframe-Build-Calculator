# Eclipse (Mirage's 3rd Ability)

**Source:** https://wiki.warframe.com/w/Eclipse (live PvE behavior, current patch)

## Solar Eclipse (Light/Damage Buff Side)

### Base damage bonus
- **Magnitude at 100% Ability Strength:** +100% weapon damage (doubles damage)
- **Scaling:** damage bonus = `1.0 × (1 + AbilityStrengthMods)`
  - Example: 100% base strength + 30% Intensify = 130% strength; Solar Eclipse bonus = `1.0 × 1.30 = +130%`

### Multiplier application
- Eclipse damage bonus is applied as an **independent multiplier**, separate from faction damage buckets (Bane, Roar)
- Unlike faction damage (which double-dips for status effects), Eclipse is applied once to the final damage
- Does NOT stack with faction bucket; applies after faction damage calculations

### Cap
- No hard cap on damage bonus

## Lunar Eclipse (Shadow/Damage Reduction Side)

### Damage reduction
- Up to **75% damage reduction** (affects incoming damage)
- Hard cap at **90% damage reduction** (cannot exceed 90% damage reduction)

## Light vs Shadow Split

- **Tap** to activate Lunar Eclipse (damage reduction, shadow side)
- **Hold** to activate Solar Eclipse (damage bonus, light/sunlight side)
- Mutually exclusive—only one active at a time

---

**Status:** Current live PvE values cached. Note: Helminth subsume (for other Warframes) uses reduced values (2%/9%/15%/30% at ranks 0-3).
