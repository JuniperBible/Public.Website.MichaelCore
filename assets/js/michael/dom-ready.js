/**
 * DOM Ready Utility
 *
 * Executes a callback when the DOM is ready, or immediately if already ready.
 * Consolidates the DOM ready pattern used across multiple JavaScript files.
 */

/**
 * Execute callback when DOM is ready
 * @param {Function} callback - Function to execute when DOM is ready
 */
export function onDomReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}
