# The Hosted Apps

Every app is a self-contained HTML file under `apps/`, framed by the shell on demand.
Each carries `apps/bridge.js` in its head (app id + storage-shim fallback + key relay).
Manifest entries live in `APPS` inside `js/shell.js`.

| App | File | World | Status | What it is |
|---|---|---|---|---|
| **MirrorFlow Ping** | `apps/ping.html` | mirrorflow | active · v6 | Message mirror. The deepest build: theme system (pulse/slate/linen/paper + variants), workspace-mode dock, insights rail, editor + phone preview, Assist integration. |
| **MirrorFlow Sync** | `apps/sync.html` | mirrorflow | building · v64 | Schedules & continuity — parsing, cleaning and visualising schedule data. |
| **MirrorFlow Notes** | `apps/notes.html` | mirrorflow | active · v4 | The workbench. Modes: Capture / Compose. Rebuilt on Excelsior's structure under the shell's own four grounds; first app to both seal and receive missives. |
| **Excelsior Coach** | `apps/coach.html` | excelsior | active · v2.7 | Editorial sales coach. Modes: Home / Library / Facilitate / Build / Assess. Cream editorial default theme. |
| **the Codex** | `apps/codex.html` | riftborn | active · v2.0 | Riftborn terminal — rituals, design bibles, lore. |

## Contract with the shell

- **Announce**: on load an app may post `{ type: 'tgc.shell.hello', appId }` to the
  parent — the shell flushes any pending missives to it.
- **Send**: `tgcSeal(kind, packet)` (from the bridge) posts
  `{ type: 'tgc.exchange.send', packet }` upward, stamping `contract`, `kind`,
  `from` and `at` for you.
- **Receive**: `tgcOnMissive(fn)` — delivered packets arrive as
  `{ type: 'tgc.exchange.deliver', packet }`.
- **Keys**: the bridge relays Esc / Ctrl+K / Ctrl+1–4 upward automatically.
- **Theme**: the bridge maps the shell's sky onto the app's own skins.
- **Storage**: use `localStorage` normally. Where it is blocked the bridge shims it
  and persists through the shell under `tgc.appstore.<id>`.

### theguide.exchange.v2 · the packet

Every missive declares what it **is**, so the receiver never has to guess:

| `kind` | Sigil | Means | What the inbox offers |
|---|---|---|---|
| `handoff` | ✦ | work handed to another instrument (Ping → Coach for review) | deliver into the target app |
| `digest` | ◈ | a summary, sealed for reading | open in the target app |
| `receipt` | ✓ | an acknowledgement that work was done | acknowledge (no app entry) |

```js
tgcSeal('handoff', {
  to: 'coach',                       // a known app id — required for handoff & digest
  subject: 'Hartley & Co · reply thread',
  coachSeed: 'The customer asked twice about pricing.',
  privacy: 'redacted'                // optional, shown in the inbox
});
```

The shell validates every packet at the door (`readPacket`): the contract must be
`theguide.exchange.v2` (v1 is still accepted and read as a `handoff`), the kind must
be known, and handoffs and digests must name a recipient that exists. Refusals toast
the reason. Valid packets queue in the inbox — **nothing reaches an app until a person
accepts it**. The vestry's *exchange contract* rite self-tests all of this.

Apps never read each other's storage. If one app needs another's data, it travels as
an explicit exchange packet, accepted by the receiver — never silently.

## The Undercroft (sealed donors)

Retired codebases are **not** in this repo — the shell carries their records only
(the `ARCHIVE` list in `js/shell.js`): MirrorFlow Assist, Classic, Lite, the
Bible-era Sync cleaner, Excelsior Classic. Donors are quarries; engines are
harvested from them into the living apps, never patched in place.
