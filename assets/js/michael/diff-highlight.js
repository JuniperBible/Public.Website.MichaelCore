/**
 * @file diff-highlight.js - Text difference highlighting for Michael Bible Module
 * @description Highlights textual differences between Bible translations
 * @requires michael/dom-utils.js
 * @version 1.0.0
 * Copyright (c) 2025, Focus with Justin
 */
'use strict';

window.Michael = window.Michael || {};

let highlightColor = '#666';

/**
 * Set the highlight color
 * @param {string} color - Hex color code
 */
function setHighlightColor(color) {
  highlightColor = color;
}

/**
 * Get current highlight color
 * @returns {string} Hex color code
 */
function getHighlightColor() {
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
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create a diff-insert span element and return its outerHTML
 * Uses DOM APIs to safely construct the element without template literals
 * @param {string} word - Plain text word to wrap (not pre-escaped)
 * @returns {string} The outerHTML of the constructed span element
 */
function makeDiffInsertSpan(word) {
  const span = document.createElement('span');
  span.className = 'diff-insert';
  span.textContent = word;
  return span.outerHTML;
}

/**
 * Build the set of normalized words from an array of texts
 * @param {Array<string>} otherTexts - Array of texts to extract words from
 * @returns {Set<string>} Set of normalized words
 */
function buildOtherWordsSet(otherTexts) {
  const otherWords = new Set();
  otherTexts.forEach(t => {
    if (t) {
      t.split(/\s+/).forEach(w => {
        const normalized = normalizeWord(w);
        if (normalized) otherWords.add(normalized);
      });
    }
  });
  return otherWords;
}

/**
 * Map words to highlighted HTML using a word set for comparison
 * @param {Array<string>} words - Words to process
 * @param {Set<string>} otherWords - Set of normalized comparison words
 * @returns {string} HTML string with highlighted differences
 */
function mapWordsToHtml(words, otherWords) {
  return words.map(word => {
    const cleanWord = normalizeWord(word);
    if (!otherWords.has(cleanWord) && cleanWord.length > 0) {
      return makeDiffInsertSpan(word);
    }
    return escapeHtml(word);
  }).join(' ');
}

/**
 * Highlight differences for normal mode (words not in ANY other translation)
 * @param {string} text - Text to highlight
 * @param {Array<string>} otherTexts - Array of other texts to compare against
 * @param {boolean} enabled - Whether highlighting is enabled
 * @returns {string} HTML string with highlighted differences
 */
function highlightNormalDifferences(text, otherTexts, enabled) {
  if (!enabled || !otherTexts || otherTexts.length === 0) return escapeHtml(text);

  // Use TextCompare engine if available
  if (window.TextCompare) {
    const compareText = otherTexts.find(t => t && t.length > 0);
    if (compareText) return highlightWithTextCompare(text, compareText);
  }

  // Fallback: simple word-level comparison
  const otherWords = buildOtherWordsSet(otherTexts);
  const words = text.split(/\s+/);
  return mapWordsToHtml(words, otherWords);
}

/**
 * Highlight differences between two texts (SSS mode)
 * @param {string} text - Text to highlight
 * @param {string} compareText - Text to compare against
 * @param {boolean} enabled - Whether highlighting is enabled
 * @returns {string} HTML string with highlighted differences
 */
function highlightDifferences(text, compareText, enabled) {
  if (!enabled || !compareText) return escapeHtml(text);

  // Use TextCompare engine if available
  if (window.TextCompare) {
    return highlightWithTextCompare(text, compareText);
  }

  // Fallback: simple word-level diff
  const words = text.split(/\s+/);
  const compareWords = new Set(compareText.split(/\s+/).map(w => normalizeWord(w)));
  return mapWordsToHtml(words, compareWords);
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

// Export public API
window.Michael.DiffHighlight = {
  setHighlightColor,
  getHighlightColor,
  highlightNormalDifferences,
  highlightDifferences
};
