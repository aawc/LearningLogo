const APP_VERSION = 'v1.1.3';
const CACHE_NAME = 'learning-logo-' + APP_VERSION;
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Clean up legacy unversioned cache or older versions of learning-logo-*
          if (key === 'learning-logo-cache' || (key.startsWith('learning-logo-') && key !== CACHE_NAME)) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass cache for versions.json so client always discovers fresh releases
  if (url.pathname.endsWith('versions.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-cache' }));
    return;
  }

  // Bypass /releases/ subpaths so historical releases are opened from live URLs only without SW interference
  if (url.pathname.includes('/releases/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
