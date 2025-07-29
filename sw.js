
const CACHE_NAME = 'tv-cache-v4';
const URLS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/data.js',
  '/index.css',
  '/index.js',
  '/vue.js',
];

self.addEventListener('install', event => {
  console.log(`[SW-TV] Event: install (version: ${CACHE_NAME})`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_PRECACHE))
      .then(() => {
        console.log('[SW-TV] All app shell files have been cached.');
        // self.skipWaiting() 会强制新的 Service Worker 立即激活，跳过等待阶段。
        return self.skipWaiting();
      }).catch(e => console.error('[SW-TV] Precaching failed:', e))
  );
});

self.addEventListener('activate', event => {
  console.log(`[SW-TV] Event: activate (version: ${CACHE_NAME})`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW-TV] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  )
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log(`[SW-TV] Serving from cache: ${request.url}`);
          return cachedResponse;
        }
        return fetch(request);
      })
      .catch(error => {})
  );
});