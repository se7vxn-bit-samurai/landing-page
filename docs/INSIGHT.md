# MirrorFlow Insight · the memory of the mirror

> Design and contract. Written **before** either half is built, so Ping's emitter
> and Insight's reader are written against the same thing. Nothing here is live
> yet — see the status table at the bottom for what exists.

## The thesis

Every instrument in MirrorFlow is a **single-moment** tool.

Ping measures every message you write — writing score, reading load, voice
pressure, grammar hits — and throws all of it away the moment you send. Sync
cleans a schedule and forgets. Coach reviews a call and forgets.

So the house cannot answer the one question a mirror should answer:
**am I actually getting better at this?**

Insight is the layer that keeps what the instruments noticed, so the arc becomes
visible. Ping is the mirror in the moment. Sync is continuity across days.
Insight is the pattern across both.

## The constraint that shapes everything

Canon: **apps never read each other's storage — explicit packets only.**

Insight therefore knows exactly what the instruments choose to tell it, and
nothing else. That is not a limitation to work around; it is the design:

**A digest carries measurements, never content.**

No message text. No customer names. No schedule rows. Nothing that could leak if
a satchel is shared or a device is lost. The privacy property falls out of the
architecture instead of being bolted onto it.

## The digest contract

Producers seal digests with the bridge helper (see `docs/APPS.md` for the full
exchange contract). Insight is the recipient:

```js
tgcSeal('digest', {
  to: 'insight',
  surface: 'reply',        // which part of the app produced this
  at: 1788600000000,       // stamped by tgcSeal if omitted

  // shape of the writing
  words: 84, sentences: 6, readingGrade: 6,

  // what the engine judged
  writingScore: 0.14,      // 0..1 · lower is heavier going
  apologies: 0, hedges: 2, robotic: 0,

  // which rules actually fired, by category — never the matched text
  grammarHits: { article: 1, confusion: 2, spelling: 1 },
  toneHits: 0,

  // how the writing happened
  revisions: 3, secondsToSend: 240
});
```

**Rules for producers**

1. Emit on a completed act (a send, a cleaned sheet, a finished review) — never
   per keystroke. One digest per act.
2. Numbers and enums only. If a field could contain something a person typed,
   it does not belong in a digest.
3. Category counts, not matched strings: `{ confusion: 2 }`, never
   `["its → it's on line 3"]`.
4. Omit a field you cannot measure honestly. A missing field is fine; a zero
   that means "unknown" is a lie.

## What Insight computes

Five families. Each is only answerable **across** digests — none can be derived
from a single one, which is exactly why this layer has to exist.

| Signal | The question it answers | Needs |
|---|---|---|
| **Trend** | Is my writing score moving, week over week? | ~20 digests |
| **Error profile** | Which rules do *I* personally break most? | ~15 digests |
| **Rhythm** | Does clarity drop after 16:00? On Mondays? | ~40 digests |
| **Load** | How much am I writing, and when? | ~10 digests |
| **Drift** | Am I getting more apologetic or hedged over time? | ~30 digests |

The **error profile** is the sharpest of the five. It turns a generic grammar
checker into *your* grammar checker: the rules you personally break, ranked, with
counts. Nothing else in the house can produce it.

## Where the outputs are viewed

Five surfaces, in order of how much they matter:

### 1 · Ping's insight rail — highest value, and it already exists
Ping's right rail shows *this message*: `Writing score · Heavy · 14%`,
`Reading load · grade 6`, `Voice pressure · 0 apologies`. The source carries a
comment reading *"insight cards + tone detail removed — placeholder until
rebuild"*. That gap is where the across-time layer belongs, beside the
in-the-moment one:

> *"You've hit `its → it's` 14 times this month — your most common miss."*

Caught while writing, not in a report nobody opens.

### 2 · Insight's own chamber — `apps/insight.html`
The full view: trend line, ranked error profile, rhythm-of-day, load. MirrorFlow's
fourth instrument, launched from the moonring alongside Ping, Sync and Notes.

### 3 · The MirrorFlow door in the nave
The panel's pulse line reads `3 instruments · 2 active` today. With Insight it can
carry real signal — `writing score up 6% this week` — visible without opening
anything.

### 4 · The shell's Pulse and chamber stat rows
`Pulse` (in `js/shell.js`) was built to report only true things. Insight is its
first real feed beyond visit stamps.

### 5 · A handoff to Excelsior Coach
`tgcSeal('handoff', { to:'coach' })` carrying a period's error profile — *"here is
what I keep getting wrong, coach me on it."* The cross-arm loop MirrorFlow and
Excelsior were always meant to close.

## What Insight must never do

- **Never invent.** With three digests it says *"not enough yet — 3 of ~20 needed
  for a trend"*, not a flat line pretending to be data. The honest empty state is
  a feature, and it is the same rule the shell follows after B2.
- **Never read storage.** If an instrument did not seal it, Insight does not know
  it. No reaching into `tgc.appstore.ping`.
- **Never become a vanity dashboard.** Every number must be able to change a
  decision. A metric nobody acts on gets cut, not kept for the look of it.
- **Never retain content.** If a digest ever needs message text to be useful, the
  metric is wrong — redesign the metric.

## How a digest reaches Insight

A digest is telemetry, not correspondence — it must never ask a human to decide
what to do with it. So the shell splits the two at the door:

- `Bus.receive()` sends anything with `kind:'digest'` to `Bus.ledger()` instead of
  `Bus.queue`. It never appears in the inbox, never rings the missive badge.
- The ledger is `tgc.shell2.digests` — append-only, capped at 2,000 entries with
  oldest-first eviction.
- If the recipient is mounted, the packet is posted straight into its frame.
- When a recipient mounts and says hello, `Bus.flushLedger()` replays its whole
  backlog as one `{type:'tgc.exchange.ledger', packets:[…]}` message. **Insight
  therefore sees every digest sealed before it existed** — which is what makes
  building it after Ping viable.

## Storage

Insight keeps its own rolling store under `tgc.appstore.insight`, written through
the normal bridge path:

- Digests are appended as received, capped (proposed: 2,000 entries ≈ a year of
  heavy use) with oldest-first eviction.
- Derived aggregates are recomputed from the raw store, never stored as the only
  copy — so a changed metric can be re-derived from history.
- The satchel already exports `tgc.*`, so Insight history travels with everything
  else and needs no separate export path.

## Sequencing — why this cannot be built first

Ping emits nothing today. An Insight built now could only display fiction — the
exact thing torn out of the shell in Phase B2 and out of Ping in Phase F1.

1. **Ping emits digests** (Phase F2) — ✅ done.
2. **Digests accumulate** — you use Ping normally. This step cannot be shortcut.
3. **Insight reads them** (Phase G) — and has something true to show on day one.

## Status

| Piece | State |
|---|---|
| Exchange v2 `digest` kind | ✅ live (Phase E) |
| `tgcSeal` / `tgcOnMissive` in the bridge | ✅ live (Phase E) |
| This contract | ✅ written |
| Shell digest ledger (`tgc.shell2.digests`) | ✅ live (Phase F2) |
| Ping emits digests | ✅ live (Phase F2) |
| `apps/insight.html` | ⏳ Phase G |
| Ping rail shows across-time cards | ⏳ Phase G |
| Nave door / Pulse fed by Insight | ⏳ Phase G |
| Handoff to Coach | ⏳ horizon |
