   // sw.js - Service Worker for SnipMaster 3000
   
   // Version identifier for our cache
   const CACHE_NAME = 'snipmaster-cache-v1';
   
   // Log events for easier debugging
   console.log('Service Worker: Loaded');
   
   // Files to cache initially
   const INITIAL_CACHED_RESOURCES = [
     '/',
     '/index.html',
     '/styles/main.css',
     '/scripts/app.js',
     '/manifest.json',
     '/offline.html'
   ];
   
// Install event listener
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    // Extend install event until caching is complete
    event.waitUntil(
      // Open our cache
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('Service Worker: Caching App Shell');
          // Add all resources to cache
          return cache.addAll(INITIAL_CACHED_RESOURCES);
        })
        .then(() => {
          console.log('Service Worker: Install Completed');
        })
    );
  });
  
  // Activate event listener
  self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    console.log('Service Worker: Activated');
  });
  
  // Fetch event listener - empty for now
  self.addEventListener('fetch', event => {
    // We'll implement offline fallback here
  });
   
   // Activate event listener - useful for cache management
   self.addEventListener('activate', event => {
     console.log('Service Worker: Activating...');
     
     // We'll expand this in the next exercise
     
     console.log('Service Worker: Activated');
   });
   
     // Update the fetch event in sw.js
     self.addEventListener('fetch', event => {
        console.log('Fetch request for:', event.request.url);
        
        // Only handle navigation requests (HTML pages)
        if (event.request.mode === 'navigate') {
          event.respondWith(
            // Try network first
            fetch(event.request)
              .catch(() => {
                // If network fails, return the offline page
                console.log('Network failed, returning offline page');
                return caches.match('/offline.html');
              })
          );
        } else {
          // For non-HTML requests, try the cache first
          event.respondWith(
            caches.match(event.request)
              .then(cachedResponse => {
                // Return from cache if found
                if (cachedResponse) {
                  console.log('Found in cache:', event.request.url);
                  return cachedResponse;
                }
                
                // Otherwise try the network
                return fetch(event.request)
                  .catch(error => {
                    console.error('Fetch failed:', error);
                    // If image, you could return a placeholder
                    // If other resources, just let it fail
                  });
              })
          );
        }
      });