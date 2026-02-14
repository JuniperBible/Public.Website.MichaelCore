/**
 * DOM Utilities Module for Michael Hugo Bible Module
 *
 * Provides common DOM manipulation utilities for touch/click handling,
 * color contrast calculation, and user notifications.
 *
 * Copyright (c) 2025, Focus with Justin
 */
/* eslint-disable no-unused-vars */

'use strict';

// ============================================================================
// TOAST NOTIFICATION CONFIGURATION
// ============================================================================

/**
 * Default toast notification options
 * @type {Object}
 */
const TOAST_DEFAULTS = {
  duration: 3000,        // Display duration in milliseconds
  position: 'bottom',    // 'top' or 'bottom'
  animationMs: window.Michael?.Config?.toastAnimationMs || 300       // CSS transition duration
};

/**
 * Toast type to CSS modifier mapping
 * @type {Object.<string, string>}
 */
const TOAST_MODIFIERS = {
  info: '',
  success: 'toast--success',
  warning: 'toast--warning',
  error: 'toast--error'
};

// ============================================================================
// TAP LISTENER
// ============================================================================

// Track all registered tap listeners for cleanup
const tapListeners = [];

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
export function addTapListener(element, handler) {
  if (!element) return;

  let touchMoved = false;

  // Track touch start
  const touchStartHandler = () => {
    touchMoved = false;
  };
  element.addEventListener('touchstart', touchStartHandler, { passive: true });

  // Track if user is scrolling/swiping
  const touchMoveHandler = () => {
    touchMoved = true;
  };
  element.addEventListener('touchmove', touchMoveHandler, { passive: true });

  // Handle touch end (tap)
  const touchEndHandler = (e) => {
    if (!touchMoved) {
      e.preventDefault();
      handler(e);
    }
  };
  element.addEventListener('touchend', touchEndHandler);

  // Handle click for mouse/trackpad
  const clickHandler = (e) => {
    // Only fire click if not from touch (touch already handled above)
    if (e.pointerType !== 'touch') {
      handler(e);
    }
  };
  element.addEventListener('click', clickHandler);

  // Track for cleanup
  tapListeners.push({
    element,
    handlers: {
      touchstart: touchStartHandler,
      touchmove: touchMoveHandler,
      touchend: touchEndHandler,
      click: clickHandler
    }
  });
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

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
export function getContrastColor(hexColor) {
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

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

/**
 * Display a toast notification to the user
 *
 * Creates an accessible, animated toast notification that auto-dismisses.
 * Supports multiple message types with distinct visual styling.
 * Uses ARIA live regions for screen reader accessibility.
 *
 * @param {string} text - The message text to display
 * @param {string} [type='info'] - Message type: 'info', 'success', 'warning', 'error'
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.duration=3000] - Display duration in milliseconds
 * @param {string} [options.position='bottom'] - Position: 'top' or 'bottom'
 * @returns {HTMLElement} The toast element (for programmatic dismissal)
 *
 * @example
 * showMessage('Chapter loaded successfully', 'success');
 *
 * @example
 * showMessage('Maximum 11 translations can be compared at once.', 'warning');
 *
 * @example
 * showMessage('Failed to load chapter data', 'error', { duration: 5000 });
 *
 * @example
 * // Programmatic dismissal
 * const toast = showMessage('Processing...', 'info', { duration: 0 });
 * // Later: dismissToast(toast);
 */
export function showMessage(text, type = 'info', options = {}) {
  const config = { ...TOAST_DEFAULTS, ...options };

  // Remove any existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast';

  // Add type-specific modifier class
  const modifier = TOAST_MODIFIERS[type] || '';
  if (modifier) {
    toast.classList.add(modifier);
  }

  // Add position modifier
  if (config.position === 'top') {
    toast.classList.add('toast--top');
  }

  // Set content
  toast.textContent = text;

  // Accessibility: Use ARIA live region for screen readers
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.setAttribute('aria-atomic', 'true');

  // Append to document
  document.body.appendChild(toast);

  // Trigger animation after DOM insertion (allows CSS transition)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });
  });

  // Auto-dismiss after duration (unless duration is 0 for persistent toasts)
  if (config.duration > 0) {
    setTimeout(() => {
      dismissToast(toast, config.animationMs);
    }, config.duration);
  }

  return toast;
}

/**
 * Dismiss a toast notification with animation
 *
 * @param {HTMLElement} toast - The toast element to dismiss
 * @param {number} [animationMs=300] - Animation duration in milliseconds
 * @returns {void}
 *
 * @example
 * const toast = showMessage('Loading...', 'info', { duration: 0 });
 * // When done loading:
 * dismissToast(toast);
 */
export function dismissToast(toast, animationMs = TOAST_DEFAULTS.animationMs) {
  if (!toast || !toast.parentNode) return;

  toast.classList.remove('toast--visible');

  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, animationMs);
}

// ============================================================================
// HTML UTILITIES
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 *
 * Converts HTML special characters to their entity equivalents:
 * - & becomes &amp;
 * - < becomes &lt;
 * - > becomes &gt;
 * - " becomes &quot;
 * - ' becomes &#039;
 *
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 *
 * @example
 * const userInput = '<script>alert("XSS")</script>';
 * const safe = escapeHtml(userInput);
 * // Returns: &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
 */
export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create a loading indicator element
 *
 * Creates a semantic loading indicator using the aria-busy pattern
 * for screen reader accessibility.
 *
 * @param {string} [message='Loading...'] - Loading message to display
 * @returns {string} HTML string for loading indicator
 *
 * @example
 * element.innerHTML = createLoadingIndicator();
 *
 * @example
 * element.innerHTML = createLoadingIndicator('Fetching chapter data...');
 */
export function createLoadingIndicator(message = 'Loading...') {
  // SECURITY: The message parameter is sanitized using escapeHtml() to prevent XSS attacks.
  // This ensures any HTML special characters (<, >, &, ", ') in the message are escaped
  // before being inserted into the template literal, making it safe to use with innerHTML.
  return `<article aria-busy="true" style="text-align: center; padding: 2rem 0;">${escapeHtml(message)}</article>`;
}

// ============================================================================
// URL VALIDATION
// ============================================================================

/**
 * Check if URL has a dangerous protocol
 * @param {string} url - URL string (lowercase)
 * @returns {boolean} True if dangerous
 */
function hasDangerousProtocol(url) {
  return url.startsWith('javascript:') || url.startsWith('data:');
}

/**
 * Check if path matches any allowed patterns
 * @param {string} path - URL path
 * @param {RegExp[]} patterns - Allowed patterns
 * @returns {boolean} True if matches
 */
function matchesAllowedPatterns(path, patterns) {
  return patterns.length === 0 || patterns.some(pattern => pattern.test(path));
}

/**
 * Check if URL string is valid (not empty, is a string, not just whitespace)
 * @param {*} url - URL to validate
 * @returns {boolean} True if valid string
 */
function isValidUrlString(url) {
  return url && typeof url === 'string' && url.trim();
}

/**
 * Validate a relative URL
 * @param {string} url - URL to check
 * @param {boolean} allowRelative - Whether relative URLs are allowed
 * @param {RegExp[]} patterns - Allowed patterns
 * @returns {boolean} True if valid
 */
function validateRelativeUrl(url, allowRelative, patterns) {
  return allowRelative && matchesAllowedPatterns(url, patterns);
}

/**
 * Validate an absolute URL for same-origin
 * @param {string} url - URL to validate
 * @param {RegExp[]} patterns - Allowed patterns
 * @returns {boolean} True if valid same-origin URL
 */
function validateAbsoluteUrl(url, patterns) {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    const isSameOrigin = parsedUrl.origin === window.location.origin;
    return isSameOrigin && matchesAllowedPatterns(parsedUrl.pathname, patterns);
  } catch {
    return false;
  }
}

/**
 * Validate that a URL is safe for fetch requests
 *
 * Ensures URLs are same-origin and follow expected path patterns.
 * This prevents SSRF attacks by rejecting external URLs and
 * validating that paths match allowed patterns.
 *
 * @param {string} url - The URL to validate
 * @param {Object} [options] - Validation options
 * @param {RegExp[]} [options.allowedPatterns] - Array of RegExp patterns for allowed paths
 * @param {boolean} [options.allowRelative=true] - Whether to allow relative URLs
 * @returns {boolean} True if URL is safe, false otherwise
 *
 * @example
 * // Validate a Bible data URL
 * const url = '/data/bibles/WEB/Matthew/1.html';
 * if (isValidFetchUrl(url, { allowedPatterns: [/^\/data\/bibles\//] })) {
 *   fetch(url);
 * }
 */
export function isValidFetchUrl(url, options = {}) {
  const { allowedPatterns = [], allowRelative = true } = options;

  // Validate input
  if (!isValidUrlString(url)) {
    return false;
  }

  const trimmedUrl = url.trim();

  // Block dangerous protocols
  if (hasDangerousProtocol(trimmedUrl.toLowerCase())) {
    return false;
  }

  // Check if relative URL (starts with / but not //)
  const isRelative = trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//');

  // Validate relative or absolute URL
  return isRelative
    ? validateRelativeUrl(trimmedUrl, allowRelative, allowedPatterns)
    : validateAbsoluteUrl(trimmedUrl, allowedPatterns);
}

/**
 * URL patterns for Bible data paths
 * @type {RegExp[]}
 */
export const BIBLE_URL_PATTERNS = [
  /^\/data\/bibles\/[A-Za-z0-9_-]+\//,  // Bible chapter data
  /^\/bibles\/[A-Za-z0-9_-]+\//          // Bible page URLs
];

/**
 * URL patterns for Bible archive paths
 * @type {RegExp[]}
 */
export const BIBLE_ARCHIVE_PATTERNS = [
  /^\/data\/bibles\/[A-Za-z0-9_-]+\.(?:json|xz|gz)$/  // Bible archive files
];

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Cleanup all registered tap listeners
 */
function cleanup() {
  tapListeners.forEach(({ element, handlers }) => {
    if (element && element.parentNode) {
      element.removeEventListener('touchstart', handlers.touchstart, { passive: true });
      element.removeEventListener('touchmove', handlers.touchmove, { passive: true });
      element.removeEventListener('touchend', handlers.touchend);
      element.removeEventListener('click', handlers.click);
    }
  });
  tapListeners.length = 0;
}

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

window.Michael = window.Michael || {};
window.Michael.DomUtils = {
  addTapListener,
  getContrastColor,
  showMessage,
  dismissToast,
  escapeHtml,
  createLoadingIndicator,
  isValidFetchUrl,
  BIBLE_URL_PATTERNS,
  BIBLE_ARCHIVE_PATTERNS,
  cleanup
};

// Register cleanup handler
if (window.Michael && typeof window.Michael.addCleanup === 'function') {
  window.Michael.addCleanup(cleanup);
}
