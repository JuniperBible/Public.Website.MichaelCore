/**
 * @file sss-mode.js - Side-by-Side-by-Side comparison mode for Michael Bible Module
 * @description Manages SSS mode state, UI, and verse-by-verse comparison rendering
 * @requires michael/dom-utils.js
 * @requires michael/bible-api.js
 * @version 1.0.0
 * Copyright (c) 2025, Focus with Justin
 */
(function() {
  'use strict';

  // SSS mode state
  let sssMode = false;
  let sssLeftBible = '';
  let sssRightBible = '';
  let sssBook = '';
  let sssChapter = 0;
  let sssVerse = 0;
  let sssHighlightEnabled = true;

  // AbortController for cancelling in-flight fetch requests
  let currentFetchController = null;

  // DOM elements
  let normalModeEl, sssModeEl, sssBibleLeft, sssBibleRight;
  let sssBookSelect, sssChapterSelect, sssLeftPane, sssRightPane;
  let sssVerseGrid, sssVerseButtons, sssAllVersesBtn;

  // Dependencies
  let bibleData, basePath, highlightDiffsFn;

  /**
   * Initialize SSS mode module
   * @param {Object} config - Configuration object
   * @param {Object} config.bibleData - Bible metadata
   * @param {string} config.basePath - Base URL for Bible data
   * @param {Function} config.highlightDiffsFn - Diff highlighting function
   * @param {Function} config.addTapListener - Tap listener utility
   */
  function init(config) {
    bibleData = config.bibleData;
    basePath = config.basePath;
    highlightDiffsFn = config.highlightDiffsFn;

    // Get DOM elements
    normalModeEl = document.getElementById('normal-mode');
    sssModeEl = document.getElementById('sss-mode');
    sssBibleLeft = document.getElementById('sss-bible-left');
    sssBibleRight = document.getElementById('sss-bible-right');
    sssBookSelect = document.getElementById('sss-book-select');
    sssChapterSelect = document.getElementById('sss-chapter-select');
    sssLeftPane = document.getElementById('sss-left-pane');
    sssRightPane = document.getElementById('sss-right-pane');
    sssVerseGrid = document.getElementById('sss-verse-grid');
    sssVerseButtons = document.getElementById('sss-verse-buttons');
    sssAllVersesBtn = document.getElementById('sss-all-verses-btn');

    if (!normalModeEl || !sssModeEl) return;

    // Set up SSS-specific event listeners
    const sssBackBtn = document.getElementById('sss-back-btn');
    const sssToggleBtn = document.getElementById('sss-toggle-btn');
    const sssHighlightToggle = document.getElementById('sss-highlight-toggle');

    if (sssBackBtn) config.addTapListener(sssBackBtn, exitSSSMode);
    if (sssToggleBtn) config.addTapListener(sssToggleBtn, exitSSSMode);

    if (sssHighlightToggle) {
      sssHighlightToggle.addEventListener('change', (e) => {
        sssHighlightEnabled = e.target.checked;
        if (canLoadSSSComparison()) loadSSSComparison();
      });
    }

    if (sssBibleLeft) sssBibleLeft.addEventListener('change', handleSSSBibleChange);
    if (sssBibleRight) sssBibleRight.addEventListener('change', handleSSSBibleChange);
    if (sssBookSelect) sssBookSelect.addEventListener('change', handleSSSBookChange);
    if (sssChapterSelect) sssChapterSelect.addEventListener('change', handleSSSChapterChange);
    if (sssAllVersesBtn) {
      config.addTapListener(sssAllVersesBtn, () => {
        sssVerse = 0;
        updateSSSVerseGridSelection();
        if (canLoadSSSComparison()) loadSSSComparison();
      });
    }
  }

  /** Check if SSS comparison can be loaded */
  function canLoadSSSComparison() {
    return sssLeftBible !== '' && sssRightBible !== '' && sssBook !== '' && sssChapter > 0;
  }

  /** Enter SSS mode with defaults */
  function enterSSSMode() {
    sssMode = true;
    updateSSSModeStatus();
    if (normalModeEl) normalModeEl.classList.add('hidden');
    if (sssModeEl) sssModeEl.classList.remove('hidden');
    document.getElementById('parallel-content')?.classList.add('hidden');

    // Check if we should reset to defaults (once per day)
    const today = new Date().toDateString();
    const lastSSSDate = localStorage.getItem('sss-last-date');
    if (lastSSSDate !== today) {
      localStorage.setItem('sss-last-date', today);
      sssLeftBible = '';
      sssRightBible = '';
      sssBook = '';
      sssChapter = 0;
    }

    // Set defaults if not already set
    if (!sssLeftBible && sssBibleLeft) {
      sssLeftBible = 'drc';
      sssBibleLeft.value = 'drc';
    }
    if (!sssRightBible && sssBibleRight) {
      sssRightBible = 'kjv';
      sssBibleRight.value = 'kjv';
    }
    if (!sssBook && sssBookSelect) {
      sssBook = 'Isa';
      sssBookSelect.value = 'Isa';
      populateSSSChapterDropdown();
    }
    if (!sssChapter && sssChapterSelect) {
      sssChapter = 42;
      sssChapterSelect.value = '42';
    }

    if (canLoadSSSComparison()) loadSSSComparison();
  }

  /** Exit SSS mode and return to normal view */
  function exitSSSMode() {
    sssMode = false;
    updateSSSModeStatus();
    if (normalModeEl) normalModeEl.classList.remove('hidden');
    if (sssModeEl) sssModeEl.classList.add('hidden');
    document.getElementById('parallel-content')?.classList.remove('hidden');
  }

  /** Update SSS mode status indicators */
  function updateSSSModeStatus() {
    const modeStatusEl = document.getElementById('sss-mode-status');
    const sssStatusEl = document.getElementById('sss-status');
    if (modeStatusEl) modeStatusEl.textContent = sssMode ? '- ON' : '- OFF';
    if (sssStatusEl) sssStatusEl.textContent = sssMode ? '- ON' : '- OFF';
  }

  /** Handle SSS Bible translation selection change */
  function handleSSSBibleChange() {
    sssLeftBible = sssBibleLeft?.value || '';
    sssRightBible = sssBibleRight?.value || '';
    if (canLoadSSSComparison()) loadSSSComparison();
  }

  /** Handle SSS book selection change */
  function handleSSSBookChange() {
    sssBook = sssBookSelect?.value || '';
    sssVerse = 0;
    populateSSSChapterDropdown();
    if (sssBook) {
      sssChapter = 1;
      if (sssChapterSelect) sssChapterSelect.value = '1';
    } else {
      sssChapter = 0;
    }
    if (canLoadSSSComparison()) loadSSSComparison();
  }

  /** Handle SSS chapter selection change */
  function handleSSSChapterChange() {
    sssChapter = parseInt(sssChapterSelect?.value) || 0;
    sssVerse = 0;
    if (canLoadSSSComparison()) loadSSSComparison();
  }

  /** Populate SSS chapter dropdown */
  function populateSSSChapterDropdown() {
    if (!sssChapterSelect) return;

    // Clear and add default option safely
    sssChapterSelect.textContent = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '...';
    sssChapterSelect.appendChild(defaultOption);

    if (!sssBook || !bibleData?.books) {
      sssChapterSelect.disabled = true;
      return;
    }

    const book = bibleData.books.find(b => b.id === sssBook);
    if (!book) {
      sssChapterSelect.disabled = true;
      return;
    }

    for (let i = 1; i <= book.chapters; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i;
      sssChapterSelect.appendChild(option);
    }
    sssChapterSelect.disabled = false;
  }

  /** Load and display SSS comparison */
  async function loadSSSComparison() {
    if (!canLoadSSSComparison()) return;

    // Cancel any previous fetch to prevent race conditions
    if (currentFetchController) {
      currentFetchController.abort();
    }

    // Create new AbortController for this fetch
    currentFetchController = new AbortController();
    const signal = currentFetchController.signal;

    // Show loading - createLoadingIndicator() returns a DOM element
    if (sssLeftPane) {
      sssLeftPane.replaceChildren(window.Michael.DomUtils.createLoadingIndicator());
    }
    if (sssRightPane) {
      sssRightPane.replaceChildren(window.Michael.DomUtils.createLoadingIndicator());
    }

    try {
      // Fetch both chapters with abort signal
      const [leftVerses, rightVerses] = await Promise.all([
        window.Michael.BibleAPI.fetchChapter(basePath, sssLeftBible, sssBook, sssChapter, signal),
        window.Michael.BibleAPI.fetchChapter(basePath, sssRightBible, sssBook, sssChapter, signal)
      ]);

      // Check if request was aborted before rendering
      if (signal.aborted) return;

      populateSSSVerseGrid(leftVerses || rightVerses);

      const leftBible = bibleData.bibles.find(b => b.id === sssLeftBible);
      const rightBible = bibleData.bibles.find(b => b.id === sssRightBible);
      const bookInfo = bibleData.books.find(b => b.id === sssBook);
      const bookName = bookInfo?.name || sssBook;

      // Filter verses if specific verse selected
      const leftFiltered = sssVerse > 0 ? leftVerses?.filter(v => v.number === sssVerse) : leftVerses;
      const rightFiltered = sssVerse > 0 ? rightVerses?.filter(v => v.number === sssVerse) : rightVerses;

      if (sssLeftPane) {
        sssLeftPane.replaceChildren(buildSSSPaneFragment(leftFiltered, leftBible, bookName, rightFiltered, rightBible));
      }
      if (sssRightPane) {
        sssRightPane.replaceChildren(buildSSSPaneFragment(rightFiltered, rightBible, bookName, leftFiltered, leftBible));
      }
    } catch (err) {
      // Handle abort gracefully
      if (err.name === 'AbortError') {
        console.log('[SSS] Fetch cancelled');
        return;
      }
      console.error('[SSS] Error loading comparison:', err);
      const buildErrorNode = () => {
        const article = document.createElement('article');
        const p = document.createElement('p');
        p.style.textAlign = 'center';
        p.style.color = 'var(--michael-text-muted)';
        p.textContent = 'Error loading content';
        article.appendChild(p);
        return article;
      };
      if (sssLeftPane) {
        sssLeftPane.replaceChildren(buildErrorNode());
      }
      if (sssRightPane) {
        sssRightPane.replaceChildren(buildErrorNode());
      }
    } finally {
      // Clear controller reference if this was the active one
      if (currentFetchController && currentFetchController.signal === signal) {
        currentFetchController = null;
      }
    }
  }

  /** Populate SSS verse grid */
  function populateSSSVerseGrid(verses) {
    if (!verses || verses.length === 0) {
      if (sssVerseGrid) sssVerseGrid.classList.add('hidden');
      if (sssVerseButtons) {
        sssVerseButtons.textContent = '';
      }
      return;
    }

    if (sssVerseButtons) {
      sssVerseButtons.textContent = '';
      verses.forEach(verse => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sss-verse-btn verse-btn';
        btn.textContent = verse.number;
        btn.dataset.verse = verse.number;
        btn.setAttribute('aria-pressed', 'false');
        window.Michael.DomUtils.addTapListener(btn, () => handleSSSVerseButtonClick(verse.number));
        sssVerseButtons.appendChild(btn);
      });
    }

    if (sssVerseGrid) sssVerseGrid.classList.remove('hidden');
    updateSSSVerseGridSelection();
  }

  /** Handle SSS verse button click */
  function handleSSSVerseButtonClick(verseNum) {
    sssVerse = verseNum;
    updateSSSVerseGridSelection();
    if (canLoadSSSComparison()) loadSSSComparison();
  }

  /** Update SSS verse grid selection state */
  function updateSSSVerseGridSelection() {
    if (!sssVerseButtons) return;
    const buttons = sssVerseButtons.querySelectorAll('.sss-verse-btn');
    buttons.forEach(btn => {
      const verseNum = parseInt(btn.dataset.verse, 10);
      if (verseNum === sssVerse) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  /**
   * Build a DocumentFragment for one SSS pane using DOM APIs
   * @param {Array<Object>} verses - Verses to display
   * @param {Object} bible - Bible metadata
   * @param {string} bookName - Book name
   * @param {Array<Object>} compareVerses - Verses for comparison
   * @param {Object} compareBible - Comparison Bible metadata
   * @returns {DocumentFragment} DOM fragment ready to be inserted
   */
  function buildSSSPaneFragment(verses, bible, bookName, compareVerses, compareBible) {
    const fragment = document.createDocumentFragment();

    if (!verses || verses.length === 0) {
      const article = document.createElement('article');
      const p = document.createElement('p');
      p.style.textAlign = 'center';
      p.style.color = 'var(--michael-text-muted)';
      p.style.padding = '2rem 0';
      p.textContent = 'No verses found';
      article.appendChild(p);
      fragment.appendChild(article);
      return fragment;
    }

    // Build translation label header
    const header = document.createElement('header');
    header.className = 'translation-label';
    header.style.textAlign = 'center';
    header.style.paddingBottom = '0.5rem';

    const strong = document.createElement('strong');
    strong.textContent = bible?.abbrev || 'Unknown';
    header.appendChild(strong);

    // Versification warning (shown when bibles use different versification schemes)
    const showVersificationWarning = compareBible &&
      bible?.versification &&
      compareBible?.versification &&
      bible.versification !== compareBible.versification;

    if (showVersificationWarning) {
      const small = document.createElement('small');
      small.style.color = 'var(--michael-text-muted)';
      small.style.display = 'block';
      small.style.fontSize = '0.7rem';
      small.textContent = bible.versification + ' versification';
      header.appendChild(small);
    }

    fragment.appendChild(header);

    // Build each verse row
    verses.forEach(verse => {
      const compareVerse = compareVerses?.find(v => v.number === verse.number);
      const highlightedText = highlightDiffsFn(verse.text, compareVerse?.text, sssHighlightEnabled);

      const verseDiv = document.createElement('div');
      verseDiv.className = 'parallel-verse';

      const numSpan = document.createElement('span');
      numSpan.className = 'parallel-verse-num';
      numSpan.textContent = verse.number;
      verseDiv.appendChild(numSpan);

      const textSpan = document.createElement('span');
      // Parse highlighted text using DOMParser via shared utility
      const { parseHtmlFragment } = window.Michael.DomUtils;
      textSpan.appendChild(parseHtmlFragment(highlightedText));
      verseDiv.appendChild(textSpan);

      fragment.appendChild(verseDiv);
    });

    return fragment;
  }

  // Export public API
  window.Michael = window.Michael || {};
  window.Michael.SSSMode = {
    init,
    enterSSSMode,
    exitSSSMode,
    isActive: () => sssMode,
    getHighlightEnabled: () => sssHighlightEnabled
  };
})();
