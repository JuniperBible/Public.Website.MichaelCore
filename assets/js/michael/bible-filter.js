/**
 * Bible tag filter — filters Bible cards by tag chips.
 *
 * Expects:
 *   #bible-filters  — container with <button data-tag="..."> chips
 *   #bible-grid     — grid of .card[data-tags="slug1 slug2 ..."]
 *   #no-results     — hidden paragraph shown when no cards match
 *   #quick-bible-select — optional select dropdown for quick navigation
 */
(function () {
  "use strict";

  // Quick Bible select dropdown — navigates directly to Bible page
  var quickSelect = document.getElementById("quick-bible-select");
  if (quickSelect) {
    quickSelect.addEventListener("change", function () {
      var bibleId = quickSelect.value;
      if (bibleId) {
        // Navigate to the Bible page (basePath is determined from current URL)
        var basePath = window.location.pathname.replace(/\/$/, "");
        window.location.href = basePath + "/" + bibleId + "/";
      }
    });
  }

  var filters = document.getElementById("bible-filters");
  var grid = document.getElementById("bible-grid");
  var noResults = document.getElementById("no-results");
  if (!filters || !grid) return;

  function apply(tag) {
    var cards = grid.querySelectorAll(".card[data-tags]");
    var buttons = filters.querySelectorAll("button[data-tag]");
    var visible = 0;

    buttons.forEach(function (btn) {
      var active = btn.dataset.tag === tag;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.classList.toggle("is-active", active);
    });

    cards.forEach(function (card) {
      var tags = " " + card.dataset.tags + " ";
      var match = tag === "all" || tags.indexOf(" " + tag + " ") !== -1;
      card.style.display = match ? "" : "none";
      if (match) visible++;
    });

    if (noResults) {
      noResults.classList.toggle("hidden", visible > 0);
    }
  }

  filters.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-tag]");
    if (btn) apply(btn.dataset.tag);
  });
})();
