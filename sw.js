/* ═══════════ theGuide service worker · network-first, cache fallback ═══════════
   Fresh when online, whole when offline. Apps, fonts, css and js are cached as
   they are fetched — nothing is pre-downloaded, everything is kept once seen.
   version.json is never cached: it powers the "new build" whisper in the topbar. */
const VER = 'tgc-shell-v2-partition-1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;                 // weather etc. go straight out
  if (url.pathname.endsWith('version.json')) return;          // always live
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VER).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
