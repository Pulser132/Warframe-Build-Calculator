# Stage 2 — All Gun Types — Checklist

> Full-granularity checklist mirroring `Plan.md`. Cross-cutting decisions live in
> `../Overview.md`; seams being filled are in `../initial-layout/STAGE-NOTES.md`.

## Phase 1 — Mechanics (RESEARCHED & LOCKED — cached in docs/warframe/mechanics/)
- [x] Trigger/fire-rate→DPS formulas locked (burst & charge exact; semi cap 10 rps)
- [x] Beam locked — tick=FR, 0.5 ammo/tick, ramp 20→100% over 0.6s
- [x] **Beam status CORRECTED:** full per-tick status, **no 0.6×** (legacy removed)
- [x] Shotgun locked — per-pellet status/crit; `P(≥1)=1−(1−s)^N`; type weighting
- [x] AoE falloff locked — linear; rim default 90% (Tonkor 70%); self-stagger only
- [x] Projectile-vs-hitscan = metadata only (no Stage 2 dmg effect)
- [ ] **Resolve in Phase 8:** `@wfcd falloff.reduction` = remaining multiplier vs
      wiki "% reduced" (Tonkor 0.7 conflict) — convert + test

## Phase 2 — Gear hierarchy
- [ ] Shared firearm behavior pulled up into `Gun`
- [ ] `Secondary` added + registered in `createWeapon`; Stage 1 rifle unchanged
- [ ] `FireMode` unit introduced (base/trigger/multishot/crit/status/AoE/ammo)
- [ ] Trigger + delivery modeled as strategy objects/interfaces (thin classes)
- [ ] `MultiMode` interface implemented (exposes fire-mode list)
- [ ] `HasCrit`/`HasStatus` confirmed to work per fire mode

## Phase 3 — Trigger types in the pipeline
- [ ] Effective-fire-rate stage — burst & charge exact formulas; semi cap 10 rps
- [ ] Burst/charge feed burst + reload-adjusted sustained DPS (mag/ammo per pull)
- [ ] Per-trigger tests vs `triggers.md` (Hind burst, Lanka charge, semi cap edge)

## Phase 4 — Beam weapons (Glaxion Vandal)
- [ ] Held-continuous: per-tick damage, tick rate=FR, 0.5 ammo/tick
- [ ] **Full** per-tick status (NO 0.6×); multishot merges (`×multishot`, >100% ok)
- [ ] Damage ramp ~20→100% over 0.6s (peak DPS + ramp note)
- [ ] Beam tested vs `beams.md`; no new bucket; non-beam regression holds

## Phase 5 — Shotguns (Vaykor Hek)
- [ ] Pellet count = `basePellets×(1+Σms)` (base 7); status & crit per pellet
- [ ] Expose expected procs/shot AND `P(≥1)=1−(1−s)^N`; type weighting
- [ ] Tested vs `shotguns.md` example

## Phase 6 — Projectile/hitscan + AoE & falloff (Tonkor)
- [ ] Hitscan/projectile delivery metadata carried through (no dmg change)
- [ ] AoE mode: separate direct + radial hits; linear falloff (clamped); center+rim
- [ ] `falloff.reduction` convention resolved (remaining-mult vs wiki "% reduced")
- [ ] AoE DPS summarized as center/rim pair (no misleading peak-only)
- [ ] Tonkor tested (direct, center-radial, rim, falloff interp, convention)

## Phase 7 — Multi-mode weapons (engine)
- [ ] `calculateBuild` returns one `DamageResult` per fire mode, keyed by mode
- [ ] Mods/conditionals/buffs apply correctly across all modes
- [ ] Multi-mode reference weapon tested per mode; single-mode unchanged

## Phase 8 — Data pipeline & effect map
- [ ] `build-data.mjs` broadened to **all Primary+Secondary guns** (not a hardcoded
      list); mechanic fields mapped **generically** from `@wfcd` records
      (trigger/multishot/`attacks[]`/falloff/shot_type/charge/beam)
- [ ] Base `attacks` taken, NOT Incarnon alts; every weapon's modes mapped (1→N)
- [ ] `falloff.reduction` normalized as remaining-multiplier (+ AoE reconcile)
- [ ] Secondary + shotgun mod descriptors authored (mods ARE hand-authored)
- [ ] `build:data` re-run; loaders typed across full gun list; transform tests vs
      cached fixtures (one weapon per mechanic)
- [ ] Un-mappable guns deferred to Stage 6 registry (no hand-edited weapon data)

## Phase 9 — UI
- [ ] Modding screen generalized: weapon type drives mod compatibility/slots
- [ ] Weapon picker spans primaries + secondaries, populated from the generated
      dataset (every gun in the dump selectable, not a curated few)
- [ ] Fire-mode switcher for `MultiMode`; panels/attribution re-bind to mode
- [ ] Mechanic-specific stats shown (beam tick DPS, pellets, AoE center/edge)
- [ ] Component tests: picker filter, mode switch, beam/shotgun/AoE panels

## Phase 10 — Verification, regression & docs
- [ ] Reference builds verified: Vaykor Hek (shotgun), Glaxion Vandal (beam),
      Lex Prime (secondary), Tonkor (AoE), Stradavar Prime (multi-mode)
- [ ] Stage 1 rifle regression green; engine coverage high; lint + test green
- [ ] README updated (adding a weapon type/fire mode/mod set)
- [ ] STAGE-NOTES updated: what's implemented vs remaining seams for Stages 3–6

## Decisions to record during the stage
- [ ] Verify quantization (already implemented in Stage 1) runs on the per-tick
      base (beam) and per-shot base before pellet-multishot (shotgun)
- [x] New bucket for beams? **No** — beams reuse the Stage 1 status bucket (full
      per-tick status × multishot); no taxonomy change needed.
