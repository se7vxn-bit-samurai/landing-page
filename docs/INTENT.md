# INTENT · why the shell exists and what it must feel like

> The reference for every design and build decision in this repo. When a change
> is argued about, it is argued against this file.

## What this is

**theGuide.Club** is one roof over four worlds — MirrorFlow (productivity),
Excelsior (the editorial sales coach, flagship), Riftborn (fables & the Codex),
and The Altar (where new ideas rest). The shell is the roof: a **living house**,
not a launcher, not a list of links.

## The thesis

**A living house, not a painted one.**
Every number shown is true. Every motion has a reason. The sky follows the real
hour, the real moon, optionally the real weather. If the house can't know
something, it doesn't pretend to — theatre that lies is cut (this is why the
fake pulse counters were removed in favour of visit stamps and candle counts).

## The voice

- **Cathedral-celestial, fully committed**: nave, chambers, vestry, undercroft,
  missives, rites, braziers, candles. Latin mottos. Never winking, never corporate.
- **Type law**: Playfair Display (display) · Cormorant Garamond italic (mottos) ·
  DM Sans (body) · DM Mono at small sizes with wide tracking (the system's voice).
- **Colour law**: gilt `#d4af37` is the house; each world one accent; everything
  else near-monochrome ink ramps. Status is a coloured dot, nothing louder.
- **Motion law**: slow and liturgical. Nothing snaps; nothing loops fast enough
  to nag. `prefers-reduced-motion` and the "still the nave" observance are honoured.

## The system canon

1. **Apps never read each other's storage** — explicit exchange packets only
   (`theguide.exchange.v1`), accepted visibly via the inbox, never silently.
2. **The shell owns the sky; the worlds own their rooms.** Each app keeps its own
   identity, but it listens to the sky: the theme handshake (`tgc.theme` over the
   bus) maps night/day/twilight onto each app's native skins.
3. **No external runtime dependencies.** Self-contained files, local fonts,
   fetch-on-demand apps, offline via service worker. Opt-in weather is the sole
   external call.
4. **Nothing is deleted.** Retired builds are sealed donors in the undercroft;
   guttered ideas are sealed, not erased. History is part of the product.
5. **Data is the user's.** Everything lives in `tgc.*` localStorage; the satchel
   carries all of it out and back in one plain-JSON file.

## Ecosystem placement

The shell serves **TheGuide.club** (umbrella). MirrorFlow is a **suite** —
Ping, Sync, Notes today; Insight and others may join — never collapsed into one
app. Excelsior and Riftborn are arms with their own voices. The Altar is a tier,
not a product: the intake valve for everything future.

## What the shell is not

- Not a dashboard of iframes — the nave must be worth lingering in (vigil mode
  exists because the idle nave should still be beautiful).
- Not a brochure — every panel leads somewhere real within two interactions.
- Not a framework — one shell, hand-made, inspectable, no build step.
