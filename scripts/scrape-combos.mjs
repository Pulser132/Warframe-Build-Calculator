#!/usr/bin/env node
/**
 * Offline stance Combo-String scraper (Stage 3 — manual run only). See ADR 0001.
 *
 * `@wfcd/items` has **no** combo-string data, so this standalone tool fetches the
 * wiki's stance combo tables and emits a git-tracked `src/data/generated/combos.json`
 * keyed by melee weapon id. The build and app read **only** the committed file —
 * there is no build-time network access (deterministic builds).
 *
 * Combo tables are the most inconsistent data on the wiki, so low-confidence
 * parses are flagged (`lowConfidence: true`) for manual review. The committed
 * `combos.json` is the source of truth: scraped values are hand-corrected when the
 * wiki is wrong, and a casual run never clobbers it — pass `--write` to overwrite.
 *
 * Usage:
 *   node scripts/scrape-combos.mjs            # writes combos.scraped.json (review)
 *   node scripts/scrape-combos.mjs --write    # overwrites src/data/generated/combos.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEN_DIR = join(__dirname, '..', 'src', 'data', 'generated');

/**
 * Stance → { wiki page, melee class it applies to }. The class is matched against
 * each weapon's `weaponClass` in weapons.json to map a stance to its weapon ids.
 */
const STANCES = [
  { name: 'Tempo Royale', page: 'Tempo_Royale', class: 'heavy-blade' },
  { name: 'Cleaving Whirlwind', page: 'Cleaving_Whirlwind', class: 'heavy-blade' },
  { name: 'Gemini Cross', page: 'Gemini_Cross', class: 'tonfa' },
  { name: 'Sovereign Outcast', page: 'Sovereign_Outcast', class: 'tonfa' },
];

const WIKI = 'https://wiki.warframe.com/w/';

/** Map a wiki proc label to an engine status/damage type (or null to drop). */
function mapProc(label) {
  const l = label.toLowerCase();
  for (const t of ['impact', 'puncture', 'slash', 'heat', 'cold', 'electricity', 'toxin',
    'blast', 'radiation', 'gas', 'magnetic', 'viral', 'corrosive', 'void', 'lifted']) {
    if (l.includes(t)) return t;
  }
  return null; // stagger / knockdown / ragdoll → not a Condition-Overload status here
}

/**
 * Parse combo tables out of a stance page's raw HTML. The wiki markup is
 * irregular, so this is heuristic: every parse is flagged low-confidence and must
 * be reviewed against the rendered page before being trusted. Returns
 * `ComboString[]` (name + hit multipliers + forced procs).
 */
function parseCombos(html, stance) {
  const combos = [];
  // Combo headers look like "Combo Name EE EE RMB…" rows; multipliers appear as
  // "200%" / "x2" tokens and procs as damage-type words. This intentionally
  // collects raw multiplier tokens per combo block and flags everything for review.
  const blocks = html.split(/<tr[ >]/i).slice(1);
  for (const block of blocks) {
    const text = block.replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ');
    const pcts = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1]) / 100);
    if (pcts.length < 2) continue;
    const nameMatch = text.match(/^\s*([A-Z][A-Za-z'’ ]{3,40})/);
    const name = nameMatch ? nameMatch[1].trim() : `Combo ${combos.length + 1}`;
    const procs = [];
    for (const word of text.split(/\s+/)) {
      const p = mapProc(word);
      if (p) procs.push(p);
    }
    combos.push({
      name,
      stance: stance.name,
      hits: pcts.map((m, i) => {
        const hit = { damageMultiplier: Number(m.toFixed(3)) };
        if (procs[i]) hit.forcedProcs = [procs[i]];
        return hit;
      }),
      lowConfidence: true,
    });
  }
  return combos;
}

async function main() {
  const write = process.argv.includes('--write');
  const weapons = JSON.parse(readFileSync(join(GEN_DIR, 'weapons.json'), 'utf8'));
  const meleeByClass = new Map();
  for (const w of weapons) {
    if (w.category !== 'Melee') continue;
    const list = meleeByClass.get(w.weaponClass) ?? [];
    list.push(w.id);
    meleeByClass.set(w.weaponClass, list);
  }

  const byWeapon = {};
  for (const stance of STANCES) {
    let combos = [];
    try {
      const res = await fetch(WIKI + stance.page);
      const html = await res.text();
      combos = parseCombos(html, stance);
      console.log(`scrape-combos: ${stance.name} → ${combos.length} combo(s) (review needed)`);
    } catch (e) {
      console.warn(`scrape-combos: failed to fetch ${stance.name}: ${e.message}`);
      continue;
    }
    for (const id of meleeByClass.get(stance.class) ?? []) {
      byWeapon[id] = [...(byWeapon[id] ?? []), ...combos];
    }
  }

  const outFile = write ? 'combos.json' : 'combos.scraped.json';
  writeFileSync(join(GEN_DIR, outFile), JSON.stringify(byWeapon, null, 2) + '\n');
  console.log(
    `scrape-combos: wrote ${Object.keys(byWeapon).length} weapon entr(y/ies) to ${outFile}` +
      (write ? '' : ' — review, hand-correct, then re-run with --write or merge manually'),
  );
}

main();
