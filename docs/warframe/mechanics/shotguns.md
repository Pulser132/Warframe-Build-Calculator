# Shotguns / Per-Pellet Status

**Sources:**
- https://wiki.warframe.com/w/Status_Chance
- https://wiki.warframe.com/w/Status_Effect
- https://wiki.warframe.com/w/Multishot
- Fetched: 2026-06-16

## Per-pellet status (post-2017 status rework)

**Confirmed:** On weapons that fire multiple pellets in a single attack, the status
chance listed in the Arsenal is the probability that **EACH PELLET will individually
proc**. (Prior to the 2017 rework, the listed chance was for the whole shot; that is
no longer the case.)

- Each pellet rolls independently at the displayed status chance.
- Each pellet also rolls crit independently (same per-pellet treatment for crits).

## Multishot adds pellets

Multishot on a shotgun increases the **number of pellets** per shot. Fractional
multishot is handled probabilistically (e.g. 2.2 multishot = 2 pellets guaranteed +
20% chance of a 3rd). Each pellet carries the weapon's per-pellet damage, crit
chance, and status chance.

```
Pellets Per Shot = Base Pellet Count x Multishot
```

## Expected procs per shot

The wiki's per-shot expectation formula:
```
Average Number of Procs Per Shot = Multishot x (Number of Forced Procs + Status Chance per Projectile)
```
And per second:
```
Average Procs Per Second = Average Procs Per Shot x Fire Rate
```

(Here "Multishot" is the total pellet count factor; "Status Chance per Projectile"
is the displayed per-pellet status chance, which CAN exceed 100% -> guarantees at
least one proc plus a chance of an extra.)

### Probability of at least one proc per shot
The formula above gives the EXPECTED number of procs, not P(>=1 proc). For the
probability that a shot lands at least one status, with N independent pellets each
at status chance s (s <= 1):
```
P(at least one proc) = 1 - (1 - s)^N
```

### Proc type distribution
When a status proc occurs, which element procs is weighted by that element's share
of total damage:
```
Proc Type Chance = (Element Damage) / (Total Damage)
```

## Worked example

Shotgun: base pellets = 10, per-pellet status chance = 30% (0.30), Fire Rate = 4.

With +90% multishot -> Multishot factor = 1.9 -> pellets = 10 x 1.9 = 19 pellets.

Expected procs per shot:
```
= Multishot x Status Chance per Projectile        (no forced procs)
= 19 x 0.30
= 5.7 procs per shot (expected)
```
Per second:
```
= 5.7 x 4 = 22.8 procs per second
```

Probability at least one proc per shot (N = 19, s = 0.30):
```
P = 1 - (1 - 0.30)^19 = 1 - 0.70^19 = 1 - 0.00114 = 0.9989  (~99.9%)
```

Crit: with 25% per-pellet crit chance, expected crit pellets per shot = 19 x 0.25
= 4.75 pellets crit; each crit pellet applies the crit multiplier to its own damage.
