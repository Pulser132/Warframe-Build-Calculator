---
name: warframe-info
description: Look up authoritative, current information about the game Warframe — mods, weapons, Warframes, stats, drop sources, damage mechanics, and formulas. Use whenever a task needs facts about Warframe rather than relying on the model's own (often outdated) knowledge, since the game is patched frequently.
---

## When to use this skill

Use this whenever you need a fact about Warframe — including item stats (weapons, Warframes, mods, arcanes), mod values and polarities, drop locations, status/elemental mechanics, or damage formulas.

Do **not** answer Warframe questions from memory. The game receives frequent balance patches, so trained knowledge is often stale or wrong. Always confirm against a live source below.

## Only the main agent delegates — subagents must NOT invoke this skill

**If you are a subagent that was spawned to perform a Warframe lookup, do not invoke the `warframe-info` skill.** You *are* the lookup — follow the Subagent brief, Sources, and Workflow below directly. Re-invoking the skill would spawn another subagent and recurse infinitely.

Delegation (spawning the Haiku subagent) is done only by the main agent.

## How to run: delegate to a Haiku subagent

Do **not** scan the raw data yourself — the item files are large and would flood the main context. Instead, spawn a subagent to do the lookup and hand you back only the relevant facts.

Launch it with the **Agent** tool:
- `subagent_type: "general-purpose"` (it needs Bash to run the script, Read/Write for the cache, and WebFetch/WebSearch for the wiki).
- `model: "haiku"` — always use Haiku for this; the work is mechanical lookup + extraction.
- `description`: a short label like `"Warframe data lookup"`.
- `prompt`: the **Subagent brief** below, plus the specific question (item name + exactly which stats/mechanic you need).

Use the concise summary the subagent returns. Spawn one subagent per distinct lookup; you can run several in parallel for unrelated items.

## Subagent brief

Give the subagent these instructions (it does the work and returns only what was asked):

> You are looking up Warframe data. **Do not invoke the `warframe-info` skill — you are already performing its lookup; just follow these instructions directly.** Follow the sources and workflow below. Return a concise answer containing only the requested facts (with exact numbers) and the source you used — do not dump the full raw record. After fetching anything new, write it to the cache as described.

## Sources, in order of preference

### 0. Local cache (`docs/warframe/`) — always check this FIRST
Before running the script or going online, look in `docs/warframe/<category>/` for an existing file. Categories mirror the data types, e.g.:
- `docs/warframe/weapons/`
- `docs/warframe/warframes/`
- `docs/warframe/mods/`
- `docs/warframe/arcanes/`
- `docs/warframe/mechanics/` — for wiki-derived formulas/interactions
- add other categories (`companions/`, `relics/`, etc.) as needed.

One file per item/topic, named in kebab-case after the item, e.g. `docs/warframe/mods/serration.md`, `docs/warframe/weapons/soma-prime.md`, `docs/warframe/mechanics/damage.md`. Cache the script's plain-text output (or wiki notes) as `.md`.

If a matching file exists, use it and skip the lookup. Only run the script / go online when the cache has no file for what you need.

**After any successful lookup, write the result to the cache** under the correct category and filename, so the next lookup is local. Create the `docs/warframe/<category>/` directory if it doesn't exist. Record the source at the top of the file (the exact script command, or the wiki URL) so it can be re-verified or refreshed later.

If cached data looks stale or the user reports it's wrong, re-run the lookup and overwrite the cached file.

### 1. `@wfcd/items` lookup script — for structured item/mod/stat data
Item, weapon, Warframe, mod, and arcane stats come from the `@wfcd/items` npm package (the WFCD data export). Don't read the raw JSON or call any web API for this — use the project's helper script, which parses the bundled JSON into clean plain text:

```
node scripts/warframe-lookup.mjs [--category <Name>] [--exact] [--json] "<search term>"
```

Examples:
- `node scripts/warframe-lookup.mjs --category Mods --exact "Serration"`
- `node scripts/warframe-lookup.mjs --exact "Soma Prime"`
- `node scripts/warframe-lookup.mjs --categories` — list valid category names (Primary, Secondary, Melee, Warframes, Mods, Arcanes, Relics, …)

Notes:
- Substring match by default; pass `--exact` for an exact name, `--category` to disambiguate (the same name can exist in several categories, and a mod name can return multiple ranks). More than 8 loose matches prints just the names so you can narrow down.
- `--json` prints the cleaned raw object if you need every field; default plain text already summarizes drops (top 5 sources) and shows a mod's max-rank stats.
- **Ensure the package is installed first.** If `node_modules/@wfcd/items` is missing, run `npm install` (the dependency is already in `package.json`; if `package.json` itself is missing, `npm install @wfcd/items` first). The script exits non-zero with a message on a missing package, unknown category, or no match.

### 2. Official Warframe Wiki — for mechanics, formulas, and interactions
Base: `https://wiki.warframe.com/`

Use WebFetch (or WebSearch scoped to `wiki.warframe.com`) for things the API doesn't model well:
- Damage formulas, armor/health scaling, and damage-type modifiers vs. health/armor/shield types
- Status effect (proc) behavior, stacking rules, and elemental combination order
- Mod stacking rules, conditional/“set” mod interactions, and corner-case mechanics

Example: `https://wiki.warframe.com/w/Damage` for the damage system, `https://wiki.warframe.com/w/<Item_Name>` for a specific item's page.

## Workflow

1. Identify exactly what fact is needed (a stat value vs. a mechanic/formula).
2. **Check the local cache first** — look for `docs/warframe/<category>/<item>.md`. If it exists, use it and stop here.
3. If not cached:
   - For concrete stats/values → run `scripts/warframe-lookup.mjs` (install the package first if needed).
   - For mechanics/formulas/interactions → consult the official wiki.
4. **Write the result to `docs/warframe/<category>/<item>.md`** — one file per item/topic, with the source (script command or wiki URL) recorded at the top.
5. Cross-check the two sources when a value feeds the damage calculation and correctness matters.
6. Cite the source (cache file, script command, or wiki URL) in your answer so the user can verify.

## Notes
- This is a build/damage calculator, so accuracy of damage-relevant numbers (base damage, crit chance/multiplier, status chance, multishot, mod values, polarities) is critical — prefer the script's exact values over rounded figures from prose.
- If a source is unreachable (package missing and install fails, or the wiki is down), say so explicitly rather than falling back to unverified memory.
