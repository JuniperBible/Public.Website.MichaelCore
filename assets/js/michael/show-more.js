/**
 * Show More Button Handler
 *
 * Generic "show more" functionality for paginated lists.
 * Reveals hidden items when the show-more button is clicked.
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

'use strict';

window.Michael = window.Michael || {};

/**
 * Initialises the show-more button for bible list items.
 * Reveals all elements with class "bible-extra" and hides the button on click.
 */
function initShowMore() {
  const showMoreBtn = document.getElementById('show-more-bibles');
  if (!showMoreBtn) return;

  showMoreBtn.addEventListener('click', function() {
    document.querySelectorAll('.bible-extra').forEach(function(el) {
      el.classList.remove('hidden');
    });
    showMoreBtn.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', initShowMore);

window.Michael.initShowMore = initShowMore;
