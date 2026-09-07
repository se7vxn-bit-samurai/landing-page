# vendor · third-party libraries, served from this house

MirrorFlow Sync needs four libraries to read and write spreadsheets. They used to
be pulled from cdnjs and jsDelivr on every mount, which broke the canon this repo
states outright — *no external runtime dependencies* — meant Sync could not work
offline, and leaked a request to a third party each time the app opened.

They now live here and are served same-origin, so the service worker caches them
like everything else and Sync runs whole with no network.

| File | Package | Used for |
|---|---|---|
| `xlsx.full.min.js` | [xlsx](https://www.npmjs.com/package/xlsx) 0.18.5 | reading and parsing uploaded schedules |
| `exceljs.min.js` | [exceljs](https://www.npmjs.com/package/exceljs) 4.4.0 | writing styled .xlsx exports |
| `jszip.min.js` | [jszip](https://www.npmjs.com/package/jszip) 3.10.1 | zipping multi-file exports |
| `html2canvas.min.js` | [html2canvas](https://www.npmjs.com/package/html2canvas) 1.4.1 | rendering a view to an image |
| `three.min.js` | Three.js r150-era UMD build | Codex · The Weave's affinity globe |

## Three.js is different, and the difference matters

The four Sync libraries above came from a CDN, so there was a published SRI hash to
check them against. `three.min.js` did not: it was **already inlined inside
`apps/codex.html`**, 654 KB of it, executing on every Codex mount. Extracting it here
is a byte-for-byte relocation of code the repo was already running — no new trust was
introduced, but equally, **no upstream verification was possible**, because there is
no external hash to verify against.

So it carries no `integrity` attribute. Claiming one would imply a check that never
happened. What is recorded instead is the hash of the copy as extracted:

```
sha384-sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O
```

That makes a future change to this file *visible* — run the command under "Updating a
library" and compare — without pretending it was verified against three.js upstream.
If this ever needs to become a real supply-chain guarantee, replace the file from the
`three` npm tarball at a pinned version and add the `integrity` attribute then.

The build is a UMD bundle that warns it is deprecated from r150 and slated for removal
at r160, so a future upgrade means moving The Weave to ES modules, not swapping the
file.

## Provenance

Each file was taken from the package's own npm tarball (`npm pack <pkg>@<version>`,
`dist/` entry) and verified byte-for-byte against the **SRI hash the page was
already trusting** on the CDN. All four matched, so what is vendored here is
exactly the code Sync had been executing — no new trust was introduced by moving it.

The `integrity` attribute stays on each `<script>` tag in `apps/sync.html`. It now
guards our own copy: if a file here is altered, the browser refuses to run it.

## Updating a library

1. `npm pack <package>@<new-version>` and take the file from `package/dist/`.
2. Compute the new hash:
   `openssl dgst -sha384 -binary <file> | openssl base64 -A`
3. Replace the file **and** the matching `integrity="sha384-…"` in `apps/sync.html`.
   Skipping step 3 makes the browser silently refuse the script.
4. Update the version in the table above, and bump `VER` in `sw.js` so caches turn over.

`three.min.js` has no `integrity` attribute to update (see above); update the recorded
hash in this file instead, so the change stays visible in the diff.

## Loading

Sync's four libraries load as ordinary `<script src="../vendor/…">` tags. Three.js does
not: it loads on first open of The Weave's globe view, via `window.__tgcLoadThree` in
the head of `apps/codex.html`. `build-portable.py` finds it by scanning for
`window.__TGC_*_URL` declarations and inlines it, the same way it handles Ping's Lens
engine and spelling ledger — and fails the build if the named file is missing.
