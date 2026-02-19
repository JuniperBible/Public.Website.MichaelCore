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
'use strict';

window.Michael = window.Michael || {};

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
/**
 * Cache all required DOM element references into module-level variables.
 * @private
 */
function cacheDOMElements() {
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
}

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
      if (bibleData.basePath) {
        basePath = bibleData.basePath;
      }
    } catch (e) {
      console.error('Failed to parse Bible data:', e);
      return;
    }
  }

  cacheDOMElements();

  if (!bookSelect || !chapterSelect || !parallelContent) {
    return; // Not on compare page
  }

  setupEventListeners();
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
 * Attach an event listener only when the element exists
 * @private
 * @param {Element|null} element - Target DOM element (no-op when falsy)
 * @param {string} event - Event type (e.g. 'change', 'click')
 * @param {Function} handler - Event handler function
 */
function registerIfExists(element, event, handler) {
  if (element) {
    element.addEventListener(event, handler);
  }
}

/**
 * Set up event listeners for SSS (Side-by-Side-by-Side) mode controls
 * Covers the enter/exit buttons and the bible/book/chapter selectors
 * @private
 */
function setupSSSControls() {
  addTapListener(document.getElementById('sss-mode-btn'), () => enterSSSMode());
  addTapListener(document.getElementById('sss-back-btn'), () => exitSSSMode());
  addTapListener(document.getElementById('sss-toggle-btn'), () => exitSSSMode());

  // SSS selectors (change events work fine on mobile)
  registerIfExists(sssBibleLeft, 'change', handleSSSBibleChange);
  registerIfExists(sssBibleRight, 'change', handleSSSBibleChange);
  registerIfExists(sssBookSelect, 'change', handleSSSBookChange);
  registerIfExists(sssChapterSelect, 'change', handleSSSChapterChange);
}

/**
 * Set up event listeners for normal-mode and SSS-mode highlight toggles
 * Also synchronises the sssHighlightEnabled flag and the legend visibility
 * @private
 */
function setupHighlightToggles() {
  const highlightToggle = document.getElementById('highlight-toggle');
  const diffLegend = document.getElementById('diff-legend');
  registerIfExists(highlightToggle, 'change', (e) => {
    normalHighlightEnabled = e.target.checked;
    if (diffLegend) diffLegend.classList.toggle('hidden', !e.target.checked);
    if (canLoadComparison()) {
      loadComparison();
    }
  });

  const sssHighlightToggle = document.getElementById('sss-highlight-toggle');
  const sssDiffLegend = document.getElementById('sss-diff-legend');
  registerIfExists(sssHighlightToggle, 'change', (e) => {
    sssHighlightEnabled = e.target.checked;
    if (sssDiffLegend) sssDiffLegend.classList.toggle('hidden', !e.target.checked);
    if (canLoadSSSComparison()) {
      loadSSSComparison();
    }
  });

  // Sync sssHighlightEnabled with checkbox state and update legend
  if (sssHighlightToggle) {
    sssHighlightEnabled = sssHighlightToggle.checked;
    if (sssDiffLegend) {
      sssDiffLegend.classList.toggle('hidden', !sssHighlightToggle.checked);
    }
  }
}

/**
 * Set up color picker event listeners for both normal and SSS modes
 * @private
 */
function setupColorPickers() {
  setupColorPicker('highlight-color-btn', 'highlight-color-picker', '.color-option');
  setupColorPicker('sss-highlight-color-btn', 'sss-highlight-color-picker', '.sss-color-option');
}

/**
 * Set up event listeners for book/chapter navigation and verse buttons
 * @private
 */
function setupNavigationListeners() {
  // Book and chapter selectors (change events work fine on mobile)
  bookSelect.addEventListener('change', handleBookChange);
  chapterSelect.addEventListener('change', handleChapterChange);

  // Verse buttons - use click for immediate response
  registerIfExists(allVersesBtn, 'click', handleAllVersesClick);
  registerIfExists(sssAllVersesBtn, 'click', handleSSSAllVersesClick);
}

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

  setupSSSControls();
  setupHighlightToggles();
  setupColorPickers();
  setupNavigationListeners();
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
 * Apply a selected highlight color: update state, UI, and reload content.
 * @private
 * @param {string} color - CSS color value from the color option's dataset
 * @param {HTMLElement} picker - The color picker element to hide after selection
 */
function applyColorSelection(color, picker) {
  highlightColor = color;
  sssHighlightEnabled = true;
  normalHighlightEnabled = true;

  // Sync checkbox states
  const highlightToggle = document.getElementById('highlight-toggle');
  if (highlightToggle) highlightToggle.checked = true;
  const sssHighlightToggle = document.getElementById('sss-highlight-toggle');
  if (sssHighlightToggle) sssHighlightToggle.checked = true;

  // Sync color button backgrounds
  document.getElementById('highlight-color-btn')?.style.setProperty('background-color', color);
  document.getElementById('sss-highlight-color-btn')?.style.setProperty('background-color', color);

  // Update CSS variable for highlight
  document.documentElement.style.setProperty('--highlight-color', color);

  picker.classList.add('hidden');

  if (sssMode && canLoadSSSComparison()) {
    loadSSSComparison();
  } else if (canLoadComparison()) {
    loadComparison();
  }
}

/**
 * Register document-level listeners that close the picker when the user
 * clicks or touches outside of it.
 * @private
 * @param {HTMLElement} btn - The toggle button (excluded from dismiss logic)
 * @param {HTMLElement} picker - The picker to dismiss
 */
function registerPickerDismiss(btn, picker) {
  const closePicker = (e) => {
    if (picker.contains(e.target) || e.target === btn || btn.contains(e.target)) {
      return;
    }
    picker.classList.add('hidden');
  };
  // Use click for mouse, touchstart for touch (touchend may fire after click)
  document.addEventListener('click', closePicker);
  document.addEventListener('touchstart', closePicker, { passive: true });
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

  // Set background colors on color option buttons and attach handlers
  picker.querySelectorAll(optionSelector).forEach(option => {
    option.style.backgroundColor = option.dataset.color;
    addTapListener(option, (e) => {
      e.stopPropagation();
      applyColorSelection(option.dataset.color, picker);
    });
  });

  registerPickerDismiss(btn, picker);
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
  chapterSelect.replaceChildren();

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
  if (!currentBook || !currentChapter) return;
  if (isLoadingComparison) return;

  isLoadingComparison = true;

  try {
    clearStrongsNotesIfAvailable();

    if (selectedTranslations.length === 0) {
      showNoTranslationsMessage();
      return;
    }

    updateURL();
    parallelContent.replaceChildren(window.Michael.DomUtils.createLoadingIndicator());

    const chaptersData = await fetchAllChapters();
    parallelContent.replaceChildren(buildComparisonHTML(chaptersData));

    processComparisonFootnotes();
    announceComparisonLoaded();
  } finally {
    isLoadingComparison = false;
  }
}

/**
 * Clear Strong's notes if the module is available
 * @private
 */
function clearStrongsNotesIfAvailable() {
  if (window.Michael?.Strongs?.clearNotes) {
    window.Michael.Strongs.clearNotes();
  }
}

/**
 * Show message when no translations are selected
 * @private
 */
function showNoTranslationsMessage() {
  parallelContent.textContent = '';
  const article = document.createElement('article');
  const p = document.createElement('p');
  p.style.cssText = 'text-align: center; color: var(--michael-text-muted); padding: 2rem 0;';
  p.textContent = 'Select at least one translation to view.';
  article.appendChild(p);
  parallelContent.appendChild(article);
}

/**
 * Fetch chapter data for all selected translations
 * @private
 * @returns {Promise<Array>}
 */
async function fetchAllChapters() {
  const promises = selectedTranslations.map(bibleId =>
    window.Michael.BibleAPI.fetchChapter(basePath, bibleId, currentBook, currentChapter)
  );
  return Promise.all(promises);
}

/**
 * Process footnotes for VVV mode content
 * @private
 */
function processComparisonFootnotes() {
  if (!window.Michael?.Footnotes) return;

  const notesRow = document.getElementById('vvv-notes-row');
  const vvvFootnotesSection = document.getElementById('vvv-footnotes-section');
  const vvvFootnotesList = document.getElementById('vvv-footnotes-list');
  const footnoteCount = window.Michael.Footnotes.process(
    parallelContent, vvvFootnotesSection, vvvFootnotesList, 'vvv-'
  );

  if (notesRow) {
    notesRow.classList.toggle('hidden', footnoteCount === 0);
  }
}

/**
 * Announce comparison loaded to screen readers
 * @private
 */
function announceComparisonLoaded() {
  const bookInfo = bibleData.books.find(b => b.id === currentBook);
  const bookName = bookInfo?.name || currentBook;
  const verseInfo = currentVerse > 0 ? ` verse ${currentVerse}` : '';
  const plural = selectedTranslations.length !== 1 ? 's' : '';
  announce(`${bookName} chapter ${currentChapter}${verseInfo} loaded with ${selectedTranslations.length} translation${plural}.`);
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
    verseButtons.replaceChildren();

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
/**
 * Create a fresh normal-mode "All verses" button and update the global reference.
 * @private
 * @returns {HTMLButtonElement}
 */
function buildAllButton() {
  const btn = document.createElement('button');
  btn.id = 'all-verses-btn';
  btn.type = 'button';
  btn.className = 'chip';
  btn.textContent = 'All';
  btn.addEventListener('click', handleAllVersesClick);
  allVersesBtn = btn;
  return btn;
}

async function populateVerseGrid() {
  // Find first translation with valid data for this chapter
  let verses = null;
  for (const translationId of selectedTranslations) {
    if (window.Michael.BibleAPI.hasInCache(translationId, currentBook, currentChapter)) {
      verses = await window.Michael.BibleAPI.fetchChapter(basePath, translationId, currentBook, currentChapter);
      if (verses && verses.length > 0) break;
    }
  }

  if (!verses || verses.length === 0) {
    resetVerseGrid();
    return;
  }

  if (verseButtons) {
    verseButtons.replaceChildren();

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

    verseButtons.appendChild(buildAllButton());
  }

  if (verseGrid) verseGrid.classList.remove('hidden');

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
/**
 * Build the reference header element for the comparison view.
 * @private
 * @param {string} bookName - Human-readable book name
 * @returns {HTMLElement}
 */
function buildComparisonHeader(bookName) {
  const verseRef = currentVerse > 0 ? `:${currentVerse}` : '';
  const abbrevList = selectedTranslations.map(id => {
    const bible = bibleData.bibles.find(b => b.id === id);
    return bible?.abbrev || id;
  }).join(', ');

  const header = document.createElement('header');
  header.style.textAlign = 'center';
  header.style.marginBottom = '1.5rem';

  const h2 = document.createElement('h2');
  h2.style.marginBottom = '0.25rem';
  h2.textContent = `${bookName} ${currentChapter}${verseRef}`;
  header.appendChild(h2);

  const abbrevP = document.createElement('p');
  abbrevP.style.color = 'var(--michael-text-muted)';
  abbrevP.style.fontSize = '0.875rem';
  abbrevP.style.margin = '0';
  abbrevP.textContent = abbrevList;
  header.appendChild(abbrevP);

  return header;
}

/**
 * Build one verse article element showing all selected translations.
 * @private
 * @param {Object} verse - Verse object with a .number property
 * @param {Array<Array<Object>>} chaptersData - Per-translation verse arrays
 * @param {string} bookName - Human-readable book name
 * @returns {HTMLElement}
 */
function buildVerseArticle(verse, chaptersData, bookName) {
  const verseNum = verse.number;
  const article = document.createElement('article');
  article.className = 'parallel-verse';
  article.dataset.verse = verseNum;

  const verseHeader = document.createElement('header');
  const h3 = document.createElement('h3');
  h3.style.fontWeight = 'bold';
  h3.style.color = 'var(--michael-accent)';
  h3.style.marginBottom = '0.5rem';
  h3.style.fontSize = '1rem';
  h3.textContent = `${bookName} ${currentChapter}:${verseNum}`;
  verseHeader.appendChild(h3);
  article.appendChild(verseHeader);

  const versesDiv = document.createElement('div');
  const allVerseTexts = selectedTranslations.map((tid, i) => {
    const chapterVerses = chaptersData[i] || [];
    const v = chapterVerses.find(cv => cv.number === verseNum);
    return v?.text || '';
  });

  selectedTranslations.forEach((translationId, idx) => {
    versesDiv.appendChild(
      buildTranslationEntry(translationId, idx, verseNum, chaptersData, allVerseTexts)
    );
  });

  article.appendChild(versesDiv);
  return article;
}

/**
 * Build the translation label + text paragraph for one translation in a verse.
 * @private
 * @param {string} translationId - Bible translation ID
 * @param {number} idx - Index into chaptersData / selectedTranslations
 * @param {number} verseNum - Verse number to look up
 * @param {Array<Array<Object>>} chaptersData - Per-translation verse arrays
 * @param {Array<string>} allVerseTexts - All verse texts for this verse number
 * @returns {HTMLElement}
 */
function buildTranslationEntry(translationId, idx, verseNum, chaptersData, allVerseTexts) {
  const bible = bibleData.bibles.find(b => b.id === translationId);
  const chapterVerses = chaptersData[idx] || [];
  const v = chapterVerses.find(cv => cv.number === verseNum);

  const translationDiv = document.createElement('div');
  translationDiv.className = 'translation-label';
  translationDiv.style.marginTop = '0.75rem';

  const strong = document.createElement('strong');
  strong.style.color = 'var(--michael-accent)';
  strong.style.fontSize = '0.75rem';
  strong.textContent = bible?.abbrev || translationId;
  translationDiv.appendChild(strong);

  const textP = document.createElement('p');
  textP.style.margin = '0.25rem 0 0 0';
  textP.style.lineHeight = '1.8';

  if (v?.text) {
    let htmlText = v.text;
    if (normalHighlightEnabled) {
      const otherTexts = allVerseTexts.filter((_, i) => i !== idx && allVerseTexts[i]);
      htmlText = highlightNormalDifferences(v.text, otherTexts);
    }
    const { parseHtmlFragment } = window.Michael.DomUtils;
    textP.appendChild(parseHtmlFragment(htmlText));
  } else {
    const em = document.createElement('em');
    em.style.color = 'var(--michael-text-muted)';
    em.textContent = 'Verse not available';
    textP.appendChild(em);
  }

  translationDiv.appendChild(textP);
  return translationDiv;
}

function buildComparisonHTML(chaptersData) {
  const fragment = document.createDocumentFragment();

  // Find first translation with verses to get verse count
  const firstVerses = chaptersData.find(verses => verses && verses.length > 0);

  if (!firstVerses) {
    const article = document.createElement('article');
    const p = document.createElement('p');
    p.style.textAlign = 'center';
    p.style.color = 'var(--michael-text-muted)';
    p.style.padding = '2rem 0';
    p.textContent = 'No verses found for this chapter.';
    article.appendChild(p);
    fragment.appendChild(article);
    return fragment;
  }

  const bookInfo = bibleData.books.find(b => b.id === currentBook);
  const bookName = bookInfo?.name || currentBook;

  fragment.appendChild(buildComparisonHeader(bookName));

  const versesToShow = currentVerse > 0
    ? firstVerses.filter(v => v.number === currentVerse)
    : firstVerses;

  versesToShow.forEach(verse => {
    fragment.appendChild(buildVerseArticle(verse, chaptersData, bookName));
  });

  return fragment;
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
  } else {
    restoreTranslationsFromLocalStorage();
  }

  // Restore reference from URL and load VVV mode
  if (refParam) {
    restoreReferenceFromURL(refParam);
  } else if (biblesParam && selectedTranslations.length > 0) {
    // Translations selected but no reference - default to Genesis 1
    setDefaultReference();
  }

  // Set defaults if no URL params (enters SSS mode by default)
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
 * Activate SSS mode UI and optionally load the comparison
 * Hides normal-mode elements, shows SSS-mode elements, and triggers a load
 * when canLoadSSSComparison() is satisfied.
 * @private
 */
function activateSSSModeUI() {
  sssMode = true;
  updateSSSModeStatus();
  if (normalModeEl) normalModeEl.classList.add('hidden');
  if (sssModeEl) sssModeEl.classList.remove('hidden');
  document.getElementById('parallel-content')?.classList.add('hidden');
  if (canLoadSSSComparison()) loadSSSComparison();
}

/**
 * Handle single Bible SSS mode (auto-select random second Bible)
 * Also populates normal mode state so switching back to VVV works
 * @private
 * @returns {boolean} True if SSS mode was entered
 */
function handleSingleBibleSSSMode(refParam) {
  if (selectedTranslations.length !== 1) return false;
  if (!refParam) return false;

  const singleBible = selectedTranslations[0];
  const otherBibles = bibleData?.bibles?.filter(b => b.id !== singleBible) || [];
  if (otherBibles.length === 0) return false;

  const ref = parseReference(refParam);
  if (!ref.book) return false;
  if (ref.chapter <= 0) return false;

  // Set up SSS mode with single Bible and random Bible
  const randomIndex = Math.floor(Math.random() * otherBibles.length);
  sssLeftBible = singleBible;
  sssRightBible = otherBibles[randomIndex].id;
  sssBook = ref.book;
  sssChapter = ref.chapter;
  sssVerse = ref.verse;

  // Also populate normal mode state for switching back to VVV
  currentBook = ref.book;
  currentChapter = ref.chapter;
  currentVerse = ref.verse;

  // Update normal mode book/chapter selectors
  if (bookSelect) {
    const bookOption = Array.from(bookSelect.options).find(opt =>
      opt.value.toLowerCase() === currentBook.toLowerCase()
    );
    if (bookOption) bookSelect.value = bookOption.value;
    populateChapterDropdown();
  }
  if (chapterSelect) chapterSelect.value = currentChapter;

  // Update SSS mode selectors
  updateSSSSelectors();

  // Enter SSS mode directly
  activateSSSModeUI();
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
    chapter: parseInt(parts[1], 10) || 0,
    verse: parseInt(parts[2], 10) || 0
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
 * Set default reference (Genesis 1) when translations are selected but no ref in URL
 * @private
 */
function setDefaultReference() {
  currentBook = 'Gen';
  currentChapter = 1;
  currentVerse = 0;

  if (bookSelect) {
    const bookOption = Array.from(bookSelect.options).find(opt =>
      opt.value.toLowerCase() === currentBook.toLowerCase()
    );
    if (bookOption) bookSelect.value = bookOption.value;
    populateChapterDropdown();
  }
  if (chapterSelect) chapterSelect.value = currentChapter;

  // Auto-load if we have valid state
  if (canLoadComparison()) {
    loadComparison().then(() => {
      populateVerseGrid();
    }).catch(error => {
      console.error('Failed to load comparison with default reference:', error);
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
 * Apply SSS default selections (Isaiah 42, DRC vs KJVA) when not already set.
 * Also resets to these defaults once per day for a fresh-start experience.
 * @private
 */
function applySSSDefaults() {
  // Reset state once per day
  const today = new Date().toDateString();
  if (localStorage.getItem('sss-last-date') !== today) {
    localStorage.setItem('sss-last-date', today);
    sssLeftBible = '';
    sssRightBible = '';
    sssBook = '';
    sssChapter = 0;
  }

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

  applySSSDefaults();

  if (canLoadSSSComparison()) {
    loadSSSComparison();
  }
}

/**
 * Exit SSS mode and return to normal comparison view
 * Restores the multi-translation comparison interface
 * Syncs SSS state to normal mode for seamless transition
 * @private
 */
function exitSSSMode() {
  sssMode = false;
  updateSSSModeStatus();
  if (normalModeEl) normalModeEl.classList.remove('hidden');
  if (sssModeEl) sssModeEl.classList.add('hidden');
  document.getElementById('parallel-content')?.classList.remove('hidden');

  // Sync SSS state to normal mode if normal mode has no selection
  if ((!currentBook || !currentChapter) && sssBook && sssChapter) {
    currentBook = sssBook;
    currentChapter = sssChapter;
    currentVerse = sssVerse;

    // Update normal mode selectors
    if (bookSelect) {
      const bookOption = Array.from(bookSelect.options).find(opt =>
        opt.value.toLowerCase() === currentBook.toLowerCase()
      );
      if (bookOption) bookSelect.value = bookOption.value;
      populateChapterDropdown();
    }
    if (chapterSelect) chapterSelect.value = currentChapter;

    // Sync selected translations from SSS Bibles if none selected
    if (selectedTranslations.length === 0) {
      if (sssLeftBible) selectedTranslations.push(sssLeftBible);
      if (sssRightBible && sssRightBible !== sssLeftBible) {
        selectedTranslations.push(sssRightBible);
      }
      translationCheckboxes.forEach(cb => {
        cb.checked = selectedTranslations.includes(cb.value);
      });
    }

    // Auto-load comparison
    if (canLoadComparison()) {
      loadComparison().then(() => {
        populateVerseGrid();
      }).catch(error => {
        console.error('Failed to load comparison after exiting SSS mode:', error);
      });
    }
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
  sssChapterSelect.replaceChildren();
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
 * Clear Strong's notes when loading a new chapter
 * @private
 */
function clearSSSStrongsNotes() {
  window.Michael?.Strongs?.clearNotes?.();
}

/**
 * Show loading indicators in both SSS panes
 * @private
 */
function showSSSLoadingIndicators() {
  if (sssLeftPane) {
    sssLeftPane.replaceChildren(window.Michael.DomUtils.createLoadingIndicator());
  }
  if (sssRightPane) {
    sssRightPane.replaceChildren(window.Michael.DomUtils.createLoadingIndicator());
  }
}

/**
 * Attempt to switch to an untried right Bible when the current one has no verses.
 * Returns true if a new Bible was selected and loadSSSComparison should be retried,
 * false if no alternatives remain and rendering should proceed with what we have.
 * @private
 * @returns {boolean}
 */
function tryAlternateSSSBible() {
  triedBiblesWithNoVerses.add(sssRightBible);

  const availableBibles = bibleData?.bibles?.filter(b =>
    b.id !== sssLeftBible && !triedBiblesWithNoVerses.has(b.id)
  ) || [];

  if (availableBibles.length === 0) return false;

  // Pick a random one from remaining options
  const randomIndex = Math.floor(Math.random() * availableBibles.length);
  sssRightBible = availableBibles[randomIndex].id;
  if (sssBibleRight) sssBibleRight.value = sssRightBible;

  return true;
}

/**
 * Render both SSS panes with the provided verse data
 * @private
 * @param {Array<Object>} leftVerses - Verses for the left pane
 * @param {Array<Object>} rightVerses - Verses for the right pane
 */
function renderSSSPanes(leftVerses, rightVerses) {
  const leftBible = bibleData.bibles.find(b => b.id === sssLeftBible);
  const rightBible = bibleData.bibles.find(b => b.id === sssRightBible);
  const bookInfo = bibleData.books.find(b => b.id === sssBook);
  const bookName = bookInfo?.name || sssBook;

  // Filter verses if specific verse selected
  const leftFiltered = sssVerse > 0 ? leftVerses?.filter(v => v.number === sssVerse) : leftVerses;
  const rightFiltered = sssVerse > 0 ? rightVerses?.filter(v => v.number === sssVerse) : rightVerses;

  if (sssLeftPane) {
    sssLeftPane.replaceChildren(buildSSSPaneHTML(leftFiltered, leftBible, bookName, rightFiltered, rightBible));
  }
  if (sssRightPane) {
    sssRightPane.replaceChildren(buildSSSPaneHTML(rightFiltered, rightBible, bookName, leftFiltered, leftBible));
  }
}

/**
 * Process footnotes for both SSS panes and update the Strong's notes row visibility
 * @private
 */
function processSSSFootnotes() {
  if (!window.Michael?.Footnotes) return;

  const leftFootnotesSection = document.getElementById('sss-left-footnotes-section');
  const leftFootnotesList = document.getElementById('sss-left-footnotes-list');
  const rightFootnotesSection = document.getElementById('sss-right-footnotes-section');
  const rightFootnotesList = document.getElementById('sss-right-footnotes-list');

  // Process left pane footnotes
  window.Michael.Footnotes.process(
    sssLeftPane, leftFootnotesSection, leftFootnotesList, 'sss-left-'
  );

  // Process right pane footnotes
  window.Michael.Footnotes.process(
    sssRightPane, rightFootnotesSection, rightFootnotesList, 'sss-right-'
  );

  // Hide Strong's notes row if no Strong's notes (footnotes are now per-pane)
  const notesRow = document.getElementById('sss-notes-row');
  if (!notesRow) return;

  // The notes row now only contains Strong's, check if it has any
  const strongsList = document.getElementById('sss-strongs-list');
  notesRow.classList.toggle('hidden', !strongsList || strongsList.children.length === 0);
}

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

  clearSSSStrongsNotes();
  showSSSLoadingIndicators();

  // Fetch both chapters
  const [leftVerses, rightVerses] = await Promise.all([
    window.Michael.BibleAPI.fetchChapter(basePath, sssLeftBible, sssBook, sssChapter),
    window.Michael.BibleAPI.fetchChapter(basePath, sssRightBible, sssBook, sssChapter)
  ]);

  // If right Bible has no verses, try to pick another one automatically
  const rightEmpty = !rightVerses || rightVerses.length === 0;
  const leftHasVerses = leftVerses && leftVerses.length > 0;
  if (rightEmpty && leftHasVerses && tryAlternateSSSBible()) {
    return loadSSSComparison();
  }

  // Reset tried Bibles set when we successfully load (for next time)
  if (rightVerses && rightVerses.length > 0) {
    triedBiblesWithNoVerses.clear();
  }

  populateSSSVerseGrid(leftVerses || rightVerses);
  renderSSSPanes(leftVerses, rightVerses);
  processSSSFootnotes();
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
/**
 * Create a fresh SSS "All verses" button and update the global reference.
 * @private
 * @param {boolean} isActive - Whether to add the 'is-active' class immediately
 * @returns {HTMLButtonElement}
 */
function buildSSSAllButton(isActive) {
  const btn = document.createElement('button');
  btn.id = 'sss-all-verses-btn';
  btn.type = 'button';
  btn.className = isActive ? 'chip is-active' : 'chip';
  btn.textContent = 'All';
  btn.addEventListener('click', handleSSSAllVersesClick);
  sssAllVersesBtn = btn;
  return btn;
}

function populateSSSVerseGrid(verses) {
  if (!verses || verses.length === 0) {
    if (sssVerseGrid) sssVerseGrid.classList.add('hidden');
    if (sssVerseButtons) {
      sssVerseButtons.replaceChildren();
      sssVerseButtons.appendChild(buildSSSAllButton(true));
    }
    return;
  }

  if (sssVerseButtons) {
    sssVerseButtons.replaceChildren();

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

    sssVerseButtons.appendChild(buildSSSAllButton(false));
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
 * Build the header element for one SSS pane.
 * Includes Bible abbreviation and optional versification-mismatch warning.
 * @private
 * @param {Object} bible - Bible metadata object
 * @param {Object} compareBible - Bible metadata for the other pane
 * @returns {HTMLElement}
 */
function buildSSSPaneHeader(bible, compareBible) {
  const paneHeader = document.createElement('header');
  paneHeader.className = 'translation-label';
  paneHeader.style.textAlign = 'center';
  paneHeader.style.paddingBottom = '0.5rem';

  const strong = document.createElement('strong');
  strong.textContent = bible?.abbrev || 'Unknown';
  paneHeader.appendChild(strong);

  // Check for versification mismatch (e.g., Masoretic vs Septuagint)
  const hasVersificationMismatch = compareBible && bible?.versification &&
    compareBible?.versification && bible.versification !== compareBible.versification;
  if (hasVersificationMismatch) {
    const small = document.createElement('small');
    small.style.color = 'var(--michael-text-muted)';
    small.style.display = 'block';
    small.style.fontSize = '0.7rem';
    small.textContent = `${bible.versification} versification`;
    paneHeader.appendChild(small);
  }

  return paneHeader;
}

/**
 * Build a single verse row element for an SSS pane.
 * @private
 * @param {Object} verse - Verse object with .number and .text
 * @param {Array<Object>} compareVerses - Verses from the other pane for diff highlighting
 * @returns {HTMLElement}
 */
function buildSSSVerseRow(verse, compareVerses) {
  const compareVerse = compareVerses?.find(v => v.number === verse.number);
  const highlightedText = highlightDifferences(verse.text, compareVerse?.text);

  const verseDiv = document.createElement('div');
  verseDiv.className = 'parallel-verse';

  const numSpan = document.createElement('span');
  numSpan.className = 'parallel-verse-num';
  numSpan.textContent = verse.number;
  verseDiv.appendChild(numSpan);

  // Add space between verse number and text
  verseDiv.appendChild(document.createTextNode(' '));

  const textSpan = document.createElement('span');
  // Parse trusted Bible HTML using DOMParser via shared utility
  const { parseHtmlFragment } = window.Michael.DomUtils;
  textSpan.appendChild(parseHtmlFragment(highlightedText));
  verseDiv.appendChild(textSpan);

  return verseDiv;
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
 * @returns {DocumentFragment}
 */
function buildSSSPaneHTML(verses, bible, bookName, compareVerses, compareBible) {
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

  fragment.appendChild(buildSSSPaneHeader(bible, compareBible));

  verses.forEach(verse => {
    fragment.appendChild(buildSSSVerseRow(verse, compareVerses));
  });

  return fragment;
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

// -- Shared helpers for diff highlighting --

/** Regex matching <note ...>...</note> elements (shared constant). */
const DIFF_NOTE_REGEX = /<note[^>]*>[\s\S]*?<\/note>/gi;

/**
 * Strip navigation/UI elements that shouldn't appear in verse text
 * @private
 * @param {string} html - HTML string to clean
 * @returns {string} HTML with UI elements removed
 */
function stripUIElements(html) {
  return html
    .replace(/<select[^>]*>[\s\S]*?<\/select>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/<label[^>]*>[\s\S]*?<\/label>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
}

/**
 * Strip all HTML/OSIS markup tags from a string, collapsing whitespace.
 * @private
 * @param {string} str
 * @returns {string}
 */
function stripAllMarkup(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Lowercase a word and strip leading/trailing punctuation for comparison.
 * @private
 * @param {string} word
 * @returns {string}
 */
function normalizeWord(word) {
  return word.toLowerCase().replace(/[.,;:!?'"]/g, '');
}

/**
 * Build a Set of normalized words from a cleaned (markup-stripped) text string.
 * @private
 * @param {string} cleanText - Markup-free text.
 * @returns {Set<string>}
 */
function collectNormalizedWords(cleanText) {
  const wordSet = new Set();
  cleanText.toLowerCase().split(/\s+/).forEach(w => {
    wordSet.add(w.replace(/[.,;:!?'"]/g, ''));
  });
  return wordSet;
}

/**
 * Find normalized words in cleanText that are absent from referenceWordSet.
 * @private
 * @param {string} cleanText - Markup-free text to scan.
 * @param {Set<string>} referenceWordSet - Words to compare against.
 * @returns {Set<string>} Normalized words that differ.
 */
function findDiffWords(cleanText, referenceWordSet) {
  const diffWords = new Set();
  cleanText.split(/\s+/).filter(w => w.length > 0).forEach(word => {
    const clean = normalizeWord(word);
    if (clean.length > 0 && !referenceWordSet.has(clean)) {
      diffWords.add(clean);
    }
  });
  return diffWords;
}

/**
 * Wrap each word token in textWithoutNotes with a diff-insert span when it
 * appears in diffWordsLower; HTML tags are passed through unchanged.
 * @private
 * @param {string} textWithoutNotes - Source text (notes already removed).
 * @param {Set<string>} diffWordsLower - Normalized words to highlight.
 * @returns {string}
 */
function applyDiffSpans(textWithoutNotes, diffWordsLower) {
  return textWithoutNotes.replace(
    /(<[^>]+>)|([^<\s]+)/g,
    (match, tag, word) => {
      if (tag) return tag;
      const clean = normalizeWord(word);
      if (word && diffWordsLower.has(clean)) {
        return `<span class="diff-insert">${escapeHtml(word)}</span>`;
      }
      return match;
    }
  );
}

/**
 * Highlight differences for normal mode (VVV - vertical verse view)
 * Uses TextCompare engine with Strong's awareness for categorized diffs
 * Compares against the first available other translation for pairwise diff
 * @private
 * @param {string} text - The text to highlight
 * @param {Array<string>} otherTexts - Array of other translation texts to compare against
 * @returns {string} HTML string with highlighted differences
 */
function highlightNormalDifferences(text, otherTexts) {
  // If highlighting disabled or no other texts to compare, return original text unchanged
  if (!normalHighlightEnabled || otherTexts.length === 0) return text;

  // Find first non-empty comparison text
  const compareText = otherTexts.find(t => t && t.trim());
  if (!compareText) return text;

  // Use TextCompare engine with Strong's awareness if available
  if (window.TextCompare?.compareTextsWithStrongs) {
    return highlightWithTextCompare(text, compareText);
  }

  // Fallback: simple word-based diff highlighting
  const notes = text.match(DIFF_NOTE_REGEX) || [];
  const textWithoutNotes = text.replace(DIFF_NOTE_REGEX, '');

  // Build a unified word set from all other translations
  const otherWords = new Set();
  otherTexts.forEach(t => {
    if (!t) return;
    const clean = stripAllMarkup(t.replace(DIFF_NOTE_REGEX, ''));
    collectNormalizedWords(clean).forEach(w => otherWords.add(w));
  });

  const diffWordsLower = findDiffWords(stripAllMarkup(textWithoutNotes), otherWords);

  // If no differences, return original text unchanged
  if (diffWordsLower.size === 0) return text;

  // Append notes at the end (CSS will hide them, footnotes.js processes them)
  return applyDiffSpans(textWithoutNotes, diffWordsLower) + notes.join('');
}

/**
 * Highlight differences between two texts (SSS mode)
 * Uses TextCompare engine with Strong's awareness for categorized diffs
 * Falls back to simple word matching if TextCompare is unavailable
 * @private
 * @param {string} text - The text to highlight
 * @param {string} compareText - The text to compare against
 * @returns {string} HTML string with highlighted differences
 */
function highlightDifferences(text, compareText) {
  // If highlighting disabled or no comparison text, return original text unchanged
  // CSS will hide any <note> elements automatically
  if (!sssHighlightEnabled || !compareText) return text;

  // Use TextCompare engine with Strong's awareness if available
  if (window.TextCompare?.compareTextsWithStrongs) {
    return highlightWithTextCompare(text, compareText);
  }

  // Fallback: simple word-based diff highlighting
  // Extract <note> elements to preserve them (CSS hides them, footnotes.js processes them)
  const notes = text.match(DIFF_NOTE_REGEX) || [];
  const textWithoutNotes = text.replace(DIFF_NOTE_REGEX, '');
  const compareWithoutNotes = compareText.replace(DIFF_NOTE_REGEX, '');

  // Build word set from comparison text, then find words unique to our text
  const compareWords = collectNormalizedWords(stripAllMarkup(compareWithoutNotes));
  const diffWordsLower = findDiffWords(stripAllMarkup(textWithoutNotes), compareWords);

  // If no differences, return original text unchanged
  if (diffWordsLower.size === 0) return text;

  // Append notes at the end (CSS will hide them, footnotes.js processes them)
  return applyDiffSpans(textWithoutNotes, diffWordsLower) + notes.join('');
}

/**
 * Use TextCompare engine for sophisticated diff highlighting
 * Leverages the TextCompare library for categorized difference detection
 * with Strong's number awareness for better classification.
 *
 * Preserves original HTML structure (including <w> tags) while adding
 * diff highlighting spans around differing words.
 *
 * @private
 * @param {string} text - The primary text/HTML to highlight (may contain <w> tags)
 * @param {string} compareText - The text/HTML to compare against
 * @returns {string} HTML string with categorized highlights
 */
function highlightWithTextCompare(text, compareText) {
  const TC = window.TextCompare;

  // Strip any navigation/UI elements that might have been included (defensive)
  const cleanText = stripUIElements(text);
  const cleanCompareText = stripUIElements(compareText);

  // Extract <note> elements to preserve them (CSS hides them, footnotes.js processes them)
  const notes = cleanText.match(DIFF_NOTE_REGEX) || [];
  const textWithoutNotes = cleanText.replace(DIFF_NOTE_REGEX, '');
  const compareWithoutNotes = cleanCompareText.replace(DIFF_NOTE_REGEX, '');

  // Use Strong's-aware comparison to get classified diffs
  const result = TC.compareTextsWithStrongs(textWithoutNotes, compareWithoutNotes);

  if (result.diffs.length === 0) {
    // No differences - return original text unchanged
    return text;
  }

  // Build a map of normalized words to their diff categories
  // This allows us to highlight words in the original HTML while preserving structure
  const diffWordCategories = new Map();
  for (const diff of result.diffs) {
    if (diff.aToken && diff.aToken.type === 'WORD') {
      const normalized = diff.aToken.normalized;
      // Use the most severe category if a word appears multiple times
      const existing = diffWordCategories.get(normalized);
      if (!existing || getCategorySeverity(diff.category) > getCategorySeverity(existing)) {
        diffWordCategories.set(normalized, diff.category);
      }
    }
  }

  // If no word differences, return original
  if (diffWordCategories.size === 0) return text;

  // Apply diff spans to words in the original HTML, preserving structure
  const highlighted = applyCategorizeDiffSpans(textWithoutNotes, diffWordCategories);

  // Append notes at the end (CSS will hide them, footnotes.js processes them)
  return highlighted + notes.join('');
}

/**
 * Get severity ranking for diff categories (higher = more severe)
 * @private
 */
function getCategorySeverity(category) {
  const severities = { typo: 1, punct: 2, spelling: 3, subst: 4, add: 5, omit: 5 };
  return severities[category] || 0;
}

/**
 * Apply categorized diff spans to words in HTML while preserving structure
 * @private
 * @param {string} html - Original HTML with <w> tags etc.
 * @param {Map<string, string>} diffWordCategories - Map of normalized word to category
 * @returns {string} HTML with diff spans added
 */
function applyCategorizeDiffSpans(html, diffWordCategories) {
  // Match either HTML tags or word tokens
  return html.replace(
    /(<[^>]+>)|([^<\s]+)/g,
    (match, tag, word) => {
      // Pass through HTML tags unchanged
      if (tag) return tag;
      if (!word) return match;

      // Normalize the word for lookup
      const normalized = word.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,;:!?'"]/g, '');

      const category = diffWordCategories.get(normalized);
      if (category) {
        // Wrap in appropriate diff span
        return `<span class="diff-${category}">${word}</span>`;
      }
      return match;
    }
  );
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
