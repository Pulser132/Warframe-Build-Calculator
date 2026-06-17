# Offline combo-string scraper → committed dataset

## Status

accepted (Stage 3 — Melee)

## Decision

Stance **combo strings** (per-hit damage multipliers + forced procs) are not in
`@wfcd/items`. We source them with a standalone, manually-run
`scripts/scrape-combos.mjs` that fetches the wiki's combo tables and emits a
**git-tracked** `src/data/generated/combos.json`. The build and the app read only
the committed file — there is **no network access at build time**. Low-confidence
parses are flagged for manual review.

## Why

The project's data pipeline is otherwise a pure transform of the bundled
`@wfcd/items` package (see `Overview.md`), and "accuracy is paramount — numbers
verified against the wiki, never from memory." Combo tables are the most
inconsistent/incomplete data on the wiki, and we want broad stance coverage.

## Considered options

- **Live scrape inside `build-data.mjs`** — rejected: non-deterministic static
  builds, a wiki-uptime/markup dependency, and silent parse errors shipping wrong
  damage numbers into a calculator whose value is correct math.
- **Hand-author every stance** — rejected for breadth: too slow for the coverage
  goal.
- **Offline generator → committed, reviewable dataset** — chosen: builds stay
  deterministic and pure; every scraped stance is auditable in PR diffs and
  hand-correctable; re-run to refresh.

## Consequences

- A second data source exists alongside `@wfcd`; downstream code depends on the
  `combos.json` shape.
- Refreshing combo data is a deliberate, reviewed step, not automatic.
- Scraped values are corrected by hand when the wiki is wrong — the committed file
  is the source of truth, not the live wiki.
