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
  let basePath = '/bible';

  // Cached left-side verses (extracted from page content)
  let leftVerses = [];

  // DOM elements
  let singleContent, sssContainer, sssVersesContainer;

  /**
   * Initialize the chapter reader module
   */
  function init() {
    console.log('[ChapterReader] init() called');

    // Get DOM elements - use querySelectorAll since there may be multiple nav bars
    const fullWidthToggles = document.querySelectorAll('#fullwidth-toggle');
    const sssToggles = document.querySelectorAll('#sss-chapter-toggle');
    singleContent = document.querySelector('.chapter-content-single');
    sssContainer = document.querySelector('.chapter-sss-container');
    sssVersesContainer = document.getElementById('sss-verses');

    console.log('[ChapterReader] Found', fullWidthToggles.length, 'fullwidth toggles,', sssToggles.length, 'sss toggles');
    console.log('[ChapterReader] singleContent:', !!singleContent, 'sssContainer:', !!sssContainer);

    if (fullWidthToggles.length === 0 && sssToggles.length === 0) {
      console.log('[ChapterReader] No toggle buttons found, exiting');
      return;
    }

    // Get current chapter context from page data
    const bibleSelect = document.getElementById('bible-select');
    if (bibleSelect) {
      currentBible = bibleSelect.value;
      basePath = bibleSelect.dataset.basePath || '/bible';
      currentBook = bibleSelect.dataset.book || '';
      currentChapter = parseInt(bibleSelect.dataset.chapter) || 0;
    }

    // Extract verses from the page content for later use
    extractLeftVerses();

    // Restore saved preferences
    fullWidthMode = localStorage.getItem(STORAGE_KEY_FULLWIDTH) === 'true';
    sssMode = localStorage.getItem(STORAGE_KEY_SSS) === 'true';
    comparisonBible = localStorage.getItem(STORAGE_KEY_SSS_BIBLE) || '';

    // Apply saved state and add listeners to ALL toggle buttons
    fullWidthToggles.forEach((btn, i) => {
      console.log('[ChapterReader] Adding listener to fullwidth toggle', i);
      if (fullWidthMode) {
        btn.setAttribute('aria-pressed', 'true');
      }
      btn.addEventListener('click', function(e) {
        console.log('[ChapterReader] Fullwidth toggle clicked');
        toggleFullWidth();
      });
    });

    sssToggles.forEach((btn, i) => {
      console.log('[ChapterReader] Adding listener to sss toggle', i);
      if (sssMode) {
        btn.setAttribute('aria-pressed', 'true');
      }
      btn.addEventListener('click', function(e) {
        console.log('[ChapterReader] SSS toggle clicked');
        toggleSSS();
      });
    });

    // Apply full-width mode to body if saved
    if (fullWidthMode) {
      document.body.classList.add('full-width-mode');
    }

    // If SSS was previously enabled and we have the elements, restore it
    if (sssMode && sssContainer) {
      enableSSSMode();
    }
  }

  /**
   * Extract verses from the single content view for SSS mode
   */
  function extractLeftVerses() {
    leftVerses = [];
    if (!singleContent) {
      console.log('[ChapterReader] No singleContent found');
      return;
    }

    const bibleText = singleContent.querySelector('.bible-text');
    if (!bibleText) {
      console.log('[ChapterReader] No .bible-text found in singleContent');
      return;
    }

    // Find all verse spans - they have class "verse" and data-verse attribute
    const verseElements = bibleText.querySelectorAll('span.verse[data-verse]');
    console.log('[ChapterReader] Found', verseElements.length, 'verse elements');

    verseElements.forEach(el => {
      const verseNum = el.dataset.verse;
      if (verseNum) {
        // Clone the element to avoid modifying original, and remove share buttons
        const clone = el.cloneNode(true);
        // Remove share buttons from clone
        clone.querySelectorAll('.verse-share-btn').forEach(btn => btn.remove());
        leftVerses.push({
          number: parseInt(verseNum),
          html: clone.innerHTML
        });
      }
    });

    console.log('[ChapterReader] Extracted', leftVerses.length, 'verses from left content');
    if (leftVerses.length > 0) {
      console.log('[ChapterReader] First verse html:', leftVerses[0].html.substring(0, 100));
    }
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
    localStorage.setItem(STORAGE_KEY_FULLWIDTH, fullWidthMode);
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
    localStorage.setItem(STORAGE_KEY_SSS, 'true');

    // Set up comparison bible selectors (may be multiple in different nav bars)
    const comparisonSelects = document.querySelectorAll('#sss-comparison-bible');
    if (comparisonSelects.length > 0) {
      const firstSelect = comparisonSelects[0];

      // Set previously selected comparison bible if available
      if (comparisonBible && firstSelect.querySelector(`option[value="${comparisonBible}"]`)) {
        // Value already set, just sync all selects
      } else {
        // Default pairing: KJVA ↔ DRC, otherwise KJVA first, then DRC
        var defaults = currentBible === 'kjva' ? ['drc', 'kjva']
                     : currentBible === 'drc'  ? ['kjva', 'drc']
                     : ['kjva', 'drc'];
        var found = false;
        for (var i = 0; i < defaults.length; i++) {
          var opt = firstSelect.querySelector('option[value="' + defaults[i] + '"]');
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

      // Sync all selects and add listeners
      comparisonSelects.forEach(sel => {
        sel.value = comparisonBible;
        sel.addEventListener('change', handleComparisonBibleChange);
      });

      // Update the right pane label with the selected Bible
      updateRightPaneLabel();
    }

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
    localStorage.setItem(STORAGE_KEY_SSS, 'false');
  }

  /**
   * Handle comparison Bible selection change
   */
  function handleComparisonBibleChange(e) {
    comparisonBible = e.target.value;
    localStorage.setItem(STORAGE_KEY_SSS_BIBLE, comparisonBible);

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

    // Show loading state
    sssVersesContainer.innerHTML = '<div class="sss-loading">Loading...</div>';

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

        if (verses && verses.length > 0) {
          rightVerses = verses.map(v => ({
            number: parseInt(v.number),
            html: `<sup>${v.number}</sup> ${v.text}`
          }));
        }
      } else {
        // Fallback: fetch HTML directly and parse verses
        const url = `${basePath}/${comparisonBible}/${currentBook}/${currentChapter}/`;
        const response = await fetch(url);
        if (response.ok) {
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const content = doc.querySelector('.bible-text');
          if (content) {
            const verseElements = content.querySelectorAll('.verse, [data-verse]');
            verseElements.forEach(el => {
              const verseNum = el.dataset.verse || el.querySelector('sup')?.textContent;
              if (verseNum) {
                rightVerses.push({
                  number: parseInt(verseNum),
                  html: el.innerHTML
                });
              }
            });
          }
        }
      }

      // Render aligned verses - even if right side is empty, show left with "not available" message
      renderAlignedVerses(rightVerses);
    } catch (err) {
      console.error('[ChapterReader] Error loading comparison:', err);
      const translationName = getComparisonBibleName();
      sssVersesContainer.innerHTML = `<div class="sss-loading">Error loading content from ${translationName}</div>`;
    }
  }

  /**
   * Render aligned verse rows with left and right verses
   */
  function renderAlignedVerses(rightVerses) {
    if (!sssVersesContainer) return;

    // Get translation names for messages
    const leftBibleName = sssContainer?.dataset.leftBible || currentBible.toUpperCase();
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
      sssVersesContainer.innerHTML = '<div class="sss-loading">No verses found</div>';
      return;
    }

    let html = '';
    sortedNums.forEach(num => {
      const leftHtml = leftMap.get(num) || `<em class="sss-missing">(not in ${leftBibleName})</em>`;
      const rightHtml = rightMap.get(num) || `<em class="sss-missing">(not in ${rightBibleName})</em>`;

      html += `<div class="sss-verse-row" data-verse="${num}">
        <div class="sss-verse-left">${leftHtml}</div>
        <div class="sss-verse-right">${rightHtml}</div>
      </div>`;
    });

    sssVersesContainer.innerHTML = html;

    // Process Strong's numbers in both left and right columns
    if (window.Michael && window.Michael.processStrongsContent) {
      window.Michael.processStrongsContent(sssVersesContainer);
    }

    console.log('[ChapterReader] Rendered', sortedNums.length, 'aligned verse rows');
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
