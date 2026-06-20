# Frame-stat mod descriptors are generated from `@wfcd` levelStats

## Status

accepted (Frame-Mod Coverage — Tier A)

## Decision

Non-augment **Frame-stat Mod** descriptors are **generated** by a script that
parses each mod's `@wfcd/items` `levelStats` string into structured
`frameEffects` (`"+30% Ability Duration"` → `{ stat: 'abilityDuration', value:
0.3 }`), rather than hand-authored entry-by-entry in `descriptors.ts`. The only
human judgement in the deterministic path is a small, curated **stat-token
dictionary** (display token → `FrameStat` | `calc-irrelevant` |
`calc-relevant-unmapped`); a tail workflow verifies the ambiguous remainder. The
script also emits a generated coverage doc grouping every frame mod by status.

## Why

This is a deliberate **exception** to the repo's stated rule that "mods are
hand-authored: the dump only gives stat strings, so `descriptors.ts` supplies the
structured effects" (`build-data.mjs`). That rule exists because weapon mods and
mechanics carry nuance the dump can't express (additive-vs-multiplicative bucket
choice, beam/shotgun behavior, the slash↔puncture transpose hazard). **Frame-stat
mods don't:** their value *is* the `levelStats` string, and they all land in the
same additive-within-a-stat resolver, so the mapping is lossless and mechanical.
Hand-authoring ~200 such mods would be slow, error-prone, and would rot silently
when `@wfcd/items` is bumped — whereas a generator stays truthful (re-run, review
the diff) and makes the coverage boundary explicit and auditable.

## Considered options

- **Hand-author every frame mod (status quo rule)** — rejected: high-toil,
  transcription-error-prone, and no regenerable record of what is/isn't covered.
- **Full LLM workflow, one agent per mod** — rejected: pays tokens to re-derive
  data a parser extracts for free, and N agents writing the same two shared files
  (`build-data.mjs` + `descriptors.ts`) need a single serialize step anyway. The
  fan-out is kept only for the genuinely ambiguous tail.

## Consequences

- A reader tracing `descriptors.ts` must know frame-stat entries originate from a
  generator + the stat-token dictionary, not free-hand authoring — weapon-mod and
  context-scaled (custom-effect) descriptors remain hand-authored.
- The coverage scope is bounded by the dictionary: a `levelStats` token the
  dictionary doesn't know is surfaced for review, never silently mis-mapped.
- `MOD_UNIQUE_NAMES` and `MOD_DESCRIPTORS` must be written together (the loader
  throws on a curated mod with no descriptor), so generation and the pin-list are
  one atomic apply step.
