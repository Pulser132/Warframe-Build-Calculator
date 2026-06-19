# Effective Target mechanics: shared routing helper + exact scale factor

## Status

accepted (vs-Target view — sidebar Target + Build/vs-Target toggle).

## Decision

When the damage view is evaluated **vs a Target**, every mechanic sub-readout
(AoE center/rim, AoE direct hit, beam per-tick, sustained heavy loop,
follow-through, combo string) is shown as a **genuinely effective** number — never
the intrinsic value under a vs-Target header. The effective values are produced by
a **hybrid** of two reuses of one routing core:

1. **One shared helper** — extract `routeToHealth(perType, scaled)` from
   `applyTarget` (faction modifier × armor mitigation, min-1-per-type floor,
   summed). This is the single source of truth for intrinsic-per-type → effective
   health-layer damage; `effectiveHitAverage` is just `routeToHealth(shot)`.
2. **Per-type routing where composition differs** — AoE and `components[]` carry
   their own per-type maps (`centerPerType`, `rimPerType`, `component.perType`), so
   they are routed through the helper directly (a Blast radial is modified
   differently than a Slash direct hit).
3. **Exact scale where composition matches** — beam/heavy/follow-through/combo
   string are the same weapon damage × a multiplier, so their type *composition*
   equals the main hit's. Routing is linear per type (armor mitigation is a scalar,
   faction modifier is per-type), so their effective value is
   `intrinsic × effectiveScale`, where `effectiveScale = effectiveHitAverage /
   avgHitPerShot`. This is **mathematically exact**, not an approximation — the
   only deviation is the min-1-per-type floor, which never binds at realistic
   damage. (Beam per-tick = `effectiveHitAverage` directly.)

The effective figures are added to `TargetResult` (incl. a new `effectiveBurstDps`,
the burst twin of `effectiveDps`) and surfaced to the UI as an **effective
projection** — an intrinsic `DamageResult` with its target-dependent fields
overridden — so the **same `DamageSummary` component** renders both the Build and
vs-Target views. See `docs/planning/vsTgt/Plan.md`.

## Why

The view requirement is that flipping the Build ↔ vs-Target toggle changes only the
*numbers*, not the layout (the effective summary must be identical to the intrinsic
one), and that as much code as possible is reused on both the engine and front-end
side. Routing per-type for mechanics whose composition is identical to the main hit
would add a per-type map to four result shapes and four pipeline sites for **zero
numerical difference** — pure plumbing. Routing AoE/components per-type is, by
contrast, *necessary* for correctness because their composition genuinely differs.
The hybrid puts per-type routing exactly where it changes the answer and the exact
scale everywhere else, on top of a single extracted helper.

## Considered options

- **Show intrinsic figures / hide the mech panels in vs-Target mode** — rejected:
  the explicit requirement is *correct* effective values, not intrinsic numbers
  under a vs-Target header.
- **Full per-type routing everywhere** — rejected: add a per-type map to
  `BeamResult` / `HeavyLoopResultRef` / `FollowThroughResult` /
  `ComboStringResultRef` and route each through the helper. Maximally uniform, but
  provably identical numbers to the scale factor for those mechanics — more code,
  no behavioural difference.
- **Approximate everything with one aggregate scale** — rejected: it would be
  *wrong* for AoE/components, whose radial damage type differs from the direct hit.

## Consequences

- `applyTarget` is refactored to call the extracted `routeToHealth` helper;
  `effectiveHitAverage`/`effectiveDps` are unchanged in value.
- `TargetResult` grows `effectiveBurstDps` and effective mech sub-results
  (effective `aoe` / `beam` / `followThrough` / `heavyLoop` / `comboString` /
  `components`).
- The front end builds a synthetic **effective projection** of `DamageResult`
  rather than a parallel effective-summary component; `DamageSummary` stays
  mode-agnostic. The bespoke headline/chips/tiers markup in `TargetPanel` is
  deleted.
- `effectiveScale` correctness rests on the composition-identity argument; a future
  mechanic whose composition diverges from the main hit must be routed per-type
  (like AoE), not scaled.
