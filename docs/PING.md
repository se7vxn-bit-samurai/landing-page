# MirrorFlow Ping · architecture

The communication mirror: one surface where you write a reply, and the house
tells you what you actually wrote before you send it.

`apps/ping.html` · the largest app in the repo. Read `docs/APPS.md` for the
shell contract every app shares; this file covers what is particular to Ping.

## The shape of the app

Three panes, left to right:

| Pane | Holds |
|---|---|
| **Left dock** | workspace mode, MirrorFlow mode switch |
| **Editor** (`#editorSurface`) | a `contenteditable` surface — the reply you are writing |
| **Phone rail** (`#phoneBody`) | a live preview of the reply as a message thread |
| **Insight rail** (`#railInsights`) | what the engine makes of what you wrote |

The editor is the input, the phone is the mirror, the rail is the judgement.
All three update from the same analysis pass.

## The Lens engine

Ping's analysis layer, exposed as `window.MirrorFlowAssistEngine`:

```js
MirrorFlowAssistEngine = {
  analyzeText,                  // the main entry — text in, findings out
  contract,                     // engine metadata
  rules, tests,                 // the registry and its fixtures
  runRuleTests,                 // the self-test suite
  buildRuleProfile, validateRuleProfile, exportProfile, importProfile,
  isRuleDisabled, disableRule, enableRule
}
```

### Rules come in two shapes

**Regex rules** (`TGC_LENS_PACK`) — a pattern, a replacement, a message:

```js
{ id:"lens.article.a_before_vowel", category:"grammar", subtype:"article",
  severity:"high", confidence:0.9,
  pattern:/\ba (?!(?:user|unique|…))([aeiou][a-z]+)\b/g,
  replacement:"an $1", message:"Use “an” before a vowel sound." }
```

**Structural rules** (`TGC_LENS_STRUCT`) — a `run()` function, for anything a
regex cannot express (spelling, sentence length, repetition):

```js
{ id:"lens.spelling.unknown_word", category:"grammar", subtype:"spelling",
  run({ text, lower, protectedSpans, push }) { … } }
```

Both are collected into `RULE_REGISTRY` and executed by `runRuleRegistry(text,
protectedSpans, ruleState)`. **191 rules** are active, covered by **83 fixture
tests** (see the diagnostics drawer).

### Rule categories

| Category | Rules | Note |
|---|---|---|
| `grammar` | 133 | articles, confusables, agreement, spelling |
| `tone` | 30 | informal, shorthand, apology load, robotic phrasing |
| `clarity` | 28 | hedging, vagueness, missing specifics |
| `style` | 0 | **declared, unpopulated** |
| `punctuation` | 0 | **declared, unpopulated** |

The last two are a real gap: the taxonomy promises coverage the engine does not
deliver. Tracked as Phase F3 in `GOALS.md`.

### The spelling ledger

Spelling uses a **bloom filter**, not a word list:

- `apps/lens/dict.js` — 2,643,264 bits, k=7 hashes, ~516 KB of base64.
- Membership test is `fnv(word, seed)` × 7 against the bit array.
- Unknown words get Norvig-style `edits1` candidates, ranked by a frequency list
  (`D.common`) shipped alongside the filter.
- Flags are capped at **8 per pass** to keep a wall of red off a long draft.

**Failure mode, stated plainly:** a bloom filter has no false negatives on
membership but does have false positives. A real misspelling can therefore be
waved through as "known". The engine **under-flags** rather than over-flags,
which is the safe direction for a tool people trust — but it means spelling
coverage is a floor, not a guarantee.

**Loading:** the ledger is *not* part of `ping.html`. It is fetched once, the
first time real prose reaches the spelling rule, then cached by the service
worker. The other 190 rules run regardless; spelling simply stays quiet until it
lands. See `window.__tgcLoadLensDict` in the head of `ping.html`.

The portable build inlines it (a blob URL cannot resolve a relative path) — see
`build-portable.py`.

### Rule profiles

Rules can be disabled per user and the set exported/imported as a **profile**
(`buildRuleProfile` / `validateRuleProfile`). Disabled ids live in
`disabledRuleIds`; a profile that fails validation is rejected with reasons
rather than partially applied.

## Boot discipline

Ping is a big app and boot is where big apps go wrong. Two rules, both learned
the hard way in Phase F1:

1. **Nothing is preloaded.** No sample thread, no draft, no seeded note. Each
   surface carries a quiet line saying what it waits for. An app that opens on
   invented content teaches you to clear it before you can work.
2. **Nothing expensive runs unasked.** The 80-case rule self-test runs on first
   open of the diagnostics drawer, not at mount. The spelling ledger downloads on
   first real prose, not at mount.

Measured effect of holding both (cold boot, nothing typed):

```
load             461 ms → 165 ms
payload          935 KB → 433 KB
DOM nodes          1881 → 1668
invented messages     6 → 0
ledger fetched  at 158ms → not at all
```

Any future change that reintroduces boot-time work should be weighed against
these numbers.

## Themes

Four native skins — `pulse` (jet black / neon), `slate` (dark teal), `linen`
(warm light), `paper` (cool light) — plus variant overrides for accent and glow.

The shell drives them: `apps/bridge.js` maps the house sky onto Ping's skins
(night→pulse, twilight→slate, day→linen, pop→paper). An in-app picker still works
between sky changes. See `docs/ARCHITECTURE.md`.

## Persistence

Everything under `tgc.appstore.ping` via the normal bridge path — drafts per
thread, side notes, rule profile, phone settings, layout state. The satchel
exports it with everything else.

## What Ping emits

On a completed send — never per keystroke — `tgcSealSendDigest()` runs one final
analysis pass and seals a `digest` to `insight`:

```js
{ to:'insight', surface:'reply',
  words, sentences, readingGrade, writingScore, clarityScore, tonePrimary,
  grammarHits:{ spelling:3, hedging:1 },   // category counts, never matched text
  toneHits, apologies, hedges, robotic,
  revisions, secondsToSend }
```

Three disciplines hold it honest:

1. **No content.** Counts and enums only. Nothing a person typed can survive into
   a digest, so nothing leaks through a shared satchel.
2. **No guessed zeros.** `readingGrade`, `writingScore`, `clarityScore` and
   `tonePrimary` are written only if the engine returned them. A missing field is
   fine; a zero meaning "unknown" is a lie.
3. **Never breaks a send.** The whole emitter is wrapped — if the engine throws or
   the app is running outside the shell, the message still sends.

Full contract and consumer design: `docs/INSIGHT.md`.

## Where Ping is going

- **F3 · style & punctuation rules** — populate the two empty categories.
- **F4 · spelling honesty** — surface the 8-flag cap when it bites.
- **G · the rail gains memory** — across-time cards beside the in-the-moment ones,
  fed by the digests F2 now produces.
