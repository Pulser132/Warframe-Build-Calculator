#!/usr/bin/env node
// Warframe data lookup — reads the bundled `@wfcd/items` JSON exports and
// prints a clean plain-text summary of matching items.
//
// Usage:
//   node scripts/warframe-lookup.mjs "Soma Prime"
//   node scripts/warframe-lookup.mjs --category Mods "Serration"
//   node scripts/warframe-lookup.mjs --exact --category Warframes "Volt"
//   node scripts/warframe-lookup.mjs --categories         # list available categories
//
// Flags:
//   --category <Name>   restrict search to one category file (e.g. Primary, Mods, Warframes)
//   --exact             match the name exactly (case-insensitive) instead of substring
//   --json              print raw (cleaned) JSON instead of plain text
//   --categories        list the available category names and exit
//
// Exit codes: 0 = found, 1 = no match, 2 = usage/data error.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'node_modules', '@wfcd', 'items', 'data', 'json');

// Non-item data files we never want to search.
const SKIP_FILES = new Set(['i18n.json']);

// Noisy fields we strip before printing — irrelevant to a build/damage calculator.
const DROP_KEYS = new Set([
  'imageName', 'wikiaThumbnail', 'wikiaUrl', 'wikiAvailable', 'patchlogs',
  'color', 'parents', 'releaseDate', 'introduced', 'estimatedVaultDate',
]);

function fail(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function listCategories() {
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json') && !SKIP_FILES.has(f))
    .map((f) => f.replace(/\.json$/, ''));
}

function loadCategory(name) {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
  } catch {
    return null;
  }
}

// Recursively format a value as indented plain text, skipping noisy keys and
// summarizing the bulky ones (drops, levelStats).
function format(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return `${pad}—`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}(none)`;
    return value
      .map((v) =>
        v !== null && typeof v === 'object'
          ? `${pad}-\n${format(v, indent + 1)}`
          : `${pad}- ${v}`,
      )
      .join('\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => formatField(k, v, indent))
      .filter(Boolean)
      .join('\n');
  }
  return `${pad}${value}`;
}

function formatField(key, value, indent) {
  if (DROP_KEYS.has(key)) return '';
  const pad = '  '.repeat(indent);

  // Summarize drops: count + the 5 most likely sources.
  if (key === 'drops' && Array.isArray(value)) {
    if (value.length === 0) return '';
    const top = [...value]
      .sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0))
      .slice(0, 5)
      .map((d) => `${pad}  - ${d.location} (${d.rarity ?? '?'}, ${((d.chance ?? 0) * 100).toFixed(2)}%)`);
    const more = value.length > 5 ? `\n${pad}  …and ${value.length - 5} more` : '';
    return `${pad}drops (${value.length}):\n${top.join('\n')}${more}`;
  }

  // Mods: only the max-rank stats matter for a build.
  if (key === 'levelStats' && Array.isArray(value) && value.length) {
    const maxRank = value.length - 1;
    const stats = value[maxRank]?.stats ?? [];
    return `${pad}maxRankStats (rank ${maxRank}): ${stats.join(', ')}`;
  }

  if (value !== null && typeof value === 'object') {
    return `${pad}${key}:\n${format(value, indent + 1)}`;
  }
  return `${pad}${key}: ${value}`;
}

function printItem(item, asJson) {
  if (asJson) {
    const clean = {};
    for (const [k, v] of Object.entries(item)) if (!DROP_KEYS.has(k)) clean[k] = v;
    console.log(JSON.stringify(clean, null, 2));
    return;
  }
  console.log(`# ${item.name}  [${item.category ?? '?'}]`);
  console.log(format(item, 0));
  if (item.wikiaUrl) console.log(`wiki: ${item.wikiaUrl}`);
  console.log('');
}

// --- arg parsing ---
const args = process.argv.slice(2);
let category = null;
let exact = false;
let asJson = false;
const terms = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--category') category = args[++i];
  else if (a === '--exact') exact = true;
  else if (a === '--json') asJson = true;
  else if (a === '--categories') {
    console.log(listCategories().join('\n'));
    process.exit(0);
  } else terms.push(a);
}

const query = terms.join(' ').trim();
if (!query) fail('Usage: node scripts/warframe-lookup.mjs [--category <Name>] [--exact] [--json] "<search term>"');

const categories = category ? [category] : listCategories();
const q = query.toLowerCase();
const matches = [];
for (const cat of categories) {
  const items = loadCategory(cat);
  if (!items) {
    if (category) fail(`Unknown category "${category}". Available:\n${listCategories().join(', ')}`);
    continue;
  }
  for (const item of items) {
    const name = (item.name ?? '').toLowerCase();
    if (exact ? name === q : name.includes(q)) matches.push(item);
  }
}

if (matches.length === 0) fail(`No match for "${query}"${category ? ` in ${category}` : ''}.`, 1);

// Many loose matches → just list names so the caller can narrow down.
if (!exact && matches.length > 8) {
  console.log(`${matches.length} matches for "${query}" — narrow with --exact or --category:`);
  for (const m of matches) console.log(`  - ${m.name} [${m.category}]`);
  process.exit(0);
}

for (const m of matches) printItem(m, asJson);
