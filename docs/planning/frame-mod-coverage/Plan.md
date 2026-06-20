# Frame-Mod Coverage — Tier A

> Read `/CONTEXT.md` for terms (**Frame-stat Mod**, **Augment Mod**) and
> `docs/adr/0007-frame-stat-mod-descriptors-generated.md` for the
> generate-don't-hand-author decision this plan rests on. Stage 4
> (`docs/planning/warframes/Plan.md`) established the frame-stat model this
> extends.

**Depends on:** Stage 4 — Warframe compartment, `frameEffects` resolver
(`resolveFrameStats`), the `FrameStat` taxonomy, set-bonus registry (ADR 0004),
and the `warframe` mod group / compatibility rules (`state/modCompat.ts`).

## Goal

Expand non-augment **Frame-stat Mod** coverage from the Stage-4 slice (19 mods)
to **every frame mod the current engine can faithfully represent** — and produce
a durable, regenerable map of what is covered, what is deferred, and why.

This is explicitly a **Tier A** pass: no engine changes. We cover mods whose
effects map to the nine modeled frame stats; everything that needs new
representation is enumerated and backlogged, not built.

**Definition of done:** every Tier-A frame mod resolves correctly in a build
(value, stat, slot, set membership), verified by the loader guard and the frame
resolver tests; a generated coverage doc lists all 231 non-augment frame mods
grouped by status; and the Tier-B backlog is captured for a future stage.

## The universe (measured from `@wfcd/items`)

Generic frame mods = `type: "Warframe Mod"`, `uniqueName` under
`/Lotus/Upgrades/Mods/`, `compatName ∈ {WARFRAME, AURA}`.

- **231** generic frame mods (195 `WARFRAME` + 36 `AURA`) after excluding augments.
- **19** already covered (Stage 4 slice), **212** uncovered.
- **Augments excluded by definition** — they live under `/Lotus/Powersuits/<Frame>/…`
  with `compat = <a frame name>`.

### Data hazards (resolved in the script, not by hand)

- **`isAugment` is useless here.** In this `@wfcd` build it is `true` for *every*
  `Warframe Mod`, including Intensify, Vitality, and Corrosive Projection. Do
  **not** filter on it. Use the path + `compatName` test above instead.
- **Tier/PvP variants share display names.** Intensify resolves to three records:
  base (`+30%`), `…/Beginner/…` (`+12%`), `…/Expert/…` (`+55%`). 32 names have >1
  record; 26 records match PvP/Conclave paths. Keep the canonical PvE record (no
  `Beginner|Intermediate|Expert` path segment, no PvP/Conclave path) and drop the
  rest. A handful of genuine name-collisions across different mods (e.g. two
  distinct "Adaptation" `uniqueName`s) are resolved by `uniqueName`, never by name.

## Coverage taxonomy

The frame stats the engine models (`FrameStat`): `abilityStrength`,
`abilityDuration`, `abilityRange`, `abilityEfficiency`, `health`, `shield`,
`armor`, `energy`, `sprintSpeed`. (`energy` and `sprintSpeed` already exist in the
taxonomy but no mod uses them yet — they are ready, not new.)

An effect is **calc-relevant** if modeling it would change a damage number, an EHP
number, or an ability-attribute number. Each non-augment frame mod is classified:

| Status | Definition |
|---|---|
| **Covered** | Already authored (19). |
| **Tier A** | Every *unmodeled* effect is **calc-irrelevant** (parkour, mobility, aim-glide, knockdown recovery, casting speed, loot/enemy radar, lock-picking). At least one effect maps to a `FrameStat`. Model the mapped stat(s); document the dropped rider. |
| **Tier B** | Has ≥1 **calc-relevant-but-unmodeled** effect (damage resistance, energy regen, shield recharge, energy economy, conditional/on-event procs, weapon- or team-buffing auras), **or** nothing maps. Backlogged. |
| **Out of scope** | No calc-relevant effect at all (pure parkour/loot/utility). A subset of Tier B, called out for clarity. |
| **Excluded** | Augment Mod (definition) or PvP/tier variant (dedup). |

### Partial-mod policy (decision)

Cover a mod **iff every unmodeled effect is calc-irrelevant.** Examples:

- `Constitution` = `+28% Duration` ✅ + knockdown recovery ➖ → **Tier A** (model duration, note rider).
- `Armored Agility` = `+40% Armor` ✅ `+15% Sprint Speed` ✅ → **Tier A** (fully mapped).
- `Endurance Drift` = `+10% Energy Max` ✅ + parkour ➖ → **Tier A**.
- `Adrenaline Boost` = `+50% Energy` ✅ `−20% Health` ✅ → **Tier A** (negative trade-off models fine).
- `Archon Flow` = `+185% Energy` ✅ + cold-kill energy proc ➖(calc-relevant) → **Tier B**.
- `Adaptation` = stacking damage resistance only → **Tier B** (nothing maps).

### Set mods

For a set mod (e.g. Augur, Gladiator), the **base stat** is Tier A; the **set
bonus** is generally a calc-relevant-unmodeled rider → that part is Tier B. Cover
the base stat now, backlog the bonus — unless the bonus maps to a frame stat and
can reuse the Umbral-style set registry (ADR 0004), in which case it is Tier A.
The script flags every set mod for review rather than guessing.

### Slot

Deterministic from `@wfcd`: `compatName === "AURA"` → `aura`; `isExilus === true`
(and the `OrokinChallenge` Drift mods) → `exilus`; otherwise `normal`.

## Approach — hybrid (script + tail workflow)

Frame-stat values are **deterministic**: a mod's value *is* its `levelStats`
string (`"+30% Ability Duration"` → `{ stat: 'abilityDuration', value: 0.3 }`).
There is no mechanic to research, so the bulk is a parser, not an LLM job (see ADR
0007). A small workflow handles only the genuinely ambiguous tail.

1. **Enumeration script** (deterministic). Reads `Mods.json`, applies the
   frame-mod filter + dedup, parses each `levelStats` token through a curated
   **stat-token dictionary** (~30 entries mapping a display token to one of:
   a `FrameStat`, `calc-irrelevant`, or `calc-relevant-unmapped`), and classifies
   every mod. Emits:
   - **(a)** the generated coverage doc, `docs/warframe/mods/frame-coverage.md`
     (the table of all 231, grouped by status — regenerable on `@wfcd` bumps);
   - **(b)** descriptor **candidates** for `tier-a-clean` mods (all tokens map or
     are calc-irrelevant, slot deterministic, no conditional/set ambiguity).

2. **Tail workflow** (small fan-out). One agent per `tier-a-review` mod (token
   uncertain, partial-rider classification borderline, conditional/`perStack`, or
   set mod), using the `warframe-info` skill to confirm value / stat mapping /
   additivity / Tier classification. Returns structured
   `{ id, slot, frameEffects, tier, notes }`; barrier; human review. **No agent
   edits source files** — they return data; the apply step writes.

3. **Serialize-apply** (single, atomic). The pin-list and descriptors must move in
   lockstep — `loaders.ts` throws if a curated mod has no descriptor. So one step
   writes both `MOD_UNIQUE_NAMES` (in `build-data.mjs`) **and** the
   `MOD_DESCRIPTORS` entries (in `descriptors.ts`), re-runs `npm run build:data`,
   regenerates the coverage doc, and confirms the loader guard + frame-resolver
   tests are green.

## Out of scope (Tier B backlog — future stage)

Captured in the generated doc, not built here:

- **Survivability mechanics not in EHP:** Adaptation (stacking DR), elemental
  resistances (Antitoxin, Diamond Skin, …), Aviator/Armored-* (situational DR),
  shield recharge (Fast Deflection, Fortitude).
- **Energy economy:** Rage / Hunter Adrenaline (damage→energy), Quick Thinking
  (energy-as-EHP), Equilibrium, energy regen (Energy Nexus, Energy Siphon aura).
- **Conditional / on-event procs:** the Archon set riders, Energy Conversion,
  Final Act, Mecha Pulse, Health Conversion.
- **Weapon/team-buffing auras:** Steel Charge, Growing Power, Dead Eye, Brief
  Respite, Empowered Blades, Holster Amp, Coaction Drift.
- **Pure utility (out of scope even long-term):** parkour/mobility, radars,
  Master Thief, casting speed, knockdown recovery.

## Architecture notes

- **No new `FrameStat`, no new bucket, no engine edit.** If a mod needs one, it is
  Tier B by definition.
- The coverage doc is **generated**, not hand-maintained, so it stays truthful as
  `@wfcd/items` is bumped. Re-run the script; review the diff.
- The stat-token dictionary is the single point of human judgement in the
  deterministic path; it is small, reviewed, and version-controlled.
