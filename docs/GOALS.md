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
- [x] **B3 · One entry ceremony** — `#gate` retired as a screen (now only the
      initial paint cover; boot dismisses it instantly); the landing exits
      through door leaves (`#lp-leaves`, shut → part onto the nave); landing §3
      is a clickable mini-sky (world orbs + live constellation at the real
      `SKY_X` positions) instead of four text blocks.
      *Done when: exactly one first-run ceremony exists and it ends through the doors.* ✓
- [x] **B4 · Altar alive** — one ember per resting idea (live from `IDEAS` +
      `tgc.shell2.altar`), hover pauses it and names it; "✶ lay an idea" on the
      door opens an inline input — a candle laid in one interaction from the
      nave, embers and pulse repainting immediately (`altarEmbersHTML`,
      `paintEmbers`, quick-lay handler).
      *Done when: laying an idea takes one interaction from the nave and the door shows it burning.* ✓
- [x] **B5 · Motifs earn their keep** — Excelsior rays lit by ladder progress
      (`LADDER` 9/12, one source read by the door rays and the chamber ladder);
      MirrorFlow moons stop orbiting on hover and fan into a labeled 14px
      launcher; Riftborn's crack widens when watched.
      *Done when: each motif reflects real state or improves a real interaction.* ✓
- [x] **B6 · Day = the nave at noon** — day rebuilt as warm stone / pale gold /
      ink-on-paper (Coach's cream as reference: `#f4eee0` ground, `#8b6914`
      gilt); the Muizenberg colourpop lives on as the chosen-only **pop** skin
      (fourth toggle dot, `auto` never derives it; frames map pop→paper/cream).
      `!important` neon-glyph overrides gone; glyphs are quiet ink at noon.
      *Done when: all three canonical skins read as one building at different hours.* ✓

## Phase C · Polish (fold into the B-item that touches the area)

- [x] Night glyph base opacity 13% → 21% (flag 26%, nebula lifted to match) — with B6
- [x] Chamber ← → arrows show prev/next world name (with B3)
- [x] Notes: type stack aligned — DM Sans / DM Mono / Playfair via the shell's
      `fonts/fonts.css` (self-hosted, same origin; portable build strips the link)
- [x] Mobile sky: a slim 60px band of tappable 22px world orbs replaces the
      old `display:none` — meta text, seal, sun and moon step aside on phones

## Phase E · The Exchange

- [x] **Exchange v2 · typed packets** — every missive declares its `kind`
      (`handoff` · `digest` · `receipt`); `readPacket()` validates contract,
      kind and recipient at the door and refuses with a reason. v1 packets
      still accepted, read as handoffs. Per-kind inbox rendering (sigil, chip,
      action verb), kind-aware missive envelope and topbar badge, receipts
      acknowledge instead of routing. `tgcSeal()`/`tgcOnMissive()` in
      `apps/bridge.js` give apps a one-line producer/consumer; a new
      *exchange contract* rite self-tests the whole schema.
      *Done when: a receiver never has to guess what arrived, and a malformed packet is refused with a reason.* ✓

## Phase D · Rituals & tooling

- [x] `build-portable.py` — regenerates the single-file offline edition from
      the partitioned source (fonts as data URIs, shell inlined, apps as blob
      payloads with the bridge inlined and `__TGC_APP_ID` preset). Output is
      gitignored — the monofile is a build product now, never the source.
- [x] Deploy-skew hardening — the service worker fetches with `cache:'no-cache'`
      so a fresh `index.html` is never paired with a 10-min-stale `shell.css`
      from the Pages HTTP cache (the "pop looked like night" report)
- [x] Deploy ritual documented: bump `version.json` per deploy; bump `VER` in
      `sw.js` when asset shape changes (see ARCHITECTURE.md)
- [ ] Post-deploy sanity: landing → app → vestry → rites 8/8 on the live domain

## Horizon (not scheduled, kept on purpose)

- MirrorFlow Insight as the consumer of real Pulse data once apps report
  activity over the bus (packets, still — never storage reads)
- MirrorFlow Insight's first real feed: apps calling `tgcSeal('digest', …)` on
  their own activity, so the Pulse widens beyond visit stamps (packets only)
- The Rift (Riftborn game) gets its bus only "when the rift opens"
