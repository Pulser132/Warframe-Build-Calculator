# Stage 8 — Sharing & Persistence (outline)

> Cross-cutting decisions live in `../Overview.md`. **Expand to full task
> granularity before implementing.**

**Depends on:** all prior stages (the full build model to serialize).

## Goal

Deliver the "**create and share builds**" promise from Goal.md's first line —
**client-only**, no backend: a complete loadout encodes into a compact, shareable
URL and persists locally.

## Key deliverables

- **Versioned build serialization**: encode a full loadout (frame, weapons,
  companion, operator, all slot/rank/polarity/forma data, combat-state config) into
  a compact code using a **stable item-ID schema**, compressed (`lz-string`-style),
  carried in the **URL hash**.
- **Decode + migration**: a version tag so old links keep working; graceful
  handling of unknown/removed items (e.g. after a data refresh) — warn, don't crash.
- **localStorage build library**: save/load **named builds**; list/rename/delete UI.
- **Import/export**: copy share link, copy/paste raw build code; "Share" button.
- Round-trip + migration **tests** (encode→decode equality; old-version decode).

## Architecture notes

- The build code is the **single serialization point**; the Zustand store
  serializes through it (the Stage 1 store was designed for this).
- Keep IDs stable and decoupled from `@wfcd` internal keys so data refreshes don't
  break existing links; the curated dataset owns the ID schema.
- Optional capacity/length budget: warn if a build code grows beyond comfortable
  URL length; compression should keep typical builds well within limits.

## High-level tasks

- [ ] Define the stable item-ID schema + versioned build-code format.
- [ ] Implement encode/decode + compression in `src/share` (+ round-trip tests).
- [ ] URL-hash sync (load build from hash on open; update hash on change).
- [ ] Migration + unknown-item handling (+ tests).
- [ ] localStorage library: save/load/rename/delete named builds + UI.
- [ ] Import/export + Share button (copy link / copy-paste code).
- [ ] End-to-end: build → share link → fresh load reproduces identical results.

## Defer

- Any server-side features (short links, public gallery, accounts) — explicitly out
  of scope per the client-only decision; revisit only if that decision changes.
