#!/usr/bin/env node
/**
 * Build-time enemy-dataset transform (Stage 5, decision 8).
 *
 * Reads the bundled `@wfcd/items` `Enemy.json` (638 records) and emits a curated,
 * git-tracked `src/data/generated/enemies.json` — **no hand-authoring** of stats.
 * Mirrors `build-data.mjs` (same offline, committed-output convention; ADR 0001).
 *
 * Per enemy:
 *  - base `health` / `shield` / `armor`: straight from `@wfcd` (level-1 values).
 *  - `faction`: inferred from the `uniqueName` path (`/Enemies/<Faction>/…`),
 *    which is reliable even when the `type` field is a weapon class ("Rifle").
 *    Falls back to the explicit `faction` then `type` field, else `Other`.
 *  - `armorType` (Ferrite | Alloy): read from the `resistances[]` layer tags
 *    (we use ONLY the layer composition; the legacy per-type `affectors` are
 *    ignored — decision 6 models the modern faction system).
 *  - `baseLevel`: 1 (confirmed: `@wfcd` base stats are the unscaled level-1 values).
 *
 * 638 raw records include duplicate name variants (a normal spawn + its combat
 * "Avatar"); we de-dupe by slug id, keeping the combat-relevant record (an
 * `…/Avatar` uniqueName, then the higher total stats).
 *
 * Re-run with: `npm run build:enemies`
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'node_modules', '@wfcd', 'items', 'data', 'json');
const OUT_DIR = join(__dirname, '..', 'src', 'data', 'generated');

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** `/Enemies/<segment>/…` → canonical faction. */
const SEGMENT_FACTION = {
  Grineer: 'Grineer',
  GrineerChampions: 'Grineer',
  Corpus: 'Corpus',
  CorpusChampions: 'Corpus',
  Infested: 'Infested',
  Orokin: 'Orokin',
  Sentients: 'Sentient',
};
/** `@wfcd` `faction`/`type` field → canonical faction (fallbacks). */
const FIELD_FACTION = {
  Grineer: 'Grineer',
  Corpus: 'Corpus',
  Infestation: 'Infested',
  Infested: 'Infested',
  Orokin: 'Orokin',
  Sentient: 'Sentient',
};

function resolveFaction(rec) {
  const m = (rec.uniqueName || '').match(/\/Enemies\/([^/]+)\//);
  if (m && SEGMENT_FACTION[m[1]]) return SEGMENT_FACTION[m[1]];
  if (rec.faction && FIELD_FACTION[rec.faction]) return FIELD_FACTION[rec.faction];
  if (rec.type && FIELD_FACTION[rec.type]) return FIELD_FACTION[rec.type];
  return 'Other';
}

/** Armor subtype from the `resistances[]` layer tags (only when armor > 0). */
function resolveArmorType(rec) {
  if (!(rec.armor > 0) || !Array.isArray(rec.resistances)) return undefined;
  for (const layer of rec.resistances) {
    const t = String(layer.type || '');
    if (/Alloy/i.test(t)) return 'Alloy';
    if (/Ferrite/i.test(t)) return 'Ferrite';
  }
  return undefined;
}

/** Prefer the combat "Avatar" record, then the one with the higher total stats. */
function quality(rec) {
  let s = 0;
  if (/Avatar/i.test(rec.uniqueName || '')) s += 1000;
  s += (rec.health || 0) + (rec.shield || 0) + (rec.armor || 0);
  return s;
}

function main() {
  const enemies = JSON.parse(readFileSync(join(DATA_DIR, 'Enemy.json'), 'utf8'));

  const best = new Map();
  for (const rec of enemies) {
    if (!rec.name) continue;
    const id = slugify(rec.name);
    const prev = best.get(id);
    if (!prev || quality(rec) > quality(prev)) best.set(id, rec);
  }

  const out = [...best.values()]
    .map((rec) => {
      const e = {
        id: slugify(rec.name),
        name: rec.name,
        faction: resolveFaction(rec),
        baseLevel: 1,
        health: rec.health || 0,
        shield: rec.shield || 0,
        armor: rec.armor || 0,
      };
      const armorType = resolveArmorType(rec);
      if (armorType) e.armorType = armorType;
      return e;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'enemies.json'), JSON.stringify(out, null, 0) + '\n');

  const byFaction = {};
  for (const e of out) byFaction[e.faction] = (byFaction[e.faction] || 0) + 1;
  console.log(
    `build-enemies: ${out.length} unique enemies (${enemies.length} raw) → src/data/generated/enemies.json`,
  );
  console.log('  by faction:', JSON.stringify(byFaction));
}

main();
