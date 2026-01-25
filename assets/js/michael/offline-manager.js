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

window.Michael = window.Michael || {};
window.Michael.OfflineManager = (function() {
  'use strict';

  /**
   * Event emitter for cache operation updates
   * @private
   * @type {EventTarget}
   */
  const eventTarget = new EventTarget();

  /**
   * Current download state
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
  async function initialize(swPath = '/sw.js') {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers are not supported in this browser');
      return;
    }

    try {
      swRegistration = await navigator.serviceWorker.register(swPath);
      console.log('Service Worker registered:', swRegistration);

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker is ready');
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
      default:
        console.log('Unknown message from service worker:', event.data);
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
    downloadState.completedItems = data.completed || 0;
    downloadState.totalItems = data.total || 0;

    const progress = downloadState.totalItems > 0
      ? Math.round((downloadState.completedItems / downloadState.totalItems) * 100)
      : 0;

    const progressEvent = new CustomEvent('download-progress', {
      detail: {
        progress,
        completed: downloadState.completedItems,
        total: downloadState.totalItems,
        currentItem: data.currentItem,
        bible: downloadState.currentBible
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
    downloadState.inProgress = false;
    downloadState.completedItems = downloadState.totalItems;

    const completeEvent = new CustomEvent('download-complete', {
      detail: {
        bible: data.bible || downloadState.currentBible,
        itemCount: data.itemCount || downloadState.totalItems,
        success: true
      }
    });

    eventTarget.dispatchEvent(completeEvent);

    // Reset state
    downloadState = {
      inProgress: false,
      totalItems: 0,
      completedItems: 0,
      currentBible: null
    };
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
    downloadState.inProgress = false;

    const errorEvent = new CustomEvent('download-complete', {
      detail: {
        bible: data.bible || downloadState.currentBible,
        success: false,
        error: data.error || 'Unknown error occurred'
      }
    });

    eventTarget.dispatchEvent(errorEvent);

    // Reset state
    downloadState = {
      inProgress: false,
      totalItems: 0,
      completedItems: 0,
      currentBible: null
    };
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
   * @returns {Promise<any>} Response from service worker
   */
  async function sendMessageToServiceWorker(message) {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active service worker controller');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
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
   * Downloads and caches a Bible translation for offline use.
   *
   * This method triggers the service worker to pre-cache all chapters of the specified
   * Bible translation. Progress updates are fired as events that the UI can listen to.
   *
   * @param {string} bibleId - Bible translation ID (e.g., "kjv", "asv", "web")
   * @param {string} basePath - Base path for Bible URLs (e.g., "/bibles")
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
   *   await OfflineManager.downloadBible('kjv', '/bibles');
   *   console.log('Bible downloaded successfully');
   * } catch (error) {
   *   console.error('Download failed:', error);
   * }
   */
  async function downloadBible(bibleId, basePath = '/bibles') {
    if (downloadState.inProgress) {
      throw new Error('Download already in progress');
    }

    downloadState.inProgress = true;
    downloadState.currentBible = bibleId;
    downloadState.completedItems = 0;
    downloadState.totalItems = 0;

    try {
      await sendMessageToServiceWorker({
        type: 'CACHE_BIBLE',
        data: {
          bibleId,
          basePath
        }
      });
    } catch (error) {
      downloadState.inProgress = false;
      throw error;
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
   * @returns {{inProgress: boolean, progress: number, completed: number, total: number, bible: string|null}}
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
      inProgress: downloadState.inProgress,
      progress,
      completed: downloadState.completedItems,
      total: downloadState.totalItems,
      bible: downloadState.currentBible
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

  // Public API
  return {
    initialize,
    getCacheStatus,
    downloadBible,
    clearCache,
    getDownloadProgress,
    addEventListener,
    removeEventListener,
    isSupported
  };
})();
