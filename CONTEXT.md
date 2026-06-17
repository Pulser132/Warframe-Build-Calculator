# Warframe Build Calculator — Context

The shared domain language for the calculator. This is a glossary, not a spec —
it defines what terms *mean*, not how they're implemented. Game mechanics are
sourced from the wiki and cached under `docs/warframe/`.

## Language

### Gear & attacks

**Fire Mode**:
The calculable unit the damage pipeline runs on — one selectable way a weapon
attacks, carrying its own crit/status/rate/components. A gun's trigger modes and
a melee weapon's Normal vs Heavy attack are all Fire Modes.
_Avoid_: "attack profile", "weapon mode" (use Fire Mode for the engine concept).

**Attack** (melee):
A melee Fire Mode. A melee weapon has a **Normal Attack** and a **Heavy Attack**.
_Avoid_: "swing", "strike" as engine terms.

**Attack Speed**:
The melee analogue of Fire Rate — attacks per second. Modeled as `fireRate` on a
melee Fire Mode. _Avoid_: "swing speed".

### Combo

**Combo Count**:
The raw number of consecutive hits landed before the combo window expires. The
fundamental combat-state input; the engine derives Combo Tier and Combo
Multiplier from it. _Avoid_: "combo hits", "hit counter".

**Combo Tier**:
`floor(ComboCount / 20)`, i.e. the number of full 20-hit steps reached (0–11).
The quantity Blood Rush and Weeping Wounds scale on (their bonus is `0.4 × Tier`).

**Combo Multiplier**:
`1 + ComboTier`, capped at 12× (220 hits). **Multiplies Heavy Attack damage
only** — it does *not* increase Normal Attack damage.
_Avoid_: "combo damage", "combo bonus".

**Heavy Attack**:
A melee attack that consumes Combo Count to deal `weapon × heavyMultiplier ×
ComboMultiplier`. Modeled as a separate Fire Mode.

**Normal Attack**:
The default melee attack (light attack). Builds Combo Count; not multiplied by
Combo Multiplier. _Avoid_: "light attack" as the engine term.

> **"Combo" is overloaded — never use it bare.** The *counter* family is **Combo
> Count / Tier / Multiplier** (above). A stance attack *sequence* is a **Combo
> String** (below). Always qualify which one is meant.

**Combo String**:
A named attack sequence unlocked by a Stance mod — an ordered list of hits, each
with its own damage multiplier and any forced procs. Distinct from the Combo
Counter. _Avoid_: "combo" (ambiguous), "attack chain".

### Slam & attacks

**Slam Attack**:
A melee attack producing a **Slam** (direct, on the primary target) plus a **Slam
Radial** (AoE around the impact, with radius + falloff, applying Lifted). A
**Heavy Slam** is a Slam performed as a Heavy Attack (× Combo Multiplier).

**Reach** (Range):
A melee weapon's swing distance in metres. Governs how many enemies a swing can
hit (a multi-target / Follow-Through input), not single-target damage-per-hit.
_Avoid_: using "range" for ability range in melee contexts.

### Multi-target & slots

**Follow-Through**:
The per-target damage reduction applied when one melee swing hits multiple
enemies in its arc (`damage × FT^(n-1)` for the n-th target). A multi-target
concern, distinct from single-target damage-per-hit.

**Stance**:
A melee-only mod slot (the melee analogue of a Warframe's Aura slot) that holds a
Stance mod and unlocks Combo Strings.

### Warframe & abilities

**Warframe** (Frame):
The player's character gear — it carries base stats (health, shield, armor,
energy, sprint speed) and abilities, and is modded on its own screen (**Aura +
Exilus + 8 normal + 2 arcanes**). The source of the ability buffs that modify
weapon damage. _Avoid_: "char", "suit" as engine terms.

**Aura**:
A **Warframe-only** mod slot at the top of the frame screen. Provides *extra* mod
capacity (doubled when the equipped Aura's polarity matches the slot). Weapons
have **no** Aura slot — the melee **Stance** slot is the melee analogue.

**Ability**:
A Warframe's active power. Its numbers scale with the frame's ability attributes.
Some abilities emit buffs (see **Emitted Buff**); others deal damage or grant
survivability (those are modeled in a later stage).

**Ability Strength / Duration / Range / Efficiency**:
The four ability attributes, each modified **additively** by mods. **Strength**
governs buff magnitude (and ability damage); **Efficiency** reduces energy cost
and is **capped**; **Duration** and **Range** govern how long / how far. _Avoid_:
mixing "power strength" with "ability power".

**Emitted Buff** (Ability Buff):
A buff an ability produces whose **magnitude is derived from the casting frame's
Ability Strength** (e.g. Roar). Distinct from a manually-entered buff: whether it
is *active* is a combat-state toggle, but its *magnitude* comes from the equipped
frame (with a manual-override fallback when no equipped frame provides it).
_Avoid_: using "buff" bare when the source (frame-derived vs manual) matters.

**Roar**:
Rhino's Emitted Buff — a damage bonus (base **+50% × Ability Strength**) that
shares the **faction** bucket (adds with Bane, then multiplies). The canonical
cross-gear link: a frame ability modifying weapon damage.

**Set Bonus**:
An extra effect a mod grants that scales with **how many mods of the same set are
equipped** (e.g. the **Umbral** set). Distinct from the mod's own base stat.

**Effective Health (EHP)**:
A Warframe's survivability expressed as a single number combining health, shield,
and armor (armor gives health a damage-reduction multiplier; shields are largely
unaffected). At this stage it is **generic** — no specific incoming damage type.
