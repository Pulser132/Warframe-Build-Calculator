# Make `Build` a container of gear compartments

## Status

accepted (Stage 4 — Warframe Modding)

## Decision

`Build` stops being a single weapon. It becomes a container of **gear
compartments**, each a generic `GearBuild = { itemId, slots, reactor,
baseCapacity }`:

```
Build = { weapon: GearBuild, warframe: GearBuild | null, /* future: companion, operator */ }
```

`CombatState` stays **top-level and shared** across compartments (it is the cross-
gear surface where a frame's Emitted Buff meets the weapon calc). The Zustand store
gains compartment-scoped mutations (assign/clear/rank/polarity addressed by
compartment + slot index), and a single "active compartment" for the modding
screen. The slot/modding primitives (`SlotState`, `slotRules`, `capacity.ts`, the
mod-card UI) are reused unchanged; what differs per compartment is the **slot
layout** and the **mod pool**.

## Why

Stage 4 introduces a Warframe — a second, independently-modded piece of gear whose
abilities feed weapon damage. The single-`weaponId` model cannot express two modded
loadouts at once, and Stages 7–8 add still more (companions, operator/amp). Modeling
gear as uniform compartments means each new gear type is *data + a layout*, not a
store rewrite, and serialization (Stage 8) serializes a list of compartments rather
than special-casing each.

## Considered options

- **Two independent top-level builds** (`weaponBuild`, `warframeBuild`) — rejected:
  duplicates every store action and does not generalize to companions/operator;
  Stage 7 would refactor it again.
- **Keep `Build` weapon-only; add a separate warframe slice beside it** — rejected:
  minimal blast radius now, but the same Stage 7 refactor looms and the two slices
  drift apart.

## Consequences

- `Build`, `EMPTY_BUILD`, `makeInitialBuild`, and the store actions become
  compartment-addressed; existing single-weapon call sites are migrated.
- A Warframe may be **absent** (`warframe: null`) — the engine and UI handle the
  empty compartment.
- Mod compatibility must become **gear-type aware** (a mod fits only its
  compartment's pool) — see the `'warframe'` mod group added this stage.
- Sets up, but does not yet add, the companion/operator compartments (Stage 7) and
  the multi-compartment share code (Stage 8).
