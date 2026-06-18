# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the landing page / shell for **TheGuide** (`sel.theguide.club`), described as "one roof, four worlds." It is a **single-file static application** — the entire UI, styles, and JavaScript live in `index.html` (~6.6 MB). There is no build step, no package manager, and no test framework.

## Development Workflow

- Edit `index.html` directly. There is no compilation step.
- Deploy by pushing to `main`; GitHub Pages serves the site at `sel.theguide.club` (configured via `CNAME`).
- To preview locally, open `index.html` in a browser or run any static file server (e.g. `python3 -m http.server`).

## Architecture

The shell has two primary **views**, toggled by setting `document.body.dataset.view`:

| `data-view` | What's visible |
|---|---|
| `nave` (default) | The sky nav, world panels, constellation, celstial bodies |
| `frame` | The iframe frame + dockbar; nave is hidden |

### Key Data Structures (top of `<script>`)

- **`WORLDS`** — The four worlds: `mirrorflow`, `excelsior`, `riftborn`, `altar`. Each has `name`, `motto`, `tagline`, `status`, `accent`, `pulse`, `flagship`, and optionally `app` (the default app to launch for that world).
- **`APPS`** — Individual apps (e.g. `ping`, `sync`, `coach`, `codex`, `notes`). Each has `id`, `world`, `glyph`, `accent`, `status`, `version`, `localPath` (the iframe URL), and `kind`.
- **`DOCK`** — Ordered list of app IDs shown in the dockbar braziers: `['ping','sync','coach','codex']`.
- **`ORDER`** — Display order of worlds in the nave: `['mirrorflow','excelsior','riftborn','altar']`.
- **`STATUS`** — Maps status strings (`building`, `active`, `open`) to display label and dot color.
- **`KEYS`** — localStorage key constants under the `tgc.shell2.*` namespace.

### Core Singletons

**`Frame`** — manages the iframe layer:
- `Frame.enter(appId)` — launches an app by creating/reusing an iframe, switches to `frame` view, updates the dockbar.
- `Frame.ascend()` — returns to the `nave` view.
- `Frame.warm(appId)` — preloads an iframe without switching to it (max 3 iframes cached; LRU eviction).
- `Frame.iframes`, `Frame.order`, `Frame.active` track mounted iframes.

**`Bus`** — cross-frame message passing:
- Listens for `postMessage` from iframes. Apps announce themselves with `tgc.shell.hello` and receive packets via `tgc.exchange.deliver`.
- Incoming packets from iframes use `tgc.exchange.send`.
- `Bus.queue` persists to localStorage (`KEYS.inbox`) as draggable "missive" envelopes shown in the sky.
- `Bus.deliver(packet)` / `Bus.dismiss(packet)` route or discard missives.
- A demo packet is injected on first visit.

### UI Sections (in DOM order)

| Element | Role |
|---|---|
| `#gate` | Loading/threshold screen with animated progress bar |
| `#stars` | CSS star field background |
| `#nave` | Main navigation view |
| `#sky` | Top strip: constellation SVG, world orbs, sun/moon, missive envelope |
| `#tp-panels` | World panels (`.tp-panel[data-world]`), one per entry in `WORLDS` |
| `#frame` | iframe container; `#veil` overlay while loading |
| `#dockbar` | Persistent bar in frame view: brazier slots, app name, ascend button |
| `#chamber` | Modal-style content pane rendered by `moduleXxx()` functions |
| `#palette` | Command palette (keyboard shortcut: `/`) |
| `#toast` | Ephemeral toast notifications via `toast(msg)` |

### Module Rendering

Each world has a corresponding `moduleXxx(world)` function that returns an HTML string injected into `#ch-content`. These open the `#chamber` overlay when a world panel is clicked. Modules include live data from `WORLDS`, `APPS`, and localStorage ideas (`KEYS.altar`).

### Persistence

All state uses `localStorage` via the `lsGet`/`lsSet` helpers. Key namespaces:
- `tgc.shell2.session` — last active app per session
- `tgc.shell2.inbox` — pending missive queue
- `tgc.shell2.demoDone` — whether demo packet was shown
- `tgc.shell2.last` — last launched app ID (for "resume" button)
- `tgc.appstore.<appId>` — per-app key-value store, set/read by hosted iframes via postMessage

### Keyboard Shortcuts

- `/` — open command palette
- `1`–`4` — launch DOCK apps by position (while in frame view)
- `Esc` — ascend to nave (from frame), or close palette/chamber

### Theming

No CSS framework. Styles are inline in `<style>` blocks. World/app accent colors are applied via CSS custom properties (`--ac`, `--wash`, `--bc`, `--pc`). The time-of-day background tint is computed on load from `new Date().getHours()`.

### Responsive / Mobile

Layout adapts by a layered set of media queries at the end of the main `<style>` block. The strategy separates **pointer capability** from **viewport width** so phone rotation switches layouts cleanly:

- `@media (hover:none)` — touch devices always reveal door content (`.tp-reveal`) since there is no hover; hover-grow flex jumps are neutralized so a tapped door doesn't stick expanded.
- `@media (max-width:980px)` — collapses the chamber's inner grids to one column.
- `@media (max-width:680px)` — phone portrait: the sky band hides, `.tp-panels` becomes a vertical scrolling column of full-width door cards.
- `@media (max-height:480px) and (min-width:681px)` — short landscape: trims the sky band so the horizontal doors keep height.
- `@media (prefers-reduced-motion:reduce)` — disables all animation/transition.

Above 680px the doors stay in their horizontal "cathedral" layout with the sky visible, so a landscape phone (wider than portrait) gets the full desktop presentation. `touch-action:manipulation`, `-webkit-text-size-adjust:100%`, and `-webkit-tap-highlight-color:transparent` on the root remove tap delay, iOS landscape font inflation, and tap flash. The star field renders 60 nodes under 680px (vs 120) to cut animated DOM cost on phones.

## Conventions

- **No external dependencies** — everything is self-contained in `index.html`.
- **Status values** are `'building'`, `'active'`, or `'open'`; rendered via the `pip()` helper.
- **App URLs** are set via `localPath` in each `APPS` entry — update these when app deployment URLs change.
- **Braziers** (`.brz`) are the 3-slot frame indicators that track which iframes are mounted.
- The `$` helper is `document.querySelector`.
