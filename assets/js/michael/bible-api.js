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
   * Validate that a URL path is safe for fetching (same-origin, relative path only).
   * Prevents SSRF by rejecting absolute URLs and external domains.
   * @param {string} path - The URL path to validate
   * @returns {boolean} True if the path is safe for fetching
   */
  function isValidInternalPath(path) {
    if (!path || typeof path !== 'string') {
      return false;
    }
    // Reject absolute URLs (http://, https://, //, etc.)
    if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) {
      return false;
    }
    // Reject javascript: and data: protocols
    if (/^(javascript|data):/i.test(path.trim())) {
      return false;
    }
    // Allow only paths starting with /
    if (!path.startsWith('/')) {
      return false;
    }
    // Reject path traversal attempts
    if (path.includes('..')) {
      return false;
    }
    return true;
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
  async function fetchChapter(basePath, bibleId, bookId, chapterNum, signal) {
    // Validate input parameters to prevent injection
    if (!basePath || typeof basePath !== 'string') {
      return null;
    }
    if (!bibleId || !/^[a-zA-Z0-9-]+$/.test(bibleId)) {
      return null;
    }
    if (!bookId || !/^[a-zA-Z0-9]+$/.test(bookId)) {
      return null;
    }
    if (typeof chapterNum !== 'number' || chapterNum < 1 || chapterNum > 200) {
      return null;
    }

    const cacheKey = bibleId + '/' + bookId + '/' + chapterNum;

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

    // Construct URL from validated components (bookId should be lowercase in URL)
    const url = basePath + '/' + bibleId + '/' + bookId.toLowerCase() + '/' + chapterNum + '/';

    // Validate the constructed URL before fetching
    if (!isValidInternalPath(url)) {
      return null;
    }

    try {
      // Fetch chapter HTML page (URL is pre-validated as internal path)
      const response = await fetch(url, { signal: fetchSignal, credentials: 'same-origin' });

      if (!response.ok) {
        console.warn('Failed to fetch URL:', url, 'status:', response.status);
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
      console.error('Error fetching URL:', url, err);
      return null;
    } finally {
      // Clean up active fetch tracking
      if (controller && activeFetches.get(cacheKey) === controller) {
        activeFetches.delete(cacheKey);
      }
    }
  }

  /**
   * Strategy 1: Modern format with .verse spans and data-verse attributes.
   *
   * Extracts verse text by iterating child nodes and excluding the <sup> verse
   * number element, preserving all other semantic markup (<note>, <w>, etc.).
   *
   * @param {Element} bibleText - Root container element
   * @returns {Array<{number: number, text: string}>} Parsed verses, or empty array
   */
  function parseModernVerseSpans(bibleText) {
    const verseSpans = bibleText.querySelectorAll('.verse[data-verse]');
    if (verseSpans.length === 0) return [];

    const verses = [];
    verseSpans.forEach(span => {
      const num = parseInt(span.dataset.verse);
      if (isNaN(num)) return;

      // Extract HTML content excluding the sup element (verse number) and UI elements
      // Preserve <note>, <w>, and other semantic elements
      const excludeTags = new Set(['SUP', 'SELECT', 'NAV', 'BUTTON', 'LABEL', 'ASIDE', 'OPTION']);
      let html = '';
      span.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          html += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE && !excludeTags.has(node.tagName)) {
          // Preserve the full HTML of other elements (note, w, etc.)
          html += node.outerHTML;
        }
      });

      verses.push({ number: num, text: html.trim() });
    });

    return verses;
  }

  /**
   * Strategy 2: Legacy format with strong elements containing verse numbers.
   *
   * Uses the DOM Range API to handle OSIS milestone elements that break
   * sibling traversal. Strips UI chrome (nav, buttons, etc.) from extracted
   * content before returning.
   *
   * @param {Element} bibleText - Root container element
   * @param {Document} doc - Owning document (needed for createRange / createElement)
   * @returns {Array<{number: number, text: string}>} Parsed verses, or empty array
   */
  function parseLegacyStrongVerses(bibleText, doc) {
    const strongElements = Array.from(bibleText.querySelectorAll('strong'));
    const verseStrongs = strongElements.filter(
      strong => /^\d+$/.test(strong.textContent.trim())
    );

    if (verseStrongs.length === 0) return [];

    const UI_SELECTORS = [
      '.verse-share-btn', 'nav', '.reader-bar', 'select', '.bible-nav', 'button'
    ];

    const verses = [];
    verseStrongs.forEach((strong, index) => {
      const num = parseInt(strong.textContent.trim());
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
      UI_SELECTORS.forEach(sel => tempDiv.querySelectorAll(sel).forEach(el => el.remove()));

      const html = tempDiv.innerHTML.trim();
      if (html) {
        verses.push({ number: num, text: html });
      }
    });

    return verses;
  }

  /**
   * Strategy 3: Broader fallback for .verse or [data-verse] elements.
   *
   * Handles pages where verse elements carry a data-verse attribute or a
   * child .verse-num element. Strips any leading <sup> verse number from the
   * extracted innerHTML.
   *
   * @param {Element} bibleText - Root container element
   * @returns {Array<{number: number, text: string}>} Parsed verses, or empty array
   */
  function parseBroadVerseElements(bibleText) {
    const verseElements = bibleText.querySelectorAll('.verse, [data-verse]');
    if (verseElements.length === 0) return [];

    // UI elements to strip from verse content
    const UI_SELECTORS = ['select', 'nav', 'button', 'label', 'aside', '.reader-bar', '.bible-nav'];

    const verses = [];
    verseElements.forEach(el => {
      const verseNum = el.dataset.verse || el.querySelector('.verse-num')?.textContent?.trim();

      // Clone the element to avoid modifying the original DOM
      const clone = el.cloneNode(true);
      // Remove UI elements
      UI_SELECTORS.forEach(sel => clone.querySelectorAll(sel).forEach(ui => ui.remove()));
      // Strip leading verse number
      const html = clone.innerHTML?.replace(/^<sup[^>]*>\d+<\/sup>\s*/, '').trim();

      if (verseNum && html) {
        const num = parseInt(verseNum);
        if (!isNaN(num)) {
          verses.push({ number: num, text: html });
        }
      }
    });

    return verses;
  }

  /**
   * Strategy 4: Span elements with id="v{number}".
   *
   * @param {Element} bibleText - Root container element
   * @returns {Array<{number: number, text: string}>} Parsed verses, or empty array
   */
  function parseVSpanElements(bibleText) {
    const vSpans = bibleText.querySelectorAll('span[id^="v"]');
    if (vSpans.length === 0) return [];

    // UI elements to strip from verse content
    const UI_SELECTORS = ['select', 'nav', 'button', 'label', 'aside', '.reader-bar', '.bible-nav'];

    const verses = [];
    vSpans.forEach(span => {
      const match = span.id.match(/v(\d+)/);
      if (match) {
        // Clone to avoid modifying original DOM
        const clone = span.cloneNode(true);
        UI_SELECTORS.forEach(sel => clone.querySelectorAll(sel).forEach(ui => ui.remove()));
        verses.push({
          number: parseInt(match[1]),
          text: clone.innerHTML?.trim() || ''
        });
      }
    });

    return verses;
  }

  /**
   * Strategy 5: Last-resort prose parsing with regex verse markers.
   *
   * Tries superscript verse numbers first (<sup>N</sup>), then falls back to
   * bold verse numbers (<strong>N</strong>).
   *
   * @param {Element} bibleText - Root container element
   * @returns {Array<{number: number, text: string}>} Parsed verses, or empty array
   */
  function parseProseVerseMarkers(bibleText) {
    const prose = bibleText.querySelector('.bible-text, .prose, article') || bibleText;
    const text = prose.innerHTML;
    const verses = [];

    // Try superscript verse numbers: <sup>1</sup> followed by text
    const supPattern = /<sup[^>]*>(\d+)<\/sup>\s*([^<]+)/g;
    let match;
    while ((match = supPattern.exec(text)) !== null) {
      verses.push({ number: parseInt(match[1]), text: match[2].trim() });
    }

    if (verses.length > 0) return verses;

    // If still no verses, try strong tags: <strong>1</strong> followed by text
    const strongPattern = /<strong>(\d+)<\/strong>\s*([^<]+)/g;
    while ((match = strongPattern.exec(text)) !== null) {
      verses.push({ number: parseInt(match[1]), text: match[2].trim() });
    }

    return verses;
  }

  /**
   * Parses verses from a Bible chapter HTML page.
   *
   * This function tries multiple parsing strategies to handle different
   * HTML formats used across various Bible pages:
   *
   * 1. Modern format: .verse spans with data-verse attributes
   * 2. Legacy format: strong elements containing verse numbers
   * 3. Fallback: .verse or [data-verse] elements (broader search)
   * 4. Span elements with id="v{number}"
   * 5. Last resort: parsing prose content with superscript or strong verse numbers
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

    // Try multiple selectors for the verse container
    // Prefer specific .bible-text, fall back to common content containers
    const bibleText = doc.querySelector('.bible-text') ||
                      doc.querySelector('.prose') ||
                      doc.querySelector('article .content') ||
                      doc.querySelector('main');

    if (!bibleText) return [];

    const strategies = [
      () => parseModernVerseSpans(bibleText),
      () => parseLegacyStrongVerses(bibleText, doc),
      () => parseBroadVerseElements(bibleText),
      () => parseVSpanElements(bibleText),
      () => parseProseVerseMarkers(bibleText)
    ];

    for (const strategy of strategies) {
      const verses = strategy();
      if (verses.length > 0) return verses;
    }

    return [];
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
  function clearCache() {
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
    const cacheKey = bibleId + '/' + bookId + '/' + chapterNum;
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
