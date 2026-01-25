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
      btn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

    const btn = document.createElement('button');
    btn.className = 'btn-paper text-sm mt-2';
    btn.innerHTML = `<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
    </svg> ${UI.share}`;
    btn.setAttribute('aria-label', 'Share this chapter');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showChapterShareMenu(btn);
    });

    header.appendChild(btn);
  }

  /**
   * Show share menu for the chapter
   */
  function showChapterShareMenu(anchorBtn) {
    // Remove any existing menu
    const existingMenu = document.querySelector('.share-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'share-menu card-paper';
    menu.innerHTML = `
      <button class="share-menu-item" data-action="copy-link">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
        ${UI.copyLink}
      </button>
      <hr class="share-menu-divider">
      <button class="share-menu-item" data-action="share-twitter">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        ${UI.shareTwitter}
      </button>
      <button class="share-menu-item" data-action="share-facebook">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        ${UI.shareFacebook}
      </button>
    `;

    // Position the menu
    const rect = anchorBtn.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    menu.style.zIndex = '50';

    document.body.appendChild(menu);

    // Handle menu actions
    menu.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      const url = window.location.href;
      const title = document.querySelector('article header h1')?.textContent || document.title;

      if (action === 'copy-link') {
        await copyToClipboard(url, anchorBtn);
      } else if (action === 'share-twitter') {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420,noopener,noreferrer');
      } else if (action === 'share-facebook') {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank', 'width=550,height=420,noopener,noreferrer');
      }

      menu.remove();
    });

    // Close on click outside
    const closeHandler = (e) => {
      if (!menu.contains(e.target) && e.target !== anchorBtn) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);

    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        menu.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * Show share menu for a specific verse
   */
  function showShareMenu(anchorBtn, verseNum) {
    // Remove any existing menu
    const existingMenu = document.querySelector('.share-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'share-menu card-paper';
    menu.innerHTML = `
      <button class="share-menu-item" data-action="copy-link">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
        ${UI.copyLink}
      </button>
      <button class="share-menu-item" data-action="copy-text">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
        ${UI.copyText}
      </button>
      <hr class="share-menu-divider">
      <button class="share-menu-item" data-action="share-twitter">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        ${UI.shareTwitter}
      </button>
      <button class="share-menu-item" data-action="share-facebook">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        ${UI.shareFacebook}
      </button>
    `;

    // Position the menu
    const rect = anchorBtn.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    menu.style.zIndex = '50';

    document.body.appendChild(menu);

    // Handle menu actions
    menu.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      if (action === 'copy-link') {
        const url = getVerseUrl(verseNum);
        await copyToClipboard(url, anchorBtn);
      } else if (action === 'copy-text') {
        const text = getVerseText(verseNum);
        await copyToClipboard(text, anchorBtn);
      } else if (action === 'share-twitter') {
        shareToTwitter(verseNum);
      } else if (action === 'share-facebook') {
        shareToFacebook(verseNum);
      }

      menu.remove();
    });

    // Close on click outside
    const closeHandler = (e) => {
      if (!menu.contains(e.target) && e.target !== anchorBtn) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);

    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        menu.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
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
   * Share verse to Twitter/X
   */
  function shareToTwitter(verseNum) {
    const text = getVerseText(verseNum);
    const url = getVerseUrl(verseNum);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420,noopener,noreferrer');
  }

  /**
   * Share verse to Facebook
   */
  function shareToFacebook(verseNum) {
    const url = getVerseUrl(verseNum);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420,noopener,noreferrer');
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
      const success = await copyToClipboard(url);
      // Show visual feedback on the button
      if (feedbackEl && success) {
        const originalText = feedbackEl.innerHTML;
        feedbackEl.innerHTML = `<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg> ${UI.copied}`;
        feedbackEl.classList.add('copied');
        setTimeout(() => {
          feedbackEl.innerHTML = originalText;
          feedbackEl.classList.remove('copied');
        }, 2000);
      }
    }
  }

  /**
   * Copy text to clipboard with feedback
   */
  async function copyToClipboard(text, feedbackEl = null) {
    try {
      await navigator.clipboard.writeText(text);

      if (feedbackEl) {
        const originalTitle = feedbackEl.getAttribute('title');
        feedbackEl.setAttribute('title', UI.copied);
        feedbackEl.classList.add('copied');
        setTimeout(() => {
          feedbackEl.setAttribute('title', originalTitle);
          feedbackEl.classList.remove('copied');
        }, 2000);
      }
      return true;
    } catch (err) {
      console.error('Copy failed:', err);
      if (feedbackEl) {
        feedbackEl.setAttribute('title', UI.copyFailed);
      }
      return false;
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
