/**
 * Theme Initialization Module
 *
 * Loads the user's theme preference immediately (before DOM ready)
 * to prevent flash of unstyled content (FOUC).
 *
 * This must run as early as possible in the page load.
 */

'use strict';

/**
 * Initialize theme from localStorage or system preference
 * This executes immediately to prevent FOUC
 */
function initTheme() {
  const theme = localStorage.getItem('theme');
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// Execute immediately - critical to prevent flash of unstyled content
initTheme();

// NOTE: No ES6 exports - this script runs synchronously before <head>
// to prevent FOUC. ES6 modules are deferred which would break this.

// Attach to window.Michael namespace for other modules
if (typeof window !== 'undefined') {
  window.Michael = window.Michael || {};
  window.Michael.ThemeInit = {
    init: initTheme
  };
}
