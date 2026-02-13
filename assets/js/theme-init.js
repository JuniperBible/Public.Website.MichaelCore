/**
 * Theme Initialization Module
 *
 * Loads the user's theme preference immediately (before DOM ready)
 * to prevent flash of unstyled content (FOUC).
 *
 * This must run as early as possible in the page load.
 */

'use strict';

(function() {
  const theme = localStorage.getItem('theme');
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
