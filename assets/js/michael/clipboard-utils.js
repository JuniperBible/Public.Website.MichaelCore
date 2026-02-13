/**
 * @file clipboard-utils.js - Clipboard copy utility with browser fallback
 * @description Consolidates clipboard copy logic used across share components.
 *              Provides a Promise-based API with fallback for older browsers.
 * @version 1.0.0
 * @copyright 2026, Focus with Justin
 */

/**
 * Copy text to clipboard with browser fallback
 * Uses modern Clipboard API when available, falls back to textarea + execCommand
 *
 * @param {string} text - The text to copy to clipboard
 * @returns {Promise<void>} Resolves on successful copy, rejects on failure
 *
 * @example
 * import { copyToClipboard } from './michael/clipboard-utils.js';
 *
 * copyToClipboard('Hello, World!')
 *   .then(() => showToast('Copied!'))
 *   .catch(() => showToast('Copy failed'));
 */
export function copyToClipboard(text) {
  // Modern Clipboard API (async)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback for older browsers (synchronous)
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-999999px';
    textarea.setAttribute('aria-hidden', 'true');

    document.body.appendChild(textarea);

    try {
      textarea.select();
      textarea.setSelectionRange(0, text.length); // Mobile support

      const success = document.execCommand('copy');

      if (success) {
        resolve();
      } else {
        reject(new Error('execCommand returned false'));
      }
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(textarea);
    }
  });
}
