# The Hosted Apps

Every app is a self-contained HTML file under `apps/`, framed by the shell on demand.
Each carries `apps/bridge.js` in its head (app id + storage-shim fallback + key relay).
Manifest entries live in `APPS` inside `js/shell.js`.

| App | File | World | Status | What it is |
|---|---|---|---|---|
| **MirrorFlow Ping** | `apps/ping.html` | mirrorflow | active · v6 | Message mirror. The deepest build: theme system (pulse/slate/linen/paper + variants), workspace-mode dock, insights rail, editor + phone preview, Assist integration. |
| **MirrorFlow Sync** | `apps/sync.html` | mirrorflow | building · v64 | Schedules & continuity — parsing, cleaning and visualising schedule data. |
| **MirrorFlow Notes** | `apps/notes.html` | mirrorflow | active · v3 | Fast capture surface. Small and deliberately scoped. |
| **Excelsior Coach** | `apps/coach.html` | excelsior | active · v2.7 | Editorial sales coach. Modes: Home / Library / Facilitate / Build / Assess. Cream editorial default theme. |
| **the Codex** | `apps/codex.html` | riftborn | active · v2.0 | Riftborn terminal — rituals, design bibles, lore. |

## Contract with the shell

- **Announce**: on load an app may post `{ type: 'tgc.shell.hello', appId }` to the
  parent — the shell flushes any pending missives to it.
- **Send**: `{ type: 'tgc.exchange.send', packet }` where the packet declares
  `contract: 'theguide.exchange.v1'`, `from`, `to`, and payload fields.
- **Receive**: delivered packets arrive as `{ type: 'tgc.exchange.deliver', packet }`.
- **Keys**: the bridge relays Esc / Ctrl+K / Ctrl+1–4 upward automatically.
- **Storage**: use `localStorage` normally. Where it is blocked the bridge shims it
  and persists through the shell under `tgc.appstore.<id>`.

Apps never read each other's storage. If one app needs another's data, it travels as
an explicit exchange packet, accepted by the receiver — never silently.

## The Undercroft (sealed donors)

Retired codebases are **not** in this repo — the shell carries their records only
(the `ARCHIVE` list in `js/shell.js`): MirrorFlow Assist, Classic, Lite, the
Bible-era Sync cleaner, Excelsior Classic. Donors are quarries; engines are
harvested from them into the living apps, never patched in place.
