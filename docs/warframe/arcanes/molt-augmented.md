# Molt Augmented

**Source:** `@wfcd` lookup — `node scripts/warframe-lookup.mjs --category Arcanes "Molt Augmented"`

## Stats (max rank 5)

- **Effect:** On Kill: **+0.24% Ability Strength per stack**, stacks up to **250×**
  → **+60% Ability Strength** at full stacks.
- **Max rank:** 5
- **uniqueName:** `/Lotus/Upgrades/CosmeticEnhancers/Offensive/PowerStrengthOnKill`

## Engine modeling (Stage 4)

A **frame arcane** (occupies a Warframe arcane slot). Modeled as a **per-stack**
frame-stat effect, with the stack count driven by combat state — exactly like the
weapon arcanes' per-stack damage (Primary Merciless):

```
frameEffects: [{ stat: 'abilityStrength', value: 0.0024, perStack: true,
                 maxStacks: 250, condition: 'arcane:molt-augmented' }]
```

The resolver multiplies `value × rankFactor × min(stacks, 250)`. The ConfigMenu
discovers the per-stack frame arcane and renders a stack slider
(`arcane:molt-augmented`); `useWarframeStats` recomputes on combat-state change.

At 0 stacks it contributes nothing; at 250 stacks it adds +60% Ability Strength,
which flows into the emitted Roar magnitude (0.5 × Strength).
