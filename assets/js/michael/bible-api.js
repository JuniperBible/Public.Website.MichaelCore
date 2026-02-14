/**
 * Michael Bible API Module
 *
 * Provides unified data layer for fetching and parsing Bible chapter content.
 * This module is DOM-free and serves as a pure data layer without UI code.
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

'use strict';

import { isValidFetchUrl, BIBLE_URL_PATTERNS } from './dom-utils.js';

// Regex pattern for valid Bible IDs and book IDs (alphanumeric, hyphen, underscore only)
const VALID_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Validates path components to prevent path traversal attacks.
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidPathComponent(id) {
  return typeof id === 'string' &&
         id.length > 0 &&
         id.length <= 50 &&
         VALID_ID_PATTERN.test(id);
}

/**
 * Cache for fetched chapter data
 * Key format: "{bibleId}/{bookId}/{chapterNum}"
 * Value: Array of verse objects { number: int, text: string }
 * @type {Map<string, Array<{number: number, text: string}>>}
 */
const chapterCache = new Map();

/**
 * Active fetch requests with AbortControllers for cancellation
 * Key format: "{bibleId}/{bookId}/{chapterNum}"
 * @type {Map<string, AbortController>}
 */
const activeFetches = new Map();

/**
 * Fetches chapter data from a Bible translation page.
 *
 * This function fetches the HTML page for a specific chapter, parses the verses,
 * and caches the result for subsequent calls. The cache key is constructed from
 * the bibleId, bookId, and chapterNum parameters.
 *
 * @param {string} basePath - Base path for Bible URLs (e.g., "/bible")
 * @param {string} bibleId - Bible translation ID (e.g., "kjv", "asv", "drc")
 * @param {string} bookId - Book identifier (e.g., "Gen", "Isa", "Matt")
 * @param {number} chapterNum - Chapter number (1-based)
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the fetch request
 * @returns {Promise<Array<{number: number, text: string}>|null>}
 *          Array of verse objects, or null if fetch fails
 *
 * @example
 * // Fetch Genesis chapter 1 from KJV
 * const verses = await fetchChapter('/bible', 'kjv', 'Gen', 1);
 * console.log(verses[0]); // { number: 1, text: "In the beginning..." }
 *
 * @example
 * // Fetch with AbortController for cancellation
 * const controller = new AbortController();
 * const verses = await fetchChapter('/bible', 'kjv', 'Gen', 1, controller.signal);
 * // Later: controller.abort();
 */
export async function fetchChapter(basePath, bibleId, bookId, chapterNum, signal) {
  // Validate path components to prevent path traversal and SSRF
  if (!isValidPathComponent(bibleId)) {
    console.error('Invalid bibleId rejected:', bibleId);
    return null;
  }
  if (!isValidPathComponent(bookId)) {
    console.error('Invalid bookId rejected:', bookId);
    return null;
  }
  if (typeof chapterNum !== 'number' || chapterNum < 1 || chapterNum > 200) {
    console.error('Invalid chapterNum rejected:', chapterNum);
    return null;
  }

  const cacheKey = `${bibleId}/${bookId}/${chapterNum}`;

  // Return cached data if available
  if (chapterCache.has(cacheKey)) {
    return chapterCache.get(cacheKey);
  }

  // Cancel any existing fetch for this same chapter to prevent race conditions
  if (activeFetches.has(cacheKey)) {
    activeFetches.get(cacheKey).abort();
    activeFetches.delete(cacheKey);
  }

  // Create AbortController if not provided
  const controller = signal ? null : new AbortController();
  const fetchSignal = signal || controller.signal;

  // Track this fetch
  if (controller) {
    activeFetches.set(cacheKey, controller);
  }

  // Construct URL (bookId should be lowercase in URL)
  const url = `${basePath}/${bibleId}/${bookId.toLowerCase()}/${chapterNum}/`;

  // Validate final URL before fetching
  if (!isValidFetchUrl(url, { allowedPatterns: BIBLE_URL_PATTERNS })) {
    console.error('Invalid URL rejected:', url);
    return null;
  }

  try {
    // Fetch chapter HTML page
    const response = await fetch(url, { signal: fetchSignal });

    if (!response.ok) {
      console.warn('Failed to fetch %s: %d', url, response.status);
      return null;
    }

    const html = await response.text();
    const verses = parseVersesFromHTML(html);

    // Cache the parsed verses
    chapterCache.set(cacheKey, verses);
    return verses;

  } catch (err) {
    // Re-throw AbortError to allow caller to handle cancellation
    if (err.name === 'AbortError') {
      throw err;
    }
    console.error('Error fetching %s:', url, err);
    return null;
  } finally {
    // Clean up active fetch tracking
    if (controller && activeFetches.get(cacheKey) === controller) {
      activeFetches.delete(cacheKey);
    }
  }
}

/**
 * Parses verses from a Bible chapter HTML page.
 *
 * This function tries multiple parsing strategies to handle different
 * HTML formats used across various Bible pages:
 *
 * 1. Modern format: .verse spans with data-verse attributes
 * 2. Legacy format: strong elements containing verse numbers
 * 3. Fallback: span elements with id="v{number}"
 * 4. Last resort: parsing prose content with superscript or strong verse numbers
 *
 * @param {string} html - HTML content of the chapter page
 * @returns {Array<{number: number, text: string}>}
 *          Array of verse objects with verse number and text content
 *
 * @example
 * const html = '<div class="bible-text"><span class="verse" data-verse="1">In the beginning...</span></div>';
 * const verses = parseVersesFromHTML(html);
 * console.log(verses); // [{ number: 1, text: "In the beginning..." }]
 */
export function parseVersesFromHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Try multiple selectors for the verse container
  // Prefer specific .bible-text, fall back to common content containers
  const bibleText = doc.querySelector('.bible-text') ||
                    doc.querySelector('.prose') ||
                    doc.querySelector('article .content') ||
                    doc.querySelector('main');

  if (!bibleText) return [];

  const verses = [];

  // Strategy 1: Modern format with .verse spans and data-verse attributes
  const verseSpans = bibleText.querySelectorAll('.verse[data-verse]');
  if (verseSpans.length > 0) {
    verseSpans.forEach(span => {
      const num = parseInt(span.dataset.verse, 10);
      if (isNaN(num)) return;

      // Extract HTML content excluding the sup element (verse number)
      // Preserve <note>, <w>, and other semantic elements
      let html = '';
      span.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          html += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SUP') {
          // Preserve the full HTML of other elements (note, w, etc.)
          html += node.outerHTML;
        }
      });

      verses.push({
        number: num,
        text: html.trim()
      });
    });
    return verses;
  }

  // Strategy 2: Legacy format with strong elements containing verse numbers
  // Uses DOM Range API to handle OSIS milestone elements that break sibling traversal
  const strongElements = Array.from(bibleText.querySelectorAll('strong'));
  const verseStrongs = strongElements.filter(strong => /^\d+$/.test(strong.textContent.trim()));

  if (verseStrongs.length > 0) {
    verseStrongs.forEach((strong, index) => {
      const num = parseInt(strong.textContent.trim(), 10);
      const nextStrong = verseStrongs[index + 1];

      // Create a range from this strong to the next (or end of container)
      // Use doc.createRange() since we're working with the parsed document
      const range = doc.createRange();
      range.setStartAfter(strong);

      if (nextStrong) {
        range.setEndBefore(nextStrong);
      } else {
        // Last verse - extend to end of container
        range.setEndAfter(bibleText.lastChild || bibleText);
      }

      // Extract content as HTML
      const fragment = range.cloneContents();
      const tempDiv = doc.createElement('div');
      tempDiv.appendChild(fragment);

      // Clean up: remove UI elements that shouldn't be in verse text
      tempDiv.querySelectorAll('.verse-share-btn').forEach(el => el.remove());
      tempDiv.querySelectorAll('nav').forEach(el => el.remove());
      tempDiv.querySelectorAll('.reader-bar').forEach(el => el.remove());
      tempDiv.querySelectorAll('select').forEach(el => el.remove());
      tempDiv.querySelectorAll('.bible-nav').forEach(el => el.remove());
      tempDiv.querySelectorAll('button').forEach(el => el.remove());

      const html = tempDiv.innerHTML.trim();
      if (html) {
        verses.push({ number: num, text: html });
      }
    });

    if (verses.length > 0) return verses;
  }

  // Strategy 3: Fallback for .verse or [data-verse] elements (broader search)
  const verseElements = bibleText.querySelectorAll('.verse, [data-verse]');
  if (verseElements.length > 0) {
    verseElements.forEach(el => {
      const verseNum = el.dataset.verse || el.querySelector('.verse-num')?.textContent?.trim();
      // Get innerHTML and strip leading verse number
      let html = el.innerHTML?.replace(/^<sup[^>]*>\d+<\/sup>\s*/, '').trim();

      if (verseNum && html) {
        const num = parseInt(verseNum, 10);
        if (!isNaN(num)) {
          verses.push({ number: num, text: html });
        }
      }
    });

    if (verses.length > 0) return verses;
  }

  // Strategy 4: Parse span elements with id="v{number}"
  const vSpans = bibleText.querySelectorAll('span[id^="v"]');
  if (vSpans.length > 0) {
    vSpans.forEach(span => {
      const id = span.id;
      const match = id.match(/v(\d+)/);
      if (match) {
        verses.push({
          number: parseInt(match[1], 10),
          text: span.innerHTML?.trim() || ''
        });
      }
    });

    if (verses.length > 0) return verses;
  }

  // Strategy 5: Last resort - parse prose content with verse markers
  const prose = bibleText.querySelector('.bible-text, .prose, article') || bibleText;
  if (prose) {
    const text = prose.innerHTML;

    // Try superscript verse numbers: <sup>1</sup> followed by text
    let versePattern = /<sup[^>]*>(\d+)<\/sup>\s*([^<]+)/g;
    let match;
    while ((match = versePattern.exec(text)) !== null) {
      verses.push({
        number: parseInt(match[1], 10),
        text: match[2].trim()
      });
    }

    // If still no verses, try strong tags: <strong>1</strong> followed by text
    if (verses.length === 0) {
      versePattern = /<strong>(\d+)<\/strong>\s*([^<]+)/g;
      while ((match = versePattern.exec(text)) !== null) {
        verses.push({
          number: parseInt(match[1], 10),
          text: match[2].trim()
        });
      }
    }
  }

  return verses;
}

/**
 * Clears the chapter cache.
 *
 * This can be useful to free memory or force fresh fetches of chapter data.
 * Call this function when you want to invalidate all cached chapters.
 * Also cancels any active fetches.
 *
 * @example
 * clearCache();
 * console.log('Chapter cache cleared');
 */
export function clearCache() {
  // Cancel all active fetches
  activeFetches.forEach(controller => controller.abort());
  activeFetches.clear();

  chapterCache.clear();
}

/**
 * Gets the current size of the chapter cache.
 *
 * @returns {number} Number of cached chapters
 *
 * @example
 * const size = getCacheSize();
 * console.log(`Cache contains ${size} chapters`);
 */
export function getCacheSize() {
  return chapterCache.size;
}

/**
 * Checks if a specific chapter is in the cache.
 *
 * @param {string} bibleId - Bible translation ID
 * @param {string} bookId - Book identifier
 * @param {number} chapterNum - Chapter number
 * @returns {boolean} True if chapter is cached
 *
 * @example
 * if (hasInCache('kjv', 'Gen', 1)) {
 *   console.log('Genesis 1 is already cached');
 * }
 */
export function hasInCache(bibleId, bookId, chapterNum) {
  const cacheKey = `${bibleId}/${bookId}/${chapterNum}`;
  return chapterCache.has(cacheKey);
}

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

window.Michael = window.Michael || {};
window.Michael.BibleAPI = {
  fetchChapter,
  parseVersesFromHTML,
  clearCache,
  getCacheSize,
  hasInCache
};
