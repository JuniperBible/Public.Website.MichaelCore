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
const CACHE_VERSION = '2';
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
  '/bible/kjva/gen/1/',      // Genesis 1 - Creation
  '/bible/kjva/ps/23/',      // Psalm 23 - The Lord is my shepherd
  '/bible/kjva/matt/1/',     // Matthew 1 - Genealogy of Jesus
  '/bible/kjva/john/1/',     // John 1 - In the beginning was the Word
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
  // Pattern: /bible/{bible}/{book}/{chapter}/
  const chapterPattern = /^\/bible\/[^/]+\/[^/]+\/\d+\/?$/;
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
  const { type, data } = event.data || {};
  const port = event.ports[0];

  if (type === 'SKIP_WAITING') {
    console.log('[Service Worker] Received SKIP_WAITING message');
    self.skipWaiting();
    return;
  }

  if (type === 'CACHE_URLS') {
    console.log('[Service Worker] Received CACHE_URLS message');
    const urls = data?.urls || event.data.urls || [];

    caches.open(CHAPTERS_CACHE).then(cache => {
      urls.forEach(url => {
        cache.add(url).then(() => {
          console.log(`[Service Worker] Cached on demand: ${url}`);
        }).catch(error => {
          console.warn(`[Service Worker] Failed to cache ${url}:`, error);
        });
      });
    });
    return;
  }

  if (type === 'GET_CACHE_STATUS') {
    console.log('[Service Worker] Received GET_CACHE_STATUS message');
    getCacheStatus().then(status => {
      if (port) port.postMessage(status);
    }).catch(error => {
      if (port) port.postMessage({ error: error.message });
    });
    return;
  }

  if (type === 'CACHE_BIBLE') {
    console.log('[Service Worker] Received CACHE_BIBLE message', data);
    cacheBible(data.bibleId, data.basePath).then(() => {
      if (port) port.postMessage({ success: true });
    }).catch(error => {
      if (port) port.postMessage({ error: error.message });
    });
    return;
  }

  if (type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Received CLEAR_CACHE message');
    clearBibleCache().then(itemsCleared => {
      if (port) port.postMessage({ success: true, itemsCleared });
      // Notify all clients
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_CLEARED', data: { itemsCleared } });
        });
      });
    }).catch(error => {
      if (port) port.postMessage({ error: error.message });
    });
    return;
  }
});

/**
 * Get cache status information
 */
async function getCacheStatus() {
  try {
    const cache = await caches.open(CHAPTERS_CACHE);
    const keys = await cache.keys();

    // Filter to only chapter pages
    const chapterKeys = keys.filter(req => isChapterPage(new URL(req.url)));

    // Estimate size (rough approximation)
    let totalSize = 0;
    for (const request of chapterKeys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.clone().blob();
        totalSize += blob.size;
      }
    }

    return {
      chapterCount: chapterKeys.length,
      sizeBytes: totalSize
    };
  } catch (error) {
    console.error('[Service Worker] getCacheStatus error:', error);
    return { chapterCount: 0, sizeBytes: 0 };
  }
}

/**
 * Cache all chapters for a Bible translation
 */
async function cacheBible(bibleId, basePath) {
  console.log(`[Service Worker] Caching Bible: ${bibleId}`);

  // Get the Bible's book/chapter structure from the auxiliary data
  // We need to fetch this from the page or construct URLs
  const cache = await caches.open(CHAPTERS_CACHE);

  // First, fetch the Bible overview page to discover books
  const bibleUrl = `${basePath}/${bibleId}/`;
  let bibleResponse;
  try {
    bibleResponse = await fetch(bibleUrl);
  } catch (error) {
    throw new Error(`Failed to fetch Bible page: ${error.message}`);
  }

  if (!bibleResponse.ok) {
    throw new Error(`Bible page returned ${bibleResponse.status}`);
  }

  // Cache the Bible overview page
  await cache.put(bibleUrl, bibleResponse.clone());

  // Parse the page to find book links
  const html = await bibleResponse.text();
  const bookLinks = extractBookLinks(html, basePath, bibleId);

  if (bookLinks.length === 0) {
    // Notify completion with what we have
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_COMPLETE',
          data: { bible: bibleId, itemCount: 1 }
        });
      });
    });
    return;
  }

  // Collect all chapter URLs
  const chapterUrls = [];
  let completedItems = 0;
  const totalBooks = bookLinks.length;

  // Process each book to get chapter URLs
  for (const bookUrl of bookLinks) {
    try {
      const bookResponse = await fetch(bookUrl);
      if (bookResponse.ok) {
        await cache.put(bookUrl, bookResponse.clone());
        const bookHtml = await bookResponse.text();
        const chapters = extractChapterLinks(bookHtml, basePath, bibleId);
        chapterUrls.push(...chapters);
      }
    } catch (error) {
      console.warn(`[Service Worker] Failed to fetch book ${bookUrl}:`, error);
    }

    completedItems++;
    // Send progress update
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_PROGRESS',
          data: {
            completed: completedItems,
            total: totalBooks + chapterUrls.length,
            currentItem: bookUrl
          }
        });
      });
    });
  }

  // Now cache all chapters
  const totalItems = totalBooks + chapterUrls.length;
  for (const chapterUrl of chapterUrls) {
    try {
      const chapterResponse = await fetch(chapterUrl);
      if (chapterResponse.ok) {
        await cache.put(chapterUrl, chapterResponse.clone());
      }
    } catch (error) {
      console.warn(`[Service Worker] Failed to cache chapter ${chapterUrl}:`, error);
    }

    completedItems++;
    // Send progress update every 10 chapters to reduce message overhead
    if (completedItems % 10 === 0 || completedItems === totalItems) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_PROGRESS',
            data: {
              completed: completedItems,
              total: totalItems,
              currentItem: chapterUrl
            }
          });
        });
      });
    }
  }

  // Notify completion
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_COMPLETE',
        data: { bible: bibleId, itemCount: totalItems }
      });
    });
  });
}

/**
 * Extract book links from Bible overview page HTML
 */
function extractBookLinks(html, basePath, bibleId) {
  const links = [];
  // Match href="/bible/{bibleId}/{book}/"
  const pattern = new RegExp(`href="(${basePath}/${bibleId}/[a-z0-9]+/)"`, 'gi');
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = match[1];
    // Avoid duplicates
    if (!links.includes(url)) {
      links.push(url);
    }
  }
  return links;
}

/**
 * Extract chapter links from book page HTML
 */
function extractChapterLinks(html, basePath, bibleId) {
  const links = [];
  // Match href="/bible/{bibleId}/{book}/{chapter}/"
  const pattern = new RegExp(`href="(${basePath}/${bibleId}/[a-z0-9]+/\\d+/)"`, 'gi');
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = match[1];
    // Avoid duplicates
    if (!links.includes(url)) {
      links.push(url);
    }
  }
  return links;
}

/**
 * Clear all cached Bible content
 */
async function clearBibleCache() {
  try {
    const cache = await caches.open(CHAPTERS_CACHE);
    const keys = await cache.keys();
    let itemsCleared = 0;

    for (const request of keys) {
      await cache.delete(request);
      itemsCleared++;
    }

    console.log(`[Service Worker] Cleared ${itemsCleared} items from cache`);
    return itemsCleared;
  } catch (error) {
    console.error('[Service Worker] clearBibleCache error:', error);
    throw error;
  }
}

console.log('[Service Worker] Script loaded');
