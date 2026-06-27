/* Jarvis/Pebble service worker (sub-project C) — offline app shell for the Safari PWA.
 *
 * Goal: the installed app OPENS OFFLINE so the durable IndexedDB outbox can drain when
 * connectivity returns. It caches only the static app shell + same-origin build assets.
 *
 * It deliberately NEVER caches:
 *   - Google / Drive API calls (googleapis.com, accounts.google.com) — auth + data must be live.
 *   - cross-origin requests in general.
 * Strategy: navigations -> network-first with a cached shell fallback; same-origin static assets
 * -> stale-while-revalidate; everything else (APIs) -> passthrough to network.
 *
 * Versioned cache name: bump CACHE_VERSION to invalidate on a new build.
 */
const CACHE_VERSION = 'jarvis-shell-v1';
// Resolve the scope base ('/', or '/iamanantshukla/') from the SW registration URL.
const BASE = new URL(self.registration.scope).pathname;
const SHELL_URL = BASE; // the SPA entry (index.html) is served at the base path

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll([BASE]).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isApiOrAuth(url) {
  return /(^|\.)googleapis\.com$/.test(url.hostname) ||
         /(^|\.)google\.com$/.test(url.hostname) ||
         /(^|\.)gstatic\.com$/.test(url.hostname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never interfere with writes
  const url = new URL(req.url);

  // Live network only for APIs/auth and any cross-origin request — never serve these from cache.
  if (url.origin !== self.location.origin || isApiOrAuth(url)) return;

  // SPA navigations: network-first, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(SHELL_URL).then((r) => r || caches.match(BASE)))
    );
    return;
  }

  // Same-origin static assets (hashed JS/CSS, icons): stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
