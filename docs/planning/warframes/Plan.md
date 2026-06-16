# Stage 4 — Warframe Modding (outline)

> Cross-cutting decisions live in `../Overview.md`. **Expand to full task
> granularity before implementing.**

**Depends on:** Stages 1–3. Produces **buff outputs** consumed by Stage 5.

## Goal

Add the **Warframe** itself: its modding screen, stats, abilities, and — crucially
— the **ability-driven buffs that modify weapon damage** (e.g. Roar), whose
magnitude depends on ability strength.

## Key deliverables

- `Warframe` gear type with the in-game modding layout: **aura + exilus + 8 mod
  slots + arcanes**.
- Warframe **stats**: health, shield, armor, energy, sprint speed, and the ability
  attributes **strength / duration / range / efficiency**.
- Warframe **mod set**: Intensify, Streamline, etc.; **set-bonus mods** (e.g.
  Umbral) as a special case validating the set-bonus machinery.
- **Ability modeling**: ability stats scaling with strength/duration/range; for
  damage abilities, how they scale (ability-strength vs weapon-damage based).
- **Buff outputs**: abilities like **Roar** emit a buff (magnitude from ability
  strength) into the buff registry for Stage 5 to apply to weapon damage. This is
  the key cross-gear link Goal.md calls out.
- **EHP** computation (health + shield + armor → effective HP).

## Architecture notes

- The frame's ability buffs are produced as **data** (buff registry entries with
  strength-derived magnitude), keeping the weapon engine decoupled from frames.
- Reuse the slot/modding UI primitives; the layout differs (no weapon firing stats).

## High-level tasks

- [ ] `Warframe` type + stats; verify ability-stat scaling vs wiki.
- [ ] Warframe modding UI (aura/exilus/8/arcanes) + frame mod set.
- [ ] Set-bonus mods (Umbral) special case + tests.
- [ ] Ability modeling (strength/duration/range/efficiency) + tests.
- [ ] Buff-output emission (e.g. Roar → registry) + tests.
- [ ] EHP calculation + display.
- [ ] Verify a reference frame build (stats + a damage-buff magnitude).

## Defer

- Applying frame buffs to weapons end-to-end UI (wired fully in Stage 5).
- Exalted weapons & augment-heavy special cases (Stage 6).
