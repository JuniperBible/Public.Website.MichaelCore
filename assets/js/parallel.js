/**
 * Parallel Translation View Controller
 *
 * Displays multiple Bible translations side-by-side, verse-by-verse.
 * Fetches chapter data on-demand to avoid embedding 32MB of Bible data.
 *
 * Interface patterns inspired by STEPBible's comparison interface.
 *
 * Copyright (c) 2025, Focus with Justin
 *
 * This code incorporates interface patterns from STEPBible (https://stepbible.org)
 * which is licensed under the BSD 3-Clause License.
 * See THIRD-PARTY-LICENSES.md for full license text.
 *
 * STEPBible Copyright (c) 2012, STEPBible - All rights reserved.
 */
(function() {
  'use strict';

  // State
  let bibleData = null;
  let basePath = '/religion/bibles'; // Default, can be overridden from bible-data JSON
  let selectedTranslations = [];
  let currentBook = '';
  let currentChapter = 0;
  let currentVerse = 0; // 0 means all verses

  // SSS Mode State
  let sssMode = false;
  let sssLeftBible = '';
  let sssRightBible = '';
  let sssBook = '';
  let sssChapter = 0;
  let sssVerse = 0; // 0 means all verses
  let sssHighlightEnabled = true;
  let highlightColor = '#6b4c6b';

  // Normal mode highlighting state
  let normalHighlightEnabled = false;

  // Cache for fetched chapter data
  const chapterCache = new Map();

  // DOM Elements
  let bookSelect, chapterSelect, parallelContent;
  let translationCheckboxes;
  let verseGrid, verseButtons, allVersesBtn;

  // SSS DOM Elements
  let normalModeEl, sssModeEl;
  let sssBibleLeft, sssBibleRight, sssBookSelect, sssChapterSelect;
  let sssLeftPane, sssRightPane;
  let sssVerseGrid, sssVerseButtons, sssAllVersesBtn;

  /**
   * Initialize the parallel view controller
   */
  function init() {
    // Parse embedded Bible data (metadata only, no verses)
    const dataEl = document.getElementById('bible-data');
    if (dataEl) {
      try {
        bibleData = JSON.parse(dataEl.textContent);
        // Use configurable basePath if provided
        if (bibleData.basePath) {
          basePath = bibleData.basePath;
        }
      } catch (e) {
        console.error('Failed to parse Bible data:', e);
        return;
      }
    }

    // Get DOM elements
    bookSelect = document.getElementById('book-select');
    chapterSelect = document.getElementById('chapter-select');
    parallelContent = document.getElementById('parallel-content');
    translationCheckboxes = document.querySelectorAll('.translation-checkbox');
    verseGrid = document.getElementById('verse-grid');
    verseButtons = document.getElementById('verse-buttons');
    allVersesBtn = document.getElementById('all-verses-btn');

    // SSS Mode elements
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

    if (!bookSelect || !chapterSelect || !parallelContent) {
      return; // Not on compare page
    }

    // Set up event listeners
    setupEventListeners();

    // Restore state from URL or localStorage
    restoreState();
  }

  /**
   * Add click and touch event listeners for mobile compatibility
   * Prevents double-firing by tracking touch events
   */
  function addTapListener(element, handler) {
    if (!element) return;

    let touchMoved = false;

    element.addEventListener('touchstart', () => {
      touchMoved = false;
    }, { passive: true });

    element.addEventListener('touchmove', () => {
      touchMoved = true;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      if (!touchMoved) {
        e.preventDefault();
        handler(e);
      }
    });

    element.addEventListener('click', (e) => {
      // Only fire click if not from touch (touch already handled above)
      if (e.pointerType !== 'touch') {
        handler(e);
      }
    });
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Translation selection
    translationCheckboxes.forEach(cb => {
      cb.addEventListener('change', handleTranslationChange);
    });

    // SSS mode toggle button (on normal mode page)
    const sssModeBtn = document.getElementById('sss-mode-btn');
    addTapListener(sssModeBtn, () => enterSSSMode());

    // SSS back button
    const sssBackBtn = document.getElementById('sss-back-btn');
    addTapListener(sssBackBtn, () => exitSSSMode());

    // SSS selectors (change events work fine on mobile)
    if (sssBibleLeft) {
      sssBibleLeft.addEventListener('change', handleSSSBibleChange);
    }
    if (sssBibleRight) {
      sssBibleRight.addEventListener('change', handleSSSBibleChange);
    }
    if (sssBookSelect) {
      sssBookSelect.addEventListener('change', handleSSSBookChange);
    }
    if (sssChapterSelect) {
      sssChapterSelect.addEventListener('change', handleSSSChapterChange);
    }

    // SSS toggle button (logo click to exit SSS mode)
    const sssToggleBtn = document.getElementById('sss-toggle-btn');
    addTapListener(sssToggleBtn, () => exitSSSMode());

    // Normal mode highlight toggle
    const highlightToggle = document.getElementById('highlight-toggle');
    if (highlightToggle) {
      highlightToggle.addEventListener('change', (e) => {
        normalHighlightEnabled = e.target.checked;
        if (canLoadComparison()) {
          loadComparison();
        }
      });
    }

    // SSS mode highlight toggle
    const sssHighlightToggle = document.getElementById('sss-highlight-toggle');
    if (sssHighlightToggle) {
      sssHighlightToggle.addEventListener('change', (e) => {
        sssHighlightEnabled = e.target.checked;
        if (canLoadSSSComparison()) {
          loadSSSComparison();
        }
      });
    }

    // Color picker setup (normal mode)
    setupColorPicker('highlight-color-btn', 'highlight-color-picker', '.color-option');
    // Color picker setup (SSS mode)
    setupColorPicker('sss-highlight-color-btn', 'sss-highlight-color-picker', '.sss-color-option');

    // Book selection (change events work fine on mobile)
    bookSelect.addEventListener('change', handleBookChange);

    // Chapter selection - auto-load on change
    chapterSelect.addEventListener('change', handleChapterChange);

    // All verses button
    addTapListener(allVersesBtn, () => {
      currentVerse = 0;
      updateVerseGridSelection();
      saveState();
      if (canLoadComparison()) {
        loadComparison();
      }
    });

    // SSS All verses button
    addTapListener(sssAllVersesBtn, () => {
      sssVerse = 0;
      updateSSSVerseGridSelection();
      if (canLoadSSSComparison()) {
        loadSSSComparison();
      }
    });
  }

  /**
   * Set up color picker functionality
   */
  function setupColorPicker(btnId, pickerId, optionSelector) {
    const btn = document.getElementById(btnId);
    const picker = document.getElementById(pickerId);
    if (!btn || !picker) return;

    // Toggle picker on button tap
    addTapListener(btn, (e) => {
      e.stopPropagation();
      picker.classList.toggle('hidden');
    });

    // Set background colors on color option buttons
    picker.querySelectorAll(optionSelector).forEach(option => {
      option.style.backgroundColor = option.dataset.color;

      addTapListener(option, (e) => {
        e.stopPropagation();
        const color = option.dataset.color;
        highlightColor = color;

        // Enable highlighting in both modes when color is selected
        sssHighlightEnabled = true;
        normalHighlightEnabled = true;

        // Update checkbox states
        const highlightToggle = document.getElementById('highlight-toggle');
        if (highlightToggle) highlightToggle.checked = true;
        const sssHighlightToggle = document.getElementById('sss-highlight-toggle');
        if (sssHighlightToggle) sssHighlightToggle.checked = true;

        // Update both color buttons
        document.getElementById('highlight-color-btn')?.style.setProperty('background-color', color);
        document.getElementById('sss-highlight-color-btn')?.style.setProperty('background-color', color);

        // Update CSS variable for highlight
        document.documentElement.style.setProperty('--highlight-color', color);

        picker.classList.add('hidden');

        // Reload comparison based on current mode
        if (sssMode && canLoadSSSComparison()) {
          loadSSSComparison();
        } else if (canLoadComparison()) {
          loadComparison();
        }
      });
    });

    // Close picker when clicking/touching outside
    document.addEventListener('click', () => {
      picker.classList.add('hidden');
    });
    document.addEventListener('touchend', (e) => {
      if (!picker.contains(e.target) && e.target !== btn) {
        picker.classList.add('hidden');
      }
    });
  }

  /**
   * Handle translation checkbox change
   */
  function handleTranslationChange(e) {
    const checkbox = e.target;
    const translationId = checkbox.value;

    if (checkbox.checked) {
      if (selectedTranslations.length >= 11) {
        checkbox.checked = false;
        showMessage('Maximum 11 translations can be compared at once.', 'warning');
        return;
      }
      selectedTranslations.push(translationId);
    } else {
      selectedTranslations = selectedTranslations.filter(t => t !== translationId);
    }

    saveState();

    // Auto-reload if we have a valid selection
    if (canLoadComparison()) {
      loadComparison().then(() => {
        populateVerseGrid();
      });
    }
  }

  /**
   * Handle book selection change
   */
  function handleBookChange(e) {
    currentBook = e.target.value;
    currentVerse = 0;

    // Populate chapter dropdown and default to chapter 1
    populateChapterDropdown();
    if (currentBook) {
      currentChapter = 1;
      chapterSelect.value = '1';
    } else {
      currentChapter = 0;
    }

    saveState();

    // Auto-load if we have a valid selection
    if (canLoadComparison()) {
      loadComparison().then(() => {
        populateVerseGrid();
      });
    } else {
      resetVerseGrid();
    }
  }

  /**
   * Populate chapter dropdown based on selected book
   */
  function populateChapterDropdown() {
    chapterSelect.innerHTML = '<option value="">Select Chapter</option>';

    if (!currentBook || !bibleData || !bibleData.books) {
      chapterSelect.disabled = true;
      return;
    }

    // Get chapter count from book structure (books is now an array)
    const book = bibleData.books.find(b => b.id === currentBook);
    if (!book) {
      chapterSelect.disabled = true;
      return;
    }

    const chapterCount = book.chapters;

    for (let i = 1; i <= chapterCount; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `Chapter ${i}`;
      chapterSelect.appendChild(option);
    }

    chapterSelect.disabled = false;
  }

  /**
   * Reset verse grid to hidden state
   */
  function resetVerseGrid() {
    if (verseGrid) {
      verseGrid.classList.add('hidden');
    }
    if (verseButtons) {
      verseButtons.innerHTML = '';
    }
    currentVerse = 0;
  }

  /**
   * Populate verse grid based on loaded chapter data
   */
  function populateVerseGrid() {
    // Find first translation with valid data for this chapter
    let verses = null;
    for (const translationId of selectedTranslations) {
      const cacheKey = `${translationId}/${currentBook}/${currentChapter}`;
      const cached = chapterCache.get(cacheKey);
      if (cached && cached.length > 0) {
        verses = cached;
        break;
      }
    }

    if (!verses || verses.length === 0) {
      resetVerseGrid();
      return;
    }

    // Populate verse buttons grid
    if (verseButtons) {
      verseButtons.innerHTML = '';
      verses.forEach(verse => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'verse-btn';
        btn.textContent = verse.number;
        btn.dataset.verse = verse.number;
        btn.style.cssText = 'width: 1.75rem; height: 1.75rem; font-family: var(--michael-font-hand); font-size: 0.875rem; border-radius: var(--pico-border-radius); cursor: pointer;';
        addTapListener(btn, () => handleVerseButtonClick(verse.number));
        verseButtons.appendChild(btn);
      });
    }

    if (verseGrid) {
      verseGrid.classList.remove('hidden');
    }

    updateVerseGridSelection();
  }

  /**
   * Handle verse button click from grid
   */
  function handleVerseButtonClick(verseNum) {
    currentVerse = verseNum;
    saveState();
    updateVerseGridSelection();

    if (canLoadComparison()) {
      loadComparison();
    }
  }

  /**
   * Update verse grid button selection state
   */
  function updateVerseGridSelection() {
    if (!verseButtons) return;

    const buttons = verseButtons.querySelectorAll('.verse-btn');
    buttons.forEach(btn => {
      const verseNum = parseInt(btn.dataset.verse);
      if (verseNum === currentVerse) {
        btn.style.background = 'var(--michael-accent)';
        btn.style.color = 'white';
      } else {
        btn.style.background = '';
        btn.style.color = '';
      }
    });
  }

  /**
   * Handle chapter selection change - auto-load comparison
   */
  function handleChapterChange(e) {
    currentChapter = parseInt(e.target.value) || 0;
    currentVerse = 0;
    saveState();

    // Populate verse grid after loading
    if (canLoadComparison()) {
      loadComparison().then(() => {
        populateVerseGrid();
      });
    } else {
      resetVerseGrid();
    }
  }

  /**
   * Check if we can load a comparison
   */
  function canLoadComparison() {
    return selectedTranslations.length >= 1 &&
           currentBook !== '' &&
           currentChapter > 0;
  }

  /**
   * Fetch chapter data from a Bible translation page
   */
  async function fetchChapter(bibleId, bookId, chapterNum) {
    const cacheKey = `${bibleId}/${bookId}/${chapterNum}`;
    if (chapterCache.has(cacheKey)) {
      return chapterCache.get(cacheKey);
    }

    const url = `${basePath}/${bibleId}/${bookId.toLowerCase()}/${chapterNum}/`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
        return null;
      }

      const html = await response.text();
      const verses = parseVersesFromHTML(html);

      chapterCache.set(cacheKey, verses);
      return verses;
    } catch (err) {
      console.error(`Error fetching ${url}:`, err);
      return null;
    }
  }

  /**
   * Parse verses from chapter HTML page
   */
  function parseVersesFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const bibleText = doc.querySelector('.bible-text');

    if (!bibleText) return [];

    const verses = [];

    // Try parsing .verse spans first (new format)
    const verseSpans = bibleText.querySelectorAll('.verse[data-verse]');
    if (verseSpans.length > 0) {
      verseSpans.forEach(span => {
        const num = parseInt(span.dataset.verse);
        if (isNaN(num)) return;

        // Get text content excluding the sup element
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

    // Fallback: try strong elements (old format)
    const strongElements = bibleText.querySelectorAll('strong');
    strongElements.forEach(strong => {
      const num = strong.textContent.trim();
      if (!/^\d+$/.test(num)) return;

      // Extract text until next verse number
      let text = '';
      let node = strong.nextSibling;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.nodeName === 'STRONG') {
          break;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Skip share buttons
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

    return verses;
  }

  /**
   * Load and display the comparison
   */
  async function loadComparison() {
    if (!currentBook || !currentChapter) {
      return Promise.resolve();
    }

    // Handle no translations selected
    if (selectedTranslations.length === 0) {
      parallelContent.innerHTML = `
        <article>
          <p style="text-align: center; color: var(--michael-gray); font-family: var(--michael-font-hand); padding: 2rem 0;">
            Select at least one translation to view.
          </p>
        </article>
      `;
      return Promise.resolve();
    }

    // Update URL
    updateURL();

    // Show loading state
    parallelContent.innerHTML = `
      <article aria-busy="true" style="text-align: center; font-family: var(--michael-font-hand); padding: 2rem 0;">
        Loading...
      </article>
    `;

    // Fetch chapter data for all selected translations in parallel
    const chapterDataPromises = selectedTranslations.map(bibleId =>
      fetchChapter(bibleId, currentBook, currentChapter)
    );

    const chaptersData = await Promise.all(chapterDataPromises);

    // Build comparison HTML
    const html = buildComparisonHTML(chaptersData);
    parallelContent.innerHTML = html;
  }

  /**
   * Build the comparison HTML for verse-by-verse display
   */
  function buildComparisonHTML(chaptersData) {
    let html = '';

    // Find first translation with verses to get verse count
    const firstVerses = chaptersData.find(verses => verses && verses.length > 0);

    if (!firstVerses) {
      return '<article><p style="text-align: center; color: var(--michael-gray); font-family: var(--michael-font-hand); padding: 2rem 0;">No verses found for this chapter.</p></article>';
    }

    // Get book name (books is now an array)
    const bookInfo = bibleData.books.find(b => b.id === currentBook);
    const bookName = bookInfo?.name || currentBook;

    // Compact header showing current reference
    const verseRef = currentVerse > 0 ? `:${currentVerse}` : '';
    html += `<header style="text-align: center; margin-bottom: 1.5rem;">
      <h2 style="font-family: var(--michael-font-hand); margin-bottom: 0.25rem;">${bookName} ${currentChapter}${verseRef}</h2>
      <p style="color: var(--michael-gray); font-family: var(--michael-font-hand); font-size: 0.875rem; margin: 0;">${selectedTranslations.map(id => {
        const bible = bibleData.bibles.find(b => b.id === id);
        return bible?.abbrev || id;
      }).join(', ')}</p>
    </header>`;

    // Filter verses if specific verse selected
    const versesToShow = currentVerse > 0
      ? firstVerses.filter(v => v.number === currentVerse)
      : firstVerses;

    // Verse-by-verse comparison
    versesToShow.forEach((verse) => {
      const verseNum = verse.number;

      html += `<article class="parallel-verse" data-verse="${verseNum}">
        <header>
          <h3 style="font-family: var(--michael-font-hand); font-weight: bold; color: var(--michael-accent); margin-bottom: 0.5rem; font-size: 1rem;">${bookName} ${currentChapter}:${verseNum}</h3>
        </header>
        <div>`;

      // Collect all verse texts for this verse number for highlighting
      const allVerseTexts = selectedTranslations.map((tid, i) => {
        const verses = chaptersData[i] || [];
        const v = verses.find(v => v.number === verseNum);
        return v?.text || '';
      });

      selectedTranslations.forEach((translationId, idx) => {
        const bible = bibleData.bibles.find(b => b.id === translationId);
        const verses = chaptersData[idx] || [];
        const v = verses.find(v => v.number === verseNum);

        let text = v?.text || '<em style="color: var(--michael-gray);">Verse not available</em>';

        // Apply highlighting if enabled
        if (normalHighlightEnabled && v?.text) {
          const otherTexts = allVerseTexts.filter((_, i) => i !== idx && allVerseTexts[i]);
          text = highlightNormalDifferences(v.text, otherTexts);
        }

        html += `<div class="translation-label" style="margin-top: 0.75rem;">
          <strong style="color: var(--michael-accent); font-family: var(--michael-font-hand); font-size: 0.75rem;">${bible?.abbrev || translationId}</strong>
          <p style="margin: 0.25rem 0 0 0; line-height: 1.8;">${text}</p>
        </div>`;
      });

      html += `</div></article>`;
    });

    return html;
  }

  /**
   * Update URL with current state
   */
  function updateURL() {
    const params = new URLSearchParams();
    params.set('bibles', selectedTranslations.join(','));
    const verseRef = currentVerse > 0 ? `.${currentVerse}` : '';
    params.set('ref', `${currentBook}.${currentChapter}${verseRef}`);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    history.pushState({ bibles: selectedTranslations, ref: `${currentBook}.${currentChapter}${verseRef}` }, '', newUrl);
  }

  /**
   * Save state to localStorage
   */
  function saveState() {
    localStorage.setItem('bible-compare-translations', JSON.stringify(selectedTranslations));
  }

  /**
   * Restore state from URL or localStorage
   */
  function restoreState() {
    // Try URL first
    const params = new URLSearchParams(window.location.search);
    const biblesParam = params.get('bibles');
    const refParam = params.get('ref');

    if (biblesParam) {
      selectedTranslations = biblesParam.split(',').filter(id =>
        bibleData?.bibles?.some(b => b.id === id)
      );

      // Check corresponding checkboxes
      translationCheckboxes.forEach(cb => {
        cb.checked = selectedTranslations.includes(cb.value);
      });
    } else {
      // Try localStorage
      const saved = localStorage.getItem('bible-compare-translations');
      if (saved) {
        try {
          selectedTranslations = JSON.parse(saved).filter(id =>
            bibleData?.bibles?.some(b => b.id === id)
          );
          translationCheckboxes.forEach(cb => {
            cb.checked = selectedTranslations.includes(cb.value);
          });
        } catch (e) {}
      }
    }

    if (refParam) {
      const parts = refParam.split('.');
      const book = parts[0];
      const chapter = parts[1];
      const verse = parts[2];

      if (book && chapter) {
        currentBook = book;
        currentChapter = parseInt(chapter) || 0;
        currentVerse = parseInt(verse) || 0;

        bookSelect.value = currentBook;
        populateChapterDropdown();
        chapterSelect.value = currentChapter;

        // Auto-load if we have valid state
        if (canLoadComparison()) {
          loadComparison().then(() => {
            populateVerseGrid();
          });
        }
      }
    }

    // Set defaults if no URL params and no localStorage
    if (!biblesParam && !refParam && selectedTranslations.length === 0) {
      // Default: KJV, Vulgate, DRC, Geneva - Isaiah 42:16
      const defaultBibles = ['kjv', 'vulgate', 'drc', 'geneva1599'];
      defaultBibles.forEach(id => {
        if (bibleData?.bibles?.some(b => b.id === id)) {
          selectedTranslations.push(id);
        }
      });
      translationCheckboxes.forEach(cb => {
        cb.checked = selectedTranslations.includes(cb.value);
      });

      currentBook = 'Isa';
      currentChapter = 42;
      currentVerse = 16;
      bookSelect.value = currentBook;
      populateChapterDropdown();
      chapterSelect.value = currentChapter;

      // Default to SSS mode ON
      enterSSSMode();
    }

  }

  /**
   * Show a message to the user
   */
  function showMessage(text, type = 'info') {
    // Simple alert for now, could be enhanced with toast notifications
    alert(text);
  }

  // ==================== SSS MODE FUNCTIONS ====================

  /**
   * Enter SSS (Side by Side Scripture) mode
   */
  function enterSSSMode() {
    sssMode = true;
    updateSSSModeStatus();
    if (normalModeEl) normalModeEl.classList.add('hidden');
    if (sssModeEl) sssModeEl.classList.remove('hidden');
    document.getElementById('parallel-content')?.classList.add('hidden');

    // Check if we should reset to defaults (once per day)
    const today = new Date().toDateString();
    const lastSSSDate = localStorage.getItem('sss-last-date');
    const shouldResetDefaults = lastSSSDate !== today;

    if (shouldResetDefaults) {
      // Reset to Isaiah 42:16 defaults once per day
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

    // Auto-load with defaults
    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  }

  /**
   * Exit SSS mode back to normal compare
   */
  function exitSSSMode() {
    sssMode = false;
    updateSSSModeStatus();
    if (normalModeEl) normalModeEl.classList.remove('hidden');
    if (sssModeEl) sssModeEl.classList.add('hidden');
    document.getElementById('parallel-content')?.classList.remove('hidden');
  }

  /**
   * Handle SSS Bible selection change
   */
  function handleSSSBibleChange() {
    sssLeftBible = sssBibleLeft?.value || '';
    sssRightBible = sssBibleRight?.value || '';

    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  }

  /**
   * Handle SSS book selection change
   */
  function handleSSSBookChange() {
    sssBook = sssBookSelect?.value || '';
    sssVerse = 0; // Reset verse selection

    // Populate chapter dropdown and default to chapter 1
    populateSSSChapterDropdown();
    if (sssBook) {
      sssChapter = 1;
      if (sssChapterSelect) sssChapterSelect.value = '1';
    } else {
      sssChapter = 0;
    }

    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  }

  /**
   * Populate SSS chapter dropdown
   */
  function populateSSSChapterDropdown() {
    if (!sssChapterSelect) return;

    sssChapterSelect.innerHTML = '<option value="">...</option>';

    if (!sssBook || !bibleData || !bibleData.books) {
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

  /**
   * Handle SSS chapter selection change
   */
  function handleSSSChapterChange() {
    sssChapter = parseInt(sssChapterSelect?.value) || 0;
    sssVerse = 0; // Reset verse selection

    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  }

  /**
   * Check if we can load SSS comparison
   */
  function canLoadSSSComparison() {
    return sssLeftBible !== '' &&
           sssRightBible !== '' &&
           sssBook !== '' &&
           sssChapter > 0;
  }

  /**
   * Load and display SSS comparison
   */
  async function loadSSSComparison() {
    if (!canLoadSSSComparison()) return;

    // Show loading
    if (sssLeftPane) {
      sssLeftPane.innerHTML = '<article aria-busy="true" style="text-align: center; font-family: var(--michael-font-hand); padding: 2rem 0;">Loading...</article>';
    }
    if (sssRightPane) {
      sssRightPane.innerHTML = '<article aria-busy="true" style="text-align: center; font-family: var(--michael-font-hand); padding: 2rem 0;">Loading...</article>';
    }

    // Fetch both chapters
    const [leftVerses, rightVerses] = await Promise.all([
      fetchChapter(sssLeftBible, sssBook, sssChapter),
      fetchChapter(sssRightBible, sssBook, sssChapter)
    ]);

    // Populate verse grid
    populateSSSVerseGrid(leftVerses || rightVerses);

    // Get Bible info
    const leftBible = bibleData.bibles.find(b => b.id === sssLeftBible);
    const rightBible = bibleData.bibles.find(b => b.id === sssRightBible);
    const bookInfo = bibleData.books.find(b => b.id === sssBook);
    const bookName = bookInfo?.name || sssBook;

    // Filter verses if specific verse selected
    const leftFiltered = sssVerse > 0 ? leftVerses?.filter(v => v.number === sssVerse) : leftVerses;
    const rightFiltered = sssVerse > 0 ? rightVerses?.filter(v => v.number === sssVerse) : rightVerses;

    // Render left pane
    if (sssLeftPane) {
      sssLeftPane.innerHTML = buildSSSPaneHTML(leftFiltered, leftBible, bookName, rightFiltered, rightBible);
    }

    // Render right pane
    if (sssRightPane) {
      sssRightPane.innerHTML = buildSSSPaneHTML(rightFiltered, rightBible, bookName, leftFiltered, leftBible);
    }
  }

  /**
   * Populate SSS verse grid based on loaded chapter data
   */
  function populateSSSVerseGrid(verses) {
    if (!verses || verses.length === 0) {
      if (sssVerseGrid) sssVerseGrid.classList.add('hidden');
      if (sssVerseButtons) sssVerseButtons.innerHTML = '';
      return;
    }

    if (sssVerseButtons) {
      sssVerseButtons.innerHTML = '';
      verses.forEach(verse => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sss-verse-btn';
        btn.textContent = verse.number;
        btn.dataset.verse = verse.number;
        btn.style.cssText = 'width: 1.75rem; height: 1.75rem; font-family: var(--michael-font-hand); font-size: 0.875rem; border-radius: var(--pico-border-radius); cursor: pointer;';
        addTapListener(btn, () => handleSSSVerseButtonClick(verse.number));
        sssVerseButtons.appendChild(btn);
      });
    }

    if (sssVerseGrid) {
      sssVerseGrid.classList.remove('hidden');
    }

    updateSSSVerseGridSelection();
  }

  /**
   * Handle SSS verse button click
   */
  function handleSSSVerseButtonClick(verseNum) {
    sssVerse = verseNum;
    updateSSSVerseGridSelection();
    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  }

  /**
   * Update SSS verse grid button selection state
   */
  function updateSSSVerseGridSelection() {
    if (!sssVerseButtons) return;

    const buttons = sssVerseButtons.querySelectorAll('.sss-verse-btn');
    buttons.forEach(btn => {
      const verseNum = parseInt(btn.dataset.verse);
      if (verseNum === sssVerse) {
        btn.style.background = 'var(--michael-accent)';
        btn.style.color = 'white';
      } else {
        btn.style.background = '';
        btn.style.color = '';
      }
    });
  }

  /**
   * Build HTML for one SSS pane with diff highlighting
   */
  function buildSSSPaneHTML(verses, bible, bookName, compareVerses, compareBible) {
    if (!verses || verses.length === 0) {
      return '<article><p style="text-align: center; color: var(--michael-gray); font-family: var(--michael-font-hand); padding: 2rem 0;">No verses found</p></article>';
    }

    // Check for versification mismatch
    const versificationWarning = (compareBible && bible?.versification && compareBible?.versification &&
      bible.versification !== compareBible.versification)
      ? `<small style="color: var(--michael-gray); display: block; font-size: 0.7rem;">${bible.versification} versification</small>`
      : '';

    let html = `<header class="translation-label" style="text-align: center; padding-bottom: 0.5rem;">
      <strong>${bible?.abbrev || 'Unknown'}</strong>${versificationWarning}
    </header>`;

    verses.forEach(verse => {
      const compareVerse = compareVerses?.find(v => v.number === verse.number);
      const highlightedText = highlightDifferences(verse.text, compareVerse?.text);

      html += `<div class="parallel-verse">
        <span class="parallel-verse-num">${verse.number}</span>
        <span>${highlightedText}</span>
      </div>`;
    });

    return html;
  }

  /**
   * Update SSS mode status indicators
   */
  function updateSSSModeStatus() {
    // Update normal mode button status
    const modeStatusEl = document.getElementById('sss-mode-status');
    if (modeStatusEl) {
      modeStatusEl.textContent = sssMode ? '- ON' : '- OFF';
    }
    // Update SSS mode button status
    const sssStatusEl = document.getElementById('sss-status');
    if (sssStatusEl) {
      sssStatusEl.textContent = sssMode ? '- ON' : '- OFF';
    }
  }

  /**
   * Highlight differences for normal mode (words not in ANY other translation)
   * Uses TextCompare engine if available, falls back to simple word matching
   */
  function highlightNormalDifferences(text, otherTexts) {
    if (!normalHighlightEnabled || otherTexts.length === 0) return text;

    // Use TextCompare engine if available
    if (window.TextCompare) {
      // Compare against first non-empty other text for now
      // (multi-text comparison could show union of all differences)
      const compareText = otherTexts.find(t => t && t.length > 0);
      if (compareText) {
        return highlightWithTextCompare(text, compareText);
      }
    }

    // Fallback: simple word-level comparison
    const textColor = getContrastColor(highlightColor);

    // Collect all words from other translations
    const otherWords = new Set();
    otherTexts.forEach(t => {
      if (t) {
        t.toLowerCase().split(/\s+/).forEach(w => {
          otherWords.add(w.replace(/[.,;:!?'"]/g, ''));
        });
      }
    });

    const words = text.split(/\s+/);
    return words.map(word => {
      const cleanWord = word.toLowerCase().replace(/[.,;:!?'"]/g, '');
      if (!otherWords.has(cleanWord) && cleanWord.length > 0) {
        return `<span class="diff-insert">${word}</span>`;
      }
      return word;
    }).join(' ');
  }

  /**
   * Highlight differences between two texts (SSS mode)
   * Uses TextCompare engine if available, falls back to simple word matching
   */
  function highlightDifferences(text, compareText) {
    if (!sssHighlightEnabled || !compareText) return text;

    // Use TextCompare engine if available
    if (window.TextCompare) {
      return highlightWithTextCompare(text, compareText);
    }

    // Fallback: simple word-level diff
    const textColor = getContrastColor(highlightColor);
    const words = text.split(/\s+/);
    const compareWords = compareText.toLowerCase().split(/\s+/).map(w =>
      w.replace(/[.,;:!?'"]/g, '')
    );

    return words.map(word => {
      const cleanWord = word.toLowerCase().replace(/[.,;:!?'"]/g, '');
      if (!compareWords.includes(cleanWord) && cleanWord.length > 0) {
        return `<span class="diff-insert">${word}</span>`;
      }
      return word;
    }).join(' ');
  }

  /**
   * Use TextCompare engine for sophisticated diff highlighting
   */
  function highlightWithTextCompare(text, compareText) {
    const TC = window.TextCompare;
    const result = TC.compareTexts(text, compareText);

    // If no differences, return original text
    if (result.diffs.length === 0) {
      return TC.escapeHtml(text);
    }

    // Use CSS class-based highlighting for categorized diffs
    // or fall back to user-selected color for simple mode
    const useCategories = true; // Could be a user preference

    if (useCategories) {
      // Use the CSS classes for different diff categories
      return TC.renderWithHighlights(result.textA, result.diffs, 'a', {
        showTypo: false,      // Too subtle, skip
        showPunct: true,
        showSpelling: true,
        showSubstantive: true,
        showAddOmit: true
      });
    } else {
      // Use user-selected highlight color for all differences
      const textColor = getContrastColor(highlightColor);
      let html = '';
      let pos = 0;
      const normalizedText = result.textA;

      // Build list of ranges to highlight (all categories)
      const highlights = [];
      for (const diff of result.diffs) {
        if (diff.aToken) {
          highlights.push({
            offset: diff.aToken.offset,
            length: diff.aToken.length,
            original: diff.aToken.original
          });
        }
      }
      highlights.sort((a, b) => a.offset - b.offset);

      for (const h of highlights) {
        if (h.offset > pos) {
          html += TC.escapeHtml(normalizedText.slice(pos, h.offset));
        }
        html += `<span class="diff-insert">${TC.escapeHtml(h.original)}</span>`;
        pos = h.offset + h.length;
      }
      if (pos < normalizedText.length) {
        html += TC.escapeHtml(normalizedText.slice(pos));
      }
      return html;
    }
  }

  /**
   * Get contrasting text color (black or white) based on background
   */
  function getContrastColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#1a1a1a' : '#f5f5eb';
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    if (e.state) {
      restoreState();
    }
  });
})();
