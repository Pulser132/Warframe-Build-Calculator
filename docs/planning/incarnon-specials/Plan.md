# Stage 6 — Incarnon & Special Cases (outline)

> Cross-cutting decisions live in `../Overview.md`. **Expand to full task
> granularity before implementing.**

**Depends on:** Stages 1–5. Validates the extension points designed throughout.

## Goal

Deliver the **special-case framework** Goal.md repeatedly asks for — "Some
weapons/mods may have special cases ... ensure this is easy to implement later ...
They may also need special UI elements ... on a case-by-case basis" — and use it
to implement **incarnon** weapons, **rivens**, and other notable exceptions.

## Key deliverables

- A **per-item special-case mechanism**: a registry where a specific weapon/mod can
  (a) override or insert pipeline behavior / custom buckets, and (b) contribute
  **custom UI controls** — without forking core code.
- **Incarnon Genesis**: incarnon-form toggle that swaps base stats; **evolution
  selection** (EVO 2/3/4 perks) modeled as selectable effect descriptors;
  incarnon-specific buffs (ties into Stage 5 combat state). Reference: the cached
  `docs/warframe/weapons/torid.md` (modes + incarnon + evolutions).
- **Riven mods**: a special mod type with user-entered stats + disposition scaling
  and a bespoke editor UI.
- Other specials: notable **set bonuses**, **augment** interactions, and any weapon
  whose math diverges from the standard pipeline.

## Architecture notes

- Prefer **data + a small registered function** over subclass sprawl; subclass only
  when behavior is genuinely structural.
- This stage is the **acceptance test** for the special-case seams claimed in
  Stages 1–5: if implementing Torid/rivens requires touching core pipeline code,
  refactor the extension points.

## High-level tasks

- [ ] Design + implement the special-case registry (calc hooks + custom UI hooks).
- [ ] Incarnon form toggle + base-stat swap (+ tests).
- [ ] Evolution selection (EVO perks as descriptors) + UI (+ tests).
- [ ] Implement a full incarnon weapon end-to-end (Torid) as the exemplar.
- [ ] Riven mod type: user-entered stats, disposition, editor UI (+ tests).
- [ ] One set-bonus + one augment special case as further exemplars.
- [ ] Confirm no core-pipeline edits were needed for the above (else refactor seams).

## Defer

- Exhaustive coverage of every special weapon — establish the pattern + exemplars;
  the long tail is added incrementally afterward.
