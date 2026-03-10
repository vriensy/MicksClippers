/* =============================================================
   SHARP JOBS — Service Worker
   Version: 1.1.0
   Description: Offline-first. App loads entirely from cache.
                Network is only used for GitHub update/backup calls,
                which are made explicitly by the user — never automatically.
   ============================================================= */

const CACHE_NAME = 'sharp-jobs-v1.1.0';
const ASSETS = [
  './', './index.html', './manifest.json',
  './js/db.js', './js/ui.js', './js/jobs.js',
  './js/delivery.js', './js/customers.js',
  './js/invoices.js', './js/dashboard.js',
  './js/settings.js', './js/updater.js'
];

// Install: cache all app files immediately, don't wait
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete any old caches from previous versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: strictly offline-first
// - GitHub API/raw calls: pass straight through to network (user-triggered only)
// - Google Fonts: network with cache fallback
// - Everything else (app files): cache only, never touch network
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // GitHub — always network, user explicitly triggered this
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{"error":"offline"}', {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Google Fonts — network with cache fallback (for first load with internet)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
          return res;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // All app files — cache only, no network attempt
  // If not in cache (first ever load), fall back to network once to populate cache
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // Not cached yet — fetch once and store (only happens on very first load)
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
