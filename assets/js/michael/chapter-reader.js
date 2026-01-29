/**
 * @file chapter-reader.js - Chapter reader mode toggles
 * @description Full-width and side-by-side scripture toggles for Bible chapter pages
 * @requires michael/dom-utils.js
 * @requires michael/bible-api.js
 * @version 1.0.0
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

  // DOM elements
  let fullWidthToggle, sssToggle;
  let singleContent, sssContainer;
  let leftPane, rightPane, rightPaneContent;

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

    console.log('[ChapterReader] Found', fullWidthToggles.length, 'fullwidth toggles,', sssToggles.length, 'sss toggles');
    console.log('[ChapterReader] singleContent:', !!singleContent, 'sssContainer:', !!sssContainer);

    // Store first toggle reference for state updates
    fullWidthToggle = fullWidthToggles[0] || null;
    sssToggle = sssToggles[0] || null;

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

    // Get panes
    leftPane = document.getElementById('sss-left-pane');
    rightPane = document.getElementById('sss-right-pane');
    rightPaneContent = rightPane ? rightPane.querySelector('.pane-content') : null;

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

    // Load comparison content
    if (comparisonBible && currentBook && currentChapter) {
      loadComparisonContent();
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

    loadComparisonContent();
  }

  /**
   * Update the right pane header label with the selected Bible abbreviation
   */
  function updateRightPaneLabel() {
    const label = document.getElementById('sss-right-pane-label');
    if (!label) return;

    if (comparisonBible) {
      // Find the abbreviation from the select options
      const select = document.getElementById('sss-comparison-bible');
      if (select) {
        const option = select.querySelector(`option[value="${comparisonBible}"]`);
        if (option) {
          label.textContent = option.textContent;
          return;
        }
      }
      label.textContent = comparisonBible.toUpperCase();
    } else {
      label.textContent = 'Select a Bible to compare';
    }
  }

  /**
   * Load comparison chapter content
   */
  async function loadComparisonContent() {
    if (!rightPaneContent || !comparisonBible || !currentBook || !currentChapter) return;

    // Show loading state
    rightPaneContent.innerHTML = '<div class="loading">Loading...</div>';

    try {
      // Use BibleAPI if available
      if (window.Michael && window.Michael.BibleAPI) {
        const verses = await window.Michael.BibleAPI.fetchChapter(
          basePath,
          comparisonBible,
          currentBook,
          currentChapter
        );

        if (verses && verses.length > 0) {
          renderComparisonContent(verses);
        } else {
          rightPaneContent.innerHTML = '<div class="loading">Chapter not available in this translation</div>';
        }
      } else {
        // Fallback: fetch HTML directly
        const url = `${basePath}/${comparisonBible}/${currentBook}/${currentChapter}/`;
        const response = await fetch(url);
        if (response.ok) {
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const content = doc.querySelector('.bible-text');
          if (content) {
            rightPaneContent.innerHTML = content.innerHTML;
          } else {
            rightPaneContent.innerHTML = '<div class="loading">Content not found</div>';
          }
        } else {
          rightPaneContent.innerHTML = '<div class="loading">Chapter not available</div>';
        }
      }
    } catch (err) {
      console.error('[ChapterReader] Error loading comparison:', err);
      rightPaneContent.innerHTML = '<div class="loading">Error loading content</div>';
    }
  }

  /**
   * Render comparison content from verses array
   */
  function renderComparisonContent(verses) {
    if (!rightPaneContent) return;

    let html = '';
    verses.forEach(verse => {
      html += `<span class="verse" data-verse="${verse.number}"><sup>${verse.number}</sup> ${verse.text}</span> `;
    });

    rightPaneContent.innerHTML = `<div class="prose bible-text">${html}</div>`;

    // Process Strong's numbers in the new content
    const newBibleText = rightPaneContent.querySelector('.bible-text');
    if (newBibleText && window.Michael && window.Michael.processStrongsContent) {
      window.Michael.processStrongsContent(newBibleText);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    if (window.Michael && window.Michael.DomUtils && window.Michael.DomUtils.escapeHtml) {
      return window.Michael.DomUtils.escapeHtml(str);
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
