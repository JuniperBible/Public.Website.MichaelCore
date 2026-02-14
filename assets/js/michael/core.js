/**
 * Michael Core Module System
 *
 * Centralized module registry with plugin architecture for Michael Bible PWA.
 * All modules register here and can be accessed via Michael.get('moduleName').
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

'use strict';

import { onDomReady } from './dom-ready.js';

// Note: Core module system is essential, runs in Diaspora mode

// Create global namespace
window.Michael = window.Michael || {};

// Module registry
const modules = new Map();
const initializedModules = new Set();

/**
 * Register a module
 * @param {string} name - Module name
 * @param {object} module - Module object with optional init() method
 */
Michael.register = function(name, module) {
  if (modules.has(name)) {
    console.warn(`[Michael] Module "${name}" already registered, overwriting`);
  }
  modules.set(name, module);
};

/**
 * Get a registered module
 * @param {string} name - Module name
 * @returns {object|undefined} - Module or undefined if not found
 */
Michael.get = function(name) {
  return modules.get(name);
};

/**
 * Check if a module is registered
 * @param {string} name - Module name
 * @returns {boolean}
 */
Michael.has = function(name) {
  return modules.has(name);
};

/**
 * Initialize all registered modules
 * Calls init() on each module that has one, in registration order.
 */
Michael.init = function() {
  modules.forEach((module, name) => {
    if (!initializedModules.has(name) && typeof module.init === 'function') {
      try {
        module.init();
        initializedModules.add(name);
      } catch (err) {
        console.error('[Michael] Failed to initialize module "%s":', name, err);
      }
    }
  });
};

/**
 * List all registered modules
 * @returns {string[]} - Array of module names
 */
Michael.list = function() {
  return Array.from(modules.keys());
};

// Cleanup registry for proper memory management
const cleanupFns = new Set();

/**
 * Register a cleanup function to be called on page unload
 * @param {function} fn - Cleanup function
 * @returns {function} - Unregister function
 */
Michael.addCleanup = function(fn) {
  cleanupFns.add(fn);
  return () => cleanupFns.delete(fn);
};

/**
 * Run all registered cleanup functions
 */
Michael.cleanup = function() {
  cleanupFns.forEach(fn => {
    try {
      fn();
    } catch (err) {
      console.error('[Michael] Cleanup error:', err);
    }
  });
  cleanupFns.clear();
};

// Auto-cleanup on page unload
window.addEventListener('beforeunload', Michael.cleanup);

// Auto-initialize when DOM is ready
onDomReady(Michael.init);
