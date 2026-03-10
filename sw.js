/* =============================================================
   SHARP JOBS — Service Worker
   Version: 1.2.0
   Description: Cache-first for instant offline loads.
                Updates are handled explicitly via the in-app
                update system — never automatically.
                GitHub API calls always bypass the cache.
   ============================================================= */

const CACHE_NAME = 'sharp-jobs-v1.2.0';
const ASSETS = [
  './', './index.html', './manifest.json',
  './js/db.js', './js/ui.js', './js/jobs.js',
  './js/delivery.js', './js/customers.js',
  './js/invoices.js', './js/dashboard.js',
  './js/settings.js', './js/updater.js'
];

// Install: pre-cache all app files immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete any old version caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Allow the app to trigger immediate SW activation after an update
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // GitHub API — always network, never cached
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{"error":"offline"}', {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Google Fonts — cache first, network fallback on first load
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

  // All app files — cache first, instant offline load
  // Updates only happen when user explicitly taps Check for Updates
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // Not in cache yet (first ever load) — fetch and store
      return fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        return res;
      });
    })
  );
});
