'use strict';

/**
 * Michael Footnotes Module
 *
 * Collects <note> elements from Bible chapter content and displays them
 * in a footnotes section at the bottom of the page. Adds superscript
 * reference numbers to the text that link to the footnotes.
 *
 * Handles OSIS-style notes with <catchWord> and <rdg> elements.
 *
 * Exports window.Michael.Footnotes.process() for use by other modules.
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

// Ensure Michael namespace exists
window.Michael = window.Michael || {};

// Track registered listeners for cleanup
const footnoteListeners = [];

/**
 * Handle click on footnote reference or backref link
 * @param {Event} e - Click event
 */
function handleFootnoteClick(e) {
  e.preventDefault();
  const targetId = this.getAttribute('href').substring(1);
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Briefly highlight the target
    target.style.backgroundColor = 'var(--brand-100)';
    setTimeout(function() {
      target.style.backgroundColor = '';
    }, 1500);
  }
}

/**
 * Process footnotes in a content container
 * @param {HTMLElement} content - The container with <note> elements
 * @param {HTMLElement} footnotesSection - The section to show/hide
 * @param {HTMLElement} footnotesList - The <ol> to append footnotes to
 * @param {string} [prefix=''] - Optional prefix for IDs to avoid collisions
 * @returns {number} Number of footnotes processed
 */
function processFootnotes(content, footnotesSection, footnotesList, prefix) {
  prefix = prefix || '';

  if (!content || !footnotesSection || !footnotesList) {
    return 0;
  }

  // Clear any existing footnotes
  footnotesList.innerHTML = '';

  // Find all <note> elements in the content
  const notes = content.querySelectorAll('note');

  if (notes.length === 0) {
    footnotesSection.classList.add('hidden');
    return 0;
  }

  // Process each note
  notes.forEach(function(note, index) {
    const noteNum = index + 1;
    const noteId = prefix + 'fn-' + noteNum;
    const refId = prefix + 'fnref-' + noteNum;

    // Remove any existing ref for this note (for re-processing)
    const existingRef = note.nextElementSibling;
    if (existingRef && existingRef.classList.contains('footnote-ref')) {
      existingRef.remove();
    }

    // Create footnote reference (superscript number)
    const ref = document.createElement('a');
    ref.href = '#' + noteId;
    ref.id = refId;
    ref.className = 'footnote-ref';
    ref.textContent = '[' + noteNum + ']';
    ref.setAttribute('aria-describedby', noteId);
    ref.title = 'See footnote ' + noteNum;

    // Insert the reference after the note element
    note.parentNode.insertBefore(ref, note.nextSibling);

    // Build footnote content
    const catchWord = note.querySelector('catchWord');

    // Create footnote list item using DOM API to prevent XSS
    const li = document.createElement('li');
    li.id = noteId;

    // Add footnote number
    const numSpan = document.createElement('span');
    numSpan.className = 'footnote-num';
    numSpan.textContent = '[' + noteNum + ']';
    li.appendChild(numSpan);
    li.appendChild(document.createTextNode(' '));

    // Add catchWord if present
    if (catchWord) {
      const catchSpan = document.createElement('span');
      catchSpan.className = 'footnote-catchword';
      catchSpan.textContent = catchWord.textContent;
      li.appendChild(catchSpan);
      li.appendChild(document.createTextNode(': '));
    }

    // Get the text content excluding catchWord
    note.childNodes.forEach(function(child) {
      if (child.nodeType === Node.TEXT_NODE) {
        li.appendChild(document.createTextNode(child.textContent));
      } else if (child.nodeName.toLowerCase() !== 'catchword') {
        if (child.nodeName.toLowerCase() === 'rdg') {
          const rdgSpan = document.createElement('span');
          rdgSpan.className = 'footnote-literal';
          rdgSpan.textContent = child.textContent;
          li.appendChild(rdgSpan);
        } else {
          li.appendChild(document.createTextNode(child.textContent));
        }
      }
    });

    // Add backref link
    li.appendChild(document.createTextNode(' '));
    const backref = document.createElement('a');
    backref.href = '#' + refId;
    backref.className = 'footnote-backref';
    backref.title = 'Back to text';
    backref.innerHTML = '&uarr;';
    li.appendChild(backref);

    footnotesList.appendChild(li);
  });

  // Show the footnotes section
  footnotesSection.classList.remove('hidden');

  // Add smooth scrolling for footnote links within this section
  // Use dataset marker to prevent duplicate listeners
  footnotesSection.querySelectorAll('.footnote-backref').forEach(function(link) {
    if (!link.dataset.footnoteListenerAdded) {
      link.dataset.footnoteListenerAdded = 'true';
      link.addEventListener('click', handleFootnoteClick);
      // Track for cleanup
      footnoteListeners.push({ element: link, handler: handleFootnoteClick });
    }
  });
  content.querySelectorAll('.footnote-ref').forEach(function(link) {
    if (!link.dataset.footnoteListenerAdded) {
      link.dataset.footnoteListenerAdded = 'true';
      link.addEventListener('click', handleFootnoteClick);
      // Track for cleanup
      footnoteListeners.push({ element: link, handler: handleFootnoteClick });
    }
  });

  return notes.length;
}

/**
 * Initialize footnotes for the default chapter page elements
 * Called automatically on DOMContentLoaded
 */
function initDefaultFootnotes() {
  const content = document.getElementById('chapter-content');
  const footnotesSection = document.getElementById('footnotes-section');
  const footnotesList = document.getElementById('footnotes-list');

  processFootnotes(content, footnotesSection, footnotesList, '');
}

/**
 * Cleanup all footnote event listeners
 */
function cleanup() {
  footnoteListeners.forEach(({ element, handler }) => {
    if (element && element.parentNode) {
      element.removeEventListener('click', handler);
      delete element.dataset.footnoteListenerAdded;
    }
  });
  footnoteListeners.length = 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { processFootnotes, initDefaultFootnotes, cleanup };

// Export the module for backwards compatibility
window.Michael.Footnotes = {
  process: processFootnotes,
  cleanup
};

// Register cleanup handler
if (window.Michael && typeof window.Michael.addCleanup === 'function') {
  window.Michael.addCleanup(cleanup);
}

// Auto-initialize for chapter pages on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDefaultFootnotes);
} else {
  initDefaultFootnotes();
}
