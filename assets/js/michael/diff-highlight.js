/**
 * @file diff-highlight.js - Text difference highlighting for Michael Bible Module
 * @description Highlights textual differences between Bible translations
 * @requires michael/dom-utils.js
 * @version 1.0.0
 * Copyright (c) 2025, Focus with Justin
 */

let highlightColor = '#666';

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (!str) return '';
  if (window.Michael?.DomUtils?.escapeHtml) {
    return window.Michael.DomUtils.escapeHtml(str);
  }
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Set the highlight color
 * @param {string} color - Hex color code
 */
export function setHighlightColor(color) {
  highlightColor = color;
}

/**
 * Get current highlight color
 * @returns {string} Hex color code
 */
export function getHighlightColor() {
  return highlightColor;
}

/**
 * Normalize word for comparison (lowercase, no punctuation)
 * @param {string} word - Word to normalize
 * @returns {string} Normalized word
 */
function normalizeWord(word) {
  return word.toLowerCase().replace(/[.,;:!?'"]/g, '');
}

/**
 * Highlight differences for normal mode (words not in ANY other translation)
 * @param {string} text - Text to highlight
 * @param {Array<string>} otherTexts - Array of other texts to compare against
 * @param {boolean} enabled - Whether highlighting is enabled
 * @returns {string} HTML string with highlighted differences
 */
export function highlightNormalDifferences(text, otherTexts, enabled) {
    if (!enabled || !otherTexts || otherTexts.length === 0) return text;

    // Use TextCompare engine if available
    if (window.TextCompare) {
      const compareText = otherTexts.find(t => t && t.length > 0);
      if (compareText) return highlightWithTextCompare(text, compareText);
    }

    // Fallback: simple word-level comparison
    const otherWords = new Set();
    otherTexts.forEach(t => {
      if (t) {
        t.split(/\s+/).forEach(w => {
          const normalized = normalizeWord(w);
          if (normalized) otherWords.add(normalized);
        });
      }
    });

    const words = text.split(/\s+/);
    return words.map(word => {
      const cleanWord = normalizeWord(word);
      if (!otherWords.has(cleanWord) && cleanWord.length > 0) {
        return `<span class="diff-insert">${escapeHtml(word)}</span>`;
      }
      return escapeHtml(word);
    }).join(' ');
  }

/**
 * Highlight differences between two texts (SSS mode)
 * @param {string} text - Text to highlight
 * @param {string} compareText - Text to compare against
 * @param {boolean} enabled - Whether highlighting is enabled
 * @returns {string} HTML string with highlighted differences
 */
export function highlightDifferences(text, compareText, enabled) {
    if (!enabled || !compareText) return text;

    // Use TextCompare engine if available
    if (window.TextCompare) {
      return highlightWithTextCompare(text, compareText);
    }

    // Fallback: simple word-level diff
    const words = text.split(/\s+/);
    const compareWords = compareText.split(/\s+/).map(w => normalizeWord(w));

    return words.map(word => {
      const cleanWord = normalizeWord(word);
      if (!compareWords.includes(cleanWord) && cleanWord.length > 0) {
        return `<span class="diff-insert">${escapeHtml(word)}</span>`;
      }
      return escapeHtml(word);
    }).join(' ');
  }

/**
 * Use TextCompare engine for sophisticated diff highlighting
 * @param {string} text - Primary text to highlight
 * @param {string} compareText - Text to compare against
 * @returns {string} HTML string with categorized highlights
 */
function highlightWithTextCompare(text, compareText) {
    const TC = window.TextCompare;
    const result = TC.compareTexts(text, compareText);

    if (result.diffs.length === 0) {
      return TC.escapeHtml(text);
    }

    // Use CSS class-based highlighting for categorized diffs
    return TC.renderWithHighlights(result.textA, result.diffs, 'a', {
      showTypo: false,
      showPunct: true,
      showSpelling: true,
      showSubstantive: true,
      showAddOmit: true
    });
  }

// Export public API (backwards compatibility)
window.Michael = window.Michael || {};
window.Michael.DiffHighlight = {
  setHighlightColor,
  getHighlightColor,
  highlightNormalDifferences,
  highlightDifferences
};
