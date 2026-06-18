# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **TheGuide** — a portal/dashboard deployed as a single `index.html` file to GitHub Pages at `sel.theguide.club`. There is no build system, no package manager, and no external dependencies. All fonts, styles, and scripts are embedded inline.

## Development

No build step exists. Edit `index.html` directly and open it in a browser to verify changes. Deploy by committing and pushing to the repository — GitHub Pages serves the file automatically.

To preview locally, any static file server works:
```sh
python3 -m http.server 8080
# or
npx serve .
```

There are no tests, no linters, and no CI/CD pipelines.

## Architecture

### Single-File Structure

`index.html` (~1351 lines, 6.4MB) contains:
1. **`<style>` block 1** — Cormorant Garamond font-face declarations (WOFF2, base64-encoded)
2. **`<style>` block 2** — Main stylesheet (~360 lines): CSS custom properties, theming, layout, animations
3. **Shell HTML** — Five top-level `<div>` containers (see below)
4. **`<script>` block 1** — localStorage shim (Shell Guard)
5. **`<script>` block 2** — Core application logic (~650 lines)
6. **`<script>` block 3** — v2-Bootstrap: base64-encoded app payloads

### Shell Containers

| ID | Name | Role |
|---|---|---|
| `#gate` | The Threshold | Splash/loading screen shown on first load |
| `#nave` | Nave | Main navigation hub — constellation view of worlds |
| `#frame` | Frame | Iframe host container for loaded apps |
| `#dockbar` | Dockbar | Bottom dock — app switcher |
| `#chamber` | Chamber | Slide-in modal for world detail views |
| `#palette` | Command Palette | Ctrl+K global search/navigation overlay |

### World & App System

Four "worlds" organize the apps. Each world has an accent color, status, and Latin subtitle:

| World | Latin Name | Status | Accent | Apps |
|---|---|---|---|---|
| `mirrorflow` | Speculum Lucens | Building | `#5dd9ff` | ping, sync, notes |
| `excelsior` | Ars Vendendi | Active (Flagship) | `#d4a832` | coach |
| `riftborn` | Inter Mundos | Active | `#b98bff` | codex |
| `altar` | Nova Flamma | Open | `#e08b4a` | *(staging tier, not an app)* |

Apps are declared in the `APPS` constant:
```js
APPS = {
  ping:  { world: 'mirrorflow', kind: 'Message mirror',        version: 'v6',     status: 'active'   },
  sync:  { world: 'mirrorflow', kind: 'Schedules & continuity', version: 'v64',    status: 'building' },
  notes: { world: 'mirrorflow', kind: 'Capture surface',        version: 'v3',     status: 'active'   },
  coach: { world: 'excelsior',  kind: 'Editorial sales',        version: 'v0.1.7', status: 'active'   },
  codex: { world: 'riftborn',   kind: 'Riftborn terminal',      version: 'v2.0',   status: 'active'   }
}
```

### Frame Manager (LRU-3)

Apps load inside `<iframe>` elements. A **max-3 LRU cache** governs which iframes stay in the DOM — the least-recently-used frame is evicted when a fourth app is opened. This prevents unbounded memory growth across app switches.

### Exchange Bus

Inter-app communication uses a packet-based protocol over `postMessage`:
- **Contract**: `theguide.exchange.v1`
- Apps send typed packets; the shell bus routes them
- MirrorFlow produces packets consumed by Excelsior (e.g., Ping → Coach with conversation review data)
- Apps must never read each other's `localStorage` directly; all cross-app data flows through the bus

### Session Persistence

UI state (active world, open app, theme) is stored in `localStorage`. On revisit, the shell restores the previous session. The Shell Guard script at the top of the JS section provides a safe `localStorage` shim for browsers that block storage access.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl+K` | Open command palette |
| `Ctrl+1`–`4` | Switch between worlds |
| `1`–`5` | Open apps by index within current world |
| `Esc` | Close palette / chamber |
| Arrow keys | Navigate within palette |

### Coding Conventions

- Helper aliases: `$` = `document.querySelector`, `$$` = `document.querySelectorAll`
- Constants in `ALL_CAPS` (`WORLDS`, `APPS`, `KEYS`)
- Functions and variables in `camelCase`
- Statements terminated with semicolons
- `localStorage` access always wrapped in try-catch via the shell guard utilities

### Archive System

Sealed/retired app versions are tracked in a `DONORS` array and displayed in a separate archive section of the nave. These are read-only history entries — do not remove them.
