# Condition Overload Mod

**Source**: `node scripts/warframe-lookup.mjs --category Mods --exact "Condition Overload"` and https://wiki.warframe.com/w/Condition_Overload (2026-06-17)

## Stats

- **Max Rank**: 5
- **Max Rank Bonus**: +80% Melee Damage per unique Status Type affecting the target
- **Polarity**: Madurai
- **Rarity**: Rare

## Damage Calculation & Multiplier Bucket

Condition Overload stacks **additively** with other damage mods in the base damage multiplier bucket:

**Total Damage = Base Damage × [1 + Damage Mods + (Condition Overload Multiplier × n)] × (1 + Elemental Mods)**

where n = number of unique status effects (each worth +80% at max rank).

This means Condition Overload bonuses stack with mods like Pressure Point in the same damage multiplier bucket.

## Maximum Unique Status Types

While technically unlimited, practically capped at **16 unique statuses** because "Lifted and knockdown will cancel out each other" from the available status pool.

## Qualifying Status Types

All of the following count toward the bonus:

**Physical Types**
- Impact
- Puncture
- Slash

**Elemental Types**
- Cold
- Electricity
- Heat
- Toxin
- Blast
- Corrosive
- Gas
- Magnetic
- Radiation
- Viral
- Void
- Tau

**Special Types**
- Lifted (from Heavy Attacks)
- Microwave (from Nukor weapons—infinite duration)
- Knockdown (despite lacking a visible status indicator)

Status procs can originate from weapons, Warframe abilities, companions, or environmental sources.
