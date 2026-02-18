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

(function() {
  'use strict';

  // Ensure Michael namespace exists
  window.Michael = window.Michael || {};

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
    footnotesList.textContent = '';

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

      // Create footnote list item
      const li = document.createElement('li');
      li.id = noteId;

      // Footnote number span
      const numSpan = document.createElement('span');
      numSpan.className = 'footnote-num';
      numSpan.textContent = '[' + noteNum + ']';
      li.appendChild(numSpan);
      li.appendChild(document.createTextNode(' '));

      // Optional catchword span
      if (catchWord) {
        const cwSpan = document.createElement('span');
        cwSpan.className = 'footnote-catchword';
        cwSpan.textContent = catchWord.textContent;
        li.appendChild(cwSpan);
        li.appendChild(document.createTextNode(': '));
      }

      // Get the text content excluding catchWord
      const noteNodes = [];
      note.childNodes.forEach(function(child) {
        if (child.nodeType === Node.TEXT_NODE) {
          noteNodes.push(document.createTextNode(child.textContent));
        } else if (child.nodeName.toLowerCase() !== 'catchword') {
          if (child.nodeName.toLowerCase() === 'rdg') {
            const rdgSpan = document.createElement('span');
            rdgSpan.className = 'footnote-literal';
            rdgSpan.textContent = child.textContent;
            noteNodes.push(rdgSpan);
          } else {
            noteNodes.push(document.createTextNode(child.textContent));
          }
        }
      });

      // Trim leading/trailing whitespace from the collected nodes
      if (noteNodes.length > 0) {
        const first = noteNodes[0];
        if (first.nodeType === Node.TEXT_NODE) {
          first.textContent = first.textContent.trimStart();
        }
        const last = noteNodes[noteNodes.length - 1];
        if (last.nodeType === Node.TEXT_NODE) {
          last.textContent = last.textContent.trimEnd();
        }
      }
      noteNodes.forEach(function(node) { li.appendChild(node); });

      // Back-reference link
      li.appendChild(document.createTextNode(' '));
      const backref = document.createElement('a');
      backref.href = '#' + refId;
      backref.className = 'footnote-backref';
      backref.title = 'Back to text';
      backref.textContent = '\u2191';
      li.appendChild(backref);

      footnotesList.appendChild(li);
    });

    // Show the footnotes section
    footnotesSection.classList.remove('hidden');

    // Add smooth scrolling for footnote links within this section
    footnotesSection.querySelectorAll('.footnote-backref').forEach(function(link) {
      link.addEventListener('click', handleFootnoteClick);
    });
    content.querySelectorAll('.footnote-ref').forEach(function(link) {
      link.addEventListener('click', handleFootnoteClick);
    });

    return notes.length;
  }

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
   * Initialize footnotes for the default chapter page elements
   * Called automatically on DOMContentLoaded
   */
  function initDefaultFootnotes() {
    const content = document.getElementById('chapter-content');
    const footnotesSection = document.getElementById('footnotes-section');
    const footnotesList = document.getElementById('footnotes-list');

    processFootnotes(content, footnotesSection, footnotesList, '');
  }

  // Export the module
  window.Michael.Footnotes = {
    process: processFootnotes
  };

  // Auto-initialize for chapter pages on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDefaultFootnotes);
  } else {
    initDefaultFootnotes();
  }
})();
