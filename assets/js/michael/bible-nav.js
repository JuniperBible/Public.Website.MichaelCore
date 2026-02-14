'use strict';

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
  // Disable selector during check
  selectEl.disabled = true;

  fetch(url, { method: 'HEAD' })
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
        var bibleId = this.value;
        if (!bibleId) return;

        var basePath = this.dataset.basePath || '/bible';
        var book = this.dataset.book || '';
        var chapter = this.dataset.chapter || '';

        // Build the most specific URL possible
        var url = basePath + '/' + bibleId + '/';
        if (book) url += book + '/';
        if (book && chapter) url += chapter + '/';

        // If we have book/chapter context, check if the page exists
        if (book) {
          checkAndNavigate(url, basePath + '/' + bibleId + '/', this);
        } else {
          window.location.href = url;
        }
      });
    }

    // Book and chapter selectors — direct navigation (values are full URLs)
    [bookSelect, chapterSelect].forEach(function(select) {
      if (!select) return;
      select.addEventListener('change', function() {
        if (this.value) {
          window.location.href = this.value;
        }
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
