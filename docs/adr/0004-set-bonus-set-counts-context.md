# Model set bonuses via a `setCounts` tally in the effect context

## Status

accepted (Stage 4 — Warframe Modding). Amends ADR 0002 (custom-effect registry).

## Decision

Set-bonus mods (the **Umbral** set is the validation case) are modeled through the
**custom-effect registry**, exactly as ADR 0002 anticipated ("set bonuses" are named
there). To let a registry function know how much of its set is equipped — which it
cannot derive from `{ rank, maxRank, combat }` alone — the effect context is
extended with a **precomputed set tally**:

```
ctx.setCounts: Record<string, number>   // e.g. { umbral: 3 }
```

`setCounts` is computed **once per resolve** by counting equipped members per `set`
id (mods gain an authored `set` field). A set-bonus function reads
`ctx.setCounts['umbral']` and returns its base stat **plus** the count-appropriate
bonus — staying pure, never re-scanning the loadout. The **same registry** is shared
by the weapon `gather` stage and the new Warframe stat resolver (both call
`CUSTOM_EFFECTS[id](ctx)` with the extended ctx).

Set membership is counted **per compartment** (Umbral is frame-only). Cross-gear
sets (mods that tally across multiple gear) are **deferred**.

## Why

Umbral mods give a base stat *plus* a set bonus that grows with the number of
equipped set members — a dependency on the rest of the loadout that `perStack` /
`condition` descriptors cannot express, and which the ADR 0002 ctx deliberately did
not expose. A single precomputed tally is the smallest extension that unlocks it
while keeping functions pure and the contract ("return final, self-scaled effects")
intact. Computing the tally once avoids every set function re-scanning the build.

## Considered options

- **A dedicated `SetBonusDescriptor` type the resolver special-cases** — rejected:
  adds a second special-case mechanism alongside the registry that ADR 0002 already
  designated for exactly this; set bonuses then live outside the registry the rest of
  the hard mods use.
- **Two-pass `gather` that injects per-source counts** — rejected: more invasive to
  the pipeline than a one-shot tally on the ctx, for no added expressiveness.
- **Give functions the full equipped loadout** — rejected: leaks far more than
  needed, invites functions to recompute tallies inconsistently, and couples the
  registry to the `Build` shape.

## Consequences

- The ADR 0002 ctx contract grows a `setCounts` field; the registry is now invoked
  from two places (weapon gather + frame resolver) and both must build the same ctx.
- Mods carry an authored `set` id; the tally is derived from equipped slots.
- Cross-gear set bonuses remain unmodeled — a known limitation to revisit when a
  multi-gear set is implemented.
