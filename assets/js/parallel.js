/**
 * @file parallel.js - Compare page controller for Michael Bible Module
 * @description Orchestrates the parallel translation comparison view,
 *              managing translation selection, chapter navigation, verse
 *              highlighting, and SSS (Side-by-Side-by-Side) mode.
 * @requires michael/dom-utils.js
 * @requires michael/bible-api.js
 * @requires michael/verse-grid.js
 * @requires michael/chapter-dropdown.js
 * @version 2.0.0
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

  /* ========================================================================
     CONFIGURATION & CONSTANTS
     ======================================================================== */

  /**
   * Timing constants for UI interactions
   */
  const TIMING = {
    SCROLL_SAVE_DEBOUNCE: 500,      // Delay before saving scroll position (ms)
    HIGHLIGHT_ANIMATION: 1500       // Duration of highlight flash animation (ms)
  };

  /* ========================================================================
     STATE
     ======================================================================== */

  /**
   * Parsed Bible metadata from embedded JSON (no verse content)
   * @type {Object|null}
   * @property {Array<Object>} bibles - Array of available Bible translations
   * @property {Array<Object>} books - Array of book metadata
   * @property {string} basePath - Base URL path for fetching Bible data
   */
  let bibleData = null;

  /**
   * Base URL path for fetching Bible chapter data
   * @type {string}
   * @default '/bible'
   */
  let basePath = '/bible'; // Default, can be overridden from bible-data JSON

  /**
   * Array of currently selected translation IDs for comparison
   * @type {Array<string>}
   */
  let selectedTranslations = [];

  /**
   * Current book ID (e.g., 'Gen', 'Isa', 'Matt')
   * @type {string}
   */
  let currentBook = '';

  /**
   * Current chapter number (0 means no chapter selected)
   * @type {number}
   */
  let currentChapter = 0;

  /**
   * Current verse number (0 means all verses)
   * @type {number}
   */
  let currentVerse = 0; // 0 means all verses

  /**
   * Whether SSS (Side-by-Side-by-Side) mode is active
   * @type {boolean}
   */
  let sssMode = false;

  /**
   * Left Bible translation ID for SSS mode
   * @type {string}
   */
  let sssLeftBible = '';

  /**
   * Right Bible translation ID for SSS mode
   * @type {string}
   */
  let sssRightBible = '';

  /**
   * Book ID for SSS mode
   * @type {string}
   */
  let sssBook = '';

  /**
   * Chapter number for SSS mode
   * @type {number}
   */
  let sssChapter = 0;

  /**
   * Verse number for SSS mode (0 means all verses)
   * @type {number}
   */
  let sssVerse = 0; // 0 means all verses

  /**
   * Whether diff highlighting is enabled in SSS mode
   * @type {boolean}
   */
  let sssHighlightEnabled = false;

  /**
   * Color used for highlighting differences
   * @type {string}
   */
  let highlightColor = '#666';

  /**
   * Whether diff highlighting is enabled in normal mode
   * @type {boolean}
   */
  let normalHighlightEnabled = false;

  /**
   * Guard flag to prevent concurrent loadComparison calls
   * @type {boolean}
   */
  let isLoadingComparison = false;

  /**
   * Pending requestAnimationFrame ID for syncSSSVerseHeights
   * @type {number|null}
   */
  let pendingSyncRAF = null;

  // Note: Chapter cache now managed by window.Michael.BibleAPI

  /**
   * Reference to book selection dropdown element
   * @type {HTMLSelectElement|null}
   */
  let bookSelect;

  /**
   * Reference to chapter selection dropdown element
   * @type {HTMLSelectElement|null}
   */
  let chapterSelect;

  /**
   * Reference to parallel content container element
   * @type {HTMLElement|null}
   */
  let parallelContent;

  /**
   * NodeList of translation checkbox elements
   * @type {NodeListOf<HTMLInputElement>}
   */
  let translationCheckboxes;

  /**
   * Reference to verse grid container element (normal mode)
   * @type {HTMLElement|null}
   */
  let verseGrid;

  /**
   * Reference to verse buttons container element (normal mode)
   * @type {HTMLElement|null}
   */
  let verseButtons;

  /**
   * Reference to "All Verses" button element (normal mode)
   * @type {HTMLElement|null}
   */
  let allVersesBtn;

  /**
   * Reference to normal mode container element
   * @type {HTMLElement|null}
   */
  let normalModeEl;

  /**
   * Reference to SSS mode container element
   * @type {HTMLElement|null}
   */
  let sssModeEl;

  /**
   * Reference to left Bible selector in SSS mode
   * @type {HTMLSelectElement|null}
   */
  let sssBibleLeft;

  /**
   * Reference to right Bible selector in SSS mode
   * @type {HTMLSelectElement|null}
   */
  let sssBibleRight;

  /**
   * Reference to book selector in SSS mode
   * @type {HTMLSelectElement|null}
   */
  let sssBookSelect;

  /**
   * Reference to chapter selector in SSS mode
   * @type {HTMLSelectElement|null}
   */
  let sssChapterSelect;

  /**
   * Reference to left pane content container in SSS mode
   * @type {HTMLElement|null}
   */
  let sssLeftPane;

  /**
   * Reference to right pane content container in SSS mode
   * @type {HTMLElement|null}
   */
  let sssRightPane;

  /**
   * Reference to verse grid container in SSS mode
   * @type {HTMLElement|null}
   */
  let sssVerseGrid;

  /**
   * Reference to verse buttons container in SSS mode
   * @type {HTMLElement|null}
   */
  let sssVerseButtons;

  /**
   * Reference to "All Verses" button in SSS mode
   * @type {HTMLElement|null}
   */
  let sssAllVersesBtn;

  /**
   * Reference to screen reader announcer element
   * @type {HTMLElement|null}
   */
  let announcer;

  /* ========================================================================
     INITIALIZATION
     ======================================================================== */

  /**
   * Initialize the parallel view controller
   * Sets up DOM references, parses Bible metadata, and restores saved state
   * @private
   */
  function init() {
    // Verify that shared modules are loaded
    if (!window.Michael || !window.Michael.DomUtils || !window.Michael.BibleAPI) {
      console.error('Required modules not loaded. Please ensure michael/dom-utils.js and michael/bible-api.js are included before parallel.js');
      return;
    }

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
    announcer = document.getElementById('compare-announcer');

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

  /* ========================================================================
     UTILITIES
     ======================================================================== */

  /**
   * Helper to access shared tap listener utility from DomUtils module
   * Provides cross-platform touch/click handling for mobile and desktop
   * @private
   * @param {HTMLElement} element - The element to attach the listener to
   * @param {Function} handler - The callback function to invoke on tap/click
   * @returns {Function} Cleanup function to remove the listener
   */
  function addTapListener(element, handler) {
    return window.Michael.DomUtils.addTapListener(element, handler);
  }

  /**
   * Helper to get contrasting text color for a background color
   * @private
   * @param {string} hexColor - Hex color code (e.g., '#666', '#FF0000')
   * @returns {string} Either '#000' or '#FFF' for optimal contrast
   */
  function getContrastColor(hexColor) {
    return window.Michael.DomUtils.getContrastColor(hexColor);
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @private
   * @param {string} str - String to escape
   * @returns {string} Escaped string safe for HTML insertion
   */
  function escapeHtml(str) {
    return window.Michael.DomUtils.escapeHtml(str);
  }

  /**
   * Announces a message to screen readers via the aria-live region.
   * Updates the announcer element which has aria-live="polite" for accessibility.
   *
   * @private
   * @param {string} message - The message to announce to screen reader users
   *
   * @example
   * announce('Loading Genesis chapter 1')
   * announce('Added King James Version')
   * announce('Chapter loaded successfully')
   */
  function announce(message) {
    if (announcer) {
      announcer.textContent = message;
    }
  }

  /**
   * Check if we have enough data to load a comparison
   * Requires at least one translation, a book, and a chapter
   * @private
   * @returns {boolean} True if comparison can be loaded
   */
  function canLoadComparison() {
    return selectedTranslations.length >= 1 &&
           currentBook !== '' &&
           currentChapter > 0;
  }

  /**
   * Check if we can load SSS mode comparison
   * Requires both left and right Bibles, a book, and a chapter
   * @private
   * @returns {boolean} True if SSS comparison can be loaded
   */
  function canLoadSSSComparison() {
    return sssLeftBible !== '' &&
           sssRightBible !== '' &&
           sssBook !== '' &&
           sssChapter > 0;
  }

  /* ========================================================================
     EVENT HANDLERS
     ======================================================================== */

  /**
   * Set up all event listeners for the parallel view
   * Attaches handlers for translation selection, book/chapter navigation,
   * verse selection, SSS mode toggles, and highlighting controls
   * @private
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
    const diffLegend = document.getElementById('diff-legend');
    if (highlightToggle) {
      highlightToggle.addEventListener('change', (e) => {
        normalHighlightEnabled = e.target.checked;
        if (diffLegend) diffLegend.classList.toggle('hidden', !e.target.checked);
        if (canLoadComparison()) {
          loadComparison();
        }
      });
    }

    // SSS mode highlight toggle
    const sssHighlightToggle = document.getElementById('sss-highlight-toggle');
    const sssDiffLegend = document.getElementById('sss-diff-legend');
    if (sssHighlightToggle) {
      sssHighlightToggle.addEventListener('change', (e) => {
        sssHighlightEnabled = e.target.checked;
        if (sssDiffLegend) sssDiffLegend.classList.toggle('hidden', !e.target.checked);
        if (canLoadSSSComparison()) {
          loadSSSComparison();
        }
      });
      // Sync sssHighlightEnabled with checkbox state and update legend
      sssHighlightEnabled = sssHighlightToggle.checked;
      if (sssDiffLegend) {
        sssDiffLegend.classList.toggle('hidden', !sssHighlightToggle.checked);
      }
    }

    // Color picker setup (normal mode)
    setupColorPicker('highlight-color-btn', 'highlight-color-picker', '.color-option');
    // Color picker setup (SSS mode)
    setupColorPicker('sss-highlight-color-btn', 'sss-highlight-color-picker', '.sss-color-option');

    // Book selection (change events work fine on mobile)
    bookSelect.addEventListener('change', handleBookChange);

    // Chapter selection - auto-load on change
    chapterSelect.addEventListener('change', handleChapterChange);

    // All verses button - use click for immediate response
    if (allVersesBtn) {
      allVersesBtn.addEventListener('click', handleAllVersesClick);
    }

    // SSS All verses button - use click for immediate response
    if (sssAllVersesBtn) {
      sssAllVersesBtn.addEventListener('click', handleSSSAllVersesClick);
    }
  }

  /**
   * Handle click on "All" button in normal mode
   * @private
   */
  function handleAllVersesClick() {
    currentVerse = 0;
    updateVerseGridSelection();
    saveState();
    if (canLoadComparison()) {
      loadComparison();
    }
  }

  /**
   * Handle click on "All" button in SSS mode
   * @private
   */
  function handleSSSAllVersesClick() {
    sssVerse = 0;
    updateSSSVerseGridSelection();
    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  }

  /**
   * Set up color picker functionality for highlight color selection
   * Creates a popup color picker that updates both normal and SSS mode highlighting
   * @private
   * @param {string} btnId - ID of the button that toggles the color picker
   * @param {string} pickerId - ID of the color picker container element
   * @param {string} optionSelector - CSS selector for color option buttons
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
    // Use a single handler that works for both mouse and touch
    const closePicker = (e) => {
      // Ignore if clicking inside picker or on button
      if (picker.contains(e.target) || e.target === btn || btn.contains(e.target)) {
        return;
      }
      picker.classList.add('hidden');
    };

    // Use click for mouse, touchstart for touch (touchend may fire after click)
    document.addEventListener('click', closePicker);
    // For touch devices, use touchstart to close before the click fires
    document.addEventListener('touchstart', closePicker, { passive: true });
  }

  /* ========================================================================
     TRANSLATION MANAGEMENT
     ======================================================================== */

  /**
   * Handle translation checkbox change event
   * Adds or removes translations from the comparison, enforces 11-translation limit
   * @private
   * @param {Event} e - Change event from checkbox
   */
  function handleTranslationChange(e) {
    const checkbox = e.target;
    const translationId = checkbox.value;
    const translationTitle = checkbox.dataset.title || translationId;

    if (checkbox.checked) {
      if (selectedTranslations.length >= 11) {
        checkbox.checked = false;
        window.Michael.DomUtils.showMessage('Maximum 11 translations can be compared at once.', 'warning');
        announce('Maximum 11 translations reached.');
        return;
      }
      selectedTranslations.push(translationId);
      announce(`Added ${translationTitle} translation.`);
    } else {
      selectedTranslations = selectedTranslations.filter(t => t !== translationId);
      announce(`Removed ${translationTitle} translation.`);
    }

    saveState();

    // Auto-reload if we have a valid selection
    if (canLoadComparison()) {
      loadComparison().then(() => {
        populateVerseGrid();
      }).catch(error => {
        console.error('Failed to load comparison after translation change:', error);
      });
    }
  }

  /* ========================================================================
     CHAPTER LOADING
     ======================================================================== */

  /**
   * Handle book selection change event
   * Updates chapter dropdown and resets to chapter 1
   * @private
   * @param {Event} e - Change event from book select dropdown
   */
  function handleBookChange(e) {
    currentBook = e.target.value;
    currentVerse = 0;

    // Populate chapter dropdown and default to chapter 1
    populateChapterDropdown();
    if (currentBook) {
      currentChapter = 1;
      chapterSelect.value = '1';

      // Get book name from metadata and announce to screen readers
      const bookInfo = bibleData.books.find(b => b.id === currentBook);
      const bookName = bookInfo?.name || currentBook;
      announce(`Selected ${bookName}. Loading chapter 1.`);
    } else {
      currentChapter = 0;
    }

    saveState();

    // Auto-load if we have a valid selection
    if (canLoadComparison()) {
      loadComparison().then(() => {
        populateVerseGrid();
      }).catch(error => {
        console.error('Failed to load comparison after book change:', error);
      });
    } else {
      resetVerseGrid();
    }
  }

  /**
   * Populate chapter dropdown based on selected book
   * Creates numbered options from 1 to the book's chapter count
   * @private
   */
  function populateChapterDropdown() {
    // Clear existing options safely
    chapterSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Chapter';
    chapterSelect.appendChild(defaultOption);

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
   * Handle chapter selection change event
   * Auto-loads the comparison for the selected chapter
   * @private
   * @param {Event} e - Change event from chapter select dropdown
   */
  function handleChapterChange(e) {
    currentChapter = parseInt(e.target.value) || 0;
    currentVerse = 0;
    saveState();

    if (currentChapter > 0 && currentBook) {
      // Get book name from metadata and announce to screen readers
      const bookInfo = bibleData.books.find(b => b.id === currentBook);
      const bookName = bookInfo?.name || currentBook;
      announce(`Loading ${bookName} chapter ${currentChapter}.`);
    }

    // Populate verse grid after loading
    if (canLoadComparison()) {
      loadComparison().then(() => {
        populateVerseGrid();
      }).catch(error => {
        console.error('Failed to load comparison after chapter change:', error);
      });
    } else {
      resetVerseGrid();
    }
  }

  /**
   * Load and display the parallel comparison
   * Fetches chapter data for all selected translations and renders verse-by-verse
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async function loadComparison() {
    if (!currentBook || !currentChapter) {
      return Promise.resolve();
    }

    // Prevent concurrent calls
    if (isLoadingComparison) return Promise.resolve();
    isLoadingComparison = true;

    try {
      // Clear Strong's notes when loading new chapter
      if (window.Michael?.Strongs?.clearNotes) {
        window.Michael.Strongs.clearNotes();
      }

    // Handle no translations selected
    if (selectedTranslations.length === 0) {
      parallelContent.textContent = '';
      const article = document.createElement('article');
      const p = document.createElement('p');
      p.style.cssText = 'text-align: center; color: var(--michael-text-muted); padding: 2rem 0;';
      p.textContent = 'Select at least one translation to view.';
      article.appendChild(p);
      parallelContent.appendChild(article);
      return Promise.resolve();
    }

    // Update URL with current state
    updateURL();

    // Show loading state - DomUtils.createLoadingIndicator() returns safe HTML
    parallelContent.innerHTML = window.Michael.DomUtils.createLoadingIndicator();

    // Fetch chapter data for all selected translations in parallel
    const chapterDataPromises = selectedTranslations.map(bibleId =>
      window.Michael.BibleAPI.fetchChapter(basePath, bibleId, currentBook, currentChapter)
    );

    const chaptersData = await Promise.all(chapterDataPromises);

    // Build comparison HTML
    const html = buildComparisonHTML(chaptersData);
    parallelContent.innerHTML = html;

    // Process footnotes for VVV mode content
    if (window.Michael?.Footnotes) {
      const notesRow = document.getElementById('vvv-notes-row');
      const vvvFootnotesSection = document.getElementById('vvv-footnotes-section');
      const vvvFootnotesList = document.getElementById('vvv-footnotes-list');
      const footnoteCount = window.Michael.Footnotes.process(parallelContent, vvvFootnotesSection, vvvFootnotesList, 'vvv-');

      // Show/hide the notes row based on whether there are footnotes
      if (notesRow) {
        notesRow.classList.toggle('hidden', footnoteCount === 0);
      }
    }

      // Announce completion to screen readers
      const bookInfo = bibleData.books.find(b => b.id === currentBook);
      const bookName = bookInfo?.name || currentBook;
      const verseInfo = currentVerse > 0 ? ` verse ${currentVerse}` : '';
      announce(`${bookName} chapter ${currentChapter}${verseInfo} loaded with ${selectedTranslations.length} translation${selectedTranslations.length !== 1 ? 's' : ''}.`);
    } finally {
      isLoadingComparison = false;
    }
  }

  /* ========================================================================
     VERSE DISPLAY
     ======================================================================== */

  /**
   * Reset verse grid to hidden state
   * Clears all verse buttons and hides the grid container
   * @private
   */
  function resetVerseGrid() {
    if (verseGrid) {
      verseGrid.classList.add('hidden');
    }
    if (verseButtons) {
      verseButtons.innerHTML = '';

      // Always create a fresh All button
      const newAllBtn = document.createElement('button');
      newAllBtn.id = 'all-verses-btn';
      newAllBtn.type = 'button';
      newAllBtn.className = 'chip is-active';
      newAllBtn.textContent = 'All';
      newAllBtn.addEventListener('click', handleAllVersesClick);
      verseButtons.appendChild(newAllBtn);

      // Update global reference
      allVersesBtn = newAllBtn;
    }
    currentVerse = 0;
  }

  /**
   * Populate verse grid based on loaded chapter data
   * Creates clickable buttons for each verse in the current chapter
   * @private
   * @async
   */
  async function populateVerseGrid() {
    // Find first translation with valid data for this chapter
    let verses = null;
    for (const translationId of selectedTranslations) {
      if (window.Michael.BibleAPI.hasInCache(translationId, currentBook, currentChapter)) {
        verses = await window.Michael.BibleAPI.fetchChapter(basePath, translationId, currentBook, currentChapter);
        if (verses && verses.length > 0) {
          break;
        }
      }
    }

    if (!verses || verses.length === 0) {
      resetVerseGrid();
      return;
    }

    // Populate verse buttons grid
    if (verseButtons) {
      verseButtons.innerHTML = '';

      // Add verse buttons
      verses.forEach(verse => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'verse-btn';
        btn.textContent = verse.number;
        btn.dataset.verse = verse.number;
        btn.setAttribute('aria-pressed', 'false');
        addTapListener(btn, () => handleVerseButtonClick(verse.number));
        verseButtons.appendChild(btn);
      });

      // Always create a fresh All button at the end
      const newAllBtn = document.createElement('button');
      newAllBtn.id = 'all-verses-btn';
      newAllBtn.type = 'button';
      newAllBtn.className = 'chip';
      newAllBtn.textContent = 'All';
      newAllBtn.addEventListener('click', handleAllVersesClick);
      verseButtons.appendChild(newAllBtn);

      // Update global reference
      allVersesBtn = newAllBtn;
    }

    if (verseGrid) {
      verseGrid.classList.remove('hidden');
    }

    updateVerseGridSelection();
  }

  /**
   * Handle verse button click from grid
   * Sets the current verse and reloads the comparison to show only that verse
   * @private
   * @param {number} verseNum - The verse number that was clicked
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
   * Adds/removes active styling and ARIA attributes based on current verse
   * @private
   */
  function updateVerseGridSelection() {
    if (!verseButtons) return;

    // Update verse number buttons
    const buttons = verseButtons.querySelectorAll('.verse-btn');
    buttons.forEach(btn => {
      const verseNum = parseInt(btn.dataset.verse);
      if (verseNum === currentVerse) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    // Update "All" button - active when no specific verse is selected
    const allBtn = verseButtons.querySelector('#all-verses-btn');
    if (allBtn) {
      if (currentVerse === 0) {
        allBtn.classList.add('is-active');
      } else {
        allBtn.classList.remove('is-active');
      }
    }
  }

  /**
   * Build the comparison HTML for verse-by-verse display
   * Creates article elements for each verse showing all selected translations
   * @private
   * @param {Array<Array<Object>>} chaptersData - Array of verse arrays, one per translation
   * @returns {string} HTML string for the comparison view
   * @example
   * // chaptersData structure:
   * // [[{number: 1, text: "In the beginning..."}], [{number: 1, text: "Au commencement..."}]]
   */
  function buildComparisonHTML(chaptersData) {
    let html = '';

    // Find first translation with verses to get verse count
    const firstVerses = chaptersData.find(verses => verses && verses.length > 0);

    if (!firstVerses) {
      return '<article><p style="text-align: center; color: var(--michael-text-muted);  padding: 2rem 0;">No verses found for this chapter.</p></article>';
    }

    // Get book name from metadata (books is now an array)
    const bookInfo = bibleData.books.find(b => b.id === currentBook);
    const bookName = bookInfo?.name || currentBook;

    // Compact header showing current reference
    const verseRef = currentVerse > 0 ? `:${currentVerse}` : '';
    const abbrevList = selectedTranslations.map(id => {
        const bible = bibleData.bibles.find(b => b.id === id);
        return escapeHtml(bible?.abbrev || id);
      }).join(', ');
    html += `<header style="text-align: center; margin-bottom: 1.5rem;">
      <h2 style=" margin-bottom: 0.25rem;">${escapeHtml(bookName)} ${currentChapter}${verseRef}</h2>
      <p style="color: var(--michael-text-muted);  font-size: 0.875rem; margin: 0;">${abbrevList}</p>
    </header>`;

    // Filter verses if specific verse selected
    const versesToShow = currentVerse > 0
      ? firstVerses.filter(v => v.number === currentVerse)
      : firstVerses;

    // Verse-by-verse comparison - iterate through each verse
    versesToShow.forEach((verse) => {
      const verseNum = verse.number;

      html += `<article class="parallel-verse" data-verse="${verseNum}">
        <header>
          <h3 style=" font-weight: bold; color: var(--michael-accent); margin-bottom: 0.5rem; font-size: 1rem;">${escapeHtml(bookName)} ${currentChapter}:${verseNum}</h3>
        </header>
        <div>`;

      // Collect all verse texts for this verse number for diff highlighting
      const allVerseTexts = selectedTranslations.map((tid, i) => {
        const verses = chaptersData[i] || [];
        const v = verses.find(v => v.number === verseNum);
        return v?.text || '';
      });

      // Render each translation for this verse
      selectedTranslations.forEach((translationId, idx) => {
        const bible = bibleData.bibles.find(b => b.id === translationId);
        const verses = chaptersData[idx] || [];
        const v = verses.find(v => v.number === verseNum);

        let text = v?.text || '<em style="color: var(--michael-text-muted);">Verse not available</em>';

        // Apply highlighting if enabled (compares against all other translations)
        if (normalHighlightEnabled && v?.text) {
          const otherTexts = allVerseTexts.filter((_, i) => i !== idx && allVerseTexts[i]);
          text = highlightNormalDifferences(v.text, otherTexts);
        }

        const bibleAbbrev = escapeHtml(bible?.abbrev || translationId);
        html += `<div class="translation-label" style="margin-top: 0.75rem;">
          <strong style="color: var(--michael-accent);  font-size: 0.75rem;">${bibleAbbrev}</strong>
          <p style="margin: 0.25rem 0 0 0; line-height: 1.8;">${text}</p>
        </div>`;
      });

      html += `</div></article>`;
    });

    return html;
  }

  /* ========================================================================
     URL STATE MANAGEMENT
     ======================================================================== */

  /**
   * Update browser URL with current comparison state
   * Allows bookmarking and sharing specific comparisons
   * @private
   * @example
   * // URL format: ?bibles=kjv,vulgate&ref=Gen.1.1
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
   * Save current translation selection to localStorage
   * Persists user's translation preferences across sessions
   * @private
   */
  function saveState() {
    localStorage.setItem('bible-compare-translations', JSON.stringify(selectedTranslations));
  }

  /**
   * Restore state from URL query parameters or localStorage
   * URL parameters take precedence over localStorage
   * Falls back to defaults if neither source has data
   * When only one Bible is provided, auto-selects a random second Bible and enters SSS mode
   * @private
   * @example
   * // URL: ?bibles=kjv,vulgate&ref=Gen.1.1
   * // URL: ?bibles=asv&ref=2chr.28 (single Bible - auto-selects random second Bible for SSS)
   * // localStorage: ["kjv", "drc"]
   */
  function restoreState() {
    const params = new URLSearchParams(window.location.search);
    const biblesParam = params.get('bibles');
    const refParam = params.get('ref');

    // Try URL first, then localStorage
    if (biblesParam) {
      restoreTranslationsFromURL(biblesParam);
      if (handleSingleBibleSSSMode(refParam)) return;
    } else {
      restoreTranslationsFromLocalStorage();
    }

    // Restore reference from URL
    if (refParam) {
      restoreReferenceFromURL(refParam);
    }

    // Set defaults if no URL params
    if (!biblesParam && !refParam) {
      setDefaultState();
    }
  }

  /**
   * Restore translations from URL parameter
   * @private
   */
  function restoreTranslationsFromURL(biblesParam) {
    selectedTranslations = biblesParam.split(',').filter(id =>
      bibleData?.bibles?.some(b => b.id === id)
    );
    translationCheckboxes.forEach(cb => {
      cb.checked = selectedTranslations.includes(cb.value);
    });
  }

  /**
   * Restore translations from localStorage
   * @private
   */
  function restoreTranslationsFromLocalStorage() {
    const saved = localStorage.getItem('bible-compare-translations');
    if (!saved) return;

    try {
      selectedTranslations = JSON.parse(saved).filter(id =>
        bibleData?.bibles?.some(b => b.id === id)
      );
      translationCheckboxes.forEach(cb => {
        cb.checked = selectedTranslations.includes(cb.value);
      });
    } catch (e) {
      // Ignore parse errors
    }
  }

  /**
   * Handle single Bible SSS mode (auto-select random second Bible)
   * @private
   * @returns {boolean} True if SSS mode was entered
   */
  function handleSingleBibleSSSMode(refParam) {
    if (selectedTranslations.length !== 1 || !refParam) return false;

    const singleBible = selectedTranslations[0];
    const otherBibles = bibleData?.bibles?.filter(b => b.id !== singleBible) || [];
    if (otherBibles.length === 0) return false;

    const ref = parseReference(refParam);
    if (!ref.book || ref.chapter <= 0) return false;

    // Set up SSS mode with single Bible and random Bible
    const randomIndex = Math.floor(Math.random() * otherBibles.length);
    sssLeftBible = singleBible;
    sssRightBible = otherBibles[randomIndex].id;
    sssBook = ref.book;
    sssChapter = ref.chapter;
    sssVerse = ref.verse;

    // Update SSS mode selectors
    updateSSSSelectors();

    // Enter SSS mode directly
    sssMode = true;
    updateSSSModeStatus();
    if (normalModeEl) normalModeEl.classList.add('hidden');
    if (sssModeEl) sssModeEl.classList.remove('hidden');
    document.getElementById('parallel-content')?.classList.add('hidden');

    if (canLoadSSSComparison()) loadSSSComparison();
    return true;
  }

  /**
   * Parse reference string into components
   * @private
   */
  function parseReference(refParam) {
    const parts = refParam.split('.');
    const bookParam = parts[0];
    const matchedBook = bibleData?.books?.find(b =>
      b.id.toLowerCase() === bookParam.toLowerCase()
    );
    return {
      book: matchedBook ? matchedBook.id : bookParam,
      chapter: parseInt(parts[1]) || 0,
      verse: parseInt(parts[2]) || 0
    };
  }

  /**
   * Update SSS mode selectors with current state
   * @private
   */
  function updateSSSSelectors() {
    if (sssBibleLeft) sssBibleLeft.value = sssLeftBible;
    if (sssBibleRight) sssBibleRight.value = sssRightBible;
    if (sssBookSelect) {
      const bookOption = Array.from(sssBookSelect.options).find(opt =>
        opt.value.toLowerCase() === sssBook.toLowerCase()
      );
      if (bookOption) sssBookSelect.value = bookOption.value;
      populateSSSChapterDropdown();
    }
    if (sssChapterSelect) sssChapterSelect.value = sssChapter;
  }

  /**
   * Restore reference from URL parameter
   * @private
   */
  function restoreReferenceFromURL(refParam) {
    const ref = parseReference(refParam);
    if (!ref.book || !ref.chapter) return;

    currentBook = ref.book;
    currentChapter = ref.chapter;
    currentVerse = ref.verse;

    // Set book select value
    const bookOption = Array.from(bookSelect.options).find(opt =>
      opt.value.toLowerCase() === currentBook.toLowerCase()
    );
    if (bookOption) bookSelect.value = bookOption.value;
    populateChapterDropdown();
    chapterSelect.value = currentChapter;

    // Auto-load if we have valid state
    if (canLoadComparison()) {
      loadComparison().then(() => {
        populateVerseGrid();
      }).catch(error => {
        console.error('Failed to load comparison after restoring state:', error);
      });
    }
  }

  /**
   * Set default state when no URL params
   * @private
   */
  function setDefaultState() {
    selectedTranslations = ['drc', 'kjva'].filter(id =>
      bibleData?.bibles?.some(b => b.id === id)
    );
    translationCheckboxes.forEach(cb => {
      cb.checked = selectedTranslations.includes(cb.value);
    });

    currentBook = 'Isa';
    currentChapter = 42;
    currentVerse = 16;
    bookSelect.value = currentBook;
    populateChapterDropdown();
    chapterSelect.value = currentChapter;

    enterSSSMode();
  }

  /* ========================================================================
     SSS MODE
     ======================================================================== */

  /**
   * Enter SSS (Side-by-Side-by-Side) mode
   * Displays two translations in parallel panes with synchronized verse navigation
   * Resets to defaults once per day for fresh start experience
   * @private
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
      sssRightBible = 'kjva';
      sssBibleRight.value = 'kjva';
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
   * Exit SSS mode and return to normal comparison view
   * Restores the multi-translation comparison interface
   * @private
   */
  function exitSSSMode() {
    sssMode = false;
    updateSSSModeStatus();
    if (normalModeEl) normalModeEl.classList.remove('hidden');
    if (sssModeEl) sssModeEl.classList.add('hidden');
    document.getElementById('parallel-content')?.classList.remove('hidden');
  }

  /**
   * Handle SSS Bible translation selection change
   * Updates left or right Bible and reloads comparison
   * @private
   */
  function handleSSSBibleChange() {
    const prevLeft = sssLeftBible;
    const prevRight = sssRightBible;
    sssLeftBible = sssBibleLeft?.value || '';
    sssRightBible = sssBibleRight?.value || '';

    // Announce which Bible was changed
    if (sssLeftBible && sssLeftBible !== prevLeft) {
      const leftBible = bibleData.bibles.find(b => b.id === sssLeftBible);
      announce(`Left Bible changed to ${leftBible?.title || sssLeftBible}.`);
    }
    if (sssRightBible && sssRightBible !== prevRight) {
      const rightBible = bibleData.bibles.find(b => b.id === sssRightBible);
      announce(`Right Bible changed to ${rightBible?.title || sssRightBible}.`);
    }

    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  }

  /**
   * Handle SSS book selection change
   * Updates chapter dropdown and resets to chapter 1
   * @private
   */
  function handleSSSBookChange() {
    sssBook = sssBookSelect?.value || '';
    sssVerse = 0; // Reset verse selection
    triedBiblesWithNoVerses.clear(); // Reset tried Bibles for new book

    // Populate chapter dropdown and default to chapter 1
    populateSSSChapterDropdown();
    if (sssBook) {
      sssChapter = 1;
      if (sssChapterSelect) sssChapterSelect.value = '1';

      // Announce book change to screen readers
      const bookInfo = bibleData.books.find(b => b.id === sssBook);
      const bookName = bookInfo?.name || sssBook;
      announce(`Selected ${bookName}. Loading chapter 1.`);
    } else {
      sssChapter = 0;
    }

    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  }

  /**
   * Populate SSS mode chapter dropdown
   * Creates numbered options from 1 to the book's chapter count
   * @private
   */
  function populateSSSChapterDropdown() {
    if (!sssChapterSelect) return;

    // Clear and add default option safely
    sssChapterSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '...';
    sssChapterSelect.appendChild(defaultOption);

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
   * Handle SSS chapter selection change event
   * Auto-loads the comparison for the selected chapter
   * @private
   */
  function handleSSSChapterChange() {
    sssChapter = parseInt(sssChapterSelect?.value) || 0;
    sssVerse = 0; // Reset verse selection
    triedBiblesWithNoVerses.clear(); // Reset tried Bibles for new chapter

    if (sssChapter > 0 && sssBook) {
      // Announce chapter change to screen readers
      const bookInfo = bibleData.books.find(b => b.id === sssBook);
      const bookName = bookInfo?.name || sssBook;
      announce(`Loading ${bookName} chapter ${sssChapter}.`);
    }

    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  }

  /**
   * Bibles that have been tried and found to have no verses for current chapter
   * Used to avoid re-selecting them when auto-picking random comparison Bible
   * @private
   * @type {Set<string>}
   */
  let triedBiblesWithNoVerses = new Set();

  /**
   * Load and display SSS comparison
   * Fetches both translations in parallel and renders side-by-side
   * If the right Bible has no verses, automatically tries another Bible
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async function loadSSSComparison() {
    if (!canLoadSSSComparison()) return;

    // Clear Strong's notes when loading new chapter
    if (window.Michael?.Strongs?.clearNotes) {
      window.Michael.Strongs.clearNotes();
    }

    // Show loading
    const loadingHtml = window.Michael.DomUtils.createLoadingIndicator();
    if (sssLeftPane) {
      sssLeftPane.innerHTML = loadingHtml;
    }
    if (sssRightPane) {
      sssRightPane.innerHTML = loadingHtml;
    }

    // Fetch both chapters
    const [leftVerses, rightVerses] = await Promise.all([
      window.Michael.BibleAPI.fetchChapter(basePath, sssLeftBible, sssBook, sssChapter),
      window.Michael.BibleAPI.fetchChapter(basePath, sssRightBible, sssBook, sssChapter)
    ]);

    // If right Bible has no verses, try to pick another one automatically
    if ((!rightVerses || rightVerses.length === 0) && leftVerses && leftVerses.length > 0) {
      triedBiblesWithNoVerses.add(sssRightBible);

      // Find another Bible that we haven't tried yet
      const availableBibles = bibleData?.bibles?.filter(b =>
        b.id !== sssLeftBible && !triedBiblesWithNoVerses.has(b.id)
      ) || [];

      if (availableBibles.length > 0) {
        // Pick a random one from remaining options
        const randomIndex = Math.floor(Math.random() * availableBibles.length);
        const newBible = availableBibles[randomIndex].id;

        // Update the right Bible and selector
        sssRightBible = newBible;
        if (sssBibleRight) sssBibleRight.value = sssRightBible;

        // Recursively try loading again with the new Bible
        return loadSSSComparison();
      }
      // If no more Bibles to try, fall through and display what we have
    }

    // Reset tried Bibles set when we successfully load (for next time)
    if (rightVerses && rightVerses.length > 0) {
      triedBiblesWithNoVerses.clear();
    }

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

    // Process footnotes for SSS mode - separate per pane
    if (window.Michael?.Footnotes) {
      const leftFootnotesSection = document.getElementById('sss-left-footnotes-section');
      const leftFootnotesList = document.getElementById('sss-left-footnotes-list');
      const rightFootnotesSection = document.getElementById('sss-right-footnotes-section');
      const rightFootnotesList = document.getElementById('sss-right-footnotes-list');

      // Process left pane footnotes
      const leftFootnoteCount = window.Michael.Footnotes.process(
        sssLeftPane, leftFootnotesSection, leftFootnotesList, 'sss-left-'
      );

      // Process right pane footnotes
      const rightFootnoteCount = window.Michael.Footnotes.process(
        sssRightPane, rightFootnotesSection, rightFootnotesList, 'sss-right-'
      );

      // Hide Strong's notes row if no Strong's notes (footnotes are now per-pane)
      const notesRow = document.getElementById('sss-notes-row');
      if (notesRow) {
        // The notes row now only contains Strong's, check if it has any
        const strongsList = document.getElementById('sss-strongs-list');
        notesRow.classList.toggle('hidden', !strongsList || strongsList.children.length === 0);
      }
    }

    // Synchronize verse row heights between panes
    syncSSSVerseHeights();
  }

  /**
   * Synchronize verse row heights between left and right SSS panes
   * Ensures verses are aligned horizontally across both panes
   * @private
   */
  function syncSSSVerseHeights() {
    if (!sssLeftPane || !sssRightPane) return;

    // Cancel any pending RAF to prevent pileup
    if (pendingSyncRAF) {
      cancelAnimationFrame(pendingSyncRAF);
      pendingSyncRAF = null;
    }

    // Use requestAnimationFrame to ensure layout is complete before measuring
    pendingSyncRAF = requestAnimationFrame(() => {
      const leftVerses = sssLeftPane.querySelectorAll('.parallel-verse');
      const rightVerses = sssRightPane.querySelectorAll('.parallel-verse');

      // Reset heights first to get natural heights
      leftVerses.forEach(v => v.style.minHeight = '');
      rightVerses.forEach(v => v.style.minHeight = '');

      // Use another frame to ensure reset is applied before measuring
      // Track the inner RAF so it can be cancelled if syncSSSVerseHeights is called again
      pendingSyncRAF = requestAnimationFrame(() => {
        leftVerses.forEach((leftVerse, index) => {
          const rightVerse = rightVerses[index];
          if (rightVerse) {
            const maxHeight = Math.max(leftVerse.offsetHeight, rightVerse.offsetHeight);
            leftVerse.style.minHeight = maxHeight + 'px';
            rightVerse.style.minHeight = maxHeight + 'px';
          }
        });
        pendingSyncRAF = null;
      });
    });
  }

  /**
   * Populate SSS verse grid based on loaded chapter data
   * Creates clickable buttons for each verse in the current chapter
   * @private
   * @param {Array<Object>} verses - Array of verse objects with number and text
   */
  function populateSSSVerseGrid(verses) {
    if (!verses || verses.length === 0) {
      if (sssVerseGrid) sssVerseGrid.classList.add('hidden');
      if (sssVerseButtons) {
        sssVerseButtons.innerHTML = '';

        // Always create a fresh All button
        const newAllBtn = document.createElement('button');
        newAllBtn.id = 'sss-all-verses-btn';
        newAllBtn.type = 'button';
        newAllBtn.className = 'chip is-active';
        newAllBtn.textContent = 'All';
        newAllBtn.addEventListener('click', handleSSSAllVersesClick);
        sssVerseButtons.appendChild(newAllBtn);

        // Update global reference
        sssAllVersesBtn = newAllBtn;
      }
      return;
    }

    if (sssVerseButtons) {
      sssVerseButtons.innerHTML = '';

      // Add verse buttons
      verses.forEach(verse => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sss-verse-btn verse-btn';
        btn.textContent = verse.number;
        btn.dataset.verse = verse.number;
        btn.setAttribute('aria-pressed', 'false');
        addTapListener(btn, () => handleSSSVerseButtonClick(verse.number));
        sssVerseButtons.appendChild(btn);
      });

      // Always create a fresh All button at the end
      const newAllBtn = document.createElement('button');
      newAllBtn.id = 'sss-all-verses-btn';
      newAllBtn.type = 'button';
      newAllBtn.className = 'chip';
      newAllBtn.textContent = 'All';
      newAllBtn.addEventListener('click', handleSSSAllVersesClick);
      sssVerseButtons.appendChild(newAllBtn);

      // Update global reference
      sssAllVersesBtn = newAllBtn;
    }

    if (sssVerseGrid) {
      sssVerseGrid.classList.remove('hidden');
    }

    updateSSSVerseGridSelection();
  }

  /**
   * Handle SSS verse button click
   * Sets the current verse and reloads SSS comparison to show only that verse
   * @private
   * @param {number} verseNum - The verse number that was clicked
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
   * Adds/removes active styling and ARIA attributes based on current verse
   * @private
   */
  function updateSSSVerseGridSelection() {
    if (!sssVerseButtons) return;

    // Update verse number buttons
    const buttons = sssVerseButtons.querySelectorAll('.sss-verse-btn');
    buttons.forEach(btn => {
      const verseNum = parseInt(btn.dataset.verse);
      if (verseNum === sssVerse) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    // Update "All" button - active when no specific verse is selected
    const allBtn = sssVerseButtons.querySelector('#sss-all-verses-btn');
    if (allBtn) {
      if (sssVerse === 0) {
        allBtn.classList.add('is-active');
      } else {
        allBtn.classList.remove('is-active');
      }
    }
  }

  /**
   * Build HTML for one SSS pane with diff highlighting
   * Creates verse-by-verse display with optional difference highlighting
   * @private
   * @param {Array<Object>} verses - Verses to display in this pane
   * @param {Object} bible - Bible metadata object
   * @param {string} bookName - Human-readable book name
   * @param {Array<Object>} compareVerses - Verses from the other pane for comparison
   * @param {Object} compareBible - Bible metadata for the other pane
   * @returns {string} HTML string for the pane content
   */
  function buildSSSPaneHTML(verses, bible, bookName, compareVerses, compareBible) {
    if (!verses || verses.length === 0) {
      return '<article><p style="text-align: center; color: var(--michael-text-muted);  padding: 2rem 0;">No verses found</p></article>';
    }

    // Check for versification mismatch (e.g., Masoretic vs Septuagint)
    // Display warning when comparing Bibles with different verse numbering systems
    const versificationWarning = (compareBible && bible?.versification && compareBible?.versification &&
      bible.versification !== compareBible.versification)
      ? `<small style="color: var(--michael-text-muted); display: block; font-size: 0.7rem;">${escapeHtml(bible.versification)} versification</small>`
      : '';

    const bibleAbbrev = escapeHtml(bible?.abbrev || 'Unknown');
    let html = `<header class="translation-label" style="text-align: center; padding-bottom: 0.5rem;">
      <strong>${bibleAbbrev}</strong>${versificationWarning}
    </header>`;

    // Render each verse with highlighting based on comparison
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
   * Syncs status text in both normal and SSS mode views
   * @private
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

  /* ========================================================================
     DIFF HIGHLIGHTING
     ======================================================================== */

  /**
   * Highlight differences for normal mode (words not in ANY other translation)
   * Uses TextCompare engine if available, falls back to simple word matching
   * In normal mode, highlights words that don't appear in any other translation
   * @private
   * @param {string} text - The text to highlight
   * @param {Array<string>} otherTexts - Array of other translation texts to compare against
   * @returns {string} HTML string with highlighted differences
   */
  function highlightNormalDifferences(text, otherTexts) {
    // If highlighting disabled or no other texts to compare, return original text unchanged
    // CSS will hide any <note> elements automatically
    if (!normalHighlightEnabled || otherTexts.length === 0) return text;

    // Extract <note> elements to preserve them (CSS hides them, footnotes.js processes them)
    const noteRegex = /<note[^>]*>[\s\S]*?<\/note>/gi;
    const notes = text.match(noteRegex) || [];
    const textWithoutNotes = text.replace(noteRegex, '');
    const otherTextsWithoutNotes = otherTexts.map(t => t ? t.replace(noteRegex, '') : t);

    // For diff comparison, strip ALL HTML/OSIS markup tags but keep the text content
    const stripAllMarkup = (str) => str
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanText = stripAllMarkup(textWithoutNotes);
    const cleanOtherTexts = otherTextsWithoutNotes.map(t => t ? stripAllMarkup(t) : t);

    // Collect all words from other translations into a Set for fast lookup (lowercase, no punctuation)
    const otherWords = new Set();
    cleanOtherTexts.forEach(t => {
      if (t) {
        t.toLowerCase().split(/\s+/).forEach(w => {
          otherWords.add(w.replace(/[.,;:!?'"]/g, ''));
        });
      }
    });

    // Find words that don't appear in any other translation
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    const diffWordsLower = new Set();

    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[.,;:!?'"]/g, '');
      if (!otherWords.has(cleanWord) && cleanWord.length > 0) {
        diffWordsLower.add(cleanWord);
      }
    });

    // If no differences, return original text unchanged
    if (diffWordsLower.size === 0) {
      return text;
    }

    // Apply highlighting to the ORIGINAL text (preserving HTML structure)
    // We work on textWithoutNotes to avoid corrupting note elements
    // Then append notes at the end
    let highlighted = textWithoutNotes;

    // Process text nodes only - find words and wrap them with spans
    // This regex finds word boundaries while preserving HTML tags
    highlighted = highlighted.replace(
      /(<[^>]+>)|([^<\s]+)/g,
      (match, tag, word) => {
        if (tag) {
          // It's an HTML tag, preserve it
          return tag;
        }
        if (word) {
          // It's a word (possibly with punctuation)
          const cleanWord = word.toLowerCase().replace(/[.,;:!?'"]/g, '');
          if (diffWordsLower.has(cleanWord)) {
            return `<span class="diff-insert">${escapeHtml(word)}</span>`;
          }
        }
        return match;
      }
    );

    // Append notes at the end (CSS will hide them, footnotes.js processes them)
    return highlighted + notes.join('');
  }

  /**
   * Highlight differences between two texts (SSS mode)
   * Uses TextCompare engine if available, falls back to simple word matching
   * In SSS mode, highlights words in one translation that differ from the other
   * Preserves OSIS markup (<w> tags) for Strong's number tooltips
   * @private
   * @param {string} text - The text to highlight
   * @param {string} compareText - The text to compare against
   * @returns {string} HTML string with highlighted differences
   */
  function highlightDifferences(text, compareText) {
    // If highlighting disabled or no comparison text, return original text unchanged
    // CSS will hide any <note> elements automatically
    if (!sssHighlightEnabled || !compareText) return text;

    // Extract <note> elements to preserve them (CSS hides them, footnotes.js processes them)
    const noteRegex = /<note[^>]*>[\s\S]*?<\/note>/gi;
    const notes = text.match(noteRegex) || [];
    const textWithoutNotes = text.replace(noteRegex, '');
    const compareWithoutNotes = compareText.replace(noteRegex, '');

    // For diff comparison, strip ALL HTML/OSIS markup tags but keep the text content
    const stripAllMarkup = (str) => str
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanText = stripAllMarkup(textWithoutNotes);
    const cleanCompare = stripAllMarkup(compareWithoutNotes);

    // Collect words from comparison text for lookup (lowercase, no punctuation)
    const compareWords = new Set(
      cleanCompare.toLowerCase().split(/\s+/).map(w => w.replace(/[.,;:!?'"]/g, ''))
    );

    // Find words in our text that don't appear in comparison
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    const diffWordsLower = new Set();

    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[.,;:!?'"]/g, '');
      if (!compareWords.has(cleanWord) && cleanWord.length > 0) {
        diffWordsLower.add(cleanWord);
      }
    });

    // If no differences, return original text unchanged
    if (diffWordsLower.size === 0) {
      return text;
    }

    // Apply highlighting to the ORIGINAL text (preserving HTML structure)
    // We work on textWithoutNotes to avoid corrupting note elements
    // Then append notes at the end
    let highlighted = textWithoutNotes;

    // Process text nodes only - find words and wrap them with spans
    // This regex finds word boundaries while preserving HTML tags
    highlighted = highlighted.replace(
      /(<[^>]+>)|([^<\s]+)/g,
      (match, tag, word) => {
        if (tag) {
          // It's an HTML tag, preserve it
          return tag;
        }
        if (word) {
          // It's a word (possibly with punctuation)
          const cleanWord = word.toLowerCase().replace(/[.,;:!?'"]/g, '');
          if (diffWordsLower.has(cleanWord)) {
            return `<span class="diff-insert">${escapeHtml(word)}</span>`;
          }
        }
        return match;
      }
    );

    // Append notes at the end (CSS will hide them, footnotes.js processes them)
    return highlighted + notes.join('');
  }

  /**
   * Use TextCompare engine for sophisticated diff highlighting
   * Leverages the TextCompare library for categorized difference detection
   * (typos, punctuation, spelling, substantive changes, additions/omissions)
   * @private
   * @param {string} text - The primary text to highlight
   * @param {string} compareText - The text to compare against
   * @returns {string} HTML string with categorized highlights
   */
  function highlightWithTextCompare(text, compareText) {
    const TC = window.TextCompare;
    const result = TC.compareTexts(text, compareText);

    // If no differences found, return escaped original text
    if (result.diffs.length === 0) {
      return TC.escapeHtml(text);
    }

    // Use CSS class-based highlighting for categorized diffs
    // or fall back to user-selected color for simple mode
    const useCategories = true; // Could be exposed as a user preference

    if (useCategories) {
      // Use the CSS classes for different diff categories
      // Categories: typo, punctuation, spelling, substantive, add/omit
      return TC.renderWithHighlights(result.textA, result.diffs, 'a', {
        showTypo: false,      // Too subtle for most users, skip
        showPunct: true,      // Show punctuation differences
        showSpelling: true,   // Show spelling variations
        showSubstantive: true, // Show word substitutions
        showAddOmit: true     // Show additions/omissions
      });
    } else {
      // Alternative: use user-selected highlight color for all differences
      const textColor = getContrastColor(highlightColor);
      let html = '';
      let pos = 0;
      const normalizedText = result.textA;

      // Build list of ranges to highlight (all categories combined)
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
      // Sort by position to render in order
      highlights.sort((a, b) => a.offset - b.offset);

      // Build HTML with highlighted spans
      for (const h of highlights) {
        // Add text before this highlight
        if (h.offset > pos) {
          html += TC.escapeHtml(normalizedText.slice(pos, h.offset));
        }
        // Add highlighted text
        html += `<span class="diff-insert">${TC.escapeHtml(h.original)}</span>`;
        pos = h.offset + h.length;
      }
      // Add remaining text after last highlight
      if (pos < normalizedText.length) {
        html += TC.escapeHtml(normalizedText.slice(pos));
      }
      return html;
    }
  }

  /* ========================================================================
     INITIALIZATION & EVENT BINDING
     ======================================================================== */

  // Initialize on DOM ready - supports both early and late loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, initialize immediately
    init();
  }

  /**
   * Handle browser back/forward navigation
   * Restores state when user uses browser history buttons
   * @private
   */
  window.addEventListener('popstate', (e) => {
    if (e.state) {
      restoreState();
    }
  });
})();
