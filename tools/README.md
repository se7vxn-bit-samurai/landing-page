# tools

Checks and build machinery. **Not shipped** — nothing here is fetched by the site,
and the no-external-dependencies rule applies to what ships, not to what checks it.

| File | What it does |
|---|---|
| `qc.mjs` | The house sweep · 44 checks, entry to portable build |
| `lens.mjs` | Ping's rule suite (the floor) + a clean-prose corpus (the ceiling) |
| `../build-portable.py` | Regenerates the single-file offline edition |

## Running them

Playwright is the only dependency. It is declared in `package.json` but never
vendored — `node_modules/` is ignored, and nothing here ships to the site:

```sh
npm install && npx playwright install chromium
python3 -m http.server 8901          # from the repo root, in another shell
python3 build-portable.py            # qc.mjs reads its output
node tools/qc.mjs
node tools/lens.mjs
```

`CHROMIUM` overrides the browser binary, `PORTABLE` the portable build's path,
`BASE` the server URL. Both scripts exit non-zero on failure, so they drop into a
hook or a CI step unchanged.

## Why `lens.mjs` is separate

The fixture suite inside `apps/ping.html` proves each rule fires on the text it
exists for. It cannot prove the opposite — that a rule stays quiet on writing that
is already correct. `lens.mjs` runs both halves:

- **the floor** · 111 fixtures, plus a guard that no declared category or headline
  subtype ships empty
- **the ceiling** · 15 ordinary, correctly-written replies that must produce zero
  flags

The ceiling is the half that earns its keep. It is where the F3 passive-voice rule
was caught flagging *"the report is attached"* — a state, not a hidden actor — and
it is the check to extend when a new rule turns out to be too eager.
