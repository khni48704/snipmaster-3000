// sw.js - Service Worker for SnipMaster 3000

// Cache names with version identifiers
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `snipmaster-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `snipmaster-dynamic-${CACHE_VERSION}`;
const SNIPPETS_CACHE = `snipmaster-snippets-${CACHE_VERSION}`;

// Files to cache initially (app shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/offline.html',
];

// Install event - cache app shell
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('Service Worker: Install Completed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');

  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, SNIPPETS_CACHE];

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // Filter caches that are outdated
        return cacheNames.filter(cacheName =>
          cacheName.startsWith('snipmaster-') && !currentCaches.includes(cacheName)
        );
      })
      .then(cachesToDelete => {
        // Delete old caches
        return Promise.all(
          cachesToDelete.map(cacheToDelete => {
            console.log('Service Worker: Deleting old cache', cacheToDelete);
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation Completed');
        return self.clients.claim();
      })
  );
});

// Cache-first strategy for static assets
function cacheFirst(event) {
  return caches.match(event.request)
    .then(cachedResponse => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise, fetch from network
      return fetch(event.request)
        .then(networkResponse => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();

          // Add to cache for future requests
          caches.open(STATIC_CACHE)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        });
    });
}

// Network-first strategy for dynamic content
function networkFirst(event) {
  return fetch(event.request)
    .then(networkResponse => {
      // Check if we received a valid response
      if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
        return networkResponse;
      }

      // Clone the response
      const responseToCache = networkResponse.clone();

      // Add to dynamic cache
      caches.open(DYNAMIC_CACHE)
        .then(cache => {
          cache.put(event.request, responseToCache);
        });

      return networkResponse;
    })
    .catch(() => {
      // If network fails, try the cache
      return caches.match(event.request)
        .then(cachedResponse => {
          // If found in cache, return it
          if (cachedResponse) {
            return cachedResponse;
          }

          // For HTML requests, return the offline page
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html');
          }

          // For other requests, just fail
          return null;
        });
    });
}

// Stale-while-revalidate strategy for user snippets
function staleWhileRevalidate(event) {
  return caches.open(SNIPPETS_CACHE)
    .then(cache => {
      return cache.match(event.request)
        .then(cachedResponse => {
          // Create a promise for updating the cache
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            })
            .catch(error => {
              console.error('Failed to update cache:', error);
              // Still return the cached response if available
              return null;
            });

          // Return the cached response immediately or wait for the network response
          return cachedResponse || fetchPromise;
        });
    });
}

// Fetch event - define different strategies based on URL
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip cache if the request explicitly asks for fresh content
  if (event.request.headers.get('Cache-Control') === 'no-cache') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 1. For API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event));
    return;
  }

  // 2. For snippet data
  if (url.pathname.includes('snippets') || event.request.headers.get('accept').includes('application/json')) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  // 3. For page navigation requests (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event));
    return;
  }

  // 4. For static assets (JS, CSS, images, etc.)
  if (url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')) {
    event.respondWith(cacheFirst(event));
    return;
  }

  // 5. Default strategy for everything else
  event.respondWith(networkFirst(event));
});