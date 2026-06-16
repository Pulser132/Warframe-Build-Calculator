# Trigger Types / Fire Rate -> DPS

**Sources:**
- https://wiki.warframe.com/w/Fire_Rate
- Fetched: 2026-06-16

Fire Rate is measured in rounds per second (rps). Fire-rate (attack speed) mods
apply a percentage bonus to the base fire rate. How that bonus translates into an
effective rate of attacks depends on the weapon's trigger type.

## Global limits

- **Floor:** Fire rate cannot drop below **0.05 rounds/second** (= max 20 seconds
  between shots) regardless of how negative the bonus is.
- **Semi-Auto cap:** Semi-Automatic weapons are capped at **10 rounds/second**
  (you cannot click/hold faster than this in practice).
- **Charge cap:** For charged weapons, charge time cannot exceed **10x the base
  charge time** (reached at >= -90% fire rate bonus).
- **Shot delay:** `Shot Delay (s) = 1 / Modified Fire Rate`.

## Modified fire rate (all types)

```
Modified Fire Rate = Base Fire Rate x (1 + sum of Fire Rate mod bonuses)
```

## Trigger types

### Automatic
Holds trigger to fire continuously at the modified fire rate. Effective fire rate
scales **linearly** with fire-rate mods (within the floor/cap).
```
Effective Fire Rate = Modified Fire Rate
```

### Semi-Automatic
One shot per trigger pull; effective rate is limited by how fast it can cycle, up
to the **10 rps cap**. Scales linearly with mods up to that cap.

### Burst
Fires a fixed number of rounds (Burst Count) per trigger pull, at the in-burst
fire rate, then waits a Burst Delay before the next burst is allowed.

```
Effective Fire Rate = Burst Count / ( 1/FireRate + (Burst Count - 1) x Burst Delay )
```
equivalently:
```
Effective Fire Rate = Burst Count / ( Burst Time In Seconds + Total Burst Delay In Seconds )
```

- Fire-rate mods scale the **in-burst** Fire Rate (the `1/FireRate` term shrinks).
- **Burst Delay is NOT affected by net-negative fire-rate bonuses** (positive
  bonuses do not shorten the delay either in the formula above — the delay is a
  fixed inter-burst value).

### Charge (bows, Opticor-type)
Hold to charge, release to fire. Fire-rate mods **reduce charge time**:
```
Modified Charge Time = Base Charge Time / (1 + Mod Bonus)
```
- **Bows:**            `Effective Fire Rate = 1 / Modified Charge Time`
- **Most charge wpns:** `Effective Fire Rate = 1 / (Modified Charge Time + 1/Modified Fire Rate)`
  (the extra `1/Modified Fire Rate` term is the post-shot recovery/recharge before
  charging can begin again).

### Held / Continuous (beam)
Fire-rate increases the **frequency of damage ticks**: fire rate (rps) == damage
ticks per second. Each tick is one damage instance. See `beams.md` for the per-tick
damage and status detail.
```
Ticks Per Second = Modified Fire Rate
```

## Burst DPS

For any type, burst DPS (ignoring reload/spool) is:
```
Burst DPS = Damage Per Shot x Multishot x Effective Fire Rate
```

## Worked example (Burst)

Hypothetical burst rifle:
- Damage per round = 30, Multishot = 1
- Base in-burst Fire Rate = 6.0 rps  ->  1/FireRate = 0.1667 s between rounds in a burst
- Burst Count = 3
- Burst Delay = 0.3 s

```
Effective Fire Rate = 3 / ( 0.1667 + (3 - 1) x 0.3 )
                    = 3 / ( 0.1667 + 0.6 )
                    = 3 / 0.7667
                    = 3.913 bursts-worth-of-rounds per second  (effective rps)

Burst DPS = 30 x 1 x 3.913 = 117.4 DPS
```

Apply a +60% fire-rate mod -> in-burst Fire Rate = 9.6 rps -> 1/FireRate = 0.1042 s:
```
Effective Fire Rate = 3 / ( 0.1042 + 0.6 ) = 3 / 0.7042 = 4.260 rps
Burst DPS = 30 x 4.260 = 127.8 DPS
```
Note the Burst Delay (0.6 s total) dominates, so the +60% mod yields only ~+9% DPS.

## Worked example (Charge bow)

- Base Charge Time = 1.0 s, Damage = 200, Multishot = 1
- With +60% fire rate: Modified Charge Time = 1.0 / 1.6 = 0.625 s
- Effective Fire Rate = 1 / 0.625 = 1.6 rps
- Burst DPS = 200 x 1.6 = 320 DPS
