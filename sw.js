/* Mi Plata — service worker: lets the installed app open without internet.
   Network first (so updates arrive as soon as they're published), cache as fallback. */
const CACHE = 'miplata-v4';
const FILES = ['./', './index.html', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png',
  './fonts/playfair-display.woff2', './fonts/nunito-sans.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Serve the saved copy when there is no internet OR the site answers with an
// error (e.g. GitHub Pages turned off → 404), so the app keeps opening.
const fromCache = req => caches.match(req, { ignoreSearch: true })
  .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        }
        return fromCache(req).then(hit => hit || res);
      })
      .catch(() => fromCache(req))
  );
});
