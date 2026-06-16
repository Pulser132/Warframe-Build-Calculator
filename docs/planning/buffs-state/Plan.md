# Stage 5 — Combat State & Target (outline)

> Cross-cutting decisions live in `../Overview.md`. **Expand to full task
> granularity before implementing.** This is a large stage — consider splitting
> the expanded plan into "state/buffs" and "target/enemy" sub-phases.

**Depends on:** Stages 1–4 (engine, buff registry seed, frame buff outputs).

## Goal

Two linked systems Goal.md explicitly calls for:
1. The **expandable configuration menu** for player/weapon state (full version of
   the Stage 1 seed) — "Make sure this is easily expandable."
2. The **configurable enemy/target model** (deferred from Stages 1–4) that turns
   intrinsic damage into **effective damage / time-to-kill**.

## Key deliverables

### Combat-state & buffs
- A generalized, data-driven **buff/state registry**: external buffs (Roar,
  Eclipse, squad/arcane buffs), **stackable buffs** (configurable stack counts —
  e.g. Galvanized mod stacks, combo, weapon-specific buff stacks), and conditional
  states. New buffs must be addable as a **registry entry only**.
- **Buff stacking rules** — which buffs are additive within a bucket vs a separate
  multiplier (Roar's interaction is the canonical case). **Source from the wiki**
  and encode in the bucket taxonomy.
- Configuration UI: grouped, searchable, expandable controls (toggles, stack
  steppers, strength sliders) that flow into the engine and attribution.

### Target / enemy model
- **Health types** (Flesh, Ferrite/Alloy armor, Shield, Cloned Flesh, Robotic,
  Infested, etc.) and **damage-type vs health/armor modifiers** — verify vs wiki.
- **Armor** value + **armor mitigation** formula; **armor strip** interactions.
- **Level scaling** for health/armor/shield (current scaling formulas) + faction.
- Outputs: effective damage per hit, effective DPS, **time-to-kill**, EHP; status
  application vs the target.
- **Target selector UI** (faction/type/level) feeding the engine.

## Architecture notes

- Combat state (combo, heavy state, buff stacks, incarnon-form flag) becomes a
  first-class `CombatState` input to `calculateBuild`, replacing the Stage 1 toggle
  stub.
- The enemy model is a post-intrinsic stage in the pipeline (intrinsic → vs-target)
  so Stages 1–4 numbers remain valid as the "intrinsic" view.

## High-level tasks

- [ ] Generalize buff/state registry; migrate the Stage 1 seed onto it.
- [ ] Encode buff stacking/bucket rules (wiki-sourced) + tests.
- [ ] Build the expandable combat-state config UI.
- [ ] Implement health types + damage-type modifiers (+ tests vs wiki).
- [ ] Implement armor mitigation + armor strip (+ tests).
- [ ] Implement level scaling + faction (+ tests).
- [ ] Effective damage / DPS / time-to-kill / EHP outputs + UI.
- [ ] Target selector UI; verify effective-damage reference cases.

## Defer

- Incarnon-form stat changes are toggled here but defined in Stage 6.
- Companion/operator buffs feed this registry in Stage 7.
