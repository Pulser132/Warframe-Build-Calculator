# Stage 1 — seams, assumptions & notes for Stage 2+

What Stage 1 deliberately left as a seam, and the assumptions later stages must
honor. Keep this in sync as the foundation evolves.

## Seams already in place (designed, not yet implemented)

- **Gear hierarchy.** `Weapon → Gun → Primary` with capability interfaces
  `HasCrit`, `HasStatus`, `MultiMode`, `HasIncarnon` (`src/engine/gear`). Only
  `Primary` is concrete. Stage 2 adds `Secondary`; `createWeapon` (factory) is the
  single branch point. Melee (Stage 3) will likely add a sibling under `Weapon`.
- **`MultiMode` / `HasIncarnon`** interfaces exist but are unimplemented. Stage 2
  (multi-mode guns) and Stage 6 (incarnon) implement them; the pipeline currently
  computes a single fire mode.
- **Custom-effect registry** (`engine/model/registry.ts`, `CUSTOM_EFFECTS`) is the
  hook for special-case mods (Condition Overload, set bonuses) — add a data entry
  + a small function, no pipeline/UI rewrite.
- **Buff registry** (`engine/buffs.ts`) is data-driven: a new buff is one entry,
  rendered automatically by `ConfigMenu`. Stage 4 (Warframe abilities → Roar-style
  buffs) and Stage 5 (combat state) extend it.
- **Attribution interface** (`AttributionStrategy`) — `leaveOneOut` is the default;
  Shapley / ordered / multiplier-chain can be added without touching callers.

## Assumptions Stage 2+ must honor

- **Bucket model is the contract.** Members of a bucket add; buckets multiply.
  Every modifier is an `EffectDescriptor` declaring its bucket. Faction (Bane,
  Roar) and `directDamage` (arcanes) are **separate conditional multipliers**.
- **Engine purity.** Nothing in `src/engine` may import React, the store, or the
  DOM (ESLint-enforced). The store resolves a `Build` into engine inputs
  (`state/resolve.ts`); the engine never reads the data loaders or the store.
- **Rank scaling** is linear: value at rank r = `value_max × (r+1)/(maxRank+1)`.
  Authored descriptors store the **max-rank** value.
- **Data flow.** Stats come from `@wfcd/items` via `scripts/build-data.mjs` →
  `src/data/generated/`; effect descriptors + slot kinds are authored in
  `src/data/mods/descriptors.ts`. The dependency direction is `data → engine`.

## Known simplifications (revisit later)

- **No enemy/target model.** Conditional mods are toggles; armor / health type /
  level scaling / faction-vs-damage-type tables arrive in **Stage 5**.
- **Aura slot on a weapon.** Goal.md's Warframe-style layout (aura + exilus + 8 +
  2 arcanes) is applied to the rifle as the slice's chosen layout, even though a
  gun has no aura slot in-game. Warframe modding (Stage 4) uses the real aura slot.
- **Polarity mismatch penalty.** Removed in live Warframe; capacity logic models
  matching-halves and aura-grants only (`state/capacity.ts`).
- **Single fire mode, hitscan only.** Projectile travel, AoE/falloff, trigger
  types, and multi-mode are Stage 2.
