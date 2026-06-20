# vs-Target view — Checklist

> Full task granularity. See `Plan.md` for rationale, `../Overview.md` /
> `/CONTEXT.md` for cross-cutting decisions and terms, and
> `docs/adr/0006-effective-target-mechanics.md` for the effective-mechanics
> architecture. Tests-first for all engine math.

## A. Engine — routing helper & effective scalars

- [x] Extract `routeToHealth(perType, scaled)` from `applyTarget` (faction × armor
      × min-1 floor, summed); `applyTarget` calls it. Characterization test:
      `effectiveHitAverage`/`effectiveDps`/`ttkSeconds`/`enemyEhp` unchanged.
- [x] Add `effectiveBurstDps` to `TargetResult`
      (`= effectiveHitAverage × burstDps / avgHitPerShot`, div-by-zero guarded) + test
      (`effectiveBurstDps / effectiveDps === burstDps / sustainedDps`).
- [x] Compute `effectiveScale = effectiveHitAverage / avgHitPerShot` (0-guarded);
      test it equals per-type routing for an identical-composition fixture.

## B. Engine — effective mechanic sub-results on `TargetResult`

- [x] `aoe` (when intrinsic has it): `centerAverage`/`rimAverage` +
      `centerPerType`/`rimPerType` via `routeToHealth`; radius/falloff unchanged +
      test (Blast radial vs Slash direct → different modifiers).
- [x] `components[]`: each `perType` → `routeToHealth`; `rimPerPelletAverage`
      scaled; role/delivery/forcedProcs unchanged.
- [x] `beam`: `perTickDamage = effectiveHitAverage`; tickRate/ramp unchanged.
- [x] `heavyLoop`: `sustainedDps`/`normalHit`/`heavyHit` × `effectiveScale`.
- [x] `followThrough`: `singleTarget`/`total`/`perTarget[]` × `effectiveScale`.
- [x] `comboString`: `totalDamage`/`averagePerHit`/`dps`/`perHit[]` × `effectiveScale`
      (forced-proc DoT stays deferred).

## C. Front end — effective projection

- [x] Build the effective projection (selector or inline): spread intrinsic,
      override `burstDps`/`sustainedDps`/`avgHitPerShot`/`perType`/`perPelletAverage`
      (= `effectiveHitAverage / multishot`) + effective `aoe`/`beam`/`followThrough`/
      `heavyLoop`/`comboString`/`components`.
- [x] Verify the shared `DamageSummary` renders effective crit tiers from the
      projected `perPelletAverage`.

## D. Front end — layout

- [x] `App.tsx`: replace the `tab` tablist with a single **"vs Target"** toggle in
      the results header (off = Build); render build vs effective readout from it.
- [x] vs-Target column order: effective `DamageSummary` → `TargetExtras` →
      `FramePanel` → `PipelineChain` → vs-target `ContributionList`.
- [x] Build column unchanged (intrinsic `DamageSummary` + `FramePanel` +
      `PipelineChain` + intrinsic `ContributionList`).
- [x] Toggle is local state, default Build; aria roles updated (switch, not tablist).

## E. Front end — split `TargetPanel`

- [x] `TargetControls` (sidebar): presets + enemy/level/armor-strip/faction/
      Steel Path/Overguard + custom block; store actions/state only; heading "Target".
- [x] `TargetExtras` (main, vs-Target only): TTK / enemy EHP / status application,
      salvaged from the current readout markup.
- [x] Delete `TargetPanel`'s bespoke headline/chips/tiers markup (replaced by
      `DamageSummary` reuse); update `@ui` exports + tests.
- [x] Sidebar renders `ConfigMenu` then `TargetControls`.

## F. CSS

- [x] Results-header switch styling (replace `.tabs`/`.tab`/`.tabActive`).
- [x] Sidebar Target panel; presets wrap to 2 columns at 320px.
- [x] Responsive (<920px): sidebar collapses below main, toggle stays in header.

## G. Tests & verification

- [x] Update/port `TargetPanel.test.tsx` → `TargetControls` + `TargetExtras` tests.
- [x] App test: toggle swaps readout; effective summary uses `DamageSummary`;
      `TargetExtras` only when on.
- [x] Manual: vs-Target mech panels show effective (not intrinsic) numbers; AoE
      center differs correctly from the Build view.

## Deferred (tracked, not this change)

- [ ] Shareability of the toggle / Target view → Stage 8.
- [ ] Per-layer (shield/overguard) effective magnitudes for mech panels.
- [ ] Sidebar-panel collapsibility (polish).
