/**
 * Bible Navigation Handler
 *
 * Handles dropdown navigation for Bible translation, book, and chapter selectors.
 * The Bible selector preserves book/chapter context when switching translations,
 * showing a "not available" message if the target content doesn't exist.
 */
'use strict';

window.Michael = window.Michael || {};

/**
 * Validate that a URL path is safe for navigation (same-origin, relative path only).
 * Prevents open redirect vulnerabilities by rejecting absolute URLs and external domains.
 * @param {string} path - The URL path to validate
 * @returns {boolean} True if the path is safe for navigation
 */
function isValidInternalPath(path) {
  if (!path || typeof path !== 'string') {
    return false;
  }
  // Reject absolute URLs (http://, https://, //, etc.)
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) {
    return false;
  }
  // Reject javascript: protocol attempts
  if (/^javascript:/i.test(path.trim())) {
    return false;
  }
  // Reject data: URLs
  if (/^data:/i.test(path.trim())) {
    return false;
  }
  // Allow only paths starting with /
  if (!path.startsWith('/')) {
    return false;
  }
  // Reject path traversal attempts
  if (path.includes('..')) {
    return false;
  }
  return true;
}

/**
 * Safely navigate to an internal path after validation
 * @param {string} path - The validated internal path
 */
function safeNavigate(path) {
  if (isValidInternalPath(path)) {
    window.location.assign(path);
  }
}

function initBibleNav() {
  const navs = document.querySelectorAll('.bible-nav');

  navs.forEach(function(nav) {
    const bibleSelect = nav.querySelector('#bible-select');
    const bookSelect = nav.querySelector('#book-select');
    const chapterSelect = nav.querySelector('#chapter-select');

    // Bible selector — preserve book/chapter context
    if (bibleSelect) {
      bibleSelect.addEventListener('change', function() {
        var bibleId = this.value;
        if (!bibleId) return;

        // Validate bibleId contains only safe characters (alphanumeric, hyphens)
        if (!/^[a-zA-Z0-9-]+$/.test(bibleId)) {
          return;
        }

        var basePath = this.dataset.basePath || '/bible';
        var book = this.dataset.book || '';
        var chapter = this.dataset.chapter || '';

        // Validate book and chapter contain only safe characters
        if (book && !/^[a-zA-Z0-9]+$/.test(book)) {
          return;
        }
        if (chapter && !/^[0-9]+$/.test(chapter)) {
          return;
        }

        // Build the most specific URL possible using validated components
        var pathParts = [basePath, bibleId];
        if (book) {
          pathParts.push(book);
        }
        if (book && chapter) {
          pathParts.push(chapter);
        }
        var url = pathParts.join('/') + '/';

        // Validate the constructed URL
        if (!isValidInternalPath(url)) {
          return;
        }

        // If we have book/chapter context, check if the page exists
        if (book) {
          var fallback = basePath + '/' + bibleId + '/';
          checkAndNavigate(url, fallback, this);
        } else {
          safeNavigate(url);
        }
      });
    }

    // Book and chapter selectors — direct navigation (values are full URLs)
    [bookSelect, chapterSelect].forEach(function(select) {
      if (!select) return;
      select.addEventListener('change', function() {
        var selectedPath = this.value;
        if (selectedPath && isValidInternalPath(selectedPath)) {
          safeNavigate(selectedPath);
        }
      });
    });
  });
}

/**
 * Check if URL exists, navigate there if so, otherwise show unavailable message
 * and navigate to the fallback URL.
 * @param {string} url - Pre-validated internal URL to check
 * @param {string} fallbackUrl - Pre-validated fallback URL
 * @param {HTMLSelectElement} selectEl - The select element to disable during check
 */
function checkAndNavigate(url, fallbackUrl, selectEl) {
  // URLs are pre-validated by caller, but double-check for safety
  if (!isValidInternalPath(url) || !isValidInternalPath(fallbackUrl)) {
    return;
  }

  // Disable selector during check
  selectEl.disabled = true;

  // Use same-origin fetch to check if resource exists
  // The URL is pre-validated to be a relative path
  fetch(url, { method: 'HEAD', credentials: 'same-origin' })
    .then(function(response) {
      if (response.ok) {
        safeNavigate(url);
      } else {
        showUnavailable(selectEl, url, fallbackUrl);
      }
    })
    .catch(function() {
      // Network error — try navigating directly
      safeNavigate(url);
    });
}

/**
 * Show a notice that the content is not available in the selected translation,
 * then navigate to the Bible overview for that translation.
 * @param {HTMLSelectElement} selectEl - The select element
 * @param {string} attemptedUrl - The URL that was attempted (unused, kept for API compat)
 * @param {string} fallbackUrl - Pre-validated fallback URL
 */
function showUnavailable(selectEl, attemptedUrl, fallbackUrl) {
  selectEl.disabled = false;

  // Validate fallback URL before use
  if (!isValidInternalPath(fallbackUrl)) {
    return;
  }

  // Extract bible name from the selected option
  var selectedOption = selectEl.options[selectEl.selectedIndex];
  var bibleName = selectedOption ? selectedOption.textContent.trim() : 'this translation';

  // Show message in the content area
  var content = document.getElementById('chapter-content');
  if (content) {
    // Build notice using DOM APIs to avoid innerHTML
    content.textContent = '';
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
    content.appendChild(notice);

    content.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    // No content area — navigate to fallback
    safeNavigate(fallbackUrl);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBibleNav);
} else {
  initBibleNav();
}

window.Michael.initBibleNav = initBibleNav;
