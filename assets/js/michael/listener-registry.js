/**
 * @file listener-registry.js - Event listener cleanup registry
 * @description Factory for creating registries that track and cleanup event listeners.
 *              Prevents memory leaks by ensuring all added listeners can be removed.
 * @version 1.0.0
 * @copyright 2025, Focus with Justin
 */

/**
 * Create a new listener registry
 * @returns {{add: Function, cleanup: Function, getCount: Function}} Registry API
 */
export function createListenerRegistry() {
  const registeredListeners = [];

  /**
   * Add an event listener and track it for cleanup
   * @param {EventTarget} target - Element or object to attach listener to
   * @param {string} event - Event name (e.g., 'click', 'keydown')
   * @param {Function} handler - Event handler function
   * @param {Object|boolean} [options] - addEventListener options
   */
  function add(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    registeredListeners.push({ target, event, handler, options });
  }

  /**
   * Remove all tracked listeners and clear the registry
   */
  function cleanup() {
    registeredListeners.forEach(({ target, event, handler, options }) => {
      target.removeEventListener(event, handler, options);
    });
    registeredListeners.length = 0;
  }

  /**
   * Get the number of registered listeners
   * @returns {number} Count of tracked listeners
   */
  function getCount() {
    return registeredListeners.length;
  }

  return {
    add,
    cleanup,
    getCount
  };
}
