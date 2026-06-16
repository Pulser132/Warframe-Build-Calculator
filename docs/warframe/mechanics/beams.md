# Beam (Continuous) Weapons

**Sources:**
- https://wiki.warframe.com/w/Beam
- https://wiki.warframe.com/w/Fire_Rate
- https://wiki.warframe.com/w/Status_Chance
- Fetched: 2026-06-16

Beam weapons (e.g. Ignis, Amprex, Convectrix) are **hitscan** and apply damage in
discrete **ticks** while the trigger is held. Damage ticks are instantaneous upon
holding the trigger.

## Tick rate

The weapon's **Fire Rate (rps) IS the tick rate** (damage instances per second).
Fire-rate mods increase the frequency of ticks.
```
Ticks Per Second = Modified Fire Rate
```

## Damage per tick

The listed damage is the per-tick damage. Beams have a **ramp-up**: damage starts
at a lower percentage and ramps to **100% over 0.6 seconds** of continuously
hitting a target.

Initial damage percentages (then ramp to 100% over 0.6s):
- Most beams: **20%**
- Convectrix (primary fire): 60%
- Convectrix (alt-fire): 80%
- Phage: 70%
- Embolist: 30%

Ammo consumption: **0.5 ammo per tick**.

```
Effective Tick Damage = Listed Damage x ramp%   (ramp% goes 20% -> 100% over 0.6s)
DPS (sustained, after ramp) = Listed Damage x Multishot x Ticks Per Second
```

## STATUS chance per tick -- IMPORTANT / FLAGGED

**The commonly-cited "0.6x per-tick status multiplier" is NOT present in the
current wiki.** That value reflects the OLD beam model where beams displayed
"STATUS / SEC".

Current model (per the live wiki):
- Beams now state **"STATUS"** (not "STATUS / SEC") in the Arsenal, because they
  **can Status Effect more than once per second**.
- Each tick rolls status at the **displayed status chance** (no documented 0.6x
  reduction multiplier in the current wiki).
- The displayed status chance applies to **status chance only** (not damage). No
  per-tick damage multiplier is applied to status.

=> Treat per-tick status chance = displayed status chance, rolled once per tick
(per merged multishot instance, see below). Do NOT apply a 0.6x factor unless you
are deliberately modeling the legacy behavior.

```
Avg status procs per second = Status Chance per tick x Ticks Per Second
```

## Multishot on a beam

Adding multishot does NOT create separate visible beams that you track
individually for damage. Instead:
- "Multiple hits on the same target from Multishot are combined, producing a
  damage instance with **damage and Status Chance equal to the sum of all hits**."
- So multishot multiplies both the per-tick damage and the per-tick status chance
  (status can exceed 100% per tick -> guaranteed proc plus additional roll).
- Additional chain beams (e.g. Amprex chains) do **not** cost extra ammo.

```
Merged Tick Damage = Listed Damage x Multishot
Merged Tick Status Chance = Status Chance x Multishot   (can exceed 100%)
```

## Worked example

Ignis-style beam:
- Listed damage = 35/tick, Status Chance = 28%, Fire Rate = 8 (so 8 ticks/s)
- Multishot mod = +120% -> Multishot = 2.2

Sustained DPS (after 0.6s ramp to 100%):
```
Merged Tick Damage = 35 x 2.2 = 77
DPS = 77 x 8 = 616 DPS
```

Status:
```
Merged Tick Status Chance = 28% x 2.2 = 61.6%  per tick
Avg procs/sec = 0.616 x 8 = 4.93 status procs per second
```
(Under the legacy 0.6x model this would have been 0.616 x 0.6 = ~37% per tick;
the current wiki does not apply that reduction.)
