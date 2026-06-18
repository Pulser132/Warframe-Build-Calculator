# Stage 4 — Warframe Modding — Checklist

> Expanded from `Plan.md` (this stage's grilling, 2026-06-17). Game facts from
> `@wfcd` / the wiki via `warframe-info`, cached under `docs/warframe/`.

## Build model & cleanup

- [x] `GearBuild`; `Build = { weapon, warframe: GearBuild | null }` (ADR 0003)
- [x] Store: compartment-addressed mutations + "active compartment"; default-equip
      reference frame (clearable); undo/redo tests
- [x] Remove the Aura slot from gun layout; migrate initial build / capacity / gun
      tests; `'aura'` is Warframe-only

## Data

- [x] `build-data.mjs` emits `warframes.json` (roster base stats + ability metadata)
- [x] `loadWarframes()` + extended `Dataset` (+ transform tests)
- [x] `scripts/scrape-abilities.mjs` → committed `abilities.json` (Roar verified;
      low-confidence flagged) + loader merge

## Engine

- [x] `Warframe` gear class + factory branch + slot layout + capability interfaces
- [x] Frame-stat resolver `resolveWarframe → WarframeStats`: four ability attributes
      (additive) + efficiency cap (175%); EHP (generic) — hand-verified unit tests
- [x] Set bonuses (ADR 0004): `set?` on `ModData`; `setCounts` tally + ctx extension;
      Umbral via the registry; registry shared across gather + frame resolver; tests
      at 1/2/3 members
- [x] Ability modeling: authored ability→buff/bucket mapping; Roar magnitude =
      base × strength (+ duration/range display) (+ tests)
- [x] Buff link: `CombatState.buffs` → active toggles; buff registry as catalog;
      weapon calc resolves Roar from the frame (manual-override fallback);
      cross-compartment integration test (on / off / manual)
- [x] Mod compatibility: `gearModGroup` + `'warframe'` group; frame pools; close the
      aura/arcane cross-gear leak (+ tests)

## Mod set

- [x] Frame mod set authored: ability-attribute mods, Umbral set, an aura
      (Corrosive Projection), an arcane (Molt Augmented), survivability mods
      (Vitality / Steel Fiber / Redirection) — numbers from `@wfcd`/the wiki

## UI

- [x] Compartment switcher (Warframe | Weapon)
- [x] Warframe modding screen (Aura + Exilus + 8 + 2 arcanes, frame pool, capacity)
- [x] Frame panel: ability attributes, EHP + components, emitted Roar magnitude
- [x] Roar on/off toggle in combat config (frame-derived + manual override)

## Verification

- [x] Reference build — Rhino Prime: ability strength, efficiency cap, Umbral set
      bonus (1/2/3), Roar magnitude, EHP, cross-compartment toggle — all wiki-verified
      and cached under `docs/warframe/warframes/rhino-prime.md`
