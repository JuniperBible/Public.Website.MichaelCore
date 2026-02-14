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

'use strict';

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
    const OfflineManager = window.Michael?.OfflineManager;
    if (!OfflineManager) {
      console.error('[Offline Settings] OfflineManager not found');
      showMessage('Offline functionality is not available', 'error');
      return;
    }

    // Check browser support
    if (!OfflineManager.isSupported()) {
      showMessage('Your browser does not support offline functionality', 'error');
      disableOfflineControls();
      return;
    }

    try {
      // Initialize the offline manager with service worker
      await OfflineManager.initialize('/sw.js');

      // Set up event listeners
      setupEventListeners(OfflineManager);

      // Load initial cache status
      await updateCacheStatus(OfflineManager);

      // Check cache status for each Bible and update UI
      await updateBibleCacheStatuses(OfflineManager);
    } catch (error) {
      console.error('[Offline Settings] Initialization failed:', error);
      showMessage('Failed to initialize offline functionality: ' + (error?.message || error || 'Unknown error'), 'error');
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
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleDownloadBibles(OfflineManager);
    });

    // Clear cache button
    const clearBtn = document.getElementById('clear-cache-btn');
    if (!clearBtn) return;
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
    // Get all selected Bibles
    const checkboxes = document.querySelectorAll('.bible-download-checkbox:checked');

    if (checkboxes.length === 0) {
      showMessage('Please select at least one Bible to download', 'error');
      return;
    }

    const selectedBibles = Array.from(checkboxes)
      .map(cb => ({
        id: cb.dataset.bibleId,
        abbrev: cb.dataset.bibleAbbrev,
        title: cb.dataset.bibleTitle
      }))
      .filter(bible => bible.id && bible.abbrev); // Validate required fields

    if (selectedBibles.length === 0) {
      showMessage('Invalid Bible selection', 'error');
      return;
    }

    // Get base path from the page
    const basePath = window.location.pathname.split('/')[1] === 'bibles'
      ? '/bible'
      : '/bible'; // fallback

    // Disable controls during download
    setDownloadControlsEnabled(false);

    // Show progress container
    showProgressContainer(true);

    let successCount = 0;
    let failCount = 0;

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
        successCount++;

      } catch (error) {
        console.error('[Offline Settings] Failed to download %s:', bible.abbrev, error);
        updateBibleStatus(bible.id, 'Failed', 'is-error');
        showMessage(`Failed to download ${bible.abbrev}: ${error.message}`, 'error');
        failCount++;
      }
    }

    // Show summary message if multiple downloads
    if (selectedBibles.length > 1) {
      if (failCount === 0) {
        showMessage(`Successfully downloaded ${successCount} Bible(s)`, 'success');
      } else if (successCount === 0) {
        showMessage(`Failed to download all ${failCount} Bible(s)`, 'error');
      } else {
        showMessage(`Downloaded ${successCount} Bible(s), ${failCount} failed`, 'info');
      }
    }

    // Re-enable controls (except for already-cached Bibles)
    setDownloadControlsEnabled(true);

    // Re-disable checkboxes for cached Bibles
    await updateBibleCacheStatuses(OfflineManager);

    // Hide progress container
    showProgressContainer(false);
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

    const clearBtn = document.getElementById('clear-cache-btn');
    const originalHtml = clearBtn.innerHTML;

    try {
      clearBtn.disabled = true;
      clearBtn.textContent = 'Clearing...';

      await OfflineManager.clearCache();

      // Reset button on success
      clearBtn.disabled = false;
      clearBtn.innerHTML = originalHtml;
    } catch (error) {
      console.error('[Offline Settings] Failed to clear cache:', error);
      showMessage('Failed to clear cache: ' + error.message, 'error');

      // Reset button on error
      clearBtn.disabled = false;
      clearBtn.innerHTML = originalHtml;
    }
  }

/**
 * Checks and updates cache status for all Bible checkboxes
 * Also sorts the chips to show cached Bibles first
 *
 * @param {Object} OfflineManager - The OfflineManager instance
 */
async function updateBibleCacheStatuses(OfflineManager) {
    const checkboxes = document.querySelectorAll('.bible-download-checkbox');
    const basePath = '/bible';
    const cachedBibles = [];
    const uncachedBibles = [];

    for (const checkbox of checkboxes) {
      const bibleId = checkbox.dataset.bibleId;
      if (!bibleId) continue;

      const chip = checkbox.closest('.bible-chip');

      try {
        const status = await OfflineManager.getBibleCacheStatus(bibleId, basePath);

        if (status.isFullyCached) {
          // Show cached state visually — keep checkbox interactive for deselection
          checkbox.checked = true;
          updateBibleStatus(bibleId, '', 'is-cached');
          if (chip) {
            chip.classList.add('is-cached');
            cachedBibles.push(chip);
          }
        } else if (status.cachedChapters > 0) {
          // Show partial cache status with percentage if we know total, otherwise just count
          if (status.totalChapters > 0) {
            const percent = Math.round((status.cachedChapters / status.totalChapters) * 100);
            updateBibleStatus(bibleId, `${percent}%`, 'is-partial');
          } else {
            updateBibleStatus(bibleId, `${status.cachedChapters}ch`, 'is-partial');
          }
          if (chip) {
            chip.classList.remove('is-cached');
            uncachedBibles.push(chip);
          }
        } else {
          // Not cached - clear any previous status
          updateBibleStatus(bibleId, '', '');
          if (chip) {
            chip.classList.remove('is-cached');
            uncachedBibles.push(chip);
          }
        }
      } catch (error) {
        console.warn('[Offline Settings] Failed to get cache status for %s:', bibleId, error);
        if (chip) uncachedBibles.push(chip);
      }
    }

    // Sort: cached Bibles first, then uncached
    const container = document.querySelector('.bible-download-chips');
    if (container && (cachedBibles.length > 0 || uncachedBibles.length > 0)) {
      // Move cached Bibles to the front
      cachedBibles.forEach(chip => container.prepend(chip));
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
      updateBibleStatus(detail.bible, '', 'is-cached');
      showMessage(`${detail.bible.toUpperCase()} downloaded successfully`, 'success');

      // Mark as cached visually — keep checkbox interactive
      const checkbox = document.querySelector(`.bible-download-checkbox[data-bible-id="${detail.bible}"]`);
      if (checkbox) {
        checkbox.checked = true;

        // Add cached class to chip
        const chip = checkbox.closest('.bible-chip');
        if (chip) {
          chip.classList.add('is-cached');
        }
      }
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
    try {
      // Clear all Bible status indicators
      const statusElements = document.querySelectorAll('.bible-download-status, .bible-chip__status');
      statusElements.forEach(el => {
        el.textContent = '';
        el.className = el.classList.contains('bible-chip__status')
          ? 'bible-chip__status'
          : 'bible-download-status';
      });

      // Clear cached classes from chips
      const chips = document.querySelectorAll('.bible-chip.is-cached');
      chips.forEach(chip => chip.classList.remove('is-cached'));

      // Re-enable all checkboxes and uncheck
      const checkboxes = document.querySelectorAll('.bible-download-checkbox');
      checkboxes.forEach(cb => {
        cb.disabled = false;
        cb.checked = false;
      });

      // Re-enable clear button
      const clearBtn = document.getElementById('clear-cache-btn');
      if (clearBtn) {
        clearBtn.disabled = false;
        clearBtn.innerHTML = '<span aria-hidden="true">🗑</span> Clear Cache';
      }

      // Update cache status
      await updateCacheStatus(OfflineManager);

      // Show success message
      const itemsCleared = detail?.itemsCleared || 0;
      showMessage(`Cache cleared successfully (${itemsCleared} items removed)`, 'success');
    } catch (error) {
      console.error('[Offline Settings] Error handling cache cleared:', error);
      showMessage('Cache was cleared but there was an error updating the UI', 'info');
    }
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
      // Support both old class name and new chip class name
      statusElement.className = statusElement.classList.contains('bible-chip__status')
        ? `bible-chip__status ${className}`
        : `bible-download-status ${className}`;
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

    if (downloadBtn) {
      downloadBtn.disabled = !enabled;
      if (!enabled) {
        downloadBtn.setAttribute('aria-busy', 'true');
      } else {
        downloadBtn.removeAttribute('aria-busy');
      }
    }

    if (clearBtn) {
      clearBtn.disabled = !enabled;
    }

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
}

// Self-invoking initialization with DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOfflineSettings);
} else {
  initializeOfflineSettings();
}
