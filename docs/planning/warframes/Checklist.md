# Stage 4 — Warframe Modding — Checklist

> Expanded from `Plan.md` (this stage's grilling, 2026-06-17). Game facts from
> `@wfcd` / the wiki via `warframe-info`, cached under `docs/warframe/`.

## Build model & cleanup

- [ ] `GearBuild`; `Build = { weapon, warframe: GearBuild | null }` (ADR 0003)
- [ ] Store: compartment-addressed mutations + "active compartment"; default-equip
      reference frame (clearable); undo/redo tests
- [ ] Remove the Aura slot from gun layout; migrate initial build / capacity / gun
      tests; `'aura'` is Warframe-only

## Data

- [ ] `build-data.mjs` emits `warframes.json` (roster base stats + ability metadata)
- [ ] `loadWarframes()` + extended `Dataset` (+ transform tests)
- [ ] `scripts/scrape-abilities.mjs` → committed `abilities.json` (Roar verified;
      low-confidence flagged) + loader merge

## Engine

- [ ] `Warframe` gear class + factory branch + slot layout + capability interfaces
- [ ] Frame-stat resolver `resolveWarframe → WarframeStats`: four ability attributes
      (additive) + efficiency cap (175%); EHP (generic) — hand-verified unit tests
- [ ] Set bonuses (ADR 0004): `set?` on `ModData`; `setCounts` tally + ctx extension;
      Umbral via the registry; registry shared across gather + frame resolver; tests
      at 1/2/3 members
- [ ] Ability modeling: authored ability→buff/bucket mapping; Roar magnitude =
      base × strength (+ duration/range display) (+ tests)
- [ ] Buff link: `CombatState.buffs` → active toggles; buff registry as catalog;
      weapon calc resolves Roar from the frame (manual-override fallback);
      cross-compartment integration test (on / off / manual)
- [ ] Mod compatibility: `gearModGroup` + `'warframe'` group; frame pools; close the
      aura/arcane cross-gear leak (+ tests)

## Mod set

- [ ] Frame mod set authored: ability-attribute mods, Umbral set, an aura, an arcane,
      survivability mods (numbers from the wiki)

## UI

- [ ] Compartment switcher (Warframe | Weapon)
- [ ] Warframe modding screen (Aura + Exilus + 8 + 2 arcanes, frame pool, capacity)
- [ ] Frame panel: ability attributes, EHP + components, emitted Roar magnitude
- [ ] Roar on/off toggle in combat config (frame-derived + manual override)

## Verification

- [ ] Reference build — Rhino Prime: ability strength, efficiency cap, Umbral set
      bonus (1/2/3), Roar magnitude, EHP, cross-compartment toggle — all wiki-verified
      and cached under `docs/warframe/warframes/rhino-prime.md`
