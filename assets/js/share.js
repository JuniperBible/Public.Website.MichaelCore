/**
 * @file share.js - Social sharing functionality for Michael Bible Module
 * @description Manages verse and chapter sharing to social platforms
 *              with clipboard fallback for offline use.
 * @requires michael/share-menu.js
 * @requires michael/dom-utils.js
 * @version 2.0.0
 * @copyright 2025, Focus with Justin
 *
 * @overview
 * This module provides comprehensive sharing functionality for Bible content:
 *
 * SHARING FLOW:
 * 1. User clicks share button on verse or chapter
 * 2. Share menu appears anchored to the button
 * 3. User selects platform (Twitter/X, Facebook) or copy option
 * 4. Content is shared or copied with proper formatting
 *
 * URL CONSTRUCTION:
 * - Chapter URLs: Use current page URL
 * - Verse URLs: Append ?v=<verse_number> query parameter
 * - Verse text includes reference (e.g., "Genesis 1:1 - In the beginning...")
 *
 * VERSE REFERENCE FORMATTING:
 * - Format: "{Book Chapter}:{Verse} - {Text}"
 * - Example: "Genesis 1:1 - In the beginning God created..."
 *
 * ACCESSIBILITY:
 * - All buttons have aria-label attributes
 * - Share buttons use semantic button elements
 * - Visual feedback provided for copy operations
 * - Keyboard navigation supported through ShareMenu
 * - Screen reader friendly with descriptive labels
 */
(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * UI text strings for share functionality
   * @const {Object.<string, string>}
   * @property {string} share - Generic share button text
   * @property {string} copied - Success message after copy
   * @property {string} copyFailed - Error message for copy failure
   * @property {string} shareVerse - Label for verse share button
   * @property {string} copyLink - Label for copy link option
   * @property {string} copyText - Label for copy text option
   * @property {string} shareTwitter - Label for X/Twitter share option
   * @property {string} shareFacebook - Label for Facebook share option
   * @property {string} offlineCopied - Message when content copied offline
   * @property {string} onlineNotice - Message when connection restored
   * @property {string} offlineNotice - Message when connection lost
   */
  const UI = {
    share: 'Share',
    copied: 'Copied!',
    copyFailed: 'Copy failed',
    shareVerse: 'Share verse',
    copyLink: 'Copy link',
    copyText: 'Copy text',
    shareTwitter: 'Share on X',
    shareFacebook: 'Share on Facebook',
    offlineCopied: 'Copied to clipboard! Share when you\'re back online.',
    onlineNotice: 'You\'re back online! Social sharing is available.',
    offlineNotice: 'You\'re offline. Social sharing is unavailable.'
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Check if the browser is currently online
   * @returns {boolean} True if online, false otherwise
   */
  function isOnline() {
    return navigator.onLine !== false;
  }

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  function showToast(message, duration = 3000) {
    // Remove any existing toast
    const existingToast = document.querySelector('.share-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('share-toast--visible');
      });
    });

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('share-toast--visible');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  /**
   * Format verse text for offline sharing
   * @param {string} verseNum - Verse number
   * @returns {string} Formatted text for clipboard
   */
  function formatOfflineShareText(verseNum) {
    const title = document.querySelector('article header h1')?.textContent || '';
    const verseText = getVerseText(verseNum);

    // Extract just the verse content without the reference prefix
    const parts = verseText.split(' - ');
    const content = parts.length > 1 ? parts.slice(1).join(' - ') : verseText;

    // Get translation name from page if available
    const translationEl = document.querySelector('[data-translation]');
    const translation = translationEl
      ? translationEl.getAttribute('data-translation')
      : 'Translation';

    return `${title}:${verseNum} - ${translation}\n\n${content}\n\nShared from Michael Bible Module`;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize share functionality on chapter pages
   * @description Sets up verse-level and chapter-level sharing buttons.
   *              Only initializes if .bible-text container is present.
   *              Also sets up network status listeners for offline support.
   * @returns {void}
   */
  function init() {
    const bibleText = document.querySelector('.bible-text');
    if (!bibleText) return;

    // Add share buttons to each verse
    addVerseShareButtons(bibleText);

    // Add chapter share button
    addChapterShareButton();

    // Setup online/offline event listeners
    setupNetworkListeners();
  }

  /**
   * Setup listeners for online/offline events
   */
  function setupNetworkListeners() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  /**
   * Handle coming online
   */
  function handleOnline() {
    showToast(UI.onlineNotice);

    // Update menus if they're initialized
    if (chapterMenu) {
      chapterMenu.setOfflineMode(false);
    }
    if (verseMenu) {
      verseMenu.setOfflineMode(false);
    }
  }

  /**
   * Handle going offline
   */
  function handleOffline() {
    showToast(UI.offlineNotice, 4000);

    // Update menus if they're initialized
    if (chapterMenu) {
      chapterMenu.setOfflineMode(true);
    }
    if (verseMenu) {
      verseMenu.setOfflineMode(true);
    }
  }

  // ============================================================================
  // UI BUTTON CREATION
  // ============================================================================

  /**
   * Add share buttons next to verse numbers
   * @description Creates and inserts share buttons after each verse number.
   *              Only processes <strong> elements containing numeric verse numbers.
   *              Each button shows a share icon and triggers the verse share menu.
   * @param {HTMLElement} container - The .bible-text container element
   * @returns {void}
   * @fires click - Opens share menu when share button is clicked
   */
  function addVerseShareButtons(container) {
    // Modern format: <span class="verse" data-verse="N"><sup>N</sup> text</span>
    const verseSpans = container.querySelectorAll('.verse[data-verse]');

    if (verseSpans.length > 0) {
      verseSpans.forEach(span => {
        const num = span.dataset.verse;
        const sup = span.querySelector('sup');
        if (!sup) return;

        const btn = document.createElement('button');
        btn.className = 'verse-share-btn';
        btn.setAttribute('aria-label', `${UI.shareVerse} ${num}`);
        btn.setAttribute('title', `${UI.shareVerse} ${num}`);
        btn.setAttribute('data-verse', num);
        btn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
        </svg>`;

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showShareMenu(btn, num);
        });

        sup.parentNode.insertBefore(btn, sup.nextSibling);
      });
      return;
    }

    // Legacy fallback: <strong>N</strong> format
    const verses = container.querySelectorAll('strong');

    verses.forEach(verseNum => {
      const num = verseNum.textContent.trim();
      if (!/^\d+$/.test(num)) return;

      const btn = document.createElement('button');
      btn.className = 'verse-share-btn';
      btn.setAttribute('aria-label', `${UI.shareVerse} ${num}`);
      btn.setAttribute('title', `${UI.shareVerse} ${num}`);
      btn.setAttribute('data-verse', num);
      btn.innerHTML = `<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
      </svg>`;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showShareMenu(btn, num);
      });

      verseNum.parentNode.insertBefore(btn, verseNum.nextSibling);
    });
  }

  /**
   * Add share button to the chapter header
   * @description Creates a chapter-level share button in the article header.
   *              Positioned after .actions div if present, or appended to header.
   *              Uses larger icon (16px) than verse buttons (12px).
   * @returns {void}
   * @fires click - Opens chapter share menu when button is clicked
   */
  function addChapterShareButton() {
    const header = document.querySelector('article header');
    if (!header) return;

    // Append to .actions div if it exists, otherwise to header
    const actionsDiv = header.querySelector('.actions');

    const btn = document.createElement('button');
    // Chapter share button includes icon + text label
    btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style="display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
    </svg> ${UI.share}`;
    btn.setAttribute('aria-label', 'Share this chapter');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showChapterShareMenu(btn);
    });

    // Create a wrapper div for the share button to appear below tags
    const shareWrapper = document.createElement('div');
    shareWrapper.className = 'share-wrapper';
    shareWrapper.appendChild(btn);

    if (actionsDiv) {
      // Insert after the actions div (tags, breadcrumbs, etc.)
      actionsDiv.after(shareWrapper);
    } else {
      header.appendChild(shareWrapper);
    }
  }

  // ============================================================================
  // SHARE MENU MANAGEMENT
  // ============================================================================

  /**
   * Chapter share menu instance
   * @type {Michael.ShareMenu}
   * @description Configured for chapter-level sharing (no text copy option)
   */
  const chapterMenu = new window.Michael.ShareMenu({
    includeTextCopy: false, // Chapters are too long to copy as text
    offline: !isOnline(),
    getShareUrl: () => window.location.href,
    getShareTitle: () => document.querySelector('article header h1')?.textContent || document.title
  });

  /**
   * Show share menu for the chapter
   * @description Displays the chapter share menu anchored to the provided button.
   *              Menu includes platform sharing and link copying options.
   * @param {HTMLElement} anchorBtn - Button element to anchor the share menu to
   * @returns {void}
   */
  function showChapterShareMenu(anchorBtn) {
    chapterMenu.show(anchorBtn);
  }

  /**
   * Currently selected verse number for verse menu callbacks
   * @type {string|null}
   * @description Stores the verse number when a verse share button is clicked.
   *              Used by getVerseUrl() and getVerseText() callbacks.
   */
  let currentVerseNum = null;

  /**
   * Verse share menu instance
   * @type {Michael.ShareMenu}
   * @description Configured for verse-level sharing (includes text copy option)
   */
  const verseMenu = new window.Michael.ShareMenu({
    includeTextCopy: true, // Verses are short enough to copy as formatted text
    offline: !isOnline(),
    getShareUrl: () => getVerseUrl(currentVerseNum),
    getShareText: () => getVerseText(currentVerseNum),
    getOfflineText: () => formatOfflineShareText(currentVerseNum),
    getShareTitle: () => document.querySelector('article header h1')?.textContent || document.title,
    onOfflineCopy: () => showToast(UI.offlineCopied)
  });

  /**
   * Show share menu for a specific verse
   * @description Updates currentVerseNum and displays the verse share menu
   *              anchored to the provided button. Menu includes platform sharing,
   *              link copying, and text copying options.
   * @param {HTMLElement} anchorBtn - Button element to anchor the share menu to
   * @param {string} verseNum - Verse number (e.g., "1", "12")
   * @returns {void}
   */
  function showShareMenu(anchorBtn, verseNum) {
    currentVerseNum = verseNum;
    verseMenu.show(anchorBtn);
  }

  // ============================================================================
  // URL GENERATION
  // ============================================================================

  /**
   * Generate URL for a specific verse
   * @description Creates a shareable URL by adding ?v=<verseNum> query parameter
   *              to the current page URL. Preserves existing query parameters.
   * @param {string} verseNum - Verse number (e.g., "1", "12")
   * @returns {string} Full URL with verse parameter (e.g., "https://example.com/genesis/1/?v=3")
   * @example
   * getVerseUrl("1") // "https://example.com/genesis/1/?v=1"
   * getVerseUrl("12") // "https://example.com/genesis/1/?v=12"
   */
  function getVerseUrl(verseNum) {
    const url = new URL(window.location.href);
    url.searchParams.set('v', verseNum); // Add or update ?v= parameter
    return url.toString();
  }

  // ============================================================================
  // TEXT EXTRACTION
  // ============================================================================

  /**
   * Get the text of a specific verse
   * @description Extracts verse text by finding the verse number element and
   *              collecting all text nodes until the next verse number.
   *              Skips share buttons and other UI elements.
   *              Returns formatted text with reference prefix.
   * @param {string} verseNum - Verse number to extract (e.g., "1", "12")
   * @returns {string} Formatted verse text with reference
   *                   Format: "{Book Chapter}:{Verse} - {Text}"
   *                   Example: "Genesis 1:1 - In the beginning God created..."
   *                   Returns empty string if verse not found
   */
  function getVerseText(verseNum) {
    const bibleText = document.querySelector('.bible-text');
    if (!bibleText) return '';

    const title = document.querySelector('article header h1')?.textContent || '';

    // Modern format: <span class="verse" data-verse="N">
    const verseSpan = bibleText.querySelector(`.verse[data-verse="${verseNum}"]`);
    if (verseSpan) {
      let text = '';
      verseSpan.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE &&
                   node.tagName !== 'SUP' &&
                   !node.classList.contains('verse-share-btn')) {
          text += node.textContent;
        }
      });
      return `${title}:${verseNum} - ${text.trim()}`;
    }

    // Legacy fallback: <strong>N</strong> format
    const verses = bibleText.querySelectorAll('strong');
    let verseEl = null;
    for (const v of verses) {
      if (v.textContent.trim() === verseNum) {
        verseEl = v;
        break;
      }
    }

    if (!verseEl) return '';

    let text = '';
    let node = verseEl.nextSibling;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeName === 'STRONG') {
        break;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (!node.classList.contains('verse-share-btn')) {
          text += node.textContent;
        }
      }
      node = node.nextSibling;
    }

    return `${title}:${verseNum} - ${text.trim()}`;
  }

  // ============================================================================
  // LEGACY SHARE FUNCTION
  // ============================================================================

  /**
   * Share the entire chapter
   * @description Legacy function that provides native share dialog or clipboard
   *              fallback. Note: This function is not currently called by the
   *              module (ShareMenu handles sharing), but kept for compatibility.
   * @async
   * @param {HTMLElement|null} feedbackEl - Optional element to show visual feedback on
   * @returns {Promise<void>}
   *
   * PLATFORM BEHAVIOR:
   * - Modern browsers with navigator.share: Opens native share sheet
   * - Fallback: Copies URL to clipboard with visual confirmation
   *
   * VISUAL FEEDBACK:
   * - Shows checkmark icon and "Copied!" text for 2 seconds
   * - Adds .copied class for CSS styling
   * - Restores original button content after timeout
   *
   * ERROR HANDLING:
   * - Ignores AbortError (user cancelled share dialog)
   * - Logs other share/copy errors to console
   */
  async function shareChapter(feedbackEl = null) {
    const url = window.location.href;
    const title = document.querySelector('article header h1')?.textContent || document.title;

    // Try native share API first (mobile devices, modern browsers)
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        // User cancelled share dialog - this is expected behavior
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        // Show visual feedback on the button
        if (feedbackEl) {
          const originalText = feedbackEl.innerHTML;
          // Replace button content with checkmark icon + "Copied!" text
          feedbackEl.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style="display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg> ${UI.copied}`;
          feedbackEl.classList.add('copied');
          // Restore original button content after 2 seconds
          setTimeout(() => {
            feedbackEl.innerHTML = originalText;
            feedbackEl.classList.remove('copied');
          }, 2000);
        }
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Initialize on DOM ready
   * @description Sets up share functionality as soon as DOM is available.
   *              Uses immediate invocation if DOM already loaded.
   * @listens DOMContentLoaded
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * Handle URL with verse parameter (scroll to verse)
   * @description Checks for ?v=<verse_number> in URL and scrolls to that verse.
   *              Adds visual highlight to the target verse.
   *              Uses smooth scrolling and centers verse in viewport.
   * @listens load
   *
   * DEEP LINKING FLOW:
   * 1. User clicks shared verse link (e.g., "...genesis/1/?v=3")
   * 2. Page loads completely
   * 3. Script extracts verse number from URL
   * 4. Finds matching verse element
   * 5. Scrolls smoothly to verse (centered in viewport)
   * 6. Adds .highlight-verse class for visual emphasis
   *
   * ACCESSIBILITY:
   * - Uses smooth scrolling for better UX
   * - Centers verse in viewport (block: 'center')
   * - Visual highlight persists for user reference
   */
  window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const verse = params.get('v'); // Extract ?v= parameter
    if (verse) {
      const bibleText = document.querySelector('.bible-text');
      if (bibleText) {
        // Modern format: <span class="verse" data-verse="N">
        const verseSpan = bibleText.querySelector(`.verse[data-verse="${verse}"]`);
        if (verseSpan) {
          verseSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
          verseSpan.classList.add('highlight-verse');
        } else {
          // Legacy fallback: <strong>N</strong>
          const verses = bibleText.querySelectorAll('strong');
          for (const v of verses) {
            if (v.textContent.trim() === verse) {
              v.scrollIntoView({ behavior: 'smooth', block: 'center' });
              v.classList.add('highlight-verse');
              break;
            }
          }
        }
      }
    }
  });
})();
