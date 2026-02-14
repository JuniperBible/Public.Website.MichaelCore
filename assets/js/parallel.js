'use strict';

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

import { addTapListener, getContrastColor, escapeHtml, createLoadingIndicator } from './michael/dom-utils.js';

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
    const bookInfo = bibleData?.books?.find(b => b.id === currentBook);
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
  const book = bibleData?.books?.find(b => b.id === currentBook);
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
  currentChapter = parseInt(e.target.value, 10) || 0;
  currentVerse = 0;
  saveState();

  if (currentChapter > 0 && currentBook) {
    // Get book name from metadata and announce to screen readers
    const bookInfo = bibleData?.books?.find(b => b.id === currentBook);
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
 * Validate loadComparison prerequisites
 * @private
 * @returns {Object|null} Validation result with error message or null if valid
 */
function validateComparisonLoad() {
  if (!currentBook || !currentChapter) {
    return { skip: true };
  }

  if (isLoadingComparison) {
    return { skip: true };
  }

  if (selectedTranslations.length === 0) {
    return {
      error: true,
      render: () => {
        parallelContent.textContent = '';
        const article = document.createElement('article');
        const p = document.createElement('p');
        p.style.cssText = 'text-align: center; color: var(--michael-text-muted); padding: 2rem 0;';
        p.textContent = 'Select at least one translation to view.';
        article.appendChild(p);
        parallelContent.appendChild(article);
      }
    };
  }

  if (!window.Michael?.BibleLoader?.getChapter) {
    return {
      error: true,
      render: () => {
        console.error('[Parallel] BibleLoader not loaded');
        parallelContent.innerHTML = '<div class="center muted">Error: Bible data unavailable</div>';
      }
    };
  }

  return null;
}

/**
 * Fetch chapter data for all selected translations
 * @private
 * @async
 * @returns {Promise<Array>} Array of chapter data for each translation
 */
async function fetchComparisonData() {
  const chapterDataPromises = selectedTranslations.map(bibleId =>
    window.Michael.BibleLoader.getChapter(bibleId, currentBook, currentChapter)
  );
  return Promise.all(chapterDataPromises);
}

/**
 * Render comparison results to the page
 * @private
 * @param {Array} chaptersData - Chapter data from all translations
 */
function renderComparisonResults(chaptersData) {
  // SECURITY: buildComparisonHTML uses escapeHtml on all user-controlled content
  const html = buildComparisonHTML(chaptersData);
  parallelContent.innerHTML = html;

  if (window.Michael?.Footnotes) {
    const notesRow = document.getElementById('vvv-notes-row');
    const vvvFootnotesSection = document.getElementById('vvv-footnotes-section');
    const vvvFootnotesList = document.getElementById('vvv-footnotes-list');
    const footnoteCount = window.Michael.Footnotes.process(parallelContent, vvvFootnotesSection, vvvFootnotesList, 'vvv-');

    if (notesRow) {
      notesRow.classList.toggle('hidden', footnoteCount === 0);
    }
  }

  const bookInfo = bibleData?.books?.find(b => b.id === currentBook);
  const bookName = bookInfo?.name || currentBook;
  const verseInfo = currentVerse > 0 ? ` verse ${currentVerse}` : '';
  announce(`${bookName} chapter ${currentChapter}${verseInfo} loaded with ${selectedTranslations.length} translation${selectedTranslations.length !== 1 ? 's' : ''}.`);
}

/**
 * Load and display the parallel comparison
 * Fetches chapter data for all selected translations and renders verse-by-verse
 * @private
 * @async
 * @returns {Promise<void>}
 */
async function loadComparison() {
  const validationResult = validateComparisonLoad();

  if (validationResult?.skip) {
    return Promise.resolve();
  }

  if (validationResult?.error) {
    validationResult.render();
    return Promise.resolve();
  }

  isLoadingComparison = true;

  try {
    if (window.Michael?.Strongs?.clearNotes) {
      window.Michael.Strongs.clearNotes();
    }

    updateURL();
    // SECURITY: createLoadingIndicator() returns static safe HTML (no user input)
    parallelContent.innerHTML = createLoadingIndicator();

    const chaptersData = await fetchComparisonData();
    renderComparisonResults(chaptersData);
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
 * Get valid verses from first available translation
 * @private
 * @async
 * @returns {Promise<Array<Object>|null>} Array of verses or null if none found
 */
async function getValidVersesForGrid() {
  if (!window.Michael?.BibleLoader?.getChapter) {
    return null;
  }

  for (const translationId of selectedTranslations) {
    const verses = await window.Michael.BibleLoader.getChapter(translationId, currentBook, currentChapter);
    if (verses && verses.length > 0) {
      return verses;
    }
  }

  return null;
}

/**
 * Create a verse button element
 * @private
 * @param {Object} verse - Verse object with number property
 * @returns {HTMLButtonElement} Configured verse button
 */
function createVerseButton(verse) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'verse-btn';
  btn.textContent = verse.number;
  btn.dataset.verse = verse.number;
  btn.setAttribute('aria-pressed', 'false');
  addTapListener(btn, () => handleVerseButtonClick(verse.number));
  return btn;
}

/**
 * Create the "All" verses button
 * @private
 * @returns {HTMLButtonElement} Configured "All" button
 */
function createAllVersesButton() {
  const newAllBtn = document.createElement('button');
  newAllBtn.id = 'all-verses-btn';
  newAllBtn.type = 'button';
  newAllBtn.className = 'chip';
  newAllBtn.textContent = 'All';
  newAllBtn.addEventListener('click', handleAllVersesClick);
  return newAllBtn;
}


/**
 * Populate verse grid based on loaded chapter data
 * Creates clickable buttons for each verse in the current chapter
 * @private
 * @async
 */
async function populateVerseGrid() {
  const verses = await getValidVersesForGrid();

  if (!verses || verses.length === 0) {
    resetVerseGrid();
    return;
  }

  // Populate verse buttons grid
  if (verseButtons) {
    verseButtons.innerHTML = '';

    // Add verse buttons
    verses.forEach(verse => {
      verseButtons.appendChild(createVerseButton(verse));
    });

    // Always create a fresh All button at the end
    const newAllBtn = createAllVersesButton();
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
    const verseNum = parseInt(btn.dataset.verse, 10);
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
  const bookInfo = bibleData?.books?.find(b => b.id === currentBook);
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
  try {
    localStorage.setItem('bible-compare-translations', JSON.stringify(selectedTranslations));
  } catch (e) {
    // localStorage unavailable (private browsing)
  }
}

/**
 * Parse a reference string into book, chapter, and verse components
 * @private
 * @param {string} refParam - Reference parameter (e.g., "Gen.1.1")
 * @returns {{book: string, chapter: number, verse: number}} Parsed reference
 */
function parseReference(refParam) {
  const parts = refParam.split('.');
  const bookParam = parts[0];
  const chapter = parseInt(parts[1], 10) || 0;
  const verse = parseInt(parts[2], 10) || 0;

  // Normalize book ID to match bibleData.books (case-insensitive lookup)
  const matchedBook = bibleData?.books?.find(b =>
    b.id.toLowerCase() === bookParam.toLowerCase()
  );

  return {
    book: matchedBook ? matchedBook.id : bookParam,
    chapter,
    verse
  };
}

/**
 * Filter and validate translation IDs against available Bibles
 * @private
 * @param {string[]} ids - Array of Bible IDs
 * @returns {string[]} Filtered array of valid IDs
 */
function filterValidBibles(ids) {
  return ids.filter(id => bibleData?.bibles?.some(b => b.id === id));
}

/**
 * Update translation checkboxes to match selected translations
 * @private
 */
function syncTranslationCheckboxes() {
  translationCheckboxes.forEach(cb => {
    cb.checked = selectedTranslations.includes(cb.value);
  });
}

/**
 * Find a matching option in a select element (case-insensitive)
 * @private
 * @param {HTMLSelectElement} selectEl - The select element
 * @param {string} value - The value to find
 * @returns {HTMLOptionElement|undefined} Matching option or undefined
 */
function findSelectOption(selectEl, value) {
  return Array.from(selectEl.options).find(opt =>
    opt.value.toLowerCase() === value.toLowerCase()
  );
}

/**
 * Pick a random Bible from available options (not cryptographic, just UI variety)
 * @private
 * @param {Array} bibles - Array of Bible objects
 * @returns {string} Random Bible ID
 */
function pickRandomBible(bibles) {
  // NOTE: Math.random() is fine for UI randomization - not used for security
  const randomIndex = Math.floor(Math.random() * bibles.length);
  return bibles[randomIndex].id;
}

/**
 * Update SSS selector elements with current state
 * @private
 */
function updateSSSSelectors() {
  if (sssBibleLeft) sssBibleLeft.value = sssLeftBible;
  if (sssBibleRight) sssBibleRight.value = sssRightBible;

  if (sssBookSelect) {
    const bookOption = findSelectOption(sssBookSelect, sssBook);
    if (bookOption) sssBookSelect.value = bookOption.value;
    populateSSSChapterDropdown();
  }

  if (sssChapterSelect) sssChapterSelect.value = sssChapter;
}

/**
 * Show SSS mode UI (hide normal mode)
 * @private
 */
function showSSSModeUI() {
  sssMode = true;
  updateSSSModeStatus();
  if (normalModeEl) normalModeEl.classList.add('hidden');
  if (sssModeEl) sssModeEl.classList.remove('hidden');
  document.getElementById('parallel-content')?.classList.add('hidden');
}

/**
 * Set up SSS mode with single Bible and random second Bible
 * @private
 * @param {string} singleBible - The single selected Bible ID
 * @param {Object} ref - Parsed reference {book, chapter, verse}
 * @returns {boolean} True if SSS mode was entered successfully
 */
function setupSingleBibleSSSMode(singleBible, ref) {
  const otherBibles = bibleData?.bibles?.filter(b => b.id !== singleBible) || [];

  // Validate inputs
  if (otherBibles.length === 0 || !ref.book || ref.chapter <= 0) {
    return false;
  }

  // Set up SSS mode state
  sssLeftBible = singleBible;
  sssRightBible = pickRandomBible(otherBibles);
  sssBook = ref.book;
  sssChapter = ref.chapter;
  sssVerse = ref.verse;

  updateSSSSelectors();
  showSSSModeUI();

  if (canLoadSSSComparison()) {
    loadSSSComparison();
  }

  return true;
}

/**
 * Restore translations from localStorage
 * @private
 * @returns {boolean} True if state was restored from localStorage
 */
function restoreTranslationsFromStorage() {
  try {
    const saved = localStorage.getItem('bible-compare-translations');
    if (saved) {
      selectedTranslations = filterValidBibles(JSON.parse(saved));
      syncTranslationCheckboxes();
      return selectedTranslations.length > 0;
    }
  } catch (e) {
    // localStorage unavailable or parse error
  }
  return false;
}

/**
 * Restore reference state and load comparison
 * @private
 * @param {Object} ref - Parsed reference {book, chapter, verse}
 */
function restoreReferenceState(ref) {
  if (!ref.book || !ref.chapter) return;

  currentBook = ref.book;
  currentChapter = ref.chapter;
  currentVerse = ref.verse;

  // Set book select value
  const bookOption = findSelectOption(bookSelect, currentBook);
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
 * Set default state (DRC, KJVA - Isaiah 42:16 in SSS mode)
 * @private
 */
function setDefaultState() {
  selectedTranslations = filterValidBibles(['drc', 'kjva']);
  syncTranslationCheckboxes();

  currentBook = 'Isa';
  currentChapter = 42;
  currentVerse = 16;
  bookSelect.value = currentBook;
  populateChapterDropdown();
  chapterSelect.value = currentChapter;

  enterSSSMode();
}

/**
 * Parse URL parameters and return bibles and reference
 * @private
 * @returns {{biblesParam: string|null, refParam: string|null}} URL parameters
 */
function parseURLParameters() {
  const params = new URLSearchParams(window.location.search);
  return {
    biblesParam: params.get('bibles'),
    refParam: params.get('ref')
  };
}

/**
 * Handle restoration from URL bibles parameter
 * @private
 * @param {string} biblesParam - Comma-separated Bible IDs
 * @param {string|null} refParam - Reference parameter
 * @returns {boolean} True if state was fully restored (SSS mode entered)
 */
function restoreFromBiblesParam(biblesParam, refParam) {
  selectedTranslations = filterValidBibles(biblesParam.split(','));
  syncTranslationCheckboxes();

  // Single Bible mode: auto-select random second Bible and enter SSS mode
  if (selectedTranslations.length === 1 && refParam) {
    const ref = parseReference(refParam);
    if (setupSingleBibleSSSMode(selectedTranslations[0], ref)) {
      return true; // SSS mode entered successfully
    }
  }

  return false;
}

/**
 * Handle restoration of Bible translations (from URL or localStorage)
 * @private
 * @param {string|null} biblesParam - URL bibles parameter
 * @param {string|null} refParam - URL reference parameter
 * @returns {boolean} True if fully restored and should exit early
 */
function restoreBibleTranslations(biblesParam, refParam) {
  if (biblesParam) {
    return restoreFromBiblesParam(biblesParam, refParam);
  } else {
    restoreTranslationsFromStorage();
    return false;
  }
}

/**
 * Apply default state if no URL parameters provided
 * @private
 * @param {string|null} biblesParam - URL bibles parameter
 * @param {string|null} refParam - URL reference parameter
 */
function applyDefaultsIfNeeded(biblesParam, refParam) {
  if (!biblesParam && !refParam) {
    setDefaultState();
  }
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
  const { biblesParam, refParam } = parseURLParameters();

  // Handle Bible translations restoration
  const shouldExitEarly = restoreBibleTranslations(biblesParam, refParam);
  if (shouldExitEarly) {
    return;
  }

  // Handle reference parameter
  if (refParam) {
    restoreReferenceState(parseReference(refParam));
  }

  // Set defaults if no URL params
  applyDefaultsIfNeeded(biblesParam, refParam);
}

/* ========================================================================
   SSS MODE
   ======================================================================== */

/**
 * Check if SSS mode defaults should be reset (once per day)
 * @private
 * @returns {boolean} True if defaults should be reset
 */
function shouldResetSSSDefaults() {
  const today = new Date().toDateString();
  let lastSSSDate = null;
  try {
    lastSSSDate = localStorage.getItem('sss-last-date');
  } catch (e) {
    // localStorage unavailable
  }
  return lastSSSDate !== today;
}

/**
 * Save today's date for SSS reset tracking
 * @private
 */
function saveSSSDate() {
  try {
    localStorage.setItem('sss-last-date', new Date().toDateString());
  } catch (e) {
    // localStorage unavailable
  }
}

/**
 * Reset SSS state variables to empty
 * @private
 */
function resetSSSState() {
  sssLeftBible = '';
  sssRightBible = '';
  sssBook = '';
  sssChapter = 0;
}

/**
 * Set SSS selector to a value if currently empty
 * @private
 * @param {string} stateVar - Variable name to check
 * @param {HTMLSelectElement|null} selectEl - Select element
 * @param {string} defaultValue - Default value to set
 * @returns {string} The value (current or default)
 */
function setSSSDefault(currentValue, selectEl, defaultValue) {
  if (!currentValue && selectEl) {
    selectEl.value = defaultValue;
    return defaultValue;
  }
  return currentValue;
}

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

  // Reset to defaults once per day
  if (shouldResetSSSDefaults()) {
    saveSSSDate();
    resetSSSState();
  }

  // Set defaults if not already set
  sssLeftBible = setSSSDefault(sssLeftBible, sssBibleLeft, 'drc');
  sssRightBible = setSSSDefault(sssRightBible, sssBibleRight, 'kjva');

  if (!sssBook && sssBookSelect) {
    sssBook = 'Isa';
    sssBookSelect.value = 'Isa';
    populateSSSChapterDropdown();
  }

  sssChapter = !sssChapter && sssChapterSelect ? 42 : sssChapter;
  if (sssChapterSelect && sssChapter === 42) {
    sssChapterSelect.value = '42';
  }

  // Auto-load with defaults
  if (canLoadSSSComparison()) {
    loadSSSComparison();
  }
}

/**
 * Exit SSS mode and return to normal comparison view
 * Syncs SSS selections (Bibles, book, chapter) to VVV mode
 * @private
 */
function exitSSSMode() {
  sssMode = false;
  updateSSSModeStatus();

  // Sync SSS Bible selections to VVV translation checkboxes
  if (sssLeftBible || sssRightBible) {
    const biblesToSelect = [sssLeftBible, sssRightBible].filter(Boolean);
    // Clear existing selections
    selectedTranslations = [];
    translationCheckboxes.forEach(cb => {
      const shouldSelect = biblesToSelect.includes(cb.value);
      cb.checked = shouldSelect;
      if (shouldSelect && !selectedTranslations.includes(cb.value)) {
        selectedTranslations.push(cb.value);
      }
    });
  }

  // Sync SSS book/chapter to VVV selectors
  if (sssBook && bookSelect) {
    bookSelect.value = sssBook;
    currentBook = sssBook;
    // Populate chapter dropdown for the book
    populateChapterDropdown();
    if (sssChapter && chapterSelect) {
      chapterSelect.value = String(sssChapter);
      currentChapter = sssChapter;
    }
  }

  if (normalModeEl) normalModeEl.classList.remove('hidden');
  if (sssModeEl) sssModeEl.classList.add('hidden');
  document.getElementById('parallel-content')?.classList.remove('hidden');

  // Load comparison with synced selections
  if (canLoadComparison()) {
    loadComparison();
  }
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
    const bookInfo = bibleData?.books?.find(b => b.id === sssBook);
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

  const book = bibleData?.books?.find(b => b.id === sssBook);
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
  sssChapter = parseInt(sssChapterSelect?.value, 10) || 0;
  sssVerse = 0; // Reset verse selection
  triedBiblesWithNoVerses.clear(); // Reset tried Bibles for new chapter

  if (sssChapter > 0 && sssBook) {
    // Announce chapter change to screen readers
    const bookInfo = bibleData?.books?.find(b => b.id === sssBook);
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

/** Maximum recursion depth for SSS Bible fallback to prevent stack overflow */
const MAX_SSS_FALLBACK_DEPTH = 20;

/**
 * Show loading indicators in SSS panes
 * @private
 */
function showSSSLoading() {
  // SECURITY: createLoadingIndicator() returns static safe HTML (no user input)
  const loadingHtml = createLoadingIndicator();
  if (sssLeftPane) sssLeftPane.innerHTML = loadingHtml;
  if (sssRightPane) sssRightPane.innerHTML = loadingHtml;
}

/**
 * Show error message in SSS panes
 * @private
 * @param {string} message - Error message to display
 */
function showSSSError(message) {
  // SECURITY: escapeHtml sanitizes the message parameter
  const errorHtml = `<div class="center muted">${escapeHtml(message)}</div>`;
  if (sssLeftPane) sssLeftPane.innerHTML = errorHtml;
  if (sssRightPane) sssRightPane.innerHTML = errorHtml;
}

/**
 * Try to find an alternative Bible when right Bible has no verses
 * @private
 * @param {number} depth - Current recursion depth
 * @returns {boolean} True if fallback was triggered
 */
function tryFallbackBible(depth) {
  triedBiblesWithNoVerses.add(sssRightBible);

  const availableBibles = bibleData?.bibles?.filter(b =>
    b.id !== sssLeftBible && !triedBiblesWithNoVerses.has(b.id)
  ) || [];

  if (availableBibles.length === 0) {
    return false;
  }

  // Pick a random Bible from remaining options
  sssRightBible = pickRandomBible(availableBibles);
  if (sssBibleRight) sssBibleRight.value = sssRightBible;

  // Check depth guard
  if (depth >= MAX_SSS_FALLBACK_DEPTH) {
    console.warn('[Parallel] Max SSS fallback depth reached, stopping recursion');
    return false;
  }

  return true;
}

/**
 * Process SSS footnotes for both panes
 * @private
 */
function processSSSFootnotes() {
  if (!window.Michael?.Footnotes) return;

  const leftFootnotesSection = document.getElementById('sss-left-footnotes-section');
  const leftFootnotesList = document.getElementById('sss-left-footnotes-list');
  const rightFootnotesSection = document.getElementById('sss-right-footnotes-section');
  const rightFootnotesList = document.getElementById('sss-right-footnotes-list');

  window.Michael.Footnotes.process(sssLeftPane, leftFootnotesSection, leftFootnotesList, 'sss-left-');
  window.Michael.Footnotes.process(sssRightPane, rightFootnotesSection, rightFootnotesList, 'sss-right-');

  // Hide Strong's notes row if no Strong's notes
  const notesRow = document.getElementById('sss-notes-row');
  if (notesRow) {
    const strongsList = document.getElementById('sss-strongs-list');
    notesRow.classList.toggle('hidden', !strongsList || strongsList.children.length === 0);
  }
}

/**
 * Render SSS comparison panes with verse content
 * @private
 * @param {Array} leftVerses - Left pane verses
 * @param {Array} rightVerses - Right pane verses
 */
function renderSSSPanes(leftVerses, rightVerses) {
  const leftBible = bibleData.bibles.find(b => b.id === sssLeftBible);
  const rightBible = bibleData.bibles.find(b => b.id === sssRightBible);
  const bookInfo = bibleData?.books?.find(b => b.id === sssBook);
  const bookName = bookInfo?.name || sssBook;

  // Filter verses if specific verse selected
  const leftFiltered = sssVerse > 0 ? leftVerses?.filter(v => v.number === sssVerse) : leftVerses;
  const rightFiltered = sssVerse > 0 ? rightVerses?.filter(v => v.number === sssVerse) : rightVerses;

  // SECURITY: buildSSSPaneHTML uses escapeHtml on all user-controlled content
  if (sssLeftPane) {
    sssLeftPane.innerHTML = buildSSSPaneHTML(leftFiltered, leftBible, bookName, rightFiltered, rightBible);
  }
  if (sssRightPane) {
    sssRightPane.innerHTML = buildSSSPaneHTML(rightFiltered, rightBible, bookName, leftFiltered, leftBible);
  }
}

/**
 * Clear Strong's notes when loading new chapter
 * @private
 */
function clearStrongsNotes() {
  if (window.Michael?.Strongs?.clearNotes) {
    window.Michael.Strongs.clearNotes();
  }
}

/**
 * Validate BibleLoader availability
 * @private
 * @returns {boolean} True if BibleLoader is available
 */
function validateBibleLoader() {
  return !!(window.Michael?.BibleLoader?.getChapter);
}

/**
 * Fetch chapter data for both SSS panes in parallel
 * @private
 * @async
 * @returns {Promise<{leftVerses: Array, rightVerses: Array}>}
 */
async function fetchSSSChapterData() {
  const [leftVerses, rightVerses] = await Promise.all([
    window.Michael.BibleLoader.getChapter(sssLeftBible, sssBook, sssChapter),
    window.Michael.BibleLoader.getChapter(sssRightBible, sssBook, sssChapter)
  ]);
  return { leftVerses, rightVerses };
}

/**
 * Check if fallback is needed for missing right Bible verses
 * @private
 * @param {Array} rightVerses - Right pane verses
 * @param {Array} leftVerses - Left pane verses
 * @returns {boolean} True if fallback is needed
 */
function shouldTryFallback(rightVerses, leftVerses) {
  const rightMissing = !rightVerses || rightVerses.length === 0;
  const leftPresent = leftVerses && leftVerses.length > 0;
  return rightMissing && leftPresent;
}

/**
 * Reset tried Bibles tracker on successful verse fetch
 * @private
 * @param {Array} rightVerses - Right pane verses
 */
function resetTriedBiblesIfSuccess(rightVerses) {
  const rightMissing = !rightVerses || rightVerses.length === 0;
  if (!rightMissing) {
    triedBiblesWithNoVerses.clear();
  }
}

/**
 * Render the complete SSS comparison view
 * @private
 * @param {Array} leftVerses - Left pane verses
 * @param {Array} rightVerses - Right pane verses
 */
function renderSSSComparison(leftVerses, rightVerses) {
  populateSSSVerseGrid(leftVerses || rightVerses);
  renderSSSPanes(leftVerses, rightVerses);
  processSSSFootnotes();
  syncSSSVerseHeights();
}

/**
 * Load and display SSS comparison
 * Fetches both translations in parallel and renders side-by-side
 * If the right Bible has no verses, automatically tries another Bible
 * @private
 * @async
 * @param {number} [depth=0] - Current recursion depth for fallback prevention
 * @returns {Promise<void>}
 */
async function loadSSSComparison(depth = 0) {
  if (!canLoadSSSComparison()) return;

  clearStrongsNotes();
  showSSSLoading();

  if (!validateBibleLoader()) {
    showSSSError('Error: Bible data unavailable');
    return;
  }

  const { leftVerses, rightVerses } = await fetchSSSChapterData();

  if (shouldTryFallback(rightVerses, leftVerses) && tryFallbackBible(depth)) {
    return loadSSSComparison(depth + 1);
  }

  resetTriedBiblesIfSuccess(rightVerses);
  renderSSSComparison(leftVerses, rightVerses);
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
    const verseNum = parseInt(btn.dataset.verse, 10);
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

// Maintain backwards compatibility with window.Michael namespace
window.Michael = window.Michael || {};
window.Michael.Parallel = {
  init
};
