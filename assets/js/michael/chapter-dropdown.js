/**
 * Chapter Dropdown Component
 *
 * Handles chapter selection dropdown population for Bible books.
 * Consolidates duplicate logic from parallel.js for both normal and SSS modes.
 *
 * Copyright (c) 2025, Focus with Justin
 */
window.Michael = window.Michael || {};
window.Michael.ChapterDropdown = (function() {
  'use strict';

  /**
   * ChapterDropdown constructor
   * @param {HTMLSelectElement} selectElement - The <select> element to populate
   * @param {Object} bibleData - Bible metadata object containing books array
   * @param {Object} options - Configuration options
   * @param {string} options.placeholder - Placeholder text (default: "Select Chapter")
   * @param {string} options.labelPrefix - Prefix for chapter labels (default: "Chapter ")
   */
  function ChapterDropdown(selectElement, bibleData, options) {
    if (!selectElement) {
      throw new Error('ChapterDropdown requires a valid select element');
    }

    this.selectElement = selectElement;
    this.bibleData = bibleData;

    // Merge options with defaults
    this.options = Object.assign({
      placeholder: 'Select Chapter',
      labelPrefix: 'Chapter '
    }, options || {});

    // Initialize with placeholder
    this.clear();
  }

  /**
   * Clear dropdown and set to disabled state
   */
  ChapterDropdown.prototype.clear = function() {
    this.selectElement.innerHTML = '<option value="">' + this.options.placeholder + '</option>';
    this.selectElement.disabled = true;
  };

  /**
   * Populate chapter dropdown for a given book
   * @param {string} bookId - Book ID (e.g., "Gen", "Isa")
   * @returns {boolean} - True if successfully populated, false otherwise
   */
  ChapterDropdown.prototype.populate = function(bookId) {
    // Clear first
    this.clear();

    if (!bookId || !this.bibleData || !this.bibleData.books) {
      return false;
    }

    // Find book in bibleData.books array
    const book = this.bibleData.books.find(function(b) {
      return b.id === bookId;
    });

    if (!book || !book.chapters) {
      return false;
    }

    // Populate chapter options
    for (let i = 1; i <= book.chapters; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = this.options.labelPrefix + i;
      this.selectElement.appendChild(option);
    }

    // Enable dropdown
    this.selectElement.disabled = false;
    return true;
  };

  /**
   * Get current selected chapter value
   * @returns {number} - Selected chapter number (0 if none selected)
   */
  ChapterDropdown.prototype.getValue = function() {
    return parseInt(this.selectElement.value) || 0;
  };

  /**
   * Set chapter value
   * @param {number} chapter - Chapter number to select
   * @returns {boolean} - True if value was set, false if invalid
   */
  ChapterDropdown.prototype.setValue = function(chapter) {
    const chapterNum = parseInt(chapter);
    if (isNaN(chapterNum) || chapterNum < 1) {
      return false;
    }

    // Check if option exists
    const option = this.selectElement.querySelector('option[value="' + chapterNum + '"]');
    if (!option) {
      return false;
    }

    this.selectElement.value = chapterNum;
    return true;
  };

  /**
   * Check if dropdown is disabled
   * @returns {boolean}
   */
  ChapterDropdown.prototype.isDisabled = function() {
    return this.selectElement.disabled;
  };

  /**
   * Enable dropdown
   */
  ChapterDropdown.prototype.enable = function() {
    this.selectElement.disabled = false;
  };

  /**
   * Disable dropdown
   */
  ChapterDropdown.prototype.disable = function() {
    this.selectElement.disabled = true;
  };

  return ChapterDropdown;
})();
