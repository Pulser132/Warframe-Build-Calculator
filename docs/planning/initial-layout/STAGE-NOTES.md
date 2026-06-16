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

---

# Stage 2 — what's implemented & what's still a seam

Stage 2 (`weapons-coverage/`) generalized the engine to **all primary & secondary
guns**. The Stage 1 bucket pipeline, attribution, capacity, and data flow are
unchanged underneath — the Vulkar Wraith DPS numbers are byte-identical (only the
physical-type *label* was corrected, see the data-quality note below).

## Now implemented

- **`FireMode`** (`engine/model/firemode.ts`) is the calculable unit. A weapon owns
  one or more; the pipeline runs on a mode, not on gun-level stats. Trigger and
  delivery are **data on the mode** (no per-mechanic subclasses): `trigger`
  (auto/semi/burst/charge/held), `components[]` (direct + radial for AoE), plus
  `burst`/`beam`/`chargeTime`/`falloff` specs.
- **`Secondary`** gear class + `createWeapon` branch; `Gun` now holds the shared
  firearm behavior and `fireModes`. `MultiMode` is implemented (`modeNames`,
  `isMultiMode`, `fireMode(name)`).
- **Trigger → effective fire rate** (`pipeline/triggers.ts`): auto/semi (10 rps
  cap, 0.05 floor), burst (`count/(1/FR+(count−1)·delay)`), charge
  (`1/(modChargeTime+1/modFR)`, bow variant, 10× cap). Folded into the existing
  `fireRate` chain stage so the Stage 1 chain shape is unchanged.
- **Beams**: held-continuous, tick rate = FR, 0.5 ammo/tick, **full** per-tick
  status × multishot (the legacy 0.6× is gone), peak DPS + ramp note. No new bucket.
- **Shotguns**: pellet count is the multishot vector (`basePellets×(1+Σms)`),
  per-pellet status/crit, `P(≥1)=1−(1−s)^N`, proc-type weighting. Per-pellet base
  damage = displayed total ÷ base pellet count.
- **AoE/falloff**: direct + radial components, linear falloff, center/rim pair in
  the result. Hitscan/projectile/aoe delivery carried as metadata (no Stage 2
  damage effect).
- **Multi-mode**: `calculateBuild` takes a `mode`; the store/UI expose a fire-mode
  switcher and attribution runs per mode.
- **Data pipeline**: `build-data.mjs` maps **every** Primary + Secondary gun
  generically (339 at time of writing), Incarnon alts dropped. Mods stay curated +
  hand-authored, now filtered to a weapon by `compat` group
  (`state/modCompat.ts`).

## Conventions / data-quality notes (honor these)

- **`@wfcd falloff.reduction` = remaining multiplier** at max distance (Vulkar 0.5,
  Vaykor 0.7333). The transform stores `maxReduction = 1 − reduction` (fraction
  removed); rim factor = `1 − maxReduction`. Tonkor radial: reduction 0.7 → rim ×0.7.
- **`@wfcd` slash/puncture are unreliable** in `attacks[].damage` and the
  `damagePerShot` *array* for some weapons (Vaykor Hek, Soma) — the explicit
  top-level `damage` **object** has unambiguous keys and is authoritative for a
  single normal component. AoE/multi-mode components must still read `attacks[]`
  (only source of the split). `damagePerShot` array order is **Impact, Slash,
  Puncture** (not I/P/S — Stage 1 had these swapped, harmless to its numbers).
- **Burst count/delay and beam ramp-start are not in the dump** → `BURST_META` /
  `BEAM_RAMP` tables in `build-data.mjs` (mechanics, not stats). Lanka has
  `fireRate 0`, so its charge recovery term is treated as 0 (acts bow-like).

## Still a seam (later stages)

- **Incarnon evolutions** are dropped from the mode list (base form only) — Stage 6
  implements them via the custom-effect registry / mode selection.
- **Projectile travel & self-stagger** are metadata only; they feed Stage 5 TTK.
- **Beam ramp-aware TTK** and the enemy/target model are Stage 5 (Stage 2 reports
  peak DPS + a ramp note).
- **Un-mappable guns** (chaining beams, status-ramp shotguns, grenade+cloud) are
  Stage 6 special cases — never hand-edited weapon data.
