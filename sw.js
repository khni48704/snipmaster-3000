// En service worker er et stykke JavaScript-kode, der kører i baggrunden i en webbrowser og 
//muliggør funktioner som offline-adgang, push-notifikationer og caching af indhold

// Bruges til at identificere og organisere forskellige typer cache
const STATIC_CACHE = 'snipmaster-static-v1';
const DYNAMIC_CACHE = 'snipmaster-dynamic-v1';
const SNIPPETS_CACHE = 'snipmaster-snippets-v1';

// Disse filer bliver cached under installationen, så appen kan virke offline
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/scripts/js/storage.js',
  '/scripts/js/ui.js',
  '/offline.html',
];

// Service worker installeres og cacher app shell-filer
// Service worker livscyklus starter her, med install, ved at cahche app-shell filer (index.html, css..) 
//-> mugighed for offline 
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

// Når service worker aktiveres, ryddes gamle caches op
// Active fasen i livscyklusen: ryder gamle cache og sikrer, 
//at den nye service worker straks tager kontrol over åbne tabs
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

// Her vil vi implementere vores cache-strategier senere
// feacth fasen i livsyklussen: Fetch-fasen bruges til at intercept netværksanmodninger 
//og vælge en cache-strategi, afhængig af typen af forespørgse
self.addEventListener('fetch', event => {
  // Strategier til håndtering af forespørgsler implementeres her
});

// === CACHE-FIRST STRATEGI ===
// Bruges til statiske filer: hent fra cache først, ellers fra netværket
function cacheFirst(event) {
  return caches.match(event.request)
    .then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      self.addEventListener('fetch', (event) => {
        const url = new URL(event.request.url);


        // 1. For API requests
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

        // 4. For static filer (JS, CSS, images...)
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


// === NETWORK-FIRST STRATEGI ===
// Bruges til dynamisk indhold: forsøg netværk først, ellers fallback til cache
function networkFirst(event) {
  return fetch(event.request)
    .then(networkResponse => {
      if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
        return networkResponse;
      }

      // Gem kopien af respons i dynamic cache
      const responseToCache = networkResponse.clone();

      // Add to dynamic cache
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(event.request, responseToCache);
      });

      return networkResponse;
    })
    .catch(() => {
      // Ved netværksfejl: forsøg at hente fra cache
      return caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Hvis det er en HTML-forespørgsel, returnér offline-side
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/offline.html');
        }
      });
    });
}

// === STALE-WHILE-REVALIDATE STRATEGI ===
// Returnér straks cachet indhold, men opdater i baggrunden fra netværk
function staleWhileRevalidate(event) {
  return caches.open(SNIPPETS_CACHE).then((cache) => {
    return cache.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        })
        .catch((error) => {
          console.error("Failed to update cache:", error);
          return null;
        });

      return cachedResponse || fetchPromise;
    });
  });
}
// === SYNC EVENT ===
// Bruges til at synkronisere snippets, når forbindelsen er tilbage
self.addEventListener('sync', event => {
  if (event.tag === 'sync-snippets') {
    console.log('Background sync triggered');
    event.waitUntil(syncSnippets());
  }
});

// === SYNC-FUNKTION ===
// Henter snippets fra IndexedDB og forsøger at sende dem til serveren
async function syncSnippets() {
  try {
    const snippetsToSync = await getSnippetsToSync();
    if (snippetsToSync.length === 0) {
      console.log('No snippets to sync');
      return;
    }

    console.log(`Syncing ${snippetsToSync.length} snippets in
background`);

    for (const snippet of snippetsToSync) {
      try {
        await syncSnippet(snippet);
        await markSnippetSynced(snippet.id);
      } catch (error) {
        console.error(`Failed to sync snippet ${snippet.id}:`,
          error);
      }
    }

    console.log('Background sync completed');

  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;
  }
}

// === HENT SNIPPETS FRA INDEXEDDB SOM IKKE ER SYNKRONISERET ===
async function getSnippetsToSync() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SnipMasterDB', 1);

    request.onerror = reject;

    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction('snippets', 'readonly');
      const store = transaction.objectStore('snippets');

      // Get all snippets with pending sync status
      const index = store.index('by-sync-status');
      const query = index.getAll('pending');

      query.onsuccess = () => {
        resolve(query.result);
      };

      query.onerror = reject;
    };
  });
}
async function syncSnippet(snippet) {

// === MOCK: SYNKRONISER ENKELT SNIPPET TIL SERVER ===
return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.9) {
        resolve({ success: true });
      } else {
        reject(new Error('Server error'));
      }
    }, 500);
  });
}

// === MARKÉR SNIPPET SOM SYNKRONISERET I INDEXEDDB ===
async function markSnippetSynced(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SnipMasterDB', 1);

    request.onerror = reject;

    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction('snippets', 'readwrite');
      const store = transaction.objectStore('snippets');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const snippet = getRequest.result;
        if (snippet) {
          snippet.syncStatus = 'synced';
          const updateRequest = store.put(snippet);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = reject;
        } else {
          resolve(); // Snippet not found, nothing to do
        }
      };

      getRequest.onerror = reject;
    };
  });
}