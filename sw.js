/**
 * Service worker de CASA J.
 *
 * Estrategia: red primero con vuelta a la caché. Así siempre ves la última
 * versión si hay cobertura, y la app sigue funcionando dentro del súper
 * aunque no haya señal.
 */

const CACHE = 'casaj-v1';

const ARCHIVOS = [
  './',
  'index.html',
  'manifest.json',
  'css/estilos.css',
  'js/app.js',
  'js/store.js',
  'js/seed.js',
  'js/ui.js',
  'js/productoEditor.js',
  'js/importarCSV.js',
  'js/views/inventario.js',
  'js/views/lista.js',
  'js/views/compra.js',
  'js/views/catalogo.js',
  'js/views/ajustes.js',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia)).catch(() => {});
        return respuesta;
      })
      .catch(() =>
        caches.match(e.request).then((cacheada) => cacheada || caches.match('index.html'))
      )
  );
});
