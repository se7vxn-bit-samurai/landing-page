# theGuide.Club · landing page & shell

The home of **theGuide.Club** (`sel.theguide.club`) — one roof over four worlds:
MirrorFlow, Excelsior, Riftborn, and The Altar.

A multi-file static site with no build step. The shell (`index.html` + `css/` + `js/`)
frames five self-contained apps under `apps/`, fetched on demand and cached for offline
by a service worker.

- **Run locally**: `python3 -m http.server` in the repo root, open `http://localhost:8000`.
- **Deploy**: push to `main` — GitHub Pages serves it (domain via `CNAME`).
- **Docs**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/APPS.md`](docs/APPS.md)
