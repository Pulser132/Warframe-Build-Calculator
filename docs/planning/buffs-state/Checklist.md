# Stage 5 — Combat State & Target — Checklist

> Expand to full task granularity before implementing (consider splitting
> state/buffs vs target/enemy). See `Plan.md`.

## State & buffs
- [ ] Generalized buff/state registry; Stage 1 seed migrated onto it
- [ ] Buff stacking / bucket rules encoded (wiki-sourced) (+ tests)
- [ ] Expandable combat-state config UI (toggles / stack steppers / sliders)
- [ ] `CombatState` is a first-class engine input (replaces Stage 1 stub)

## Target / enemy
- [ ] Health types + damage-type-vs-health/armor modifiers (+ tests vs wiki)
- [ ] Armor mitigation formula + armor strip (+ tests)
- [ ] Level scaling (health/armor/shield) + faction (+ tests)
- [ ] Effective damage / DPS / time-to-kill / EHP outputs + UI
- [ ] Target selector UI; effective-damage reference cases verified
