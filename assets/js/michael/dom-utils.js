/**
 * DOM Utilities Module for Michael Hugo Bible Module
 *
 * Provides common DOM manipulation utilities for touch/click handling,
 * color contrast calculation, and user notifications.
 *
 * Copyright (c) 2025, Focus with Justin
 */

window.Michael = window.Michael || {};
window.Michael.DomUtils = (function() {
  'use strict';

  /**
   * Add unified tap listener for mobile and desktop compatibility
   *
   * Prevents double-firing of events on touch devices by tracking touch
   * movement and preventing click events that originate from touches.
   *
   * Usage:
   *   addTapListener(element, (e) => {
   *     // Handle tap/click event
   *   });
   *
   * @param {HTMLElement} element - The element to attach the listener to
   * @param {Function} handler - The event handler function
   * @returns {void}
   *
   * @example
   * const button = document.getElementById('my-button');
   * addTapListener(button, (e) => {
   *   console.log('Button tapped or clicked');
   * });
   */
  function addTapListener(element, handler) {
    if (!element) return;

    let touchMoved = false;

    // Track touch start
    element.addEventListener('touchstart', () => {
      touchMoved = false;
    }, { passive: true });

    // Track if user is scrolling/swiping
    element.addEventListener('touchmove', () => {
      touchMoved = true;
    }, { passive: true });

    // Handle touch end (tap)
    element.addEventListener('touchend', (e) => {
      if (!touchMoved) {
        e.preventDefault();
        handler(e);
      }
    });

    // Handle click for mouse/trackpad
    element.addEventListener('click', (e) => {
      // Only fire click if not from touch (touch already handled above)
      if (e.pointerType !== 'touch') {
        handler(e);
      }
    });
  }

  /**
   * Calculate contrasting text color for a given background color
   *
   * Uses the relative luminance formula to determine whether black or
   * white text will provide better contrast on the given background.
   *
   * Based on WCAG contrast ratio guidelines.
   *
   * @param {string} hexColor - Background color in hex format (e.g., '#FF5733')
   * @returns {string} Contrasting text color ('#1a1a1a' or '#f5f5eb')
   *
   * @example
   * const bgColor = '#FF5733';
   * const textColor = getContrastColor(bgColor);
   * // Returns '#1a1a1a' for dark text on this bright background
   *
   * @example
   * const bgColor = '#333333';
   * const textColor = getContrastColor(bgColor);
   * // Returns '#f5f5eb' for light text on this dark background
   */
  function getContrastColor(hexColor) {
    // Extract RGB components from hex color
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate relative luminance using perceived brightness formula
    // (ITU-R BT.709 coefficients)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return dark text for bright backgrounds, light text for dark backgrounds
    return brightness > 128 ? '#1a1a1a' : '#f5f5eb';
  }

  /**
   * Display a message notification to the user
   *
   * Currently uses native browser alert dialog. Can be enhanced with
   * custom toast notifications or modal dialogs in the future.
   *
   * @param {string} text - The message text to display
   * @param {string} [type='info'] - Message type ('info', 'warning', 'error', 'success')
   * @returns {void}
   *
   * @example
   * showMessage('Chapter loaded successfully', 'success');
   *
   * @example
   * showMessage('Maximum 11 translations can be compared at once.', 'warning');
   *
   * @example
   * showMessage('Failed to load chapter data', 'error');
   */
  function showMessage(text, type = 'info') {
    // TODO: Replace with custom toast notification system
    // For now, use simple alert dialog
    alert(text);
  }

  // Public API
  return {
    addTapListener,
    getContrastColor,
    showMessage
  };
})();
