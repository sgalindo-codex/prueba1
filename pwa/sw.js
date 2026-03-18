// Service Worker – LEDUNI Controller
const CACHE = 'leduni-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // No cachear peticiones al controlador ESP32
  if (e.request.url.includes(':8080')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
