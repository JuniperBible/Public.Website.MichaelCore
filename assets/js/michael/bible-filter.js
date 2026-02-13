/**
 * Bible tag filter — filters Bible cards by tag chips.
 *
 * Expects:
 *   #bible-filters  — container with <button data-tag="..."> chips
 *   #bible-grid     — grid of .card[data-tags="slug1 slug2 ..."]
 *   #no-results     — hidden paragraph shown when no cards match
 *   #quick-bible-select — optional select dropdown for quick navigation
 */

'use strict';

// Quick Bible select dropdown — navigates directly to Bible page
const quickSelect = document.getElementById("quick-bible-select");
if (quickSelect) {
  quickSelect.addEventListener("change", function () {
    const bibleId = quickSelect.value;
    if (bibleId) {
      // Navigate to the Bible page (basePath is determined from current URL)
      const basePath = window.location.pathname.replace(/\/$/, "");
      window.location.href = basePath + "/" + bibleId + "/";
    }
  });
}

const filters = document.getElementById("bible-filters");
const grid = document.getElementById("bible-grid");
const noResults = document.getElementById("no-results");

/**
 * Apply a tag filter to the Bible cards
 * @param {string} tag - The tag to filter by ('all' shows all cards)
 */
function applyFilter(tag) {
  if (!filters || !grid) return;

  const cards = grid.querySelectorAll(".card[data-tags]");
  const buttons = filters.querySelectorAll("button[data-tag]");
  let visible = 0;

  buttons.forEach(function (btn) {
    const active = btn.dataset.tag === tag;
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.classList.toggle("is-active", active);
  });

  cards.forEach(function (card) {
    const tags = " " + card.dataset.tags + " ";
    const match = tag === "all" || tags.indexOf(" " + tag + " ") !== -1;
    card.style.display = match ? "" : "none";
    if (match) visible++;
  });

  if (noResults) {
    noResults.classList.toggle("hidden", visible > 0);
  }
}

// Initialize filter click listener
if (filters) {
  filters.addEventListener("click", function (e) {
    const btn = e.target.closest("button[data-tag]");
    if (btn) applyFilter(btn.dataset.tag);
  });
}

// ES6 exports
export { applyFilter };

// Backwards compatibility - attach to window.Michael namespace
if (typeof window !== 'undefined') {
  window.Michael = window.Michael || {};
  window.Michael.BibleFilter = {
    applyFilter
  };
}
