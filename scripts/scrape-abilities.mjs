#!/usr/bin/env node
/**
 * Offline ability-scaling scraper (Stage 4 — manual run only). See ADR 0001.
 *
 * `@wfcd/items` gives ability **names/descriptions** but **no numeric scaling**
 * (Roar's +50%, durations, radii). This standalone tool fetches the wiki ability
 * tables and emits a git-tracked `src/data/generated/abilities.json` keyed by
 * ability id. The build and app read **only** the committed file — there is no
 * build-time network access (deterministic builds).
 *
 * Ability tables are irregular wiki markup, so low-confidence parses are flagged
 * (`lowConfidence: true`) for manual review. The committed `abilities.json` is the
 * source of truth: scraped values are hand-corrected when the wiki is wrong, and a
 * casual run never clobbers it — pass `--write` to overwrite.
 *
 * Roar is the verified Stage-4 entry (hand-authored from the wiki: +50% damage at
 * max ability rank, 30 s duration, 25 m range); other abilities are scaffolding
 * for later stages and ship flagged low-confidence until reviewed.
 *
 * Usage:
 *   node scripts/scrape-abilities.mjs            # writes abilities.scraped.json (review)
 *   node scripts/scrape-abilities.mjs --write    # overwrites src/data/generated/abilities.json
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEN_DIR = join(__dirname, '..', 'src', 'data', 'generated');

/**
 * Ability → { wiki page, the numeric fields to pull }. Only buff-emitting
 * abilities need exact numbers this stage; the rest are display-only scaffolding.
 */
const ABILITIES = [
  {
    id: 'roar',
    name: 'Roar',
    page: 'Rhino/Abilities',
    // Verified vs wiki (max ability rank): +50% damage, 30 s, 25 m radius.
    verified: { strengthBase: 0.5, durationBase: 30, rangeBase: 25 },
  },
];

const WIKI = 'https://wiki.warframe.com/w/';

/**
 * Heuristic parse of an ability page for the max-rank damage %, duration, and
 * radius. The wiki ability boxes are irregular, so any parsed (non-verified)
 * value is flagged low-confidence and must be reviewed before being trusted.
 */
function parseAbility(html, ability) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ');
  // Take the LAST number in a "a / b / c / d" progression as the max-rank value.
  const lastOf = (re) => {
    const m = text.match(re);
    if (!m) return undefined;
    const nums = m[1].split('/').map((s) => Number(s.trim()));
    return nums[nums.length - 1];
  };
  const pct = lastOf(/Damage Bonus[^0-9]*([\d/.\s]+)\s*%/i);
  const dur = lastOf(/Duration[^0-9]*([\d/.\s]+)\s*s/i);
  const range = lastOf(/Range[^0-9]*([\d/.\s]+)\s*m/i);
  return {
    id: ability.id,
    name: ability.name,
    ...(pct != null ? { strengthBase: pct / 100 } : {}),
    ...(dur != null ? { durationBase: dur } : {}),
    ...(range != null ? { rangeBase: range } : {}),
    lowConfidence: true,
  };
}

async function main() {
  const write = process.argv.includes('--write');
  const out = {};

  for (const ability of ABILITIES) {
    let entry;
    try {
      const res = await fetch(WIKI + ability.page);
      const html = await res.text();
      entry = parseAbility(html, ability);
    } catch (e) {
      console.warn(`scrape-abilities: failed to fetch ${ability.name}: ${e.message}`);
      entry = { id: ability.id, name: ability.name, lowConfidence: true };
    }
    // Hand-verified values override the scrape and clear the low-confidence flag.
    if (ability.verified) {
      entry = { id: ability.id, name: ability.name, ...ability.verified };
    }
    out[ability.id] = entry;
    console.log(
      `scrape-abilities: ${ability.name} → ${JSON.stringify(entry)}` +
        (ability.verified ? ' (verified)' : ' (review needed)'),
    );
  }

  const outFile = write ? 'abilities.json' : 'abilities.scraped.json';
  writeFileSync(join(GEN_DIR, outFile), JSON.stringify(out, null, 2) + '\n');
  console.log(
    `scrape-abilities: wrote ${Object.keys(out).length} ability entr(y/ies) to ${outFile}` +
      (write ? '' : ' — review, hand-correct, then re-run with --write'),
  );
}

main();
