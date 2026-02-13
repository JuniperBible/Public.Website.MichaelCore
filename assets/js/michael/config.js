/**
 * Michael Configuration Module
 *
 * Centralized configuration for Juniper Bible.
 * Replaces hardcoded paths and values across the codebase.
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

'use strict';

// Note: Config is essential for core functionality, runs in Diaspora mode

const config = {
  // Base paths
  basePath: '/bible',
  archivePath: '/bible-archives',

  // Default Bible
  defaultBible: 'kjva',

  // Breakpoints (match CSS)
  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1024
  },

  // Comparison limits by viewport
  maxComparisons: {
    desktop: 3,
    tablet: 2,
    mobile: 1
  },

  // Storage keys
  storageKeys: {
    theme: 'michael-theme',
    selectedBible: 'michael-selected-bible',
    offlineBibles: 'michael-offline-bibles',
    recentBibles: 'michael-recent-bibles'
  },

  // Feature flags
  features: {
    offline: 'serviceWorker' in navigator,
    indexedDB: 'indexedDB' in window,
    compression: typeof DecompressionStream !== 'undefined'
  },

  /**
   * Get current viewport type
   * @returns {string} - 'mobile', 'tablet', or 'desktop'
   */
  getViewport: function() {
    const width = window.innerWidth;
    if (width < this.breakpoints.tablet) return 'mobile';
    if (width < this.breakpoints.desktop) return 'tablet';
    return 'desktop';
  },

  /**
   * Get max comparisons for current viewport
   * @returns {number}
   */
  getMaxComparisons: function() {
    return this.maxComparisons[this.getViewport()];
  }
};

// Register with Michael
if (window.Michael) {
  Michael.register('config', config);
}

// Also expose directly for non-module usage
window.Michael = window.Michael || {};
window.Michael.Config = config;
