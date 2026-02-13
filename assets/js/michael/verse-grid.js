/**
 * VerseGrid Component
 *
 * Manages verse selection grids for Bible chapter navigation.
 * Consolidates duplicate verse grid logic from parallel.js.
 *
 * Copyright (c) 2025, Focus with Justin
 */

'use strict';

import { addTapListener } from './dom-utils.js';

/**
 * VerseGrid constructor
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.container - Container element for the verse grid
 * @param {HTMLElement} options.buttonsContainer - Container for verse buttons
 * @param {HTMLElement} options.allVersesBtn - "All Verses" button element
 * @param {string} options.buttonClass - CSS class name for verse buttons (default: 'verse-btn')
 * @param {Function} options.onVerseSelect - Callback when a verse is selected (receives verse number)
 */
export function VerseGrid(options) {
  if (!options) {
    throw new Error('VerseGrid requires options object');
  }

  this.container = options.container;
  this.buttonsContainer = options.buttonsContainer;
  this.allVersesBtn = options.allVersesBtn;
  this.buttonClass = options.buttonClass || 'verse-btn';
  this.onVerseSelect = options.onVerseSelect || function() {};

  this.selectedVerse = 0; // 0 means all verses

  // Set up "All Verses" button listener
  if (this.allVersesBtn) {
    addTapListener(this.allVersesBtn, () => {
      this.setSelectedVerse(0);
      if (this.onVerseSelect) {
        this.onVerseSelect(0);
      }
    });
  }
}

/**
 * Populate the verse grid with verse buttons
 * @param {Array} verses - Array of verse objects with 'number' property
 */
VerseGrid.prototype.populate = function(verses) {
  if (!verses || verses.length === 0) {
    this.reset();
    return;
  }

  // Clear existing buttons
  if (this.buttonsContainer) {
    this.buttonsContainer.innerHTML = '';

    // Create button for each verse
    verses.forEach(verse => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = this.buttonClass;
      btn.textContent = verse.number;
      btn.dataset.verse = verse.number;
      btn.setAttribute('aria-pressed', 'false');
      btn.style.cssText = 'width: 1.75rem; height: 1.75rem; font-size: 0.875rem; border-radius: 3px; cursor: pointer;';

      addTapListener(btn, () => this.handleClick(verse.number));

      this.buttonsContainer.appendChild(btn);
    });
  }

  // Show the grid
  if (this.container) {
    this.container.classList.remove('hidden');
  }

  // Update selection state
  this.updateSelection();
};

/**
 * Handle verse button click
 * @param {number} verseNum - The verse number that was clicked
 */
VerseGrid.prototype.handleClick = function(verseNum) {
  this.selectedVerse = verseNum;
  this.updateSelection();

  if (this.onVerseSelect) {
    this.onVerseSelect(verseNum);
  }
};

/**
 * Update the visual selection state of verse buttons
 */
VerseGrid.prototype.updateSelection = function() {
  if (!this.buttonsContainer) return;

  const buttons = this.buttonsContainer.querySelectorAll('.' + this.buttonClass);
  buttons.forEach(btn => {
    const verseNum = parseInt(btn.dataset.verse);
    const isSelected = verseNum === this.selectedVerse;

    // Update visual state
    if (isSelected) {
      btn.style.background = 'var(--michael-accent)';
      btn.style.color = 'white';
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.style.background = '';
      btn.style.color = '';
      btn.setAttribute('aria-pressed', 'false');
    }
  });

  // Update "All Verses" button state
  if (this.allVersesBtn) {
    const allSelected = this.selectedVerse === 0;
    if (allSelected) {
      this.allVersesBtn.style.background = 'var(--michael-accent)';
      this.allVersesBtn.style.color = 'white';
      this.allVersesBtn.setAttribute('aria-pressed', 'true');
    } else {
      this.allVersesBtn.style.background = '';
      this.allVersesBtn.style.color = '';
      this.allVersesBtn.setAttribute('aria-pressed', 'false');
    }
  }
};

/**
 * Reset the verse grid to hidden state and clear selection
 */
VerseGrid.prototype.reset = function() {
  if (this.container) {
    this.container.classList.add('hidden');
  }
  if (this.buttonsContainer) {
    this.buttonsContainer.innerHTML = '';
  }
  this.selectedVerse = 0;
};

/**
 * Set the selected verse programmatically
 * @param {number} verseNum - The verse number to select (0 for all verses)
 */
VerseGrid.prototype.setSelectedVerse = function(verseNum) {
  this.selectedVerse = verseNum;
  this.updateSelection();
};

/**
 * Get the currently selected verse number
 * @returns {number} The selected verse number (0 means all verses)
 */
VerseGrid.prototype.getSelectedVerse = function() {
  return this.selectedVerse;
};

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

window.Michael = window.Michael || {};
window.Michael.VerseGrid = VerseGrid;
