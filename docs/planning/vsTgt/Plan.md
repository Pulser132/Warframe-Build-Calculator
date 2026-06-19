# vs-Target view — sidebar Target + Build/vs-Target toggle

> Cross-cutting decisions live in `../Overview.md`; domain terms in `/CONTEXT.md`.
> The effective-mechanics architecture has its own ADR
> (`docs/adr/0006-effective-target-mechanics.md`). This plan is the result of a
> grilling session (2026-06-19) and is expanded toward task granularity; the
> `Checklist.md` sibling holds the executable steps.

**Depends on:** Stage 5 (Combat State & Target — `applyTarget`, `TargetState`,
`TargetResult`, `useTargetResult`, the enemy dataset, `TargetPanel`).

## Goal

Restructure how the Target is presented. Today the results column has two tabs —
**Build** (intrinsic) and **vs Target** (effective) — and the whole Target lives in
the `vs Target` tab as one `TargetPanel` (controls **and** a bespoke effective
readout). Instead:

1. Move **all** Target controls to a panel in the **sidebar** (always visible).
2. Replace the tab strip with a single **"vs Target" toggle** in the results
   header (off = Build/intrinsic, on = effective).
3. Make the vs-Target summary **identical in layout** to the intrinsic
   `DamageSummary`, reusing the same component fed effective numbers — including
   **correct** effective values for every mechanic sub-panel.

Guiding constraint (user): **reuse as much code as possible**, front end and engine.

---

## Decisions (this grilling, 2026-06-19)

1. **Toggle = swap the readout.** The toggle chooses which readout the main column
   renders; it does not merge panels or stack them. Off → intrinsic panels; on →
   effective panels. Functionally the old two tabs, driven by a toggle.
2. **Toggle lives in the results header** (where the tab strip was), as a single
   on/off switch labelled **"vs Target"** (off = Build). It is **independent** of
   the sidebar — the Target config is always visible regardless of toggle state.
3. **All Target controls move to the sidebar**, in a new **`Target`** panel:
   the featured presets (wrapping to a 2-col grid at 320px), enemy dropdown, level,
   armor strip, faction override, Steel Path, Eximus/Overguard, and the custom
   stat block. Sidebar order: **Combat State, then Target** (easily swappable).
4. **vs-Target summary = identical layout to the intrinsic summary.** The same
   `DamageSummary` renders both views. Summary heading stays **"Damage"** in both;
   the toggle supplies the "effective" context.
5. **Target-only readouts append below the summary.** TTK, enemy EHP
   (overguard/shield/health/net-armor/total), and status application have no
   intrinsic counterpart; they render as a small **`TargetExtras`** block beneath
   the effective summary, **only** in vs-Target mode.
6. **Effective Burst DPS is a first-class engine field.** Add `effectiveBurstDps`
   to `TargetResult` (the burst twin of `effectiveDps`); the headline keeps its
   three slots [Burst · Sustained · Avg Hit] populated in both modes.
7. **Secondary panels are the same in both modes.** `FramePanel` and
   `PipelineChain` render in Build and vs-Target alike; only the summary and the
   `ContributionList` swap to effective. vs-Target column order: **effective
   `DamageSummary` → `TargetExtras` → `FramePanel` → `PipelineChain` → vs-target
   `ContributionList`**.
8. **Naming: "Target" everywhere.** Matches the `CONTEXT.md` canonical term
   (`Enemy` is only an alias; `enemy state`/`mob` are on the avoid-list). **No
   glossary change required** — `Intrinsic Damage` and `Effective Damage` already
   exist as terms.
9. **Maximal reuse via an effective projection.** The front end builds a synthetic
   `DamageResult` — `{ ...intrinsic, burstDps, sustainedDps, avgHitPerShot,
   perType, perPelletAverage, aoe, beam, followThrough, heavyLoop, comboString,
   components }` overridden with effective values — and passes it to the **same**
   `DamageSummary`. `TargetPanel`'s bespoke headline/chips/tiers markup is deleted.
10. **Correct effective mechanics via the hybrid (ADR-0006).** Extract one
    `routeToHealth` helper from `applyTarget`; route AoE/components **per-type**
    (their composition differs); apply the **exact** `effectiveScale`
    (= `effectiveHitAverage / avgHitPerShot`) to beam/heavy/follow-through/combo
    string (their composition equals the main hit, so scaling is exact). No
    "intrinsic numbers under a vs-Target header."
11. **Toggle state is ephemeral.** Local React state (like the current `tab`),
    default **Build**. `src/share/index.ts` is a Stage-8 placeholder; whether the
    view is shareable is decided when share lands.

---

## Engine / architecture notes

- **`routeToHealth(perType, scaled)`** (extract from `applyTarget`): the per-type
  health-layer routing (faction modifier × armor mitigation, min-1 floor, summed)
  as a pure helper. `applyTarget`'s existing `effectiveHitAverage`/`effectiveDps`
  must come out **byte-identical** after the extraction (characterization test).
- **`effectiveBurstDps`**: mirror the `effectiveRate`/`effectiveDps` lines —
  `effectiveBurstDps = effectiveHitAverage × (burstDps / avgHitPerShot)`
  (equivalently `effectiveDps × burstDps / sustainedDps`), guarding div-by-zero.
- **`effectiveScale`** = `effectiveHitAverage / avgHitPerShot` (0 when
  `avgHitPerShot === 0`). Exact for same-composition mechanics; see ADR-0006.
- **Effective mech sub-results on `TargetResult`** (only when the intrinsic result
  has the corresponding field):
  - `aoe`: `centerAverage = routeToHealth(centerPerType)`,
    `rimAverage = routeToHealth(rimPerType)`; `centerPerType`/`rimPerType` re-routed
    per type; `radius`/`falloffStart` unchanged.
  - `components[]`: each `perType` → `routeToHealth`; `rimPerPelletAverage` scaled
    by the component's own ratio; `forcedProcs`/`role`/`delivery` unchanged.
  - `beam`: `perTickDamage = effectiveHitAverage`; `tickRate`/ramp unchanged;
    `procsPerSecond` already in `statusApplication`.
  - `heavyLoop`: `sustainedDps`/`normalHit`/`heavyHit` × `effectiveScale`;
    `comboConsumed`/`rebuildHits`/`loopSeconds` unchanged. `comboMultiplier`/
    `comboCount` are target-independent (no change).
  - `followThrough`: `singleTarget`/`total`/`perTarget[]` × `effectiveScale`;
    `factor`/`targetCount` unchanged.
  - `comboString`: `totalDamage`/`averagePerHit`/`dps`/`perHit[]` × `effectiveScale`;
    `hitCount`/`forcedProcs`/`durationSeconds` unchanged. (Forced-proc status DoT
    stays deferred, consistent with TTK excluding DoT.)
- **`crit tiers`** in the effective view: `critTiers` reads `perPelletAverage` off
  the result, so the projection must set `perPelletAverage = effectiveHitAverage /
  multishot` for the shared `DamageSummary` call to produce effective tiers.

## UI

- **`App.tsx`**: replace the `tab` tablist with a single toggle in the results
  header; render the build readout or the effective readout from the toggle; the
  sidebar holds `ConfigMenu` + the new Target panel.
- **Split `TargetPanel`** into:
  - **`TargetControls`** (sidebar) — presets + the six controls + custom block;
    uses store actions/state only (no result). Heading **"Target"**.
  - **`TargetExtras`** (main column, vs-Target only) — TTK / enemy EHP / status
    application, salvaged from the current `TargetPanel` readout markup.
  - The bespoke effective headline/chips/tiers markup is **removed** (DamageSummary
    reuse replaces it).
- **Effective projection** built in the vs-Target branch (or a small
  `useEffectiveResult` selector wrapping `useTargetResult`) and passed to
  `DamageSummary` + the effective `ContributionList`.
- **CSS**: results header switch styling (replacing `.tabs`/`.tab`); sidebar Target
  panel; preset 2-col wrap at 320px. Both sidebar panels stack in the sticky
  sidebar — consider each being independently collapsible (polish).

## Tests

- Characterization: `applyTarget` output unchanged after `routeToHealth` extraction.
- `effectiveBurstDps`: equals `effectiveDps × burstDps / sustainedDps`; div-by-zero
  guarded.
- Effective mech values: AoE center/rim routed per-type (Blast-radial vs Slash-
  direct case); `effectiveScale` path equals per-type routing for an identical-
  composition fixture (proves the exactness claim); beam per-tick = effective hit.
- UI: toggle swaps readout; Target controls render in the sidebar; effective
  summary uses the same `DamageSummary`; `TargetExtras` only in vs-Target mode.

---

## Defer (out of scope)

- Shareability of the toggle / Target view → Stage 8 (share/persist).
- Status-DoT in TTK and in effective combo-string forced procs (already deferred).
- Effective per-layer (shield/overguard) magnitudes for mech panels — the panels
  mirror `effectiveHitAverage` (health-layer), matching the existing convention.
- Sidebar-panel collapsibility (polish, not required for the change).
