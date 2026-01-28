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
  let leftPane, rightPane;

  /**
   * Initialize the chapter reader module
   */
  function init() {
    // Get DOM elements
    fullWidthToggle = document.getElementById('fullwidth-toggle');
    sssToggle = document.getElementById('sss-chapter-toggle');
    singleContent = document.querySelector('.chapter-content-single');
    sssContainer = document.querySelector('.chapter-sss-container');

    if (!fullWidthToggle && !sssToggle) return;

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

    // Apply saved state
    if (fullWidthMode) {
      document.body.classList.add('full-width-mode');
      if (fullWidthToggle) fullWidthToggle.setAttribute('aria-pressed', 'true');
    }

    // Set up event listeners
    if (fullWidthToggle) {
      fullWidthToggle.addEventListener('click', toggleFullWidth);
    }

    if (sssToggle) {
      sssToggle.addEventListener('click', toggleSSS);
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
    fullWidthToggle.setAttribute('aria-pressed', fullWidthMode ? 'true' : 'false');
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
    sssToggle.setAttribute('aria-pressed', 'true');
    localStorage.setItem(STORAGE_KEY_SSS, 'true');

    // Get panes
    leftPane = document.getElementById('sss-left-pane');
    rightPane = document.getElementById('sss-right-pane');

    // Set up comparison bible selector
    const comparisonSelect = document.getElementById('sss-comparison-bible');
    if (comparisonSelect) {
      // Set previously selected comparison bible if available
      if (comparisonBible && comparisonSelect.querySelector(`option[value="${comparisonBible}"]`)) {
        comparisonSelect.value = comparisonBible;
      } else {
        // Default to a different translation than current
        const options = Array.from(comparisonSelect.options);
        const different = options.find(opt => opt.value && opt.value !== currentBible);
        if (different) {
          comparisonBible = different.value;
          comparisonSelect.value = comparisonBible;
        }
      }

      comparisonSelect.addEventListener('change', handleComparisonBibleChange);
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
    sssToggle.setAttribute('aria-pressed', 'false');
    localStorage.setItem(STORAGE_KEY_SSS, 'false');
  }

  /**
   * Handle comparison Bible selection change
   */
  function handleComparisonBibleChange(e) {
    comparisonBible = e.target.value;
    localStorage.setItem(STORAGE_KEY_SSS_BIBLE, comparisonBible);
    loadComparisonContent();
  }

  /**
   * Load comparison chapter content
   */
  async function loadComparisonContent() {
    if (!rightPane || !comparisonBible || !currentBook || !currentChapter) return;

    // Show loading state
    rightPane.innerHTML = '<div class="loading">Loading...</div>';

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
          rightPane.innerHTML = '<div class="loading">Chapter not available in this translation</div>';
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
            rightPane.innerHTML = content.innerHTML;
          } else {
            rightPane.innerHTML = '<div class="loading">Content not found</div>';
          }
        } else {
          rightPane.innerHTML = '<div class="loading">Chapter not available</div>';
        }
      }
    } catch (err) {
      console.error('[ChapterReader] Error loading comparison:', err);
      rightPane.innerHTML = '<div class="loading">Error loading content</div>';
    }
  }

  /**
   * Render comparison content from verses array
   */
  function renderComparisonContent(verses) {
    if (!rightPane) return;

    let html = '';
    verses.forEach(verse => {
      const text = escapeHtml(verse.text);
      html += `<span class="verse" data-verse="${verse.number}"><sup>${verse.number}</sup> ${text}</span> `;
    });

    rightPane.innerHTML = `<div class="prose bible-text">${html}</div>`;
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
