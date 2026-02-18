/**
 * @file chapter-reader.js - Chapter reader mode toggles
 * @description Full-width and side-by-side scripture toggles for Bible chapter pages
 * @requires michael/dom-utils.js
 * @requires michael/bible-api.js
 * @version 1.1.0
 * Copyright (c) 2026, Focus with Justin
 */
(function() {
  'use strict';

  // Storage keys
  const STORAGE_KEY_FULLWIDTH = 'michael-fullwidth-mode';
  const STORAGE_KEY_SSS = 'michael-sss-chapter-mode';
  const STORAGE_KEY_SSS_BIBLE = 'michael-sss-comparison-bible';

  // State
  let fullWidthMode = false;
  let sssMode = false;
  let currentBible = '';
  let currentBook = '';
  let currentChapter = 0;
  let comparisonBible = '';
  let basePath = window.Michael?.Config?.basePath || '/bible';

  // Cached left-side verses (extracted from page content)
  let leftVerses = [];

  // DOM elements
  let singleContent, sssContainer, sssVersesContainer;

  /**
   * AbortController for loadAndRenderSSS to handle race conditions
   * @type {AbortController|null}
   */
  let loadSSSAbortController = null;

  /**
   * Initialize DOM element references
   * @returns {Object} Object containing DOM toggle elements
   */
  function initDOMElements() {
    const fullWidthToggles = document.querySelectorAll('#fullwidth-toggle');
    const sssToggles = document.querySelectorAll('#sss-chapter-toggle');
    const printButtons = document.querySelectorAll('#print-chapter');
    singleContent = document.querySelector('.chapter-content-single');
    sssContainer = document.querySelector('.chapter-sss-container');
    sssVersesContainer = document.getElementById('sss-verses');

    return { fullWidthToggles, sssToggles, printButtons };
  }

  /**
   * Initialize chapter context from page data
   */
  function initChapterContext() {
    const bibleSelect = document.getElementById('bible-select');
    if (bibleSelect) {
      currentBible = bibleSelect.value;
      basePath = bibleSelect.dataset.basePath || '/bible';
      currentBook = bibleSelect.dataset.book || '';
      currentChapter = parseInt(bibleSelect.dataset.chapter, 10) || 0;
    }
  }

  /**
   * Restore saved preferences from localStorage
   */
  function restoreSavedPreferences() {
    try {
      fullWidthMode = localStorage.getItem(STORAGE_KEY_FULLWIDTH) === 'true';
      sssMode = localStorage.getItem(STORAGE_KEY_SSS) === 'true';
      comparisonBible = localStorage.getItem(STORAGE_KEY_SSS_BIBLE) || '';
    } catch (e) {
      // localStorage unavailable - use defaults
      fullWidthMode = false;
      sssMode = false;
      comparisonBible = '';
    }
  }

  /**
   * Attach event listeners to toggle buttons
   * @param {NodeList} fullWidthToggles - Full width toggle buttons
   * @param {NodeList} sssToggles - SSS toggle buttons
   * @param {NodeList} printButtons - Print buttons
   */
  function attachEventListeners(fullWidthToggles, sssToggles, printButtons) {
    fullWidthToggles.forEach((btn) => {
      if (fullWidthMode) {
        btn.setAttribute('aria-pressed', 'true');
      }
      btn.addEventListener('click', toggleFullWidth);
    });

    sssToggles.forEach((btn) => {
      if (sssMode) {
        btn.setAttribute('aria-pressed', 'true');
      }
      btn.addEventListener('click', toggleSSS);
    });

    printButtons.forEach((btn) => {
      btn.addEventListener('click', () => window.print());
    });
  }

  /**
   * Apply saved UI state
   */
  function applySavedState() {
    if (fullWidthMode) {
      document.body.classList.add('full-width-mode');
    }

    if (sssMode && sssContainer) {
      enableSSSMode();
    }
  }

  /**
   * Initialize the chapter reader module
   */
  function init() {
    // Get DOM elements - use querySelectorAll since there may be multiple nav bars
    const { fullWidthToggles, sssToggles, printButtons } = initDOMElements();

    if (fullWidthToggles.length === 0 && sssToggles.length === 0) {
      return;
    }

    // Get current chapter context from page data
    initChapterContext();

    // Extract verses from the page content for later use
    extractLeftVerses();

    // Restore saved preferences (wrapped for private browsing mode)
    restoreSavedPreferences();

    // Apply saved state and add listeners to ALL toggle buttons
    attachEventListeners(fullWidthToggles, sssToggles, printButtons);

    // Apply full-width mode to body if saved and restore SSS if needed
    applySavedState();
  }

  /**
   * Extract verses from the single content view for SSS mode
   */
  function extractLeftVerses() {
    leftVerses = [];
    if (!singleContent) {
      return;
    }

    const bibleText = singleContent.querySelector('.bible-text');
    if (!bibleText) {
      return;
    }

    // Find all verse spans - they have class "verse" and data-verse attribute
    const verseElements = bibleText.querySelectorAll('span.verse[data-verse]');

    verseElements.forEach(el => {
      const verseNum = el.dataset.verse;
      if (verseNum) {
        // Clone the element to avoid modifying original, and remove share buttons
        const clone = el.cloneNode(true);
        // Remove share buttons from clone
        clone.querySelectorAll('.verse-share-btn').forEach(btn => btn.remove());
        // SECURITY: innerHTML is from trusted page DOM
        leftVerses.push({
          number: parseInt(verseNum, 10),
          html: clone.innerHTML
        });
      }
    });
  }

  /**
   * Toggle full-width mode
   */
  function toggleFullWidth() {
    fullWidthMode = !fullWidthMode;
    document.body.classList.toggle('full-width-mode', fullWidthMode);
    // Update all toggle buttons
    document.querySelectorAll('#fullwidth-toggle').forEach(btn => {
      btn.setAttribute('aria-pressed', fullWidthMode ? 'true' : 'false');
    });
    try { localStorage.setItem(STORAGE_KEY_FULLWIDTH, fullWidthMode); } catch (e) {}
  }

  /**
   * Toggle SSS (Side-by-Side Scripture) mode
   */
  function toggleSSS() {
    if (sssMode) {
      disableSSSMode();
    } else {
      enableSSSMode();
    }
  }

  /**
   * Get default comparison Bible based on current Bible
   * @returns {Array<string>} Array of default Bible codes in priority order
   */
  function getDefaultComparisonBibles() {
    if (currentBible === 'kjva') {
      return ['drc', 'kjva'];
    } else if (currentBible === 'drc') {
      return ['kjva', 'drc'];
    } else {
      return ['kjva', 'drc'];
    }
  }

  /**
   * Select default comparison Bible from available options
   * @param {HTMLSelectElement} firstSelect - First comparison Bible select element
   */
  function selectDefaultComparisonBible(firstSelect) {
    const defaults = getDefaultComparisonBibles();
    let found = false;

    for (let i = 0; i < defaults.length; i++) {
      const opt = firstSelect.querySelector('option[value="' + defaults[i] + '"]');
      if (opt && defaults[i] !== currentBible) {
        comparisonBible = defaults[i];
        found = true;
        break;
      }
    }

    // Fallback: first available different translation
    if (!found) {
      const options = Array.from(firstSelect.options);
      const different = options.find(opt => opt.value && opt.value !== currentBible);
      if (different) {
        comparisonBible = different.value;
      }
    }
  }

  /**
   * Initialize comparison Bible selection
   * @param {NodeList} comparisonSelects - Comparison Bible select elements
   */
  function initComparisonBibleSelection(comparisonSelects) {
    if (comparisonSelects.length === 0) return;

    const firstSelect = comparisonSelects[0];

    // Set previously selected comparison bible if available
    const hasValidSavedBible = comparisonBible &&
      firstSelect.querySelector(`option[value="${comparisonBible}"]`);

    if (!hasValidSavedBible) {
      selectDefaultComparisonBible(firstSelect);
    }

    // Sync all selects and add listeners
    comparisonSelects.forEach(sel => {
      sel.value = comparisonBible;
      sel.addEventListener('change', handleComparisonBibleChange);
    });

    // Update the right pane label with the selected Bible
    updateRightPaneLabel();
  }

  /**
   * Enable SSS mode
   */
  function enableSSSMode() {
    if (!sssContainer) return;

    sssMode = true;
    document.body.classList.add('sss-chapter-mode');

    // Update all toggle buttons
    document.querySelectorAll('#sss-chapter-toggle').forEach(btn => {
      btn.setAttribute('aria-pressed', 'true');
    });
    try { localStorage.setItem(STORAGE_KEY_SSS, 'true'); } catch (e) {}

    // Set up comparison bible selectors (may be multiple in different nav bars)
    const comparisonSelects = document.querySelectorAll('#sss-comparison-bible');
    initComparisonBibleSelection(comparisonSelects);

    // Load comparison content and build verse rows
    if (comparisonBible && currentBook && currentChapter) {
      loadAndRenderSSS();
    }
  }

  /**
   * Disable SSS mode
   */
  function disableSSSMode() {
    sssMode = false;
    document.body.classList.remove('sss-chapter-mode');
    // Update all toggle buttons
    document.querySelectorAll('#sss-chapter-toggle').forEach(btn => {
      btn.setAttribute('aria-pressed', 'false');
    });
    try { localStorage.setItem(STORAGE_KEY_SSS, 'false'); } catch (e) {}
  }

  /**
   * Handle comparison Bible selection change
   */
  function handleComparisonBibleChange(e) {
    comparisonBible = e.target.value;
    try { localStorage.setItem(STORAGE_KEY_SSS_BIBLE, comparisonBible); } catch (e) {}

    // Sync all comparison selectors (multiple nav bars may exist)
    document.querySelectorAll('#sss-comparison-bible').forEach(sel => {
      if (sel !== e.target) {
        sel.value = comparisonBible;
      }
    });

    // Update right pane header label
    updateRightPaneLabel();

    // Reload SSS content
    loadAndRenderSSS();
  }

  /**
   * Get the display name for the comparison Bible
   */
  function getComparisonBibleName() {
    if (!comparisonBible) return 'the selected translation';
    const select = document.getElementById('sss-comparison-bible');
    if (select) {
      const option = select.querySelector(`option[value="${comparisonBible}"]`);
      if (option) {
        return option.textContent;
      }
    }
    return comparisonBible.toUpperCase();
  }

  /**
   * Update the right pane header label with the selected Bible abbreviation
   */
  function updateRightPaneLabel() {
    const label = document.getElementById('sss-right-pane-label');
    if (!label) return;

    if (comparisonBible) {
      label.textContent = getComparisonBibleName();
    } else {
      label.textContent = 'Select a Bible';
    }
  }

  /**
   * Load comparison content and render aligned verse rows
   */
  async function loadAndRenderSSS() {
    if (!sssVersesContainer || !comparisonBible || !currentBook || !currentChapter) return;

    // Cancel any pending load operation
    if (loadSSSAbortController) {
      loadSSSAbortController.abort();
    }

    // Create new AbortController for this operation
    loadSSSAbortController = new AbortController();
    const signal = loadSSSAbortController.signal;

    // Show loading state
    sssVersesContainer.textContent = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'sss-loading';
    loadingDiv.textContent = 'Loading...';
    sssVersesContainer.appendChild(loadingDiv);

    try {
      let rightVerses = [];

      // Use BibleAPI if available
      if (window.Michael && window.Michael.BibleAPI) {
        const verses = await window.Michael.BibleAPI.fetchChapter(
          basePath,
          comparisonBible,
          currentBook,
          currentChapter
        );

        // Check if operation was aborted
        if (signal.aborted) return;

        if (verses && verses.length > 0) {
          // eslint-disable-next-line @anthropic/no-html-template-literals -- v.number/v.text from trusted BibleAPI
          rightVerses = verses.map(v => ({
            number: parseInt(v.number, 10),
            html: `<sup>${v.number}</sup> ${v.text}`
          }));
        }
      } else {
        // Fallback: fetch HTML directly and parse verses
        const url = `${basePath}/${comparisonBible}/${currentBook}/${currentChapter}/`;
        const response = await fetch(url, { signal });

        // Check if operation was aborted
        if (signal.aborted) return;

        if (response.ok) {
          const html = await response.text();

          // Check if operation was aborted
          if (signal.aborted) return;

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const content = doc.querySelector('.bible-text');
          if (content) {
            const verseElements = content.querySelectorAll('.verse, [data-verse]');
            verseElements.forEach(el => {
              const verseNum = el.dataset.verse || el.querySelector('sup')?.textContent;
              if (verseNum) {
                // SECURITY: Safe - innerHTML is from trusted Bible data fetched from our own site
                rightVerses.push({
                  number: parseInt(verseNum, 10),
                  html: el.innerHTML
                });
              }
            });
          }
        }
      }

      // Check if operation was aborted before rendering
      if (signal.aborted) return;

      // Render aligned verses - even if right side is empty, show left with "not available" message
      renderAlignedVerses(rightVerses);
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;

      console.error('Error loading comparison:', err);
      const translationName = getComparisonBibleName();
      if (sssVersesContainer) {
        sssVersesContainer.textContent = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'sss-loading';
        errorDiv.textContent = 'Error loading content from ' + translationName;
        sssVersesContainer.appendChild(errorDiv);
      }
    } finally {
      // Clear the abort controller when operation completes
      if (loadSSSAbortController && !loadSSSAbortController.signal.aborted) {
        loadSSSAbortController = null;
      }
    }
  }

  /**
   * Escape HTML to prevent XSS attacks
   * @param {string} str - String to escape
   * @returns {string} Escaped string safe for HTML insertion
   */
  function escapeHtml(str) {
    if (!str) return '';
    // Use DomUtils if available, otherwise inline fallback
    if (window.Michael && window.Michael.DomUtils && window.Michael.DomUtils.escapeHtml) {
      return window.Michael.DomUtils.escapeHtml(str);
    }
    // Fallback implementation
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Render aligned verse rows with left and right verses
   */
  function renderAlignedVerses(rightVerses) {
    if (!sssVersesContainer) return;

    // Get translation names for messages
    const leftBibleName = (sssContainer && sssContainer.dataset && sssContainer.dataset.leftBible)
      ? sssContainer.dataset.leftBible
      : currentBible.toUpperCase();
    const rightBibleName = getComparisonBibleName();

    // Create a map for quick lookup
    const leftMap = new Map();
    leftVerses.forEach(v => leftMap.set(v.number, v.html));

    const rightMap = new Map();
    rightVerses.forEach(v => rightMap.set(v.number, v.html));

    // Get all unique verse numbers from both sides, sorted
    const allVerseNums = new Set([...leftMap.keys(), ...rightMap.keys()]);
    const sortedNums = Array.from(allVerseNums).sort((a, b) => a - b);

    // Handle case where no verses found at all
    if (sortedNums.length === 0) {
      sssVersesContainer.textContent = '';
      const noVersesDiv = document.createElement('div');
      noVersesDiv.className = 'sss-loading';
      noVersesDiv.textContent = 'No verses found';
      sssVersesContainer.appendChild(noVersesDiv);
      return;
    }

    /**
     * Populate a container element from an HTML string sourced from trusted Bible data.
     * Uses a temporary element to parse the markup into DOM nodes, then moves those
     * nodes into the target container so no innerHTML assignment is made on live DOM.
     * @param {HTMLElement} container - The element to populate
     * @param {string} html - Trusted HTML from page DOM clone or BibleAPI
     */
    function setTrustedHtml(container, html) {
      const tmp = document.createElement('div');
      // Reading innerHTML on a detached element to parse trusted Bible HTML into nodes
      tmp.innerHTML = html; // eslint-disable-line no-unsanitized/property -- trusted Bible HTML parsed into detached element
      while (tmp.firstChild) {
        container.appendChild(tmp.firstChild);
      }
    }

    /**
     * Build a "missing verse" element for when a translation lacks a verse.
     * @param {string} bibleName - Already-escaped Bible translation name
     * @returns {HTMLElement} An <em> element with the missing-verse message
     */
    function buildMissingVerseNode(bibleName) {
      const em = document.createElement('em');
      em.className = 'sss-missing';
      em.textContent = '(not in ' + bibleName + ')';
      return em;
    }

    // Build verse rows using DOM APIs
    const fragment = document.createDocumentFragment();
    sortedNums.forEach(num => {
      // Validate num is an integer to prevent unexpected values in data-verse attribute
      if (!Number.isInteger(num)) return;

      const row = document.createElement('div');
      row.className = 'sss-verse-row';
      row.dataset.verse = num;

      const leftCell = document.createElement('div');
      leftCell.className = 'sss-verse-left';
      if (leftMap.has(num)) {
        // leftMap values are from page DOM clones - trusted HTML with sup tags, Strong's links, etc.
        setTrustedHtml(leftCell, leftMap.get(num));
      } else {
        leftCell.appendChild(buildMissingVerseNode(leftBibleName));
      }

      const rightCell = document.createElement('div');
      rightCell.className = 'sss-verse-right';
      if (rightMap.has(num)) {
        // rightMap values are from BibleAPI or parsed same-origin HTML - trusted Bible HTML
        setTrustedHtml(rightCell, rightMap.get(num));
      } else {
        rightCell.appendChild(buildMissingVerseNode(rightBibleName));
      }

      row.appendChild(leftCell);
      row.appendChild(rightCell);
      fragment.appendChild(row);
    });

    sssVersesContainer.textContent = '';
    sssVersesContainer.appendChild(fragment);

    // Process Strong's numbers in both left and right columns
    if (window.Michael && window.Michael.processStrongsContent) {
      window.Michael.processStrongsContent(sssVersesContainer);
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
