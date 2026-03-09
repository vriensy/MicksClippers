/* =============================================================
   SHARP JOBS — Service Worker
   Version: 1.0.0
   Description: Offline caching & background sync
   ============================================================= */

const CACHE_NAME = 'sharp-jobs-v1.0.0';
const ASSETS = [
  './', './index.html', './manifest.json',
  './js/db.js', './js/ui.js', './js/jobs.js',
  './js/delivery.js', './js/customers.js',
  './js/invoices.js', './js/dashboard.js',
  './js/settings.js', './js/updater.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}')));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
