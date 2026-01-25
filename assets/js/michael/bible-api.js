/**
 * Michael Bible API Module
 *
 * Provides unified data layer for fetching and parsing Bible chapter content.
 * This module is DOM-free and serves as a pure data layer without UI code.
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

window.Michael = window.Michael || {};
window.Michael.BibleAPI = (function() {
  'use strict';

  /**
   * Cache for fetched chapter data
   * Key format: "{bibleId}/{bookId}/{chapterNum}"
   * Value: Array of verse objects { number: int, text: string }
   * @type {Map<string, Array<{number: number, text: string}>>}
   */
  const chapterCache = new Map();

  /**
   * Fetches chapter data from a Bible translation page.
   *
   * This function fetches the HTML page for a specific chapter, parses the verses,
   * and caches the result for subsequent calls. The cache key is constructed from
   * the bibleId, bookId, and chapterNum parameters.
   *
   * @param {string} basePath - Base path for Bible URLs (e.g., "/bibles")
   * @param {string} bibleId - Bible translation ID (e.g., "kjv", "asv", "drc")
   * @param {string} bookId - Book identifier (e.g., "Gen", "Isa", "Matt")
   * @param {number} chapterNum - Chapter number (1-based)
   * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the fetch request
   * @returns {Promise<Array<{number: number, text: string}>|null>}
   *          Array of verse objects, or null if fetch fails
   *
   * @example
   * // Fetch Genesis chapter 1 from KJV
   * const verses = await fetchChapter('/bibles', 'kjv', 'Gen', 1);
   * console.log(verses[0]); // { number: 1, text: "In the beginning..." }
   *
   * @example
   * // Fetch with AbortController for cancellation
   * const controller = new AbortController();
   * const verses = await fetchChapter('/bibles', 'kjv', 'Gen', 1, controller.signal);
   * // Later: controller.abort();
   */
  async function fetchChapter(basePath, bibleId, bookId, chapterNum, signal) {
    const cacheKey = `${bibleId}/${bookId}/${chapterNum}`;

    // Return cached data if available
    if (chapterCache.has(cacheKey)) {
      return chapterCache.get(cacheKey);
    }

    // Construct URL (bookId should be lowercase in URL)
    const url = `${basePath}/${bibleId}/${bookId.toLowerCase()}/${chapterNum}/`;

    try {
      // Fetch chapter HTML page
      const response = await fetch(url, { signal });

      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
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
      console.error(`Error fetching ${url}:`, err);
      return null;
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
  function parseVersesFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const bibleText = doc.querySelector('.bible-text');

    if (!bibleText) return [];

    const verses = [];

    // Strategy 1: Modern format with .verse spans and data-verse attributes
    const verseSpans = bibleText.querySelectorAll('.verse[data-verse]');
    if (verseSpans.length > 0) {
      verseSpans.forEach(span => {
        const num = parseInt(span.dataset.verse);
        if (isNaN(num)) return;

        // Extract text content excluding the sup element (verse number)
        let text = '';
        span.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
          } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SUP') {
            text += node.textContent;
          }
        });

        verses.push({
          number: num,
          text: text.trim()
        });
      });
      return verses;
    }

    // Strategy 2: Legacy format with strong elements containing verse numbers
    const strongElements = bibleText.querySelectorAll('strong');
    if (strongElements.length > 0) {
      strongElements.forEach(strong => {
        const num = strong.textContent.trim();
        // Only process if strong contains just a number
        if (!/^\d+$/.test(num)) return;

        // Extract text until next verse number
        let text = '';
        let node = strong.nextSibling;
        while (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
          } else if (node.nodeName === 'STRONG') {
            // Stop at next verse number
            break;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip share buttons and other UI elements
            if (!node.classList?.contains('verse-share-btn')) {
              text += node.textContent;
            }
          }
          node = node.nextSibling;
        }

        verses.push({
          number: parseInt(num),
          text: text.trim()
        });
      });

      if (verses.length > 0) return verses;
    }

    // Strategy 3: Fallback for .verse or [data-verse] elements (broader search)
    const verseElements = bibleText.querySelectorAll('.verse, [data-verse]');
    if (verseElements.length > 0) {
      verseElements.forEach(el => {
        const verseNum = el.dataset.verse || el.querySelector('.verse-num')?.textContent?.trim();
        let text = el.textContent?.replace(/^\d+\s*/, '').trim();

        if (verseNum && text) {
          const num = parseInt(verseNum);
          if (!isNaN(num)) {
            verses.push({ number: num, text });
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
            number: parseInt(match[1]),
            text: span.textContent?.trim() || ''
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
          number: parseInt(match[1]),
          text: match[2].trim()
        });
      }

      // If still no verses, try strong tags: <strong>1</strong> followed by text
      if (verses.length === 0) {
        versePattern = /<strong>(\d+)<\/strong>\s*([^<]+)/g;
        while ((match = versePattern.exec(text)) !== null) {
          verses.push({
            number: parseInt(match[1]),
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
   *
   * @example
   * clearCache();
   * console.log('Chapter cache cleared');
   */
  function clearCache() {
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
  function getCacheSize() {
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
  function hasInCache(bibleId, bookId, chapterNum) {
    const cacheKey = `${bibleId}/${bookId}/${chapterNum}`;
    return chapterCache.has(cacheKey);
  }

  // Public API
  return {
    fetchChapter,
    parseVersesFromHTML,
    clearCache,
    getCacheSize,
    hasInCache
  };
})();
