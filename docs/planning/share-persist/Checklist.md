# Stage 8 — Sharing & Persistence — Checklist

> Expand to full task granularity before implementing. See `Plan.md`.

- [ ] Stable item-ID schema + versioned build-code format defined
- [ ] Encode/decode + compression in `src/share` (+ round-trip tests)
- [ ] URL-hash sync (load from hash on open; update on change)
- [ ] Migration + unknown/removed-item handling (+ tests)
- [ ] localStorage library: save / load / rename / delete named builds + UI
- [ ] Import/export + Share button (copy link / copy-paste code)
- [ ] E2E: build → share link → fresh load reproduces identical results
