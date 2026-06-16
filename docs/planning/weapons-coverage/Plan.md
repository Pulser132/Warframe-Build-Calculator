# Stage 2 — All Gun Types (outline)

> Cross-cutting decisions live in `../Overview.md`. **Expand this outline to full
> task granularity (like Stage 1's Plan.md) immediately before implementing**,
> using what Stage 1 actually established.

**Depends on:** Stage 1 (engine, gear hierarchy, modding UI, data pipeline).

## Goal

Generalize the single-rifle slice into **all primary and secondary firearms**,
proving the inheritance/interface design (Goal.md: "use inheritance and
interfaces to make development more modular").

## Key deliverables

- `Secondary` gear class alongside `Primary`; shared behavior pulled up into `Gun`.
- **Trigger types**: auto, semi-auto, burst, charge, held-continuous (beam).
- **Projectile vs hitscan** handling; **AoE + falloff** (radius, min/max falloff).
- **Beam weapons**: damage-per-tick model, beam "multishot" semantics, the reduced
  (0.6×) status-per-tick rule — verify vs wiki.
- **Shotguns**: pellet-based multishot and the **per-pellet status** mechanic
  (distinct from rifles) — verify vs wiki.
- **Multi-mode weapons** via the `MultiMode` interface (e.g. alt-fire, or
  Torid-style grenade + lingering cloud): per-mode stats, mods, and results, with
  UI mode switching.
- Secondary/shotgun/rifle **mod sets** added to the data pipeline + effect map.

## Architecture notes

- Push trigger/fire-mode and ammo/reload behavior into strategy objects or
  interface methods so weapon classes stay thin.
- Each fire mode is a calculable unit producing its own `DamageResult`; the UI
  aggregates/toggles modes.
- Confirm the Stage 1 bucket model survives beams/shotguns; extend buckets only
  where the wiki demands (e.g. beam status multiplier).

## High-level tasks

- [ ] Extract shared gun behavior into `Gun`; add `Secondary`.
- [ ] Implement trigger-type models (auto/semi/burst/charge/beam) + tests.
- [ ] Implement projectile/hitscan + AoE falloff + tests.
- [ ] Implement beam mechanics (per-tick dmg/status) + tests vs wiki.
- [ ] Implement shotgun per-pellet status + multishot + tests vs wiki.
- [ ] Implement `MultiMode` weapons + per-mode UI switching.
- [ ] Extend data pipeline + mod map for secondary/shotgun mod sets.
- [ ] Verify several reference builds (a shotgun, a beam, a secondary, a multi-mode).

## Defer

- Incarnon, riven, and per-weapon special cases (Stage 6).
- Enemy-specific effective damage (Stage 5).
