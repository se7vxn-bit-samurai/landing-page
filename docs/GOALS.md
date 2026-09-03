# GOALS · the plan, phased and honest

Working ledger for the shell. Ordered by leverage; each item names its files and
its done-condition. Update statuses as things land. Intent behind all of it:
[`INTENT.md`](INTENT.md).

## Phase 0 · Foundation — ✅ done

- [x] Full audit of launch flow, nave panels, chambers, apps, visual identity
- [x] Partition the 7.5 MB monofile → `apps/` `css/` `js/` `fonts/` `docs/` (7.5 KB shell)
- [x] Service worker (offline after first visit), `manifest.json`, `version.json`
- [x] Docs: ARCHITECTURE, APPS, INTENT, GOALS · CLAUDE.md + README rewritten

## Phase A · Bugs — ✅ done

- [x] A1 landing §3 copy: missing spaces after `·` (`js/landing.js`)
- [x] A2 landing cards `Frame.warm()` on hover — no more cold summons from the landing
- [x] A3 fake pulse data resolved by B2 (fields deleted, live signals in their place)

## Phase B · System builds

- [x] **B1 · Theme handshake** — shell broadcasts `{type:'tgc.theme', theme}` on
      mount, hello, and sky change (`js/shell.js`); `apps/bridge.js` maps it:
      ping/notes → pulse·slate·linen, coach → press·cream; sync/codex opt out.
      In-app pickers still work between sky changes.
      *Done when: switching the sky re-skins mounted frames; entering any frame matches the hour.*
- [x] **B2 · The Pulse** — honest live signals replace fake counters
      (`Pulse` in `js/shell.js`): visit stamps (`tgc.shell2.visits`), altar
      candle counts, per-world instrument/active counts. Feeds door reveals
      (`.tp-pulse`), chamber stat rows, MirrorFlow cards.
      *Done when: no number in the shell is invented.*
- [ ] **B3 · One entry ceremony** — retire `#gate` as a screen; reuse its
      door-leaf animation as the landing's exit transition; landing §3 becomes a
      clickable mini-sky (orbs + constellation) instead of four text blocks.
      Files: `js/landing.js`, `js/shell.js` (boot), `css/shell.css`, `index.html`.
      *Done when: exactly one first-run ceremony exists and it ends through the doors.*
- [ ] **B4 · Altar alive** — one ember per resting idea (live from `IDEAS` +
      `tgc.shell2.altar`), hover names it; quick-lay a candle from the panel
      without opening the chamber. Files: `js/shell.js` (door render, embers),
      `css/shell.css`.
      *Done when: laying an idea takes one interaction from the nave and the door shows it burning.*
- [ ] **B5 · Motifs earn their keep** — Excelsior rays lit by ladder progress
      (9/12); MirrorFlow moons pause + fan into a labeled launcher on hover
      (today: 9 px moving targets); Riftborn crack widens slightly on hover.
      *Done when: each motif reflects real state or improves a real interaction.*
- [ ] **B6 · Day = the nave at noon** — rebuild the day skin as warm stone /
      pale gold / ink-on-paper (Coach's cream is the reference); demote the
      Muizenberg colourpop to an optional named skin. Kill the `!important`
      neon-glyph overrides. Files: `css/shell.css`.
      *Done when: all three canonical skins read as one building at different hours.*

## Phase C · Polish (fold into the B-item that touches the area)

- [ ] Night glyph base opacity 13% → ~20–22% (letterforms are near-subliminal) → with B6
- [ ] Chamber ← → arrows show prev/next world name → with B3
- [ ] Notes: align type stack (Inter/Cascadia → DM Sans/DM Mono) → with B1 follow-up
- [ ] Mobile sky story (`#sky` is hidden under 980px; decide what the small
      screen gets once orbs carry pulse) → after B5

## Phase D · Rituals & tooling

- [ ] `build-portable.py` — regenerate the single-file offline build from the
      partitioned source (the old monofile as an *output*, not the source)
- [x] Deploy ritual documented: bump `version.json` per deploy; bump `VER` in
      `sw.js` when asset shape changes (see ARCHITECTURE.md)
- [ ] Post-deploy sanity: landing → app → vestry → rites 7/7 on the live domain

## Horizon (not scheduled, kept on purpose)

- MirrorFlow Insight as the consumer of real Pulse data once apps report
  activity over the bus (packets, still — never storage reads)
- Exchange v2: typed packet kinds (handoff, digest, receipt) with per-kind inbox
  rendering
- The Rift (Riftborn game) gets its bus only "when the rift opens"
