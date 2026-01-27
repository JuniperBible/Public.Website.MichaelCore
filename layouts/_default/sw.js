{{/*
  Template: sw.js
  Purpose: Service Worker generated at build time with correct asset hashes

  This template is processed by Hugo to embed fingerprinted asset paths
  directly into the service worker. This solves the problem of CSS files
  being fingerprinted but the SW having hardcoded paths.
*/}}
{{- $theme := resources.Get "css/theme.css" | minify | fingerprint -}}
{{- $hash := substr $theme.Data.Integrity 0 12 | replaceRE "[^a-zA-Z0-9]" "" -}}
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
 *
 * Generated at build time by Hugo to include fingerprinted asset paths.
 */

// Cache version - derived from theme CSS hash for automatic invalidation
const CACHE_VERSION = '{{ $hash }}';
const SHELL_CACHE = `michael-shell-v${CACHE_VERSION}`;
const CHAPTERS_CACHE = 'michael-chapters-v3';
const METADATA_CACHE = 'michael-metadata-v1';
const OFFLINE_URL = '/offline.html';

// Track active download operations for cancellation
const activeDownloads = new Map(); // bibleId -> AbortController

// In-memory Bible metadata (total chapters per Bible)
const bibleMetadata = new Map(); // bibleId -> { totalChapters, totalBooks }

// Assets to pre-cache on install
// CSS files are now embedded with their fingerprinted paths by Hugo
// Only include JS files that are actually built (referenced in templates)
const SHELL_ASSETS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  // CSS with fingerprinted path from Hugo
  '{{ $theme.RelPermalink }}',
  // Core JS files (only those referenced in templates)
  '/js/michael/bible-api.js',
  '/js/michael/dom-utils.js',
  '/js/michael/share-menu.js',
  '/js/michael/offline-manager.js',
  '/js/michael/offline-settings-ui.js',
  '/js/michael/pwa-install.js',
  '/js/michael/user-storage.js',
  '/js/michael/reading-tracker.js',
  '/js/michael/bible-nav.js',
  '/js/michael/footnotes.js',
  '/js/michael/show-more.js',
  '/js/share.js',
  '/js/strongs.js',
  '/js/bible-search.js',
  '/js/text-compare.js',
  '/js/parallel.js',
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

        // Delete old caches (keep current shell, chapters, and metadata caches)
        const cacheWhitelist = [SHELL_CACHE, CHAPTERS_CACHE, METADATA_CACHE];
        const deletionPromises = cacheNames
          .filter(cacheName => !cacheWhitelist.includes(cacheName))
          .map(cacheName => {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          });

        await Promise.all(deletionPromises);

        // Load Bible metadata from persistent cache
        await loadAllBibleMetadata();

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
  if (request.mode === 'navigate') {
    return true;
  }
  const accept = request.headers.get('accept');
  return request.method === 'GET' && accept && accept.includes('text/html');
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

  if (type === 'GET_BIBLE_CACHE_STATUS') {
    console.log('[Service Worker] Received GET_BIBLE_CACHE_STATUS message', data);
    getBibleCacheStatus(data.bibleId, data.basePath).then(status => {
      if (port) port.postMessage(status);
    }).catch(error => {
      if (port) port.postMessage({ error: error.message });
    });
    return;
  }

  if (type === 'CANCEL_DOWNLOAD') {
    console.log('[Service Worker] Received CANCEL_DOWNLOAD message', data);
    const bibleId = data?.bibleId;
    if (bibleId && activeDownloads.has(bibleId)) {
      activeDownloads.get(bibleId).abort();
      activeDownloads.delete(bibleId);
      if (port) port.postMessage({ success: true, cancelled: bibleId });
    } else {
      if (port) port.postMessage({ success: false, error: 'No active download found' });
    }
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

  // Set up abort controller for cancellation
  const abortController = new AbortController();
  activeDownloads.set(bibleId, abortController);
  const signal = abortController.signal;

  // Helper to check if cancelled
  const checkCancelled = () => {
    if (signal.aborted) {
      throw new Error('Download cancelled');
    }
  };

  try {
    // Get the Bible's book/chapter structure from the auxiliary data
    // We need to fetch this from the page or construct URLs
    const cache = await caches.open(CHAPTERS_CACHE);

    // First, fetch the Bible overview page to discover books
    const bibleUrl = `${basePath}/${bibleId}/`;
    let bibleResponse;
    try {
      bibleResponse = await fetch(bibleUrl, { signal });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Download cancelled');
      }
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

    // Phase 1: Discover all chapters first (to get accurate total)
    console.log(`[Service Worker] Discovering chapters for ${bibleId}...`);
    const chapterUrls = [];
    let failedBooks = 0;

    for (const bookUrl of bookLinks) {
      checkCancelled();
      try {
        const bookResponse = await fetch(bookUrl, { signal });
        if (bookResponse.ok) {
          await cache.put(bookUrl, bookResponse.clone());
          const bookHtml = await bookResponse.text();
          const chapters = extractChapterLinks(bookHtml, basePath, bibleId);
          chapterUrls.push(...chapters);
        } else {
          failedBooks++;
        }
      } catch (error) {
        if (error.name === 'AbortError' || error.message === 'Download cancelled') {
          throw new Error('Download cancelled');
        }
        console.warn(`[Service Worker] Failed to fetch book ${bookUrl}:`, error);
        failedBooks++;
      }
    }

    // Calculate total upfront (1 overview + books + chapters)
    const totalItems = 1 + bookLinks.length + chapterUrls.length;
    let completedItems = 1 + bookLinks.length; // Overview and books already cached

    console.log(`[Service Worker] Found ${chapterUrls.length} chapters to cache`);

    // Store Bible metadata for later retrieval (total chapters known after discovery)
    bibleMetadata.set(bibleId, {
      totalChapters: chapterUrls.length,
      totalBooks: bookLinks.length
    });
    // Also persist to metadata cache
    await saveBibleMetadata(bibleId, chapterUrls.length, bookLinks.length);

    // Send initial progress with accurate total
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_PROGRESS',
          data: {
            bible: bibleId,
            completed: completedItems,
            total: totalItems,
            currentItem: 'Starting chapter downloads...'
          }
        });
      });
    });

    // Phase 2: Cache all chapters
    let failedChapters = 0;
    for (const chapterUrl of chapterUrls) {
      checkCancelled();
      try {
        const chapterResponse = await fetch(chapterUrl, { signal });
        if (chapterResponse.ok) {
          await cache.put(chapterUrl, chapterResponse.clone());
        } else {
          failedChapters++;
        }
      } catch (error) {
        if (error.name === 'AbortError' || error.message === 'Download cancelled') {
          throw new Error('Download cancelled');
        }
        console.warn(`[Service Worker] Failed to cache chapter ${chapterUrl}:`, error);
        failedChapters++;
      }

      completedItems++;
      // Send progress update every 10 chapters to reduce message overhead
      if (completedItems % 10 === 0 || completedItems === totalItems) {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_PROGRESS',
              data: {
                bible: bibleId,
                completed: completedItems,
                total: totalItems,
                currentItem: chapterUrl
              }
            });
          });
        });
      }
    }

    // Notify completion (include failure count if any)
    const successCount = totalItems - failedBooks - failedChapters;
    console.log(`[Service Worker] Cached ${successCount}/${totalItems} items for ${bibleId}`);

    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_COMPLETE',
          data: {
            bible: bibleId,
            itemCount: successCount,
            totalItems: totalItems,
            failedCount: failedBooks + failedChapters
          }
        });
      });
    });

  } finally {
    // Clean up the abort controller
    activeDownloads.delete(bibleId);
  }
}

/**
 * Extract book links from Bible overview page HTML
 * Looks for both href attributes (anchor links) and value attributes (select options)
 */
function extractBookLinks(html, basePath, bibleId) {
  const links = [];
  // Match both href="/bible/{bibleId}/{book}/" and value="/bible/{bibleId}/{book}/"
  // Book IDs can contain letters, numbers, and are case-insensitive
  const hrefPattern = new RegExp(`href="(${basePath}/${bibleId}/[a-zA-Z0-9]+/)"`, 'gi');
  const valuePattern = new RegExp(`value="(${basePath}/${bibleId}/[a-zA-Z0-9]+/)"`, 'gi');

  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    const url = match[1];
    if (!links.includes(url)) {
      links.push(url);
    }
  }
  while ((match = valuePattern.exec(html)) !== null) {
    const url = match[1];
    if (!links.includes(url)) {
      links.push(url);
    }
  }
  return links;
}

/**
 * Extract chapter links from book page HTML
 * Looks for both href attributes (anchor links) and value attributes (select options)
 */
function extractChapterLinks(html, basePath, bibleId) {
  const links = [];
  // Match both href="/bible/{bibleId}/{book}/{chapter}/" and value="/bible/{bibleId}/{book}/{chapter}/"
  // Book IDs can contain letters, numbers, and are case-insensitive
  const hrefPattern = new RegExp(`href="(${basePath}/${bibleId}/[a-zA-Z0-9]+/\\d+/)"`, 'gi');
  const valuePattern = new RegExp(`value="(${basePath}/${bibleId}/[a-zA-Z0-9]+/\\d+/)"`, 'gi');

  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    const url = match[1];
    if (!links.includes(url)) {
      links.push(url);
    }
  }
  while ((match = valuePattern.exec(html)) !== null) {
    const url = match[1];
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

/**
 * Get cache status for a specific Bible translation
 * Returns the number of cached chapters vs expected total
 */
async function getBibleCacheStatus(bibleId, basePath) {
  try {
    const cache = await caches.open(CHAPTERS_CACHE);
    const keys = await cache.keys();

    // Count chapters for this Bible
    const biblePattern = new RegExp(`^${basePath}/${bibleId}/[^/]+/\\d+/?$`);
    const cachedChapters = keys.filter(req => biblePattern.test(new URL(req.url).pathname));

    // Count books for this Bible
    const bookPattern = new RegExp(`^${basePath}/${bibleId}/[^/]+/?$`);
    const cachedBooks = keys.filter(req => {
      const pathname = new URL(req.url).pathname;
      // Match book pages but not the Bible overview page
      return bookPattern.test(pathname) && pathname !== `${basePath}/${bibleId}/`;
    });

    // Check if Bible overview page is cached (indicates download was started)
    const bibleOverviewUrl = `${basePath}/${bibleId}/`;
    const hasBibleOverview = keys.some(req => new URL(req.url).pathname === bibleOverviewUrl);

    // Get total chapters from stored metadata first (actual count from when Bible was cached)
    let totalChapters = 0;
    let totalBooks = 0;

    // Check in-memory metadata first
    if (bibleMetadata.has(bibleId)) {
      const meta = bibleMetadata.get(bibleId);
      totalChapters = meta.totalChapters;
      totalBooks = meta.totalBooks;
    } else {
      // Try to load from persistent metadata cache
      const savedMeta = await loadBibleMetadata(bibleId);
      if (savedMeta) {
        totalChapters = savedMeta.totalChapters;
        totalBooks = savedMeta.totalBooks;
        // Store in memory for faster access
        bibleMetadata.set(bibleId, savedMeta);
      }
    }

    // Determine if fully cached
    // If we have metadata, use exact count. Otherwise, consider cached if we have overview + chapters
    const isFullyCached = totalChapters > 0
      ? (hasBibleOverview && cachedChapters.length >= totalChapters)
      : (hasBibleOverview && cachedChapters.length > 100); // Fallback heuristic

    return {
      bibleId,
      cachedChapters: cachedChapters.length,
      cachedBooks: cachedBooks.length,
      totalChapters,
      totalBooks,
      hasBibleOverview,
      isFullyCached
    };
  } catch (error) {
    console.error('[Service Worker] getBibleCacheStatus error:', error);
    return { bibleId, cachedChapters: 0, cachedBooks: 0, totalChapters: 0, hasBibleOverview: false, isFullyCached: false };
  }
}

/**
 * Save Bible metadata to persistent cache
 */
async function saveBibleMetadata(bibleId, totalChapters, totalBooks) {
  try {
    const cache = await caches.open(METADATA_CACHE);
    const metadata = { bibleId, totalChapters, totalBooks, savedAt: Date.now() };
    const response = new Response(JSON.stringify(metadata), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/metadata/${bibleId}`, response);
    console.log(`[Service Worker] Saved metadata for ${bibleId}: ${totalChapters} chapters, ${totalBooks} books`);
  } catch (error) {
    console.warn('[Service Worker] Failed to save Bible metadata:', error);
  }
}

/**
 * Load Bible metadata from persistent cache
 */
async function loadBibleMetadata(bibleId) {
  try {
    const cache = await caches.open(METADATA_CACHE);
    const response = await cache.match(`/metadata/${bibleId}`);
    if (response) {
      const metadata = await response.json();
      return metadata;
    }
  } catch (error) {
    console.warn('[Service Worker] Failed to load Bible metadata:', error);
  }
  return null;
}

/**
 * Load all Bible metadata on service worker activation
 */
async function loadAllBibleMetadata() {
  try {
    const cache = await caches.open(METADATA_CACHE);
    const keys = await cache.keys();
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const metadata = await response.json();
        if (metadata.bibleId) {
          bibleMetadata.set(metadata.bibleId, {
            totalChapters: metadata.totalChapters,
            totalBooks: metadata.totalBooks
          });
        }
      }
    }
    console.log(`[Service Worker] Loaded metadata for ${bibleMetadata.size} Bibles`);
  } catch (error) {
    console.warn('[Service Worker] Failed to load all Bible metadata:', error);
  }
}

/**
 * Background Sync Event Handler
 * Handles queued Bible downloads when the device comes back online
 */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event:', event.tag);

  if (event.tag.startsWith('download-bible-')) {
    const bibleId = event.tag.replace('download-bible-', '');
    console.log(`[Service Worker] Background sync for Bible: ${bibleId}`);

    event.waitUntil(
      (async () => {
        try {
          // Default base path for Bible URLs
          const basePath = '/bible';

          // Cache the Bible
          await cacheBible(bibleId, basePath);

          // Notify clients that background sync completed
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'BACKGROUND_SYNC_COMPLETE',
              data: { bible: bibleId, success: true }
            });
          });

          console.log(`[Service Worker] Background sync completed for ${bibleId}`);
        } catch (error) {
          console.error(`[Service Worker] Background sync failed for ${bibleId}:`, error);

          // Notify clients of failure
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'BACKGROUND_SYNC_COMPLETE',
              data: { bible: bibleId, success: false, error: error.message }
            });
          });

          // Re-throw to let the sync manager know it failed (will retry)
          throw error;
        }
      })()
    );
  }
});

console.log('[Service Worker] Script loaded');
