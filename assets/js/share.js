/**
 * Share Verse Controller
 *
 * Provides functionality to share Bible verses via URL, clipboard, or social media.
 *
 * Copyright (c) 2025, Focus with Justin
 */
(function() {
  'use strict';

  // UI strings (can be overridden by data attributes)
  const UI = {
    share: 'Share',
    copied: 'Copied!',
    copyFailed: 'Copy failed',
    shareVerse: 'Share verse',
    copyLink: 'Copy link',
    copyText: 'Copy text',
    shareTwitter: 'Share on X',
    shareFacebook: 'Share on Facebook'
  };

  /**
   * Initialize share functionality on chapter pages
   */
  function init() {
    const bibleText = document.querySelector('.bible-text');
    if (!bibleText) return;

    // Add share buttons to each verse
    addVerseShareButtons(bibleText);

    // Add chapter share button
    addChapterShareButton();
  }

  /**
   * Add share buttons next to verse numbers
   */
  function addVerseShareButtons(container) {
    // Verses are marked with <strong>N</strong> for verse numbers
    const verses = container.querySelectorAll('strong');

    verses.forEach(verseNum => {
      const num = verseNum.textContent.trim();
      if (!/^\d+$/.test(num)) return;

      // Create share button
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

      // Insert after verse number
      verseNum.parentNode.insertBefore(btn, verseNum.nextSibling);
    });
  }

  /**
   * Add share button to the chapter header
   */
  function addChapterShareButton() {
    const header = document.querySelector('article header');
    if (!header) return;

    // Append to .actions div if it exists, otherwise to header
    const actionsDiv = header.querySelector('.actions');

    const btn = document.createElement('button');
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
      // Insert after the actions div
      actionsDiv.after(shareWrapper);
    } else {
      header.appendChild(shareWrapper);
    }
  }

  // Initialize chapter share menu
  const chapterMenu = new window.Michael.ShareMenu({
    includeTextCopy: false,
    getShareUrl: () => window.location.href,
    getShareTitle: () => document.querySelector('article header h1')?.textContent || document.title
  });

  /**
   * Show share menu for the chapter
   */
  function showChapterShareMenu(anchorBtn) {
    chapterMenu.show(anchorBtn);
  }

  // Store current verse number for verse menu callbacks
  let currentVerseNum = null;

  // Initialize verse share menu
  const verseMenu = new window.Michael.ShareMenu({
    includeTextCopy: true,
    getShareUrl: () => getVerseUrl(currentVerseNum),
    getShareText: () => getVerseText(currentVerseNum),
    getShareTitle: () => document.querySelector('article header h1')?.textContent || document.title
  });

  /**
   * Show share menu for a specific verse
   */
  function showShareMenu(anchorBtn, verseNum) {
    currentVerseNum = verseNum;
    verseMenu.show(anchorBtn);
  }

  /**
   * Generate URL for a specific verse
   */
  function getVerseUrl(verseNum) {
    const url = new URL(window.location.href);
    url.searchParams.set('v', verseNum);
    return url.toString();
  }

  /**
   * Get the text of a specific verse
   */
  function getVerseText(verseNum) {
    const bibleText = document.querySelector('.bible-text');
    if (!bibleText) return '';

    // Find the verse number element
    const verses = bibleText.querySelectorAll('strong');
    let verseEl = null;
    for (const v of verses) {
      if (v.textContent.trim() === verseNum) {
        verseEl = v;
        break;
      }
    }

    if (!verseEl) return '';

    // Extract text until next verse number or end
    let text = '';
    let node = verseEl.nextSibling;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeName === 'STRONG') {
        // Next verse
        break;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Skip share buttons
        if (!node.classList.contains('verse-share-btn')) {
          text += node.textContent;
        }
      }
      node = node.nextSibling;
    }

    // Format with reference
    const title = document.querySelector('article header h1')?.textContent || '';
    return `${title}:${verseNum} - ${text.trim()}`;
  }

  /**
   * Share the entire chapter
   * @param {HTMLElement} feedbackEl - Optional element to show feedback on
   */
  async function shareChapter(feedbackEl = null) {
    const url = window.location.href;
    const title = document.querySelector('article header h1')?.textContent || document.title;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        // Show visual feedback on the button
        if (feedbackEl) {
          const originalText = feedbackEl.innerHTML;
          feedbackEl.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style="display: inline-block; vertical-align: middle; margin-right: 0.25rem;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg> ${UI.copied}`;
          feedbackEl.classList.add('copied');
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

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle URL with verse parameter (scroll to verse)
  window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const verse = params.get('v');
    if (verse) {
      const bibleText = document.querySelector('.bible-text');
      if (bibleText) {
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
  });
})();
