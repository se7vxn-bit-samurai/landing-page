# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the landing page / shell for **TheGuide** (`sel.theguide.club`), described as "one roof, four worlds." It is a **multi-file static site** — no build step, no package manager, no test framework. The shell lives in `index.html` + `css/shell.css` + `js/shell.js` + `js/landing.js`; each hosted app is its own self-contained file under `apps/`; fonts are local woff2 under `fonts/`.

Full architecture reference: `docs/ARCHITECTURE.md`. App contract & inventory: `docs/APPS.md`. Ping internals: `docs/PING.md`. Insight design + digest contract: `docs/INSIGHT.md`.

## Development Workflow

- Edit the file that owns the concern: markup → `index.html`, shell styles → `css/shell.css`, shell logic → `js/shell.js`, scroll landing → `js/landing.js`, an app → `apps/<id>.html`.
- Deploy by pushing to `main`; GitHub Pages serves the site at `sel.theguide.club` (configured via `CNAME`). Bump `version.json` on meaningful deploys (open tabs poll it and whisper "new build"); bump `VER` in `sw.js` when cached assets change shape.
- To preview locally, run any static file server from the repo root (e.g. `python3 -m http.server`). Plain `file://` won't fetch the split assets — serve it.

## Architecture

Product intent and design canon: `docs/INTENT.md`. Roadmap/backlog: `docs/GOALS.md` — keep its checkboxes current as work lands.

The shell has two primary **views**, toggled by setting `document.body.dataset.view`:

| `data-view` | What's visible |
|---|---|
| `nave` (default) | The sky nav, world panels, constellation, celestial bodies |
| `frame` | The iframe frame + topbar; nave is hidden |

First-run entry is owned by the **scroll landing** (`js/landing.js`, 3 snap sections); the older `#gate` threshold only fires for non-first-run paths. Script order in `index.html` matters: `js/shell.js` defers `boot()` with `setTimeout(0)` so `js/landing.js` can register first.

### Key Data Structures (top of `js/shell.js`)

- **`WORLDS`** — The four worlds: `mirrorflow`, `excelsior`, `riftborn`, `altar`. Each has `name`, `motto`, `tagline`, `status`, `accent`, `palette`, `flagship`, and optionally `app` (the default app to launch for that world).
- **`APPS`** — Individual apps (`ping`, `sync`, `coach`, `codex`, `notes`, `insight`). Each has `id`, `world`, `glyph`, `accent`, `status`, `version`, `localPath` (the iframe URL, `apps/<id>.html`), and `kind`.
- **`DOCK`** — Ordered list of app IDs shown in the topbar braziers: `['ping','sync','coach','codex']`.
- **`ORDER`** — Display order of worlds in the nave: `['mirrorflow','excelsior','riftborn','altar']`.
- **`STATUS`** — Maps status strings (`building`, `active`, `open`, `soon`, `archived`) to display label and dot color.
- **`ARCHIVE` / `EXCHANGE` / `IDEAS`** — sealed donors (undercroft), per-world bus contracts, and altar ideas.
- **`KEYS`** — localStorage key constants under the `tgc.shell2.*` namespace.
- **`Pulse`** — honest live signals (visit stamps under `tgc.shell2.visits`, altar counts, per-world instrument counts) feeding door reveals, chamber stat rows and MirrorFlow cards. Never show an invented number; extend `Pulse` instead.

### Core Singletons

**`Frame`** — manages the iframe layer:
- `Frame.enter(appId)` — launches an app by creating/reusing a same-origin iframe pointed at its `localPath`, switches to `frame` view, updates the braziers.
- `Frame.ascend()` — returns to the `nave` view.
- `Frame.warm(appId)` — pre-fetches an app file into the HTTP cache without mounting it.
- LRU cache: 4 mounted frames on desktop, 2 on phones; pinned braziers (right-click) are never evicted.

**`Bus`** — cross-frame message passing:
- Listens for `postMessage` from iframes. Apps announce themselves with `tgc.shell.hello` and receive packets via `tgc.exchange.deliver`.
- Incoming packets use `tgc.exchange.send` and are validated by `readPacket()`: contract `theguide.exchange.v2` (v1 accepted, read as a handoff), a known `kind` (`handoff` · `digest` · `receipt`), and an existing recipient for handoffs and digests. Refusals toast the reason. Apps produce with `tgcSeal(kind, packet)` and consume with `tgcOnMissive(fn)` — both from `apps/bridge.js`. Full contract: `docs/APPS.md`.
- `Bus.queue` persists to localStorage (`KEYS.inbox`) as the draggable "missive" envelope shown in the sky; the full queue lives in the Inbox drawer.
- **Digests never queue.** A `digest` is telemetry, not correspondence — it bypasses the human inbox entirely and appends to the capped ledger at `KEYS.digests` (`tgc.shell2.digests`, 2000 entries, oldest-first eviction). `Bus.flushLedger(id, win)` replays a recipient's backlog as `tgc.exchange.ledger` when it mounts and says hello.
- `Bus.deliver(packet)` / `Bus.dismiss(packet)` route or discard missives.

### The app bridge (`apps/bridge.js`)

Every app's `<head>` loads `bridge.js` first. It derives the app id from the filename, installs a localStorage shim **only where storage is blocked** (persisting through the shell via `tgc.ls.persist` under `tgc.appstore.<id>`), relays Esc / Ctrl+K / Ctrl+1–4 to the shell, and applies the **theme handshake**: the shell broadcasts `{type:'tgc.theme', theme:'night'|'day'|'twilight'}` on mount/hello/sky-change and the bridge maps it onto each app's native skins (ping/notes: pulse·slate·linen; coach: press·cream; sync/codex opt out). When adding a new app, include this script tag and add a manifest entry to `APPS`.

### UI Sections (in DOM order)

| Element | Role |
|---|---|
| `#topbar` | Persistent strip: home seal, braziers, missive badge, theme toggle, tips |
| `#gate` | Threshold screen (non-first-run entry only) |
| `#stars` / `.aurora` / `.weather` | Background layers |
| `#nave` | Main navigation view |
| `#sky` | Top strip: constellation SVG, world orbs, sun/moon, missive envelope |
| `#tp-panels` | World panels (`.tp-panel[data-world]`), one per entry in `WORLDS` |
| `#frame` | iframe container; `#veil` overlay while loading |
| `#chamber` | Modal-style content pane rendered by `moduleXxx()` functions |
| `#inbox` / `#rites` | Drawers: missive queue · environment self-test |
| `#palette` | Command palette (Ctrl+K) |
| `#toast` | Ephemeral toast notifications via `toast(msg)` |
| `#landing` | Scroll landing, appended by `js/landing.js` |

### Module Rendering

Each world has a corresponding `moduleXxx(world)` function in `js/shell.js` that returns an HTML string injected into `#ch-content`. These open the `#chamber` overlay when a world panel is clicked. Two extra chambers exist beyond the worlds: the **undercroft** (sealed donors) and the **vestry** (settings, satchel export/import, rites, storage meters).

### Persistence

All state uses `localStorage` via the `lsGet`/`lsSet` helpers. Key namespaces:
- `tgc.shell2.*` — session, inbox, altar ideas, settings, pins, recents, last app
- `tgc.appstore.<appId>` — per-app key-value store written via the bridge shim fallback

The **satchel** (vestry) exports/imports every `tgc.*` key as one JSON file.

### Keyboard Shortcuts

- `Ctrl+K` — command palette · `Ctrl+1–4` — switch DOCK apps
- `1`–`6` — open chambers (worlds, undercroft, vestry) from the nave
- `←`/`→` — walk chambers · `Ctrl+←/→` — cycle warm frames · `H` — home · `Esc` — ascend/close

### Theming

No CSS framework. Four skins via `:root[data-theme]` token overrides in `css/shell.css`: night (default), day ("the nave at noon" — warm stone/pale gold/ink-on-paper), twilight, and pop (Muizenberg colourpop — chosen only, `auto` never derives it). `auto` mode follows the clock with a continuous sky tint. World/app accents are applied via CSS custom properties (`--ac`, `--wash`, `--bc`, `--pc`); chambers re-skin via `--c*` variables from each world's `palette`.

## Conventions

- **No external runtime dependencies** — the shell and every app are self-contained. Fonts live in `fonts/`, Sync's spreadsheet libraries in `vendor/` (see `vendor/README.md` before touching them). The only outbound call in the whole house is opt-in weather (Open-Meteo); the QC suite fails on any other external request.
- **Status values** are `'building'`, `'active'`, or `'open'`; rendered via the `pip()` helper.
- **App URLs** are set via `localPath` in each `APPS` entry — update these if app files move. An app declared with `status:'soon'` and `localPath:null` is a promise, not a build; the rites count it as declared rather than broken.
- **Braziers** (`.brz`) are the 4-slot frame indicators in the topbar that track mounted iframes.
- The `$` helper is `document.querySelector`; `$$` is `querySelectorAll` as an array.
- Canon: **apps never read each other's storage — explicit exchange packets only.**
