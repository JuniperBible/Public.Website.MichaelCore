/**
 * Michael Offline Manager Module
 *
 * Manages offline Bible content caching and interfaces with the service worker.
 * Provides methods for downloading Bible translations, clearing cache, and monitoring
 * download progress. Fires events for UI updates during cache operations.
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

'use strict';

/**
 * Event emitter for cache operation updates
 * @private
 * @type {EventTarget}
 */
const eventTarget = new EventTarget();

/**
 * Current download state (tracks per-Bible downloads)
 * @private
 * @type {Map<string, {totalItems: number, completedItems: number}>}
 */
const downloadStates = new Map();

/**
 * Legacy download state for backwards compatibility with events
 * @private
 * @type {{inProgress: boolean, totalItems: number, completedItems: number, currentBible: string|null}}
 */
let downloadState = {
  inProgress: false,
  totalItems: 0,
  completedItems: 0,
  currentBible: null
};

/**
 * Service Worker registration
 * @private
 * @type {ServiceWorkerRegistration|null}
 */
let swRegistration = null;

/**
 * Service worker message handler reference for cleanup
 * @private
 * @type {Function|null}
 */
let swMessageHandler = null;

/**
 * Pending reload flag - set when SW update is available but user is busy
 * @private
 * @type {boolean}
 */
let pendingReload = false;

/**
 * Initializes the offline manager by registering the service worker
 * and setting up message listeners.
 *
 * This should be called once when the page loads. It registers the service worker
 * if it's supported by the browser and sets up communication channels.
 *
 * @param {string} swPath - Path to the service worker file (e.g., "/sw.js")
 * @returns {Promise<void>}
 *
 * @example
 * await OfflineManager.initialize('/sw.js');
 * console.log('Offline manager ready');
 */
async function initialize(swPath = window.Michael?.Config?.serviceWorkerPath || '/sw.js') {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported in this browser');
    return;
  }

  try {
    swRegistration = await navigator.serviceWorker.register(swPath);

    // Store handler reference for potential cleanup
    swMessageHandler = handleServiceWorkerMessage;

    // Listen for messages from the service worker
    // This listener persists for the page lifetime - no cleanup needed
    navigator.serviceWorker.addEventListener('message', swMessageHandler);

    // Auto-activate updated service workers: when a new SW is found and
    // finishes installing, reload the page so the fresh SW takes control.
    // The SW already calls skipWaiting() on install, so the new controller
    // will be active after reload.
    //
    // To avoid disrupting user actions, we check if the user is idle before reloading.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Check if user is actively doing something that shouldn't be interrupted
      if (isUserBusy()) {
        console.log('[OfflineManager] SW update available, but user is busy. Queueing reload...');
        queueReloadWhenIdle();
      } else {
        console.log('[OfflineManager] SW updated, reloading page...');
        window.location.reload();
      }
    });

    // Wait for service worker to be ready with timeout
    const SW_READY_TIMEOUT = 5000; // 5 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Service worker ready timeout')), SW_READY_TIMEOUT);
    });

    await Promise.race([
      navigator.serviceWorker.ready,
      timeoutPromise
    ]);
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Handles messages received from the service worker.
 *
 * @private
 * @param {MessageEvent} event - Message event from service worker
 */
function handleServiceWorkerMessage(event) {
  const { type, data } = event.data || {};

  switch (type) {
    case 'CACHE_PROGRESS':
      handleCacheProgress(data);
      break;
    case 'CACHE_COMPLETE':
      handleCacheComplete(data);
      break;
    case 'CACHE_ERROR':
      handleCacheError(data);
      break;
    case 'CACHE_CLEARED':
      handleCacheCleared(data);
      break;
  }
}

/**
 * Handles cache progress updates from service worker.
 *
 * @private
 * @param {Object} data - Progress data
 * @param {number} data.completed - Number of completed items
 * @param {number} data.total - Total number of items
 * @param {string} data.currentItem - Currently processing item
 */
function handleCacheProgress(data) {
  const bibleId = data.bible || downloadState.currentBible;

  // Update per-Bible state if tracking this Bible
  if (bibleId && downloadStates.has(bibleId)) {
    const state = downloadStates.get(bibleId);
    state.completedItems = data.completed || 0;
    state.totalItems = data.total || 0;
  }

  // Update legacy state for backwards compatibility
  downloadState.completedItems = data.completed || 0;
  downloadState.totalItems = data.total || 0;

  const progress = (data.total || 0) > 0
    ? Math.round(((data.completed || 0) / (data.total || 1)) * 100)
    : 0;

  const progressEvent = new CustomEvent('download-progress', {
    detail: {
      progress,
      completed: data.completed || 0,
      total: data.total || 0,
      currentItem: data.currentItem,
      bible: bibleId
    }
  });

  eventTarget.dispatchEvent(progressEvent);
}

/**
 * Handles cache completion notification from service worker.
 *
 * @private
 * @param {Object} data - Completion data
 * @param {string} data.bible - Bible ID that was cached
 * @param {number} data.itemCount - Number of items cached
 */
function handleCacheComplete(data) {
  const bibleId = data.bible || downloadState.currentBible;

  const completeEvent = new CustomEvent('download-complete', {
    detail: {
      bible: bibleId,
      itemCount: data.itemCount || downloadState.totalItems,
      success: true
    }
  });

  eventTarget.dispatchEvent(completeEvent);

  // Resolve per-Bible pending download promise
  const pending = pendingDownloads.get(bibleId);
  if (pending) {
    pending.resolve();
    pendingDownloads.delete(bibleId);
  }

  // Clean up per-Bible state
  downloadStates.delete(bibleId);

  // Update legacy state only if no more downloads
  if (downloadStates.size === 0) {
    downloadState = {
      inProgress: false,
      totalItems: 0,
      completedItems: 0,
      currentBible: null
    };
    pendingDownload = null;
  }
}

/**
 * Handles cache error notification from service worker.
 *
 * @private
 * @param {Object} data - Error data
 * @param {string} data.error - Error message
 * @param {string} data.bible - Bible ID that failed
 */
function handleCacheError(data) {
  const bibleId = data.bible || downloadState.currentBible;

  const errorEvent = new CustomEvent('download-complete', {
    detail: {
      bible: bibleId,
      success: false,
      error: data.error || 'Unknown error occurred'
    }
  });

  eventTarget.dispatchEvent(errorEvent);

  // Reject per-Bible pending download promise
  const pending = pendingDownloads.get(bibleId);
  if (pending) {
    pending.reject(new Error(data.error || 'Download failed'));
    pendingDownloads.delete(bibleId);
  }

  // Clean up per-Bible state
  downloadStates.delete(bibleId);

  // Update legacy state only if no more downloads
  if (downloadStates.size === 0) {
    downloadState = {
      inProgress: false,
      totalItems: 0,
      completedItems: 0,
      currentBible: null
    };
    pendingDownload = null;
  }
}

/**
 * Handles cache cleared notification from service worker.
 *
 * @private
 * @param {Object} data - Clear data
 */
function handleCacheCleared(data) {
  const clearedEvent = new CustomEvent('cache-cleared', {
    detail: {
      success: true,
      itemsCleared: data.itemsCleared || 0
    }
  });

  eventTarget.dispatchEvent(clearedEvent);
}

/**
 * Sends a message to the active service worker.
 *
 * @private
 * @param {Object} message - Message to send
 * @param {number} [timeout=30000] - Timeout in milliseconds (default 30 seconds)
 * @returns {Promise<any>} Response from service worker
 */
async function sendMessageToServiceWorker(message, timeout = 30000) {
  if (!navigator.serviceWorker.controller) {
    throw new Error('No active service worker controller');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    let timeoutId;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      messageChannel.port1.onmessage = null;
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Service worker message timeout'));
    }, timeout);

    messageChannel.port1.onmessage = (event) => {
      cleanup();
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Gets the current cache status including size and number of cached items.
 *
 * This method queries the service worker for information about the current cache state.
 * It returns details about how many chapters are cached and the approximate cache size.
 *
 * @returns {Promise<{chapterCount: number, sizeBytes: number, sizeFormatted: string}>}
 *          Cache status information
 *
 * @example
 * const status = await OfflineManager.getCacheStatus();
 * console.log(`Cached ${status.chapterCount} chapters (${status.sizeFormatted})`);
 */
async function getCacheStatus() {
  try {
    const response = await sendMessageToServiceWorker({
      type: 'GET_CACHE_STATUS'
    });

    return {
      chapterCount: response.chapterCount || 0,
      sizeBytes: response.sizeBytes || 0,
      sizeFormatted: formatBytes(response.sizeBytes || 0)
    };
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return {
      chapterCount: 0,
      sizeBytes: 0,
      sizeFormatted: '0 B'
    };
  }
}

/**
 * Pending download promise resolvers (per-Bible)
 * @private
 * @type {Map<string, {resolve: Function, reject: Function}>}
 */
const pendingDownloads = new Map();

/**
 * Legacy pending download promise resolver (for backwards compatibility)
 * @private
 * @type {{resolve: Function, reject: Function}|null}
 */
let pendingDownload = null;

/**
 * Downloads and caches a Bible translation for offline use.
 *
 * This method triggers the service worker to pre-cache all chapters of the specified
 * Bible translation. Progress updates are fired as events that the UI can listen to.
 * The promise resolves when the download completes (success or failure).
 *
 * @param {string} bibleId - Bible translation ID (e.g., "kjv", "asv", "web")
 * @param {string} basePath - Base path for Bible URLs (e.g., "/bible")
 * @returns {Promise<void>}
 *
 * @fires download-progress - Fired periodically during download with progress info
 * @fires download-complete - Fired when download completes (success or failure)
 *
 * @throws {Error} If download is already in progress or service worker is unavailable
 *
 * @example
 * try {
 *   OfflineManager.addEventListener('download-progress', (e) => {
 *     console.log(`Progress: ${e.detail.progress}%`);
 *   });
 *   await OfflineManager.downloadBible('kjv', '/bible');
 *   console.log('Bible downloaded successfully');
 * } catch (error) {
 *   console.error('Download failed:', error);
 * }
 */
async function downloadBible(bibleId, basePath = '/bible') {
  // Check if THIS specific Bible is already being downloaded
  if (downloadStates.has(bibleId)) {
    throw new Error(`Download already in progress for ${bibleId.toUpperCase()}`);
  }

  // Track this Bible's download state
  downloadStates.set(bibleId, { totalItems: 0, completedItems: 0 });

  // Update legacy state for backwards compatibility
  downloadState.inProgress = true;
  downloadState.currentBible = bibleId;
  downloadState.completedItems = 0;
  downloadState.totalItems = 0;

  // Create a promise that will resolve when download completes
  const downloadPromise = new Promise((resolve, reject) => {
    pendingDownloads.set(bibleId, { resolve, reject });
    // Also set legacy pendingDownload for backwards compatibility
    pendingDownload = { resolve, reject };
  });

  try {
    await sendMessageToServiceWorker({
      type: 'CACHE_BIBLE',
      data: {
        bibleId,
        basePath
      }
    });

    // Wait for the download to actually complete
    await downloadPromise;
  } finally {
    // Always clean up this Bible's state when done
    downloadStates.delete(bibleId);
    pendingDownloads.delete(bibleId);

    // Update legacy state
    if (downloadStates.size === 0) {
      downloadState.inProgress = false;
      pendingDownload = null;
    }
  }
}

/**
 * Clears all cached Bible content.
 *
 * This method removes all cached Bible chapters from the browser's cache storage.
 * A confirmation should typically be shown to the user before calling this method.
 *
 * @returns {Promise<void>}
 *
 * @fires cache-cleared - Fired when cache is successfully cleared
 *
 * @throws {Error} If cache clearing fails
 *
 * @example
 * if (confirm('Clear all cached content?')) {
 *   await OfflineManager.clearCache();
 *   console.log('Cache cleared');
 * }
 */
async function clearCache() {
  try {
    await sendMessageToServiceWorker({
      type: 'CLEAR_CACHE'
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Gets the current download progress.
 *
 * Returns the current state of any in-progress download operation.
 *
 * @returns {{inProgress: boolean, progress: number, completed: number, total: number, bible: string|null, activeDownloads: string[]}}
 *          Current download progress information
 *
 * @example
 * const progress = OfflineManager.getDownloadProgress();
 * if (progress.inProgress) {
 *   console.log(`Downloading ${progress.bible}: ${progress.progress}%`);
 * }
 */
function getDownloadProgress() {
  const progress = downloadState.totalItems > 0
    ? Math.round((downloadState.completedItems / downloadState.totalItems) * 100)
    : 0;

  return {
    inProgress: downloadStates.size > 0,
    progress,
    completed: downloadState.completedItems,
    total: downloadState.totalItems,
    bible: downloadState.currentBible,
    activeDownloads: Array.from(downloadStates.keys())
  };
}

/**
 * Adds an event listener for offline manager events.
 *
 * Supported events:
 * - 'download-progress': Fired during Bible download with progress updates
 * - 'download-complete': Fired when Bible download completes (success or failure)
 * - 'cache-cleared': Fired when cache is cleared
 *
 * @param {string} eventType - Type of event to listen for
 * @param {Function} callback - Callback function to handle the event
 *
 * @example
 * OfflineManager.addEventListener('download-progress', (event) => {
 *   console.log(`Progress: ${event.detail.progress}%`);
 *   updateProgressBar(event.detail.progress);
 * });
 */
function addEventListener(eventType, callback) {
  eventTarget.addEventListener(eventType, callback);
}

/**
 * Removes an event listener.
 *
 * @param {string} eventType - Type of event to stop listening for
 * @param {Function} callback - Callback function to remove
 *
 * @example
 * OfflineManager.removeEventListener('download-progress', handleProgress);
 */
function removeEventListener(eventType, callback) {
  eventTarget.removeEventListener(eventType, callback);
}

/**
 * Formats bytes into a human-readable string.
 *
 * @private
 * @param {number} bytes - Number of bytes
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Checks if the user is currently busy with an operation that shouldn't be interrupted.
 * This includes:
 * - Active downloads in progress
 * - Form inputs being filled
 * - Text being selected
 * - Active media playback
 *
 * @private
 * @returns {boolean} True if user appears to be busy
 */
function isUserBusy() {
  // Check if downloads are in progress
  if (downloadStates.size > 0) {
    return true;
  }

  // Check if user is typing in a form field
  const activeElement = document.activeElement;
  if (activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable
  )) {
    return true;
  }

  // Check if user has selected text (they might be copying)
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    return true;
  }

  // Check if media is playing
  const mediaElements = document.querySelectorAll('audio, video');
  for (const media of mediaElements) {
    if (!media.paused && !media.ended) {
      return true;
    }
  }

  return false;
}

/**
 * Queues a page reload to happen when the user becomes idle.
 * Uses requestIdleCallback if available, otherwise uses a simple timeout.
 *
 * @private
 */
function queueReloadWhenIdle() {
  if (pendingReload) {
    return; // Already queued
  }

  pendingReload = true;

  // Function to check if we can reload now
  const attemptReload = () => {
    if (!isUserBusy()) {
      console.log('[OfflineManager] User is now idle, reloading for SW update...');
      window.location.reload();
    } else {
      // Try again in 10 seconds
      setTimeout(attemptReload, 10000);
    }
  };

  // Use requestIdleCallback if available (fires when browser is idle)
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      attemptReload();
    }, { timeout: 30000 }); // Force check after 30 seconds max
  } else {
    // Fallback: wait 5 seconds then check
    setTimeout(attemptReload, 5000);
  }
}

/**
 * Checks if the browser supports service workers and offline functionality.
 *
 * @returns {boolean} True if offline functionality is supported
 *
 * @example
 * if (OfflineManager.isSupported()) {
 *   console.log('Offline features available');
 * } else {
 *   console.log('Offline features not available');
 * }
 */
function isSupported() {
  return 'serviceWorker' in navigator && 'caches' in window;
}

/**
 * Checks if the browser supports background sync.
 *
 * @returns {boolean} True if background sync is supported
 *
 * @example
 * if (OfflineManager.isBackgroundSyncSupported()) {
 *   console.log('Background sync available');
 * }
 */
function isBackgroundSyncSupported() {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Queues a Bible download for background sync.
 *
 * When the user is offline or the download fails, this method queues the
 * download to be retried automatically when the device comes back online.
 * The download will complete even if the user closes the app.
 *
 * @param {string} bibleId - Bible translation ID (e.g., "kjv", "asv", "web")
 * @param {string} basePath - Base path for Bible URLs (e.g., "/bible")
 * @returns {Promise<boolean>} True if queued successfully, false if not supported
 *
 * @example
 * const queued = await OfflineManager.queueBackgroundDownload('kjv', '/bible');
 * if (queued) {
 *   console.log('Download will complete when online');
 * }
 */
async function queueBackgroundDownload(bibleId, basePath = '/bible') {
  if (!isBackgroundSyncSupported()) {
    console.warn('Background Sync is not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Store pending download info in localStorage for the SW to pick up
    // Add TTL (Time To Live) of 7 days to prevent stale entries
    const TTL_DAYS = 7;
    const expiresAt = Date.now() + (TTL_DAYS * 24 * 60 * 60 * 1000);
    const pendingKey = `michael-pending-download-${bibleId}`;
    localStorage.setItem(pendingKey, JSON.stringify({
      bibleId,
      basePath,
      queuedAt: Date.now(),
      expiresAt
    }));

    // Register a background sync task
    await registration.sync.register(`download-bible-${bibleId}`);

    // Fire event to notify UI
    const queuedEvent = new CustomEvent('download-queued', {
      detail: {
        bible: bibleId,
        basePath
      }
    });
    eventTarget.dispatchEvent(queuedEvent);

    return true;
  } catch (error) {
    console.error('Failed to queue background download:', error);
    return false;
  }
}

/**
 * Downloads a Bible with automatic background sync fallback.
 *
 * Attempts a normal download first. If it fails due to network issues,
 * automatically queues it for background sync (if supported).
 *
 * @param {string} bibleId - Bible translation ID (e.g., "kjv", "asv", "web")
 * @param {string} basePath - Base path for Bible URLs (e.g., "/bible")
 * @returns {Promise<{success: boolean, queued: boolean, error?: string}>}
 *
 * @example
 * const result = await OfflineManager.downloadBibleWithSync('kjv', '/bible');
 * if (result.success) {
 *   console.log('Downloaded successfully');
 * } else if (result.queued) {
 *   console.log('Queued for background download');
 * } else {
 *   console.error('Failed:', result.error);
 * }
 */
async function downloadBibleWithSync(bibleId, basePath = '/bible') {
  try {
    await downloadBible(bibleId, basePath);
    return { success: true, queued: false };
  } catch (error) {
    // Check if it's a network error using multiple detection methods
    const isNetworkError = isNetworkRelatedError(error);

    if (isNetworkError) {
      // Try to queue for background sync
      if (isBackgroundSyncSupported()) {
        const queued = await queueBackgroundDownload(bibleId, basePath);
        if (queued) {
          return { success: false, queued: true };
        }
      }
    }

    return { success: false, queued: false, error: error.message };
  }
}

/**
 * Detects if an error is network-related using multiple detection methods.
 * This is more reliable than just checking error.message across different browsers.
 *
 * @private
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error appears to be network-related
 */
function isNetworkRelatedError(error) {
  // Check navigator.onLine first (most reliable)
  if (!navigator.onLine) {
    return true;
  }

  // Check error name for specific types
  if (error.name === 'NetworkError' || error.name === 'TypeError') {
    return true;
  }

  // Check error message (less reliable but covers more cases)
  const errorMessage = (error.message || '').toLowerCase();
  const networkKeywords = [
    'network',
    'fetch',
    'timeout',
    'failed to fetch',
    'networkerror',
    'net::err',
    'connection',
    'offline',
    'unreachable'
  ];

  for (const keyword of networkKeywords) {
    if (errorMessage.includes(keyword)) {
      return true;
    }
  }

  // Check if it's an AbortError from a timeout
  if (error.name === 'AbortError') {
    return true;
  }

  return false;
}

/**
 * Gets the list of pending background sync downloads.
 * Also cleans up any expired entries.
 *
 * @returns {Array<{bibleId: string, basePath: string, queuedAt: number, expiresAt: number}>}
 *
 * @example
 * const pending = OfflineManager.getPendingDownloads();
 * pending.forEach(item => {
 *   console.log(`${item.bibleId} queued at ${new Date(item.queuedAt)}`);
 * });
 */
function getPendingDownloads() {
  const pending = [];
  const now = Date.now();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('michael-pending-download-')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));

        // Check if entry has expired
        if (data.expiresAt && data.expiresAt < now) {
          console.log(`[OfflineManager] Removing expired pending download: ${data.bibleId}`);
          localStorage.removeItem(key);
          continue;
        }

        pending.push(data);
      } catch (e) {
        // Invalid data, remove corrupted entry
        console.warn(`[OfflineManager] Removing corrupted pending download entry: ${key}`);
        localStorage.removeItem(key);
      }
    }
  }
  return pending;
}

/**
 * Cleans up expired pending download entries from localStorage.
 * This should be called periodically to prevent localStorage bloat.
 *
 * @returns {number} Number of expired entries removed
 */
function cleanupExpiredDownloads() {
  const now = Date.now();
  let removedCount = 0;

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('michael-pending-download-')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));

        // Check if entry has expired
        if (data.expiresAt && data.expiresAt < now) {
          localStorage.removeItem(key);
          removedCount++;
        }
      } catch (e) {
        // Invalid data, remove corrupted entry
        localStorage.removeItem(key);
        removedCount++;
      }
    }
  }

  if (removedCount > 0) {
    console.log(`[OfflineManager] Cleaned up ${removedCount} expired pending download entries`);
  }

  return removedCount;
}

/**
 * Clears a pending background sync download.
 *
 * @param {string} bibleId - Bible translation ID to clear
 */
function clearPendingDownload(bibleId) {
  const pendingKey = `michael-pending-download-${bibleId}`;
  localStorage.removeItem(pendingKey);
}

/**
 * Gets the cache status for a specific Bible translation.
 *
 * Returns information about how many chapters are cached for this Bible
 * and whether it appears to be fully cached.
 *
 * @param {string} bibleId - Bible translation ID (e.g., "kjv", "asv", "web")
 * @param {string} basePath - Base path for Bible URLs (e.g., "/bible")
 * @returns {Promise<{bibleId: string, cachedChapters: number, hasBibleOverview: boolean, isFullyCached: boolean}>}
 *          Bible cache status information
 *
 * @example
 * const status = await OfflineManager.getBibleCacheStatus('kjv', '/bible');
 * if (status.isFullyCached) {
 *   console.log('KJV is fully cached');
 * } else {
 *   console.log(`KJV has ${status.cachedChapters} chapters cached`);
 * }
 */
async function getBibleCacheStatus(bibleId, basePath = '/bible') {
  try {
    const response = await sendMessageToServiceWorker({
      type: 'GET_BIBLE_CACHE_STATUS',
      data: {
        bibleId,
        basePath
      }
    });

    return {
      bibleId: response.bibleId || bibleId,
      cachedChapters: response.cachedChapters || 0,
      cachedBooks: response.cachedBooks || 0,
      totalChapters: response.totalChapters || 0,
      hasBibleOverview: response.hasBibleOverview || false,
      isFullyCached: response.isFullyCached || false
    };
  } catch (error) {
    console.error('Failed to get Bible cache status:', error);
    return {
      bibleId,
      cachedChapters: 0,
      cachedBooks: 0,
      totalChapters: 0,
      hasBibleOverview: false,
      isFullyCached: false
    };
  }
}

/**
 * Cancels an in-progress Bible download.
 *
 * @param {string} bibleId - Bible translation ID to cancel
 * @returns {Promise<boolean>} True if cancelled, false if no active download
 *
 * @example
 * const cancelled = await OfflineManager.cancelDownload('kjv');
 * if (cancelled) {
 *   console.log('Download cancelled');
 * }
 */
async function cancelDownload(bibleId) {
  if (!downloadStates.has(bibleId)) {
    return false;
  }

  try {
    await sendMessageToServiceWorker({
      type: 'CANCEL_DOWNLOAD',
      data: { bibleId }
    });

    // Clean up local state
    const pending = pendingDownloads.get(bibleId);
    if (pending) {
      pending.reject(new Error('Download cancelled'));
      pendingDownloads.delete(bibleId);
    }
    downloadStates.delete(bibleId);

    // Fire cancellation event
    const cancelEvent = new CustomEvent('download-complete', {
      detail: {
        bible: bibleId,
        success: false,
        cancelled: true,
        error: 'Download cancelled by user'
      }
    });
    eventTarget.dispatchEvent(cancelEvent);

    return true;
  } catch (error) {
    console.error('Failed to cancel download:', error);
    return false;
  }
}

// ES6 Module Exports
/**
 * Cleanup function that removes the service worker message handler.
 * Should be called when the offline manager is no longer needed.
 *
 * @returns {void}
 *
 * @example
 * OfflineManager.cleanup();
 * console.log('Offline manager cleaned up');
 */
function cleanup() {
  if (swMessageHandler) {
    navigator.serviceWorker.removeEventListener('message', swMessageHandler);
    swMessageHandler = null;
  }
}
export {
  cleanup,
  initialize,
  getCacheStatus,
  getBibleCacheStatus,
  downloadBible,
  downloadBibleWithSync,
  queueBackgroundDownload,
  cancelDownload,
  clearCache,
  getDownloadProgress,
  getPendingDownloads,
  cleanupExpiredDownloads,
  clearPendingDownload,
  addEventListener,
  removeEventListener,
  isSupported,
  isBackgroundSyncSupported
};

// Maintain backwards compatibility with window.Michael.OfflineManager
window.Michael = window.Michael || {};
window.Michael.OfflineManager = {
  cleanup,
  initialize,
  getCacheStatus,
  getBibleCacheStatus,
  downloadBible,
  downloadBibleWithSync,
  queueBackgroundDownload,
  cancelDownload,
  clearCache,
  getDownloadProgress,
  getPendingDownloads,
  cleanupExpiredDownloads,
  clearPendingDownload,
  addEventListener,
  removeEventListener,
  isSupported,
  isBackgroundSyncSupported
};

// Run cleanup on initialization to remove any stale entries
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    cleanupExpiredDownloads();
  });
} else {
  cleanupExpiredDownloads();
}
