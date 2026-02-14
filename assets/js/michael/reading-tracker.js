/**
 * Michael Reading Tracker
 *
 * Tracks and persists reading progress using IndexedDB.
 * Features:
 * - Auto-saves scroll position on chapter pages
 * - Tracks reading streaks
 * - Provides "Continue Reading" functionality
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */
/* eslint-disable no-unused-vars */

'use strict';

/**
 * Timing and duration constants
 */
const TIMING = {
  SCROLL_SAVE_DEBOUNCE: 500,       // Delay before saving scroll position (ms)
  SCROLL_RESTORE_WINDOW: 24,       // Hours within which to restore scroll position
  MILLISECONDS_PER_DAY: 86400000   // Milliseconds in 24 hours (for streak calculation)
};

// Debounce timer for scroll saving
let scrollDebounceTimer = null;

// Current page info
let currentPage = null;

// Event handlers for cleanup
let scrollHandler = null;
let beforeUnloadHandler = null;

/**
 * Initializes the reading tracker.
 *
 * Automatically detects if on a chapter page and sets up tracking.
 *
 * @returns {Promise<void>}
 */
async function init() {
  // Check if UserStorage is available
  if (!window.Michael?.UserStorage?.isSupported()) {
    return;
  }

  // Initialize storage
  await window.Michael.UserStorage.init();

  // Parse current page info
  currentPage = parseCurrentPage();

  if (currentPage && currentPage.type === 'chapter') {
    // We're on a chapter page - set up tracking
    setupChapterTracking();

    // Save initial progress
    await saveCurrentProgress();

    // Restore scroll position if returning to this chapter
    await restoreScrollPosition();
  }

  // Update reading streak
  await updateReadingStreak();

  // Set up "Continue Reading" buttons
  setupContinueReading();
}

/**
 * Parses the current page URL to extract Bible, book, and chapter info.
 *
 * @private
 * @returns {{type: string, bibleId: string, bookId?: string, chapter?: number}|null}
 */
function parseCurrentPage() {
    const path = window.location.pathname;

    // Chapter page: /bible/{bibleId}/{bookId}/{chapter}/
    const chapterMatch = path.match(/^\/bible\/([^/]+)\/([^/]+)\/(\d+)\/?$/);
    if (chapterMatch) {
      return {
        type: 'chapter',
        bibleId: chapterMatch[1],
        bookId: chapterMatch[2],
        chapter: parseInt(chapterMatch[3], 10)
      };
    }

    // Book page: /bible/{bibleId}/{bookId}/
    const bookMatch = path.match(/^\/bible\/([^/]+)\/([^/]+)\/?$/);
    if (bookMatch) {
      return {
        type: 'book',
        bibleId: bookMatch[1],
        bookId: bookMatch[2]
      };
    }

    // Bible page: /bible/{bibleId}/
    const bibleMatch = path.match(/^\/bible\/([^/]+)\/?$/);
    if (bibleMatch) {
      return {
        type: 'bible',
        bibleId: bibleMatch[1]
      };
    }

    // Bible list page: /bible/
    if (path === '/bible/' || path === '/bible') {
      return {
        type: 'list'
      };
    }

    return null;
  }

/**
 * Sets up scroll tracking for chapter pages.
 *
 * @private
 */
function setupChapterTracking() {
    // Save scroll position with debounce
    scrollHandler = () => {
      if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer);
      }

      scrollDebounceTimer = setTimeout(async () => {
        await saveCurrentProgress();
      }, TIMING.SCROLL_SAVE_DEBOUNCE);
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    // Save progress when leaving the page
    beforeUnloadHandler = () => {
      // Use synchronous storage as a fallback
      if (currentPage) {
        const progressKey = `michael-progress-${currentPage.bibleId}`;
        const data = {
          bibleId: currentPage.bibleId,
          bookId: currentPage.bookId,
          chapter: currentPage.chapter,
          scrollPos: window.scrollY,
          lastRead: Date.now()
        };
        try {
          localStorage.setItem(progressKey, JSON.stringify(data));
        } catch (e) {
          // Storage full or unavailable
        }
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }

/**
 * Saves current reading progress.
 *
 * @private
 * @returns {Promise<void>}
 */
async function saveCurrentProgress() {
    if (!currentPage || currentPage.type !== 'chapter') {
      return;
    }

    try {
      await window.Michael.UserStorage.saveProgress(
        currentPage.bibleId,
        currentPage.bookId,
        currentPage.chapter,
        window.scrollY
      );
    } catch (error) {
      console.warn('[ReadingTracker] Failed to save progress:', error);
    }
  }

/**
 * Checks if progress matches the current chapter.
 *
 * @private
 * @param {Object} progress - Progress data
 * @returns {boolean} True if progress matches current chapter
 */
function isProgressMatchingCurrentChapter(progress) {
  return progress &&
         progress.bookId === currentPage.bookId &&
         progress.chapter === currentPage.chapter &&
         progress.scrollPos > 0;
}

/**
 * Checks if the last read time is within the restore window.
 *
 * @private
 * @param {number} lastRead - Timestamp of last read
 * @returns {boolean} True if within restore window
 */
function isWithinRestoreWindow(lastRead) {
  const hoursSinceLastRead = (Date.now() - lastRead) / (1000 * 60 * 60);
  return hoursSinceLastRead < TIMING.SCROLL_RESTORE_WINDOW;
}

/**
 * Performs the scroll restoration to the saved position.
 *
 * @private
 * @param {number} scrollPos - Scroll position to restore
 */
function performScrollRestore(scrollPos) {
  requestAnimationFrame(() => {
    window.scrollTo({
      top: scrollPos,
      behavior: 'instant'
    });
  });
}

/**
 * Restores scroll position when returning to a chapter.
 *
 * @private
 * @returns {Promise<void>}
 */
async function restoreScrollPosition() {
    if (!currentPage || currentPage.type !== 'chapter') {
      return;
    }

    try {
      const progress = await window.Michael.UserStorage.getProgress(currentPage.bibleId);

      if (isProgressMatchingCurrentChapter(progress) && isWithinRestoreWindow(progress.lastRead)) {
        performScrollRestore(progress.scrollPos);
      }
    } catch (error) {
      console.warn('[ReadingTracker] Failed to restore scroll position:', error);
    }
  }

/**
 * Updates the reading streak.
 *
 * @private
 * @returns {Promise<void>}
 */
async function updateReadingStreak() {
    if (!currentPage || currentPage.type !== 'chapter') {
      return;
    }

    try {
      const UserStorage = window.Michael.UserStorage;

      // Get current streak data
      const streakData = await UserStorage.getSetting('readingStreak', {
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null
      });

      const today = new Date().toDateString();
      const lastReadDate = streakData.lastReadDate;

      if (lastReadDate !== today) {
        // Check if this is a consecutive day
        const yesterday = new Date(Date.now() - TIMING.MILLISECONDS_PER_DAY).toDateString();

        if (lastReadDate === yesterday) {
          // Consecutive day - increment streak
          streakData.currentStreak++;
        } else if (lastReadDate !== today) {
          // Streak broken - reset to 1
          streakData.currentStreak = 1;
        }

        // Update longest streak
        if (streakData.currentStreak > streakData.longestStreak) {
          streakData.longestStreak = streakData.currentStreak;
        }

        // Update last read date
        streakData.lastReadDate = today;

        await UserStorage.setSetting('readingStreak', streakData);
      }
    } catch (error) {
      console.warn('[ReadingTracker] Failed to update streak:', error);
    }
  }

/**
 * Sets up "Continue Reading" functionality.
 *
 * @private
 */
function setupContinueReading() {
    const continueButtons = document.querySelectorAll('[data-continue-reading]');

    continueButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        await navigateToContinueReading();
      });
    });

    // Also populate any "Continue Reading" displays
    populateContinueReadingDisplay();
  }

/**
 * Populates "Continue Reading" display elements.
 *
 * @private
 */
async function populateContinueReadingDisplay() {
    const displays = document.querySelectorAll('[data-continue-reading-display]');
    if (displays.length === 0) {
      return;
    }

    try {
      const lastRead = await window.Michael.UserStorage.getLastRead();

      if (lastRead) {
        const url = `/bible/${lastRead.bibleId}/${lastRead.bookId}/${lastRead.chapter}/`;
        const displayText = `${formatBookName(lastRead.bookId)} ${lastRead.chapter}`;

        displays.forEach(display => {
          const link = display.querySelector('a') || display;
          if (link.tagName === 'A') {
            link.href = url;
            link.textContent = displayText;
          } else {
            // Use DOM methods to safely create link element
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.textContent = displayText;
            display.innerHTML = '';
            display.appendChild(anchor);
          }
          display.classList.remove('hidden');
        });
      }
    } catch (error) {
      console.warn('[ReadingTracker] Failed to populate continue reading:', error);
    }
  }

/**
 * Navigates to the last read location.
 *
 * @returns {Promise<void>}
 */
async function navigateToContinueReading() {
    try {
      const lastRead = await window.Michael.UserStorage.getLastRead();

      if (lastRead) {
        window.location.href = `/bible/${lastRead.bibleId}/${lastRead.bookId}/${lastRead.chapter}/`;
      } else {
        // No reading history - go to Bible list
        window.location.href = '/bible/';
      }
    } catch (error) {
      console.warn('[ReadingTracker] Failed to navigate:', error);
      window.location.href = '/bible/';
    }
  }

/**
 * Formats a book ID into a display name.
 *
 * @private
 * @param {string} bookId - Book ID (e.g., "gen", "matt")
 * @returns {string} Formatted name
 */
function formatBookName(bookId) {
    const bookNames = {
      'gen': 'Genesis', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers',
      'deut': 'Deuteronomy', 'josh': 'Joshua', 'judg': 'Judges', 'ruth': 'Ruth',
      '1sam': '1 Samuel', '2sam': '2 Samuel', '1kgs': '1 Kings', '2kgs': '2 Kings',
      '1chr': '1 Chronicles', '2chr': '2 Chronicles', 'ezra': 'Ezra', 'neh': 'Nehemiah',
      'esth': 'Esther', 'job': 'Job', 'ps': 'Psalm', 'prov': 'Proverbs',
      'eccl': 'Ecclesiastes', 'song': 'Song of Solomon', 'isa': 'Isaiah',
      'jer': 'Jeremiah', 'lam': 'Lamentations', 'ezek': 'Ezekiel', 'dan': 'Daniel',
      'hos': 'Hosea', 'joel': 'Joel', 'amos': 'Amos', 'obad': 'Obadiah',
      'jonah': 'Jonah', 'mic': 'Micah', 'nah': 'Nahum', 'hab': 'Habakkuk',
      'zeph': 'Zephaniah', 'hag': 'Haggai', 'zech': 'Zechariah', 'mal': 'Malachi',
      'matt': 'Matthew', 'mark': 'Mark', 'luke': 'Luke', 'john': 'John',
      'acts': 'Acts', 'rom': 'Romans', '1cor': '1 Corinthians', '2cor': '2 Corinthians',
      'gal': 'Galatians', 'eph': 'Ephesians', 'phil': 'Philippians', 'col': 'Colossians',
      '1thess': '1 Thessalonians', '2thess': '2 Thessalonians', '1tim': '1 Timothy',
      '2tim': '2 Timothy', 'titus': 'Titus', 'philem': 'Philemon', 'heb': 'Hebrews',
      'jas': 'James', '1pet': '1 Peter', '2pet': '2 Peter', '1john': '1 John',
      '2john': '2 John', '3john': '3 John', 'jude': 'Jude', 'rev': 'Revelation'
    };

    return bookNames[bookId.toLowerCase()] || bookId;
  }

/**
 * Gets the current reading streak information.
 *
 * @returns {Promise<{currentStreak: number, longestStreak: number, lastReadDate: string|null}>}
 */
async function getStreakInfo() {
    try {
      return await window.Michael.UserStorage.getSetting('readingStreak', {
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null
      });
    } catch (error) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null
      };
    }
  }

/**
 * Gets the last read location.
 *
 * @returns {Promise<{bibleId: string, bookId: string, chapter: number, scrollPos: number, lastRead: number}|null>}
 */
async function getLastRead() {
    try {
      return await window.Michael.UserStorage.getLastRead();
    } catch (error) {
      return null;
    }
  }

/**
 * Cleanup event listeners
 */
function cleanup() {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
  }
  if (scrollDebounceTimer) {
    clearTimeout(scrollDebounceTimer);
    scrollDebounceTimer = null;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ES6 exports
export {
  init,
  getStreakInfo,
  getLastRead,
  navigateToContinueReading,
  cleanup
};

// Backwards compatibility: expose on window.Michael
window.Michael = window.Michael || {};
window.Michael.ReadingTracker = {
  init,
  getStreakInfo,
  getLastRead,
  navigateToContinueReading,
  cleanup
};

// Register cleanup handler
if (window.Michael && typeof window.Michael.addCleanup === 'function') {
  window.Michael.addCleanup(cleanup);
}
