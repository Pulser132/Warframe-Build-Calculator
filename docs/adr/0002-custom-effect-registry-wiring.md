# Wire the custom-effect registry in Stage 3, with a "final, self-scaled" contract

## Status

accepted (Stage 3 — Melee)

## Decision

Stage 3 wires the custom-effect registry (`CUSTOM_EFFECTS`) end-to-end: `ModData`
gains an optional `customEffectId`, and the `gather` stage, when a source declares
one, calls `CUSTOM_EFFECTS[id](ctx)` to obtain its effects. Condition Overload,
Blood Rush, and Weeping Wounds are implemented as registry functions.

**Contract:** a registry function reads `{ rank, maxRank, combat }` from its
context and returns **already-computed, rank-scaled** `EffectDescriptor`s. `gather`
folds these outputs into the bucket sums **without** re-applying `rankFactor` or
`perStack`.

## Why

These three mods could be expressed with the existing `perStack` + `condition`
descriptors (e.g. Blood Rush = `+0.4 × combo:tier` in the `critChance` bucket). We
deliberately route them through the registry anyway to **battle-test the seam**
before genuinely hard mods arrive in later stages (Galvanized stacking, set
bonuses, mods whose scaling is non-linear or derived from other computed stats) —
exactly the cases `perStack` cannot express. The "return final, self-scaled
effects" contract is what gives functions that flexibility; if `gather` re-scaled
their output, a function could do nothing `perStack` couldn't.

## Considered options

- **`perStack` descriptors, registry left an unused seam** — rejected: the registry
  stays unproven until a hard mod forces it, and the first such mod then debugs the
  seam and itself simultaneously.
- **Wire the registry, functions return max-rank descriptors that `gather` scales**
  — rejected: limits functions to what `perStack`/`condition` already do, defeating
  the purpose.

## Consequences

- Each registry function owns its rank scaling (and must not forget it); covered by
  unit tests asserting rank-scaled values.
- Custom-effect outputs bypass the standard rank/stack scaling path — a divergence
  a reader must know about when tracing the pipeline.
