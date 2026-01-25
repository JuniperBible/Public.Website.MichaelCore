/**
 * Bible Navigation Handler
 *
 * Handles dropdown navigation for Bible translation, book, and chapter selectors.
 * This is loaded externally to comply with CSP script-src 'self' policy.
 */
(function() {
  'use strict';

  function initBibleNav() {
    // Get all navigation selects
    const selects = document.querySelectorAll('.bible-nav select');

    selects.forEach(function(select) {
      select.addEventListener('change', function() {
        if (this.value) {
          window.location.href = this.value;
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBibleNav);
  } else {
    initBibleNav();
  }
})();
