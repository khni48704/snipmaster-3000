// sw.js - Service Worker for SnipMaster 3000

// Cache names with version identifiers
const STATIC_CACHE = 'snipmaster-static-v1';
const DYNAMIC_CACHE = 'snipmaster-dynamic-v1';
const SNIPPETS_CACHE = 'snipmaster-snippets-v1';

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
        return cacheNames.filter(cacheName => 
          cacheName.startsWith('snipmaster-') && !currentCaches.includes(cacheName)
        );
      })
      .then(cachesToDelete => {
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

// Fetch event - will be implemented in next steps
self.addEventListener('fetch', event => {
  // We'll implement our strategies here
});


// Cache-first strategy for static assets
function cacheFirst(event) {
  return caches.match(event.request)
    .then(cachedResponse => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }
      
      self.addEventListener('fetch', (event) => {
        const url = new URL(event.request.url);
    
        // Handle different URLs with different strategies
        
        // 1. For API requests (if your app has them)
        if (url.pathname.startsWith('/api/')) {
            event.respondWith(networkFirst(event));
            return;
        }
    
        // 2. For snippet data
        if (
            url.pathname.includes('snippets') ||
            event.request.headers.get('accept').includes('application/json')
        ) {
            event.respondWith(staleWhileRevalidate(event));
            return;
        }
    
        // 3. For page navigation requests
        if (event.request.mode === 'navigate') {
            event.respondWith(networkFirst(event));
            return;
        }
    
        // 4. For static assets (JS, CSS, images, etc.)
        if (
            url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.ico')
        ) {
            event.respondWith(cacheFirst(event));
            return;
        }
    
        // 5. Default strategy for everything else
        event.respondWith(networkFirst(event));
    });
    
    });
}

// Add this to your sw.js file

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
          caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseToCache);
          });

          return networkResponse;
      })
      .catch(() => {
          // If network fails, try the cache
          return caches.match(event.request).then(cachedResponse => {
              // If found in cache, return it
              if (cachedResponse) {
                  return cachedResponse;
              }

              // For HTML requests, return the offline page
              if (event.request.headers.get('accept').includes('text/html')) {
                  return caches.match('/offline.html');
              }

              // For other requests, we'll just have to fail
              // You could return fallback images, etc. here
          });
      });
}

// Add this to your sw.js file
// Stale-while-revalidate for user snippets

function staleWhileRevalidate(event) {
  return caches.open(SNIPPETS_CACHE).then((cache) => {
    return cache.match(event.request).then((cachedResponse) => {
      // Create a promise for updating the cache
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        })
        .catch((error) => {
          console.error("Failed to update cache:", error);
          // We still return null here to fall back to cached response
          return null;
        });

      // Return the cached response immediately or wait for the network response
      return cachedResponse || fetchPromise;
    });
  });
}