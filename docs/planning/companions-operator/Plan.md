# Stage 7 — Companions & Operator (outline)

> Cross-cutting decisions live in `../Overview.md`. **Expand to full task
> granularity before implementing.**

**Depends on:** Stages 1–6 (gun/melee engine, buff registry, special-case framework).

## Goal

Complete the loadout: **companions** and the **operator/amp**, including their
mods, their own damage contributions, and the **buffs they grant the player**
(Goal.md: "Companions, Operator, etc. Anything that the player can modify in
game should be accounted for").

## Key deliverables

### Companions
- Companion types: **Sentinels** (+ sentinel weapons), **beasts** (Kubrow/Kavat),
  **MOA**, **Hounds**; their modding screens.
- **Companion weapons** reuse the gun engine from Stages 1–2.
- Companion mods, incl. **player-affecting buffs** (e.g. Smeeta Charm multiplier,
  Panzer Vulpaphyla viral) emitted into the Stage 5 buff registry.

### Operator / Amp
- **Amp** assembly (prism / scaffold / brace) modeled as a weapon via the gun
  engine; amp stats + arcanes.
- **Operator** arcanes and **focus-school** passives emitted as buffs.

## Architecture notes

- Maximize reuse: companion/amp weapons should be instances of existing gear
  classes, not new hierarchies.
- All player-affecting companion/operator effects are **buff-registry entries**,
  consistent with Stages 4–5 — no new cross-gear coupling.

## High-level tasks

- [ ] Companion gear types + modding UIs (sentinel/beast/MOA/hound).
- [ ] Companion weapons via the existing gun engine.
- [ ] Companion player-buffs → buff registry (+ tests).
- [ ] Amp assembly (prism/scaffold/brace) as a weapon + arcanes (+ tests).
- [ ] Operator arcanes + focus passives → buffs (+ tests).
- [ ] Verify a companion build and an amp build; verify a companion buff reaches
      weapon damage + attribution.

## Defer

- Deep AI/behavior modeling (not relevant to a damage calculator).
