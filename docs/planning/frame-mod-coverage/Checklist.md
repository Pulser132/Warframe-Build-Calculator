# Frame-Mod Coverage (Tier A) — Checklist

> Full task granularity. See `Plan.md` for rationale, `/CONTEXT.md` for terms, and
> `docs/adr/0007-frame-stat-mod-descriptors-generated.md` for the
> generate-don't-hand-author decision. Tests-first for the parser and the
> resolver math.

## A. Enumeration script — filter & dedup

- [ ] New `scripts/build-frame-coverage.mjs` (or extend `build-data.mjs`): load
      `@wfcd/items` `Mods.json`; select generic frame mods
      (`type === "Warframe Mod"`, `uniqueName` under `/Lotus/Upgrades/Mods/`,
      `compatName ∈ {WARFRAME, AURA}`). **Do not filter on `isAugment`** (it is
      `true` for everything here).
- [ ] Dedup variants: drop records whose `uniqueName` contains a
      `Beginner|Intermediate|Expert` segment or a PvP/Conclave path; keep the
      canonical PvE record. Resolve genuine cross-mod name collisions by
      `uniqueName`, never by display name.
- [ ] Assert the post-dedup count is stable (snapshot the count + a sorted
      uniqueName list as a fixture) so an `@wfcd` bump that changes the universe is
      visible in the diff.

## B. Stat-token dictionary & parser

- [ ] Author the stat-token dictionary (~30 entries): each `levelStats` display
      token → one of `{ FrameStat, 'calc-irrelevant', 'calc-relevant-unmapped' }`.
      Cover the four ability attributes, health/shield/armor (+ "Shield Capacity"),
      "Energy"/"Energy Max", "Sprint Speed"; mark parkour/aim-glide/knockdown/
      casting/radar/loot as `calc-irrelevant`; mark damage-resistance/regen/
      recharge/economy/proc tokens as `calc-relevant-unmapped`.
- [ ] Parser: split a `levelStats` string on `;`, extract sign/number/%/token per
      effect, convert `%`→fraction (`+30%` → `0.3`, `−20%` → `−0.2`). Unit-test
      against known mods (Continuity `+30%`→0.3; Armored Agility two tokens;
      Adrenaline Boost negative; an unmapped-token mod).
- [ ] Classifier: `tier-a-clean` (all tokens map or calc-irrelevant, slot
      deterministic, no conditional/set ambiguity) · `tier-a-review`
      (token uncertain, borderline rider, conditional/`perStack`, or set mod) ·
      `tier-b` (≥1 calc-relevant-unmapped, or nothing maps) · `out-of-scope`
      (no calc-relevant effect). Unit-test the boundary cases from `Plan.md`.
- [ ] Slot derivation: `AURA`→`aura`; `isExilus` / `OrokinChallenge` Drift→`exilus`;
      else `normal`.

## C. Generated outputs

- [ ] Emit `docs/warframe/mods/frame-coverage.md`: all 231 grouped by status, each
      row `name · uniqueName · parsed effect(s) · slot · status · notes`. Header
      states it is generated — do not hand-edit.
- [ ] Emit `tier-a-clean` descriptor **candidates** (the `{ id, slot, frameEffects }`
      shape) to a reviewable intermediate (stdout or a scratch JSON), not directly
      into `descriptors.ts`.

## D. Tail workflow (review only)

- [ ] Run the small fan-out over `tier-a-review` mods: one agent per mod uses
      `warframe-info` to confirm value / stat mapping / additivity / Tier; returns
      `{ id, slot, frameEffects, tier, notes }`. Agents return data only — no file
      edits.
- [ ] Human review of the barrier output; fold confirmed Tier-A mods into the
      candidate set; move rejected ones to the Tier-B backlog.

## E. Serialize-apply (atomic)

- [ ] In one pass, add every covered mod's `uniqueName` to `MOD_UNIQUE_NAMES`
      (`build-data.mjs`) **and** its entry to `MOD_DESCRIPTORS` (`descriptors.ts`),
      keeping them in lockstep (`loaders.ts:76` throws otherwise). Author set
      membership where applicable; route any set-bonus-as-frame-stat through the
      Umbral-style registry (ADR 0004).
- [ ] Run `npm run build:data`; confirm `mods.json` regenerates with the new mods.
- [ ] Regenerate `docs/warframe/mods/frame-coverage.md`.

## F. Tests & verification

- [ ] Loader guard green: every curated mod has a descriptor
      (`loaders.test.ts`); no `No authored descriptor` throw.
- [ ] Frame-resolver test: a sample build stacking several new Tier-A mods sums to
      the expected `abilityStrength`/`duration`/`range`/`efficiency` +
      health/shield/armor/energy/sprint (additive within each stat).
- [ ] Slot/compat test: aura mods only fit the `warframe` group's aura slot; exilus
      mods land in exilus; normal in normal (`modCompat`).
- [ ] `npm run lint` + full `npm test` green; Stage-4 reference builds unchanged.

## Deferred (Tier B backlog — tracked, not this change)

- [ ] Survivability mechanics not in EHP (Adaptation, elemental resistances,
      situational DR, shield recharge).
- [ ] Energy economy (Rage/Hunter Adrenaline, Quick Thinking, Equilibrium, regen).
- [ ] Conditional / on-event procs (Archon riders, Energy Conversion, Final Act).
- [ ] Weapon/team-buffing auras (Steel Charge, Growing Power, Dead Eye, …).
