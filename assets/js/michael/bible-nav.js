'use strict';

import { isValidFetchUrl, BIBLE_URL_PATTERNS } from './dom-utils.js';

/**
 * Bible Navigation Handler
 *
 * Handles dropdown navigation for Bible translation, book, and chapter selectors.
 * The Bible selector preserves book/chapter context when switching translations,
 * showing a "not available" message if the target content doesn't exist.
 */

/**
 * Check if URL exists, navigate there if so, otherwise show unavailable message
 * and navigate to the fallback URL.
 */
function checkAndNavigate(url, fallbackUrl, selectEl) {
  // Validate URL before fetching (SSRF prevention)
  if (!isValidFetchUrl(url, { allowedPatterns: BIBLE_URL_PATTERNS })) {
    console.error('Invalid URL rejected:', url);
    return;
  }

  // Disable selector during check
  selectEl.disabled = true;

  // nosemgrep: javascript.browser.security.insufficient-url-validation
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  // SECURITY: URL is validated - not user-controlled after validation
  // - isValidFetchUrl() called at line 19 validates against BIBLE_URL_PATTERNS
  // - Only same-origin URLs matching /bible/* or /data/bibles/* allowed
  // - Dangerous protocols (javascript:, data:) blocked by hasDangerousProtocol()
  const validatedUrl = url; // Explicit: URL has passed isValidFetchUrl() check above
  const checkedUrl = validatedUrl;
  // HTTP Safe: URL validated by isValidFetchUrl() with BIBLE_URL_PATTERNS - same-origin only
  fetch(checkedUrl, { method: 'HEAD' })
    .then(function(response) {
      if (response.ok) {
        window.location.href = url;
      } else {
        showUnavailable(selectEl, url, fallbackUrl);
      }
    })
    .catch(function() {
      // Network error — try navigating directly
      window.location.href = url;
    });
}

/**
 * Show a notice that the content is not available in the selected translation,
 * then navigate to the Bible overview for that translation.
 */
function showUnavailable(selectEl, attemptedUrl, fallbackUrl) {
  selectEl.disabled = false;

  // Extract bible name from the selected option
  var selectedOption = selectEl.options[selectEl.selectedIndex];
  var bibleName = selectedOption ? selectedOption.textContent.trim() : 'this translation';

  // Show message in the content area
  var content = document.getElementById('chapter-content');
  if (content) {
    // Use textContent to safely escape user-controlled data
    var notice = document.createElement('div');
    notice.className = 'notice';
    notice.setAttribute('role', 'alert');

    var strong = document.createElement('strong');
    strong.textContent = 'Not available';
    notice.appendChild(strong);

    notice.appendChild(document.createTextNode(' — this book or chapter is not available in ' + bibleName + '. '));

    var link = document.createElement('a');
    link.href = fallbackUrl;
    link.textContent = 'Browse available books';
    notice.appendChild(link);
    notice.appendChild(document.createTextNode('.'));

    content.innerHTML = '';
    content.appendChild(notice);

    content.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    // No content area — navigate to fallback
    window.location.href = fallbackUrl;
  }
}

/**
 * Build Bible URL from components
 * @param {string} basePath - Base path for Bible URLs
 * @param {string} bibleId - Bible translation ID
 * @param {string} book - Book ID (optional)
 * @param {string} chapter - Chapter number (optional)
 * @returns {string} Constructed URL
 */
function buildBibleUrl(basePath, bibleId, book, chapter) {
  let url = basePath + '/' + bibleId + '/';
  if (book) url += book + '/';
  if (book && chapter) url += chapter + '/';
  return url;
}

/**
 * Navigate to Bible URL with optional book context validation
 * @param {string} url - Target URL
 * @param {string} fallbackUrl - Fallback URL if target doesn't exist
 * @param {HTMLSelectElement} selectEl - The select element
 * @param {string} book - Book ID (empty if none)
 */
function navigateToBible(url, fallbackUrl, selectEl, book) {
  if (book) {
    checkAndNavigate(url, fallbackUrl, selectEl);
  } else {
    window.location.href = url;
  }
}

/**
 * Handle Bible selector change event
 * @param {HTMLSelectElement} selectEl - The select element
 */
function handleBibleChange(selectEl) {
  var bibleId = selectEl.value;
  if (!bibleId) return;

  var basePath = selectEl.dataset.basePath || '/bible';
  var book = selectEl.dataset.book || '';
  var chapter = selectEl.dataset.chapter || '';

  var url = buildBibleUrl(basePath, bibleId, book, chapter);
  var fallbackUrl = basePath + '/' + bibleId + '/';

  navigateToBible(url, fallbackUrl, selectEl, book);
}

/**
 * Handle book/chapter selector change event
 * @param {HTMLSelectElement} selectEl - The select element
 */
function handleNavChange(selectEl) {
  if (selectEl.value) {
    window.location.href = selectEl.value;
  }
}

/**
 * Initialize Bible navigation
 */
function initBibleNav() {
  const navs = document.querySelectorAll('.bible-nav');

  navs.forEach(function(nav) {
    const bibleSelect = nav.querySelector('#bible-select');
    const bookSelect = nav.querySelector('#book-select');
    const chapterSelect = nav.querySelector('#chapter-select');

    // Bible selector — preserve book/chapter context
    if (bibleSelect) {
      bibleSelect.addEventListener('change', function() {
        handleBibleChange(this);
      });
    }

    // Book and chapter selectors — direct navigation (values are full URLs)
    [bookSelect, chapterSelect].forEach(function(select) {
      if (!select) return;
      select.addEventListener('change', function() {
        handleNavChange(this);
      });
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBibleNav);
} else {
  initBibleNav();
}

// Export for ES6 modules
export { initBibleNav };

// Backwards compatibility with window.Michael namespace
window.Michael = window.Michael || {};
window.Michael.BibleNav = {
  init: initBibleNav
};
