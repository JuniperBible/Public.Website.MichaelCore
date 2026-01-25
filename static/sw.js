/**
 * Service Worker for Michael Bible Module
 *
 * Provides offline support with the following caching strategies:
 * - Cache-first for static assets (CSS, JS, fonts)
 * - Network-first with cache fallback for chapter pages
 * - Offline fallback page when network fails and no cache exists
 *
 * Cache Strategy:
 * - Shell assets: Pre-cached on install (CSS, JS)
 * - Chapter pages: Cached on-demand as users browse
 * - Offline fallback: Pre-cached for when all else fails
 */

// Cache version - increment to force cache refresh
const CACHE_VERSION = '1';
const SHELL_CACHE = `michael-shell-v${CACHE_VERSION}`;
const CHAPTERS_CACHE = `michael-chapters-v${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache on install
// Note: CSS files use content hashing, so paths will change on content updates
const SHELL_ASSETS = [
  '/',
  OFFLINE_URL,
  // CSS files - these paths will need to be updated when CSS changes
  // The service worker will cache whatever CSS is currently loaded
  // JS files - these are also content-hashed
  '/js/michael/bible-api.js',
  '/js/michael/dom-utils.js',
  '/js/michael/share-menu.js',
  '/js/share.js',
  '/js/strongs.js',
];

// Default chapters to pre-cache for offline reading
// These are commonly read passages that provide value when offline
const DEFAULT_CHAPTERS = [
  '/bibles/kjva/gen/1/',      // Genesis 1 - Creation
  '/bibles/kjva/ps/23/',      // Psalm 23 - The Lord is my shepherd
  '/bibles/kjva/matt/1/',     // Matthew 1 - Genealogy of Jesus
  '/bibles/kjva/john/1/',     // John 1 - In the beginning was the Word
];

/**
 * Install Event
 * Pre-cache shell assets and default chapters
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    (async () => {
      try {
        // Cache shell assets
        const shellCache = await caches.open(SHELL_CACHE);
        console.log('[Service Worker] Caching shell assets');

        // Cache assets one by one to handle failures gracefully
        for (const asset of SHELL_ASSETS) {
          try {
            await shellCache.add(asset);
            console.log(`[Service Worker] Cached: ${asset}`);
          } catch (error) {
            console.warn(`[Service Worker] Failed to cache ${asset}:`, error);
          }
        }

        // Cache default chapters
        const chaptersCache = await caches.open(CHAPTERS_CACHE);
        console.log('[Service Worker] Caching default chapters');

        for (const chapter of DEFAULT_CHAPTERS) {
          try {
            await chaptersCache.add(chapter);
            console.log(`[Service Worker] Cached: ${chapter}`);
          } catch (error) {
            console.warn(`[Service Worker] Failed to cache ${chapter}:`, error);
          }
        }

        console.log('[Service Worker] Installation complete');

        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Installation failed:', error);
      }
    })()
  );
});

/**
 * Activate Event
 * Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    (async () => {
      try {
        // Get all cache names
        const cacheNames = await caches.keys();

        // Delete old caches
        const cacheWhitelist = [SHELL_CACHE, CHAPTERS_CACHE];
        const deletionPromises = cacheNames
          .filter(cacheName => !cacheWhitelist.includes(cacheName))
          .map(cacheName => {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          });

        await Promise.all(deletionPromises);

        console.log('[Service Worker] Activation complete');

        // Take control of all clients immediately
        await self.clients.claim();
      } catch (error) {
        console.error('[Service Worker] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch Event
 * Implement caching strategies based on request type
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Determine caching strategy based on URL
  if (isStaticAsset(url)) {
    // Cache-first for static assets (CSS, JS, fonts, images)
    event.respondWith(cacheFirstStrategy(request, SHELL_CACHE));
  } else if (isChapterPage(url)) {
    // Network-first with cache fallback for chapter pages
    event.respondWith(networkFirstStrategy(request, CHAPTERS_CACHE));
  } else if (isNavigationRequest(request)) {
    // Network-first with offline fallback for navigation
    event.respondWith(navigationStrategy(request));
  } else {
    // Default: network-first for everything else
    event.respondWith(networkFirstStrategy(request, SHELL_CACHE));
  }
});

/**
 * Cache-First Strategy
 * Try cache first, fall back to network
 * Best for static assets that rarely change
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log(`[Service Worker] Cache hit: ${request.url}`);
      return cachedResponse;
    }

    console.log(`[Service Worker] Cache miss, fetching: ${request.url}`);
    const networkResponse = await fetch(request);

    // Cache the new response for future use
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error(`[Service Worker] Cache-first failed for ${request.url}:`, error);
    throw error;
  }
}

/**
 * Network-First Strategy
 * Try network first, fall back to cache
 * Best for content that changes frequently
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache the response for offline use
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log(`[Service Worker] Cached from network: ${request.url}`);
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log(`[Service Worker] Network failed, trying cache: ${request.url}`);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log(`[Service Worker] Serving from cache: ${request.url}`);
      return cachedResponse;
    }

    // Both network and cache failed
    console.error(`[Service Worker] Network-first failed for ${request.url}:`, error);
    throw error;
  }
}

/**
 * Navigation Strategy
 * Network-first with offline fallback page
 */
async function navigationStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful navigation responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CHAPTERS_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(CHAPTERS_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log(`[Service Worker] Serving cached page: ${request.url}`);
      return cachedResponse;
    }

    // Both failed, show offline page
    console.log('[Service Worker] Serving offline page');
    const offlineCache = await caches.open(SHELL_CACHE);
    const offlinePage = await offlineCache.match(OFFLINE_URL);

    if (offlinePage) {
      return offlinePage;
    }

    // Last resort: return a basic error response
    return new Response('Offline and no cached content available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Helper: Check if URL is a static asset
 */
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.woff', '.woff2', '.ttf', '.eot', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * Helper: Check if URL is a Bible chapter page
 */
function isChapterPage(url) {
  // Pattern: /bibles/{bible}/{book}/{chapter}/
  const chapterPattern = /^\/bibles\/[^/]+\/[^/]+\/\d+\/?$/;
  return chapterPattern.test(url.pathname);
}

/**
 * Helper: Check if request is a navigation request
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

/**
 * Message Handler
 * Allow the page to communicate with the service worker
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    console.log('[Service Worker] Received CACHE_URLS message');
    const urls = event.data.urls || [];

    caches.open(CHAPTERS_CACHE).then(cache => {
      urls.forEach(url => {
        cache.add(url).then(() => {
          console.log(`[Service Worker] Cached on demand: ${url}`);
        }).catch(error => {
          console.warn(`[Service Worker] Failed to cache ${url}:`, error);
        });
      });
    });
  }
});

console.log('[Service Worker] Script loaded');
