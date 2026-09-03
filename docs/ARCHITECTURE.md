# theGuide Shell · Architecture

The landing page / shell for **theGuide.Club** (`sel.theguide.club`) — "one roof, four worlds."
As of the partition pass, the repo is a **multi-file static site**: the shell in `index.html`
+ `css/` + `js/`, each hosted app as its own file under `apps/`, fonts under `fonts/`.
No build step, no package manager. Deploy = push to `main` (GitHub Pages).

## Repo layout

```
index.html          the shell markup only (~7.5 KB) · head, topbar, gate, nave, frame,
                    chamber, inbox, rites, palette + the inline shell-guard script
css/shell.css       all shell styles: tokens, three skins, nave, chambers, palette
js/shell.js         the engine: manifest (WORLDS/APPS/…), Frame, Bus, chambers,
                    palette, themes, weather, vigil, boot
js/landing.js       the scroll landing (3 snap sections) · self-contained module
fonts/fonts.css     @font-face declarations → local woff2 files
fonts/*.woff2       19 faces: Playfair Display, Cormorant Garamond, DM Sans, DM Mono
apps/<id>.html      the five hosted apps: ping, sync, coach, codex, notes
apps/bridge.js      injected into every app <head> · app-id, storage shim, key relay
sw.js               service worker · network-first with cache fallback (offline after
                    first visit; version.json is never cached)
manifest.json       PWA manifest
version.json        build stamp · polled every 30 min for the "new build" whisper
docs/               this documentation
```

## Load order (index.html)

1. `fonts/fonts.css` + `css/shell.css` (head links)
2. inline **shell-guard** — localStorage shim if storage is blocked; must run first
3. static markup (topbar, gate, nave, frame, chamber, drawers, palette)
4. `js/shell.js` — defines everything, defers `boot()` via `setTimeout(0)`
5. `js/landing.js` — registers the landing and claims first-run entry **before**
   the deferred `boot()` fires. Keep this script order.

## How apps are delivered

Each entry in `APPS` carries `localPath: 'apps/<id>.html'`. `Frame.enter(id)` creates a
same-origin iframe pointed at that path; `Frame.warm(id)` pre-fetches it into the HTTP
cache. Nothing is embedded in the shell — **apps are fetched on demand** and the service
worker keeps them for offline return visits.

> History: the pre-partition monofile (~7.5 MB) carried all five apps as base64 inside a
> `v2-bootstrap` script that re-pointed `localPath` at blob URLs, plus ~850 KB of inline
> fonts. That machinery is gone; a portable single-file build can still be produced by a
> builder that re-inlines these pieces (the `data-src` attribute on the shell-guard
> script marks the assembly points).

## apps/bridge.js (injected into every app)

Replaces the injection the old bootstrap did at runtime. Three jobs:

1. **App id** — derived from the filename (`apps/ping.html` → `ping`), exposed as
   `window.__TGC_APP_ID`.
2. **Storage shim** — engages **only** where `localStorage` is blocked; seeds from the
   parent's `tgc.appstore.<id>` and persists back via a `tgc.ls.persist` postMessage
   (the listener lives in `js/shell.js`). Where storage works — the normal same-origin
   case — apps use real localStorage directly, exactly as they did under blob URLs.
3. **Key relay** — forwards Esc, Ctrl/Cmd+K and Ctrl/Cmd+1–4 to the shell as
   `tgc.keys` messages so shell shortcuts work while an app has focus.

## Views & core singletons

`document.body.dataset.view` toggles `nave` (sky + world panels) and `frame`
(iframe + topbar). Two singletons in `js/shell.js`:

- **`Frame`** — iframe manager. LRU cache (4 frames desktop / 2 on phones), pinning
  (right-click a brazier), veil while loading, session restore, `#app=<id>` deep links.
- **`Bus`** — the exchange. Iframes announce with `tgc.shell.hello`; packets declaring
  `contract: 'theguide.exchange.v1'` arrive via `tgc.exchange.send` and are delivered
  with `tgc.exchange.deliver`. Queued missives persist to `tgc.shell2.inbox` and render
  as the draggable envelope in the sky.

**Canon: apps never read each other's storage — explicit packets only.**

## Persistence map

| Key | Holds |
|---|---|
| `tgc.shell2.session` | last view + app (restore on return) |
| `tgc.shell2.inbox` | queued missives |
| `tgc.shell2.altar` | user-laid ideas |
| `tgc.shell2.last` | last launched app (resume pill) |
| `tgc.shell2.settings` | theme mode, observances, weather |
| `tgc.shell2.pins` / `.recents` | pinned braziers · palette recency |
| `tgc.appstore.<id>` | per-app store written via the bridge shim fallback |

The **satchel** (vestry → pack/unpack) exports and imports every `tgc.*` key as one
JSON file. The **rites** (vestry → run) self-test storage, blobs, canvas, fonts and
the bus on the current machine.

## Adding a new app

1. Drop `apps/<id>.html` (self-contained; include `<script src="bridge.js"></script>`
   first in `<head>`).
2. Add its entry to `APPS` in `js/shell.js` (`localPath: 'apps/<id>.html'`).
3. Optionally add it to `DOCK`, a world's `app`, and the palette picks it up
   automatically from `APPS`.

## Deploy notes

- Bump `version.json` on meaningful deploys — open tabs will whisper "⟳ new build".
- Bump `VER` in `sw.js` when cached assets change shape (old caches are purged on
  activate; network-first means stale cache is only ever served offline).
