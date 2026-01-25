/**
 * Michael Offline Settings UI
 *
 * Initializes and manages the offline settings panel UI, connecting it to the
 * OfflineManager for cache operations. Handles user interactions, updates UI
 * state based on events, and provides visual feedback during operations.
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

(function() {
  'use strict';

  // Wait for DOM and dependencies to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOfflineSettings);
  } else {
    initializeOfflineSettings();
  }

  /**
   * Initializes the offline settings UI and connects it to OfflineManager
   */
  async function initializeOfflineSettings() {
    // Check if we're on a page with offline settings
    const offlineForm = document.getElementById('offline-download-form');
    if (!offlineForm) {
      return;
    }

    // Check if OfflineManager is available
    if (!window.Michael?.OfflineManager) {
      console.error('[Offline Settings] OfflineManager not found');
      showMessage('Offline functionality is not available', 'error');
      return;
    }

    // Check browser support
    if (!window.Michael.OfflineManager.isSupported()) {
      showMessage('Your browser does not support offline functionality', 'error');
      disableOfflineControls();
      return;
    }

    const OfflineManager = window.Michael.OfflineManager;

    try {
      // Initialize the offline manager with service worker
      await OfflineManager.initialize('/sw.js');

      // Set up event listeners
      setupEventListeners(OfflineManager);

      // Load initial cache status
      await updateCacheStatus(OfflineManager);

      console.log('[Offline Settings] Initialized successfully');
    } catch (error) {
      console.error('[Offline Settings] Initialization failed:', error);
      showMessage('Failed to initialize offline functionality: ' + error.message, 'error');
    }
  }

  /**
   * Sets up all event listeners for the offline settings UI
   *
   * @param {Object} OfflineManager - The OfflineManager instance
   */
  function setupEventListeners(OfflineManager) {
    // Form submission - download selected Bibles
    const form = document.getElementById('offline-download-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleDownloadBibles(OfflineManager);
    });

    // Clear cache button
    const clearBtn = document.getElementById('clear-cache-btn');
    clearBtn.addEventListener('click', async () => {
      await handleClearCache(OfflineManager);
    });

    // Listen for download progress events
    OfflineManager.addEventListener('download-progress', (event) => {
      updateDownloadProgress(event.detail);
    });

    // Listen for download complete events
    OfflineManager.addEventListener('download-complete', (event) => {
      handleDownloadComplete(event.detail, OfflineManager);
    });

    // Listen for cache cleared events
    OfflineManager.addEventListener('cache-cleared', (event) => {
      handleCacheCleared(event.detail, OfflineManager);
    });
  }

  /**
   * Handles the download Bibles action
   *
   * @param {Object} OfflineManager - The OfflineManager instance
   */
  async function handleDownloadBibles(OfflineManager) {
    // Get selected Bibles
    const checkboxes = document.querySelectorAll('.bible-download-checkbox:checked');

    if (checkboxes.length === 0) {
      showMessage('Please select at least one Bible to download', 'error');
      return;
    }

    const selectedBibles = Array.from(checkboxes).map(cb => ({
      id: cb.dataset.bibleId,
      abbrev: cb.dataset.bibleAbbrev,
      title: cb.dataset.bibleTitle
    }));

    // Get base path from the page
    const basePath = window.location.pathname.split('/')[1] === 'bibles'
      ? '/bibles'
      : '/bibles'; // fallback

    // Disable controls during download
    setDownloadControlsEnabled(false);

    // Show progress container
    showProgressContainer(true);

    // Download each Bible sequentially
    for (let i = 0; i < selectedBibles.length; i++) {
      const bible = selectedBibles[i];

      try {
        // Update progress label
        updateProgressLabel(`Downloading ${bible.abbrev} (${i + 1} of ${selectedBibles.length})...`);

        // Update Bible status
        updateBibleStatus(bible.id, 'Downloading...', 'is-downloading');

        // Download the Bible
        await OfflineManager.downloadBible(bible.id, basePath);

      } catch (error) {
        console.error(`[Offline Settings] Failed to download ${bible.abbrev}:`, error);
        updateBibleStatus(bible.id, 'Failed', 'is-error');
        showMessage(`Failed to download ${bible.abbrev}: ${error.message}`, 'error');
      }
    }

    // Re-enable controls
    setDownloadControlsEnabled(true);

    // Hide progress container
    showProgressContainer(false);

    // Uncheck all checkboxes
    checkboxes.forEach(cb => cb.checked = false);
  }

  /**
   * Handles the clear cache action
   *
   * @param {Object} OfflineManager - The OfflineManager instance
   */
  async function handleClearCache(OfflineManager) {
    // Confirm with user
    if (!confirm('Are you sure you want to clear all cached Bible content? This cannot be undone.')) {
      return;
    }

    try {
      // Disable clear button
      const clearBtn = document.getElementById('clear-cache-btn');
      clearBtn.disabled = true;
      clearBtn.textContent = 'Clearing...';

      await OfflineManager.clearCache();

    } catch (error) {
      console.error('[Offline Settings] Failed to clear cache:', error);
      showMessage('Failed to clear cache: ' + error.message, 'error');

      // Re-enable button
      const clearBtn = document.getElementById('clear-cache-btn');
      clearBtn.disabled = false;
      clearBtn.innerHTML = '<span aria-hidden="true">🗑</span> Clear Cache';
    }
  }

  /**
   * Updates the cache status display
   *
   * @param {Object} OfflineManager - The OfflineManager instance
   */
  async function updateCacheStatus(OfflineManager) {
    try {
      const status = await OfflineManager.getCacheStatus();

      // Update cached chapters count
      const chaptersCount = document.getElementById('cached-chapters-count');
      if (chaptersCount) {
        chaptersCount.textContent = status.chapterCount.toLocaleString();
      }

      // Update cache size
      const cacheSize = document.getElementById('cache-size');
      if (cacheSize) {
        cacheSize.textContent = status.sizeFormatted;
      }

    } catch (error) {
      console.error('[Offline Settings] Failed to get cache status:', error);

      // Show error state
      const chaptersCount = document.getElementById('cached-chapters-count');
      const cacheSize = document.getElementById('cache-size');

      if (chaptersCount) chaptersCount.textContent = 'Error';
      if (cacheSize) cacheSize.textContent = 'Error';
    }
  }

  /**
   * Updates the download progress display
   *
   * @param {Object} detail - Progress event detail
   */
  function updateDownloadProgress(detail) {
    const progressBar = document.getElementById('download-progress-bar');
    const progressText = document.getElementById('download-progress-text');

    if (progressBar) {
      progressBar.value = detail.progress;
    }

    if (progressText) {
      progressText.textContent = `${detail.progress}% (${detail.completed} / ${detail.total})`;
    }
  }

  /**
   * Handles download completion
   *
   * @param {Object} detail - Completion event detail
   * @param {Object} OfflineManager - The OfflineManager instance
   */
  async function handleDownloadComplete(detail, OfflineManager) {
    if (detail.success) {
      updateBibleStatus(detail.bible, 'Cached', 'is-cached');
      showMessage(`${detail.bible.toUpperCase()} downloaded successfully`, 'success');
    } else {
      updateBibleStatus(detail.bible, 'Failed', 'is-error');
      showMessage(`Failed to download ${detail.bible.toUpperCase()}: ${detail.error}`, 'error');
    }

    // Update cache status
    await updateCacheStatus(OfflineManager);
  }

  /**
   * Handles cache cleared event
   *
   * @param {Object} detail - Clear event detail
   * @param {Object} OfflineManager - The OfflineManager instance
   */
  async function handleCacheCleared(detail, OfflineManager) {
    // Clear all Bible status indicators
    const statusElements = document.querySelectorAll('.bible-download-status');
    statusElements.forEach(el => {
      el.textContent = '';
      el.className = 'bible-download-status';
    });

    // Re-enable clear button
    const clearBtn = document.getElementById('clear-cache-btn');
    clearBtn.disabled = false;
    clearBtn.innerHTML = '<span aria-hidden="true">🗑</span> Clear Cache';

    // Update cache status
    await updateCacheStatus(OfflineManager);

    // Show success message
    showMessage('Cache cleared successfully', 'success');
  }

  /**
   * Updates the status indicator for a specific Bible
   *
   * @param {string} bibleId - Bible ID
   * @param {string} text - Status text to display
   * @param {string} className - CSS class for status styling
   */
  function updateBibleStatus(bibleId, text, className) {
    const statusElement = document.getElementById(`status-${bibleId}`);
    if (statusElement) {
      statusElement.textContent = text;
      statusElement.className = `bible-download-status ${className}`;
    }
  }

  /**
   * Updates the progress label text
   *
   * @param {string} text - Label text
   */
  function updateProgressLabel(text) {
    const label = document.getElementById('download-progress-label');
    if (label) {
      label.textContent = text;
    }
  }

  /**
   * Shows or hides the progress container
   *
   * @param {boolean} show - Whether to show the container
   */
  function showProgressContainer(show) {
    const container = document.getElementById('download-progress-container');
    if (container) {
      if (show) {
        container.classList.remove('hidden');
      } else {
        container.classList.add('hidden');
      }
    }
  }

  /**
   * Enables or disables download controls
   *
   * @param {boolean} enabled - Whether controls should be enabled
   */
  function setDownloadControlsEnabled(enabled) {
    const downloadBtn = document.getElementById('download-offline-btn');
    const clearBtn = document.getElementById('clear-cache-btn');
    const checkboxes = document.querySelectorAll('.bible-download-checkbox');

    if (downloadBtn) downloadBtn.disabled = !enabled;
    if (clearBtn) clearBtn.disabled = !enabled;

    checkboxes.forEach(cb => {
      cb.disabled = !enabled;
    });
  }

  /**
   * Disables all offline controls (when not supported)
   */
  function disableOfflineControls() {
    setDownloadControlsEnabled(false);

    const form = document.getElementById('offline-download-form');
    if (form) {
      form.style.opacity = '0.5';
      form.style.pointerEvents = 'none';
    }
  }

  /**
   * Displays a message to the user
   *
   * @param {string} message - Message text
   * @param {string} type - Message type: 'success', 'error', or 'info'
   */
  function showMessage(message, type = 'info') {
    const messagesContainer = document.getElementById('offline-messages');
    if (!messagesContainer) return;

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `offline-message offline-message--${type}`;
    messageEl.textContent = message;
    messageEl.setAttribute('role', 'status');

    // Add to container
    messagesContainer.appendChild(messageEl);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageEl.remove();
    }, 5000);
  }

})();
