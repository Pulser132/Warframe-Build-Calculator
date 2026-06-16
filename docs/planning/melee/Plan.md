# Stage 3 — Melee (outline)

> Cross-cutting decisions live in `../Overview.md`. **Expand to full task
> granularity before implementing.**

**Depends on:** Stages 1–2 (engine, gear hierarchy, modding UI).

## Goal

Add **melee weapons** with their distinct mechanics, completing the player's
hand-weapon coverage.

## Key deliverables

- `Melee` gear class (sibling of `Gun` under `Weapon`).
- **Combo counter**: combo multiplier scaling with hit count; combo duration/decay.
- **Heavy attacks**: combo consumption, heavy-attack efficiency, wind-up.
- **Stance** slot + stance mods; **follow-through** (multi-target damage reduction);
  **range** and **attack speed** mechanics.
- Melee **mod set** incl. the important conditional/stacking specials:
  **Condition Overload** (damage scales with active status types on target),
  **Blood Rush** (crit scales with combo), **Weeping Wounds** (status scales with
  combo). These exercise the conditional/stacking-effect machinery.
- Slam attacks / initial vs follow-up hits modeled (depth as wiki dictates).

## Architecture notes

- Combo and heavy-attack state are **combat-state inputs** (foreshadows Stage 5);
  model them as engine inputs now, surfaced in config later.
- Condition Overload / Blood Rush / Weeping Wounds validate that the data-driven
  conditional-effect registry from Stage 1 is sufficient — extend if not.

## High-level tasks

- [ ] `Melee` class + interfaces; verify melee formula vs wiki.
- [ ] Combo counter (multiplier, duration, decay) + tests.
- [ ] Heavy attacks (consumption, efficiency, wind-up) + tests.
- [ ] Stance slot, follow-through, range, attack speed.
- [ ] Conditional/combo-scaling mods (Condition Overload / Blood Rush / Weeping
      Wounds) + tests.
- [ ] Melee modding UI (stance slot, melee mod set).
- [ ] Verify reference builds (a combo/crit build and a heavy-attack build).

## Defer

- Exalted/pseudo-exalted melee weapons tied to frames (revisit in Stage 4/6).
- Riven/incarnon melee specifics (Stage 6).
