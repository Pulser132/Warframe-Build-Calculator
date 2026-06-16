#!/usr/bin/env node
/**
 * Build-time data transform.
 *
 * Reads the bundled `@wfcd/items` JSON, selects ONLY the Stage-1 slice items
 * (Vulkar Wraith + the slice mods/arcanes), normalizes them to the curated
 * internal schema (`src/engine/model/types.ts`), and emits one JSON file per
 * category to `src/data/generated/`.
 *
 * Effect descriptors and slot kinds are NOT produced here — `@wfcd` only gives
 * human-readable stat strings. Those are authored by hand in
 * `src/data/mods/descriptors.ts` and merged at load time by `src/data/loaders.ts`.
 *
 * Re-run with: `npm run build:data`
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'node_modules', '@wfcd', 'items', 'data', 'json');
const OUT_DIR = join(__dirname, '..', 'src', 'data', 'generated');

/** Canonical Warframe damagePerShot index order. */
const DAMAGE_ORDER = [
  'impact', 'puncture', 'slash', 'heat', 'cold', 'electricity', 'toxin',
  'blast', 'radiation', 'gas', 'magnetic', 'viral', 'corrosive', 'void',
];

/** Slice weapon, by exact name. */
const SLICE_WEAPONS = ['Vulkar Wraith'];

/**
 * Slice mods, keyed by **full** `uniqueName`. The trailing segment is NOT unique
 * (e.g. Serration and Hornet Strike both end in `WeaponDamageAmountMod`), and a
 * single name has Beginner/Intermediate/Expert duplicates — so we pin the exact
 * canonical PvE path for each.
 */
const SLICE_MOD_UNIQUE_NAMES = [
  '/Lotus/Upgrades/Mods/Rifle/WeaponDamageAmountMod', // Serration  (+165%, r10)
  '/Lotus/Upgrades/Mods/Rifle/WeaponFireIterationsMod', // Split Chamber (+90% MS, r5)
  '/Lotus/Upgrades/Mods/Rifle/WeaponCritChanceMod', // Point Strike (+150% CC, r5)
  '/Lotus/Upgrades/Mods/Rifle/WeaponCritDamageMod', // Vital Sense (+120% CD, r5)
  '/Lotus/Upgrades/Mods/Rifle/WeaponStunChanceMod', // Rifle Aptitude (+90% SC, r5)
  '/Lotus/Upgrades/Mods/Rifle/WeaponToxinDamageMod', // Infected Clip (+90% Toxin, r5)
  '/Lotus/Upgrades/Mods/Rifle/WeaponElectricityDamageMod', // Stormbringer (+90% Elec, r5)
  '/Lotus/Upgrades/Mods/Rifle/WeaponFireRateMod', // Speed Trigger (+60% FR, r5)
  '/Lotus/Upgrades/Mods/Rifle/WeaponFactionDamageGrineer', // Bane of Grineer (x1.3, r5)
  '/Lotus/Upgrades/Mods/Aura/PlayerRifleDamageAuraMod', // Rifle Amp (aura, +27%, r5)
  '/Lotus/Upgrades/Mods/Rifle/WeaponBeamDistanceMod', // Sinister Reach (exilus, r3)
];

/** Slice arcanes, by exact name. */
const SLICE_ARCANES = ['Primary Merciless', 'Primary Deadhead'];

function loadCategory(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function maxRankStats(item) {
  const ls = item.levelStats ?? [];
  return ls.length ? (ls[ls.length - 1].stats ?? []) : [];
}

function normalizeWeapon(w) {
  const damage = {};
  const arr = w.damagePerShot ?? [];
  for (let i = 0; i < DAMAGE_ORDER.length; i++) {
    const v = arr[i] ?? 0;
    if (v > 0) damage[DAMAGE_ORDER[i]] = v;
  }
  return {
    id: slugify(w.name),
    uniqueName: w.uniqueName,
    name: w.name,
    category: 'Primary',
    weaponClass: 'rifle',
    trigger: w.trigger ?? 'Auto',
    damage,
    totalBaseDamage: Number((w.totalDamage ?? 0).toFixed(5)),
    criticalChance: w.criticalChance ?? 0,
    criticalMultiplier: w.criticalMultiplier ?? 1,
    statusChance: w.procChance ?? 0,
    fireRate: w.fireRate ?? 1,
    magazine: w.magazineSize ?? 0,
    reload: w.reloadTime ?? 0,
    multishot: w.multishot ?? 1,
    masteryReq: w.masteryReq ?? 0,
    disposition: w.disposition ?? 0,
    exilusPolarity: w.exilusPolarity ?? null,
    polarities: w.polarities ?? [],
  };
}

function normalizeMod(m) {
  return {
    id: slugify(m.name),
    uniqueName: m.uniqueName,
    name: m.name,
    polarity: m.polarity ?? 'none',
    baseDrain: m.baseDrain ?? 0,
    maxRank: m.fusionLimit ?? 0,
    rarity: m.rarity ?? 'Common',
    compat: m.compatName ?? '',
    description: (m.description ?? '').trim(),
    rawMaxStats: maxRankStats(m),
  };
}

function normalizeArcane(a) {
  const ls = a.levelStats ?? [];
  return {
    id: slugify(a.name),
    uniqueName: a.uniqueName,
    name: a.name,
    rarity: a.rarity ?? 'Rare',
    maxRank: a.fusionLimit ?? (ls.length ? ls.length - 1 : 0),
    description: (a.description ?? '').trim(),
    rawMaxStats: maxRankStats(a),
  };
}

function main() {
  const primary = loadCategory('Primary');
  const mods = loadCategory('Mods');
  const arcanes = loadCategory('Arcanes');

  const weaponsOut = SLICE_WEAPONS.map((name) => {
    const w = primary.find((x) => x.name === name);
    if (!w) throw new Error(`Slice weapon not found in @wfcd: ${name}`);
    return normalizeWeapon(w);
  });

  const modsOut = SLICE_MOD_UNIQUE_NAMES.map((u) => {
    const m = mods.find((x) => x.uniqueName === u);
    if (!m) throw new Error(`Slice mod not found in @wfcd (uniqueName): ${u}`);
    return normalizeMod(m);
  });

  const arcanesOut = SLICE_ARCANES.map((name) => {
    const a = arcanes.find((x) => x.name === name);
    if (!a) throw new Error(`Slice arcane not found in @wfcd: ${name}`);
    return normalizeArcane(a);
  });

  mkdirSync(OUT_DIR, { recursive: true });
  const write = (file, data) =>
    writeFileSync(join(OUT_DIR, file), JSON.stringify(data, null, 2) + '\n');

  write('weapons.json', weaponsOut);
  write('mods.json', modsOut);
  write('arcanes.json', arcanesOut);

  console.log(
    `build-data: wrote ${weaponsOut.length} weapon(s), ${modsOut.length} mod(s), ${arcanesOut.length} arcane(s) to src/data/generated/`,
  );
}

main();
