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
