const CACHE_NAME = 'swiftpos-v1';

// Install event: cache the basics immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like Google Fonts) for strict caching, 
  // or handle them loosely. Here we focus on the app's own assets.
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If network fetch is successful, cache the response
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // If network fails (offline), try to serve from cache
        return caches.match(event.request);
      })
  );
});