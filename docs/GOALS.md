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

## Phase F · MirrorFlow Ping

Ping's own reference: [`PING.md`](PING.md).

- [x] **F1 · Nothing preloaded, nothing expensive at boot** — the sample thread,
      the letter to "Marcus", the idle fake conversation and the seeded side note
      are gone; each surface carries a quiet waiting line instead. The spelling
      ledger moved to `apps/lens/dict.js` and is fetched on first real prose; the
      80-case rule self-test moved to first open of the diagnostics drawer.
      *Measured: load 461→165 ms, payload 935→433 KB, invented messages 6→0.* ✓
- [x] **F2 · Ping emits digests** — a completed send seals
      `tgcSeal('digest', {to:'insight', …})`: word/sentence counts, reading grade,
      writing and clarity scores, per-category rule hits, apology/hedge/robotic
      counts, revisions and seconds-to-send. Fields the engine could not measure
      are **omitted**, never zeroed. The shell routes digests past the human inbox
      into a capped ledger (`tgc.shell2.digests`), replayed to the recipient on
      mount via `tgc.exchange.ledger`. `insight` is declared in `APPS` as
      `status:'soon'` so the packet has a valid door to arrive at.
      *Verified: one send → 1 ledger entry, 0 inbox rows, no typed content in the
      packet. QC 42/42.* ✓
- [x] **F3 · Punctuation and style** — the premise this item was written on was
      wrong: `style` and `punctuation` were never *declared* categories. There are
      three categories (`grammar` · `clarity` · `tone`), all populated;
      `punctuation` was a thin subtype (6 rules, all about whitespace) and `style`
      did not exist. Corrected in [`PING.md`](PING.md), then filled.
      **+47 rules, +28 fixtures.** Punctuation gained the marks that change how a
      sentence reads — missing question marks, opening-adverb and greeting commas,
      stray apostrophes, em dashes, comma splices, unclosed brackets and quotes.
      Style arrived as a subtype of clarity — passive voice, buried verbs
      (`make a decision` → `decide`), redundant pairs (`revert back` → `revert`),
      empty intensifiers, filler openers, the `There is` empty subject, and three
      sentences in a row opening with the same word.
      Style stays a **subtype**, not a category: a passive clause is not a fourth
      axis, it is harder to read, which is what clarity already measures — so the
      score, the presets, the rewrites and the digest need no new dimension.
      *191 → 238 rules · 83 → 111 fixtures, all passing · 0 false positives on a
      clean 15-sentence corpus · 0.21 ms per analysis pass · boot unchanged.* ✓
- [ ] **F4 · Spelling honesty** — the bloom filter under-flags by design (false
      positives wave real misspellings through) and caps at 8 flags per pass.
      Neither is wrong, but neither is visible. Surface the cap when it bites, and
      document the ceiling where a user can see it.
      *Done when: a long draft says "8 shown of N" rather than silently stopping.*

## Phase H · Weight

Measured across the house before any of this was written, cold mount through the
shell (median of 6, fresh context each run). The finding redirected the work:
**Ping was third**, and we had been optimising it because it was loud.

| App | Mount | Transfer | DOM |
|---|---:|---:|---:|
| sync | 696 ms | 1 269 KB | 222 |
| ping | 351 ms | 537 KB | 1 904 |
| codex | 328 ms | 1 527 KB | 2 942 |

After H1 and H2, on the same measurement: ping **143 ms / 353 KB to DCL**,
codex **219 ms / 749 KB**. Sync is now the worst by a wide margin.
| coach | 223 ms | 703 KB | 1 276 |
| notes | 154 ms | 167 KB | 93 |
| *shell* | *172 ms DCL* | *80 KB* | *732* |

Fonts were checked and cleared: 19 `@font-face` rules, all with `font-display:swap`
and `unicode-range`, so the browser fetches only the faces it paints. That
mechanism is already right — no work needed there.

- [x] **H1 · Split Ping, then get the engine off the boot path** — `apps/ping.html`
      456 KB → 55 KB plus `apps/ping/` (seven parts, cut at the file's own section
      banners). Classic scripts sharing top-level bindings, so **load order is the
      contract** and each file's header says so.
      `ping/lens.js` (114 KB) is wrapped in its own IIFE and exposes only
      `window.MirrorFlowAssistEngine`; every consumer already early-returned while
      it was absent, so it now has no script tag at all and loads on idle, on first
      prose, or on the diagnostics drawer opening.
      *Measured: mount 203 → 143 ms, DCL 186 → 131 ms, boot payload 462 → 353 KB.
      The split alone was a wash (196 ms / 464 KB) — it is the enabler, not the win.*
      *Caught in the act: the portable build shipped Ping with no engine, because the
      engine no longer had a tag for the builder to rewrite. The builder now scans for
      `window.__TGC_*_URL` and fails on a missing part; QC asserts both halves.* ✓
- [x] **H2 · Three.js out of `apps/codex.html`** — 654 KB of Three.js was inlined into
      a `<script id="weave-three-inline">`, 43% of Codex's payload, executing on every
      mount whether or not anyone opened the globe. Now `vendor/three.min.js`, loaded by
      `window.__tgcLoadThree` on first open of the globe view.
      `initGlobe()` already had a `if (!THREE)` branch that showed a dead-end message —
      that branch became the trigger, so the change is a loader plus six lines.
      *Measured: mount 303 → 219 ms, DCL 292 → 210 ms, payload 1411 → 749 KB (−47%).*
      *Unlike Sync's four libraries this carries **no** `integrity` attribute, and
      `vendor/README.md` says why: those came from a CDN with a published SRI hash to
      verify against, this came from inside our own file. It is a byte-for-byte
      relocation of code already running — no new trust, but no upstream verification
      either, and claiming an `integrity` would imply a check that never happened. The
      extracted copy's hash is recorded instead, so a change stays visible.* ✓
- [ ] **H3 · Sync's 1.35 MB single script** — **owned elsewhere · do not touch.**
      Sel is working on Sync outside this repo and will integrate the result here.
      Recorded so the measurement is not lost: it is now the heaviest app in the
      house (696 ms, 1 269 KB), one undivided `<script>` with nine labelled
      sections, `SHIFT NOTES` (239 KB) and `OT PLANNER UI` (231 KB) the largest.
      When the external work lands, the H1 playbook applies — split at the
      existing banners, then look for the deferral seams.
- [ ] **H4 · Codex's other on-demand surfaces** — `weave-atlas` (129 KB) and
      `reader-editor` (24 KB) behind their own openers.

## Phase G · MirrorFlow Insight

Design and digest contract: [`INSIGHT.md`](INSIGHT.md). F2 has landed, so digests
now accumulate as Ping is used. G1 stays gated on there being enough of them to
show something true — an Insight built against an empty ledger could only show
fiction, which is the thing Phase B2 and F1 both existed to remove.

- [ ] **G1 · `apps/insight.html`** — MirrorFlow's fourth instrument. Consumes
      digests via `tgcOnMissive`, stores under `tgc.appstore.insight`, computes
      the five signal families (trend · error profile · rhythm · load · drift).
      *Done when: it shows only what the digests support, and says "not enough
      yet — N of ~M" for everything they do not.*
- [ ] **G2 · Ping's rail gains memory** — across-time cards beside the
      in-the-moment ones, in the gap the source already marks as *"insight cards
      removed — placeholder until rebuild"*. The error profile is the sharpest:
      *"you've hit `its → it's` 14 times this month."*
      *Done when: the rail tells you something a single message cannot.*
- [ ] **G3 · Insight feeds the house** — the MirrorFlow door's pulse line and the
      shell's `Pulse` carry real writing signal instead of instrument counts.
      *Done when: the nave shows a true number that came from your own work.*

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
- [x] QC sweep automated — 49 checks across entry, pulse, all four skins, the
      handshake, motifs, altar, exchange, rites, satchel, mobile and the
      portable build; it also guards the canon (fails on any external request)
- [x] The checks live in the repo — `tools/qc.mjs` and `tools/lens.mjs`, with
      `tools/README.md`. They had been running from a scratch directory, so the
      "44 checks" line above was a claim the repo could not back and the suite
      died with the container. `lens.mjs` carries both halves of the rule check:
      the 111 fixtures, and the clean-prose corpus that must produce zero flags
- [x] Canon repair: Coach and Sync fetched Google Fonts on every mount, which
      broke the offline promise and leaked a request per open. Both now use the
      self-hosted faces; Cinzel falls back to the hosted Playfair
- [x] Sync's four CDN libraries vendored into `vendor/` (xlsx 0.18.5, exceljs
      4.4.0, jszip 3.10.1, html2canvas 1.4.1). Each pulled from its npm tarball
      and verified byte-for-byte against the SRI hash the page already trusted,
      so no new trust was introduced; `integrity` now guards our own copies. The
      portable builder inlines them too, so Sync finally works offline in both
      builds. **The house now makes zero external requests** — only the opt-in
      weather lookup remains, and QC fails if that changes
- [x] Post-deploy sanity confirmed on the live domain (5 Sep 2026, v2.8):
      rites **8/8 · all rites held**. The automated sweep runs against a clean
      checkout of the merged commit and covers everything except delivery
      (DNS, TLS, Pages) — that part needs a real browser on the real domain

## Horizon (not scheduled, kept on purpose)

- Sync and Coach as digest producers too, once Ping proves the shape
- Insight → Coach handoff: a period's error profile sent for coaching, closing
  the MirrorFlow ↔ Excelsior loop
- The Rift (Riftborn game) gets its bus only "when the rift opens"
