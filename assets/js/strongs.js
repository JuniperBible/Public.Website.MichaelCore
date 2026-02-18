/**
 * @file strongs.js - Strong's concordance tooltip functionality
 * @description Displays Greek and Hebrew word definitions when users
 *              click on Strong's numbers in Bible text. Uses locally
 *              bundled definitions injected by Hugo at build time.
 * @version 2.0.0
 *
 * Strong's Numbering System:
 * - H#### (e.g., H430) = Hebrew/Aramaic words from the Old Testament
 * - G#### (e.g., G2316) = Greek words from the New Testament
 * - Numbers reference James Strong's Exhaustive Concordance of the Bible (1890)
 *
 * Accessibility Pattern:
 * - Each Strong's number becomes a role="button" with keyboard support
 * - Tooltip uses role="tooltip" with aria-describedby relationship
 * - aria-expanded tracks tooltip open/closed state
 * - Enter key activates tooltip, Escape key closes it
 * - Tab navigation supported with tabindex="0"
 *
 * Tooltip Positioning:
 * - Default: 8px below the clicked Strong's number
 * - Adjusts horizontally if would exceed right edge of viewport
 * - Flips above if would exceed bottom edge of viewport
 * - Minimum 10px padding from left edge
 */
(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION & CONSTANTS
  // ============================================================================

  /**
   * Timing constants for UI interactions
   */
  const TIMING = {
    HIGHLIGHT_ANIMATION: 1500  // Duration of highlight flash animation (ms)
  };

  // Strong's definitions are served locally — no external links needed

  /**
   * Strong's definition object structure
   * @typedef {Object} StrongsDefinition
   * @property {string} number - Strong's number (e.g., "H430" or "G2316")
   * @property {string} type - Language type ("Hebrew" or "Greek")
   * @property {string} note - Display text or definition
   * @property {string} [lemma] - Original word in Hebrew/Greek characters
   * @property {string} [xlit] - Transliteration into Latin alphabet
   * @property {string} [pron] - Pronunciation guide
   * @property {string} [definition] - English definition
   * @property {string} [derivation] - Etymology and word derivation info
   * @property {string} [source] - Data source: 'local' or 'api'
   * @property {boolean} [offline] - True if offline and no data available
   */

  /**
   * In-memory cache for loaded definitions
   * Prevents redundant API calls or data lookups
   * Key format: "H1234" or "G5678"
   * @type {Map<string, StrongsDefinition>}
   */
  const definitionCache = new Map();

  /**
   * Singleton tooltip element reference
   * Created lazily on first use
   * @type {HTMLElement|null}
   */
  let tooltip = null;

  /**
   * Check if local Strong's data is available (injected by Hugo partial)
   * @type {boolean}
   */
  const hasLocalData = window.Michael && window.Michael.StrongsData;

  /**
   * Local Hebrew definitions (from data/strongs/hebrew.json)
   * @type {Object|null}
   */
  const localHebrewData = hasLocalData ? window.Michael.StrongsData.hebrew : null;

  /**
   * Local Greek definitions (from data/strongs/greek.json)
   * @type {Object|null}
   */
  const localGreekData = hasLocalData ? window.Michael.StrongsData.greek : null;

  /**
   * Normalize a Strong's number to canonical form: strip leading zeros, pad to 4 digits.
   * OSIS sources use inconsistent padding (e.g., "01", "0127", "01004", "07650").
   * JSON lookup keys use 4-digit padding (e.g., "0001", "0127", "1004", "7650").
   * @param {string} number - Raw numeric part (e.g., "07650", "01", "0127")
   * @returns {string} Normalized number (e.g., "7650", "0001", "0127")
   */
  function normalizeStrongsNumber(number) {
    // Strip leading zeros, then pad to at least 4 digits
    const stripped = number.replace(/^0+/, '') || '0';
    return stripped.padStart(4, '0');
  }

  // ============================================================================
  // TOOLTIP MANAGEMENT
  // ============================================================================

  /**
   * Creates and initializes the tooltip element (singleton pattern)
   * Sets up global event listeners for closing the tooltip
   *
   * @returns {HTMLElement} The tooltip DOM element
   */
  function createTooltip() {
    // Return existing tooltip if already created
    if (tooltip) return tooltip;

    // Create tooltip container with semantic structure
    tooltip = document.createElement('div');
    tooltip.className = 'strongs-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.id = 'strongs-tooltip';
    tooltip.setAttribute('aria-hidden', 'true');
    // Build tooltip structure using DOM APIs (avoids innerHTML)
    const h4 = document.createElement('h4');
    h4.className = 'strongs-number';
    const defDiv = document.createElement('div');
    defDiv.className = 'strongs-definition';
    tooltip.appendChild(h4);
    tooltip.appendChild(defDiv);
    document.body.appendChild(tooltip);

    // Close tooltip when clicking outside of it or its trigger
    document.addEventListener('click', (e) => {
      if (!tooltip.contains(e.target) && !e.target.classList.contains('strongs-ref')) {
        hideTooltip();
      }
    });

    // Close tooltip with Escape key for keyboard accessibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideTooltip();
      }
    });

    return tooltip;
  }

  /**
   * Displays the tooltip for a Strong's number reference
   * Handles positioning, ARIA attributes, and content loading
   *
   * Positioning Strategy:
   * 1. Default: 8px below the trigger element
   * 2. If extends past right edge: align to right with 10px margin
   * 3. If extends past bottom edge: position above instead
   * 4. Enforce minimum 10px left margin
   *
   * @param {HTMLElement} element - The Strong's reference element that was clicked
   * @param {string} number - The numeric part of the Strong's number (e.g., "430")
   * @param {string} type - Language type: "H" for Hebrew or "G" for Greek
   */
  function showTooltip(element, number, type) {
    const tip = createTooltip();
    const rect = element.getBoundingClientRect();

    // Calculate initial position: 8px below the trigger, aligned to left edge
    let top = rect.bottom + 8;
    let left = rect.left;

    // Horizontal overflow prevention: tooltip is ~300px wide
    if (left + 300 > window.innerWidth) {
      left = window.innerWidth - 310; // 10px right margin
    }

    // Vertical overflow prevention: tooltip is ~200px tall
    if (top + 200 > window.innerHeight) {
      top = rect.top - 200; // Flip to above the trigger
    }

    // Apply position with minimum 10px left padding
    tip.style.top = top + 'px';
    tip.style.left = Math.max(10, left) + 'px';
    tip.style.display = 'block';

    // Update ARIA attributes for accessibility
    // aria-expanded indicates the tooltip's visibility state
    element.setAttribute('aria-expanded', 'true');
    // aria-describedby creates semantic relationship between trigger and tooltip
    element.setAttribute('aria-describedby', 'strongs-tooltip');
    tip.setAttribute('aria-hidden', 'false');

    // Normalize number for display and lookup (strip leading zeros)
    const normalized = normalizeStrongsNumber(number);
    const displayNumber = parseInt(normalized, 10).toString();

    // Populate tooltip header with language type and number
    const typeName = type === 'H' ? 'Hebrew' : 'Greek';
    tip.querySelector('.strongs-number').textContent = `${typeName} ${displayNumber}`;

    // Load and display definition content
    loadDefinition(normalized, type, tip);
  }

  /**
   * Hides the tooltip and cleans up ARIA attributes
   * Removes accessibility relationships from all active triggers
   */
  function hideTooltip() {
    // Clean up ARIA attributes from all currently expanded triggers
    document.querySelectorAll('.strongs-ref[aria-expanded="true"]').forEach(el => {
      el.setAttribute('aria-expanded', 'false');
      el.removeAttribute('aria-describedby');
    });

    // Hide tooltip and mark as unavailable to screen readers
    if (tooltip) {
      tooltip.setAttribute('aria-hidden', 'true');
      tooltip.style.display = 'none';
    }
  }

  /**
   * Track Strong's numbers that have been added to the notes list
   * to avoid duplicates
   * @type {Set<string>}
   */
  const addedStrongsNotes = new Set();

  /**
   * Add a Strong's definition to the Strong's Notes section
   * @param {string} number - Strong's number (e.g., "430")
   * @param {string} type - Language type: "H" for Hebrew or "G" for Greek
   * @param {StrongsDefinition} def - The definition data
   */
  function addToStrongsNotes(number, type, def) {
    const cacheKey = `${type}${number}`;

    // Find the appropriate Strong's notes list (SSS mode or VVV mode)
    let notesList = document.getElementById('sss-strongs-list');
    let notesRow = document.getElementById('sss-notes-row');

    // If SSS mode list doesn't exist or is hidden, try VVV mode
    if (!notesList || notesRow?.classList.contains('hidden')) {
      notesList = document.getElementById('vvv-strongs-list');
      notesRow = document.getElementById('vvv-notes-row');
    }

    // Fallback: look for any visible strongs list (compare page or chapter page)
    if (!notesList) {
      notesList = document.querySelector('.strongs-notes-list');
      notesRow = notesList?.closest('.compare-notes-row, .chapter-notes-row');
    }

    if (!notesList) return;

    // Check if already added (avoid duplicates)
    if (addedStrongsNotes.has(cacheKey)) {
      // Highlight existing entry briefly
      const existingEntry = document.getElementById(`strongs-note-${cacheKey}`);
      if (existingEntry) {
        existingEntry.style.backgroundColor = 'var(--brand-100)';
        setTimeout(() => { existingEntry.style.backgroundColor = ''; }, TIMING.HIGHLIGHT_ANIMATION);
      }
      return;
    }

    addedStrongsNotes.add(cacheKey);

    // Build the note using DOM APIs (avoids innerHTML)
    const typeName = type === 'H' ? 'Hebrew' : 'Greek';
    const displayNumber = parseInt(number, 10).toString();

    // Create and append the list item
    const li = document.createElement('li');
    li.id = `strongs-note-${cacheKey}`;

    // Add strong element for type and number
    const strong = document.createElement('strong');
    strong.textContent = `${typeName} ${displayNumber}`;
    li.appendChild(strong);

    if (def.source === 'local') {
      if (def.lemma) {
        li.appendChild(document.createTextNode(' — '));
        const lemmaSpan = document.createElement('span');
        lemmaSpan.className = 'strongs-lemma';
        lemmaSpan.textContent = def.lemma;
        li.appendChild(lemmaSpan);
        if (def.xlit) {
          li.appendChild(document.createTextNode(` (${def.xlit})`));
        }
      }
      if (def.definition) {
        li.appendChild(document.createTextNode(`: ${def.definition}`));
      }
    } else if (def.note) {
      li.appendChild(document.createTextNode(`: ${def.note}`));
    }

    notesList.appendChild(li);

    // Show the notes row if it was hidden
    if (notesRow) {
      notesRow.classList.remove('hidden');
    }

    li.style.backgroundColor = 'var(--brand-100)';
    setTimeout(() => { li.style.backgroundColor = ''; }, TIMING.HIGHLIGHT_ANIMATION);
  }

  /**
   * Clear Strong's notes when navigating to new chapter
   */
  function clearStrongsNotes() {
    addedStrongsNotes.clear();
    const lists = document.querySelectorAll('.strongs-notes-list');
    lists.forEach(list => { list.textContent = ''; });
  }

  // Expose clearStrongsNotes for use by parallel.js
  window.Michael = window.Michael || {};
  window.Michael.Strongs = {
    clearNotes: clearStrongsNotes
  };

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Loads Strong's definition data with caching support
   *
   * Data Loading Strategy:
   * 1. Check in-memory cache first for instant display
   * 2. Check for local bundled JSON data (injected by Hugo partial)
   * 3. Show "not available" message if no local data found
   *
   * @param {string} number - The numeric part of the Strong's number
   * @param {string} type - Language type: "H" for Hebrew or "G" for Greek
   * @param {HTMLElement} tip - The tooltip element to populate
   */
  function loadDefinition(number, type, tip) {
    const cacheKey = `${type}${number}`;
    let def = null;

    // Check cache first to avoid redundant lookups
    if (definitionCache.has(cacheKey)) {
      def = definitionCache.get(cacheKey);
      showDefinition(tip, def);
      addToStrongsNotes(number, type, def);
      return;
    }

    // Try to get local definition first
    const localDef = getLocalDefinition(number, type);
    if (localDef) {
      definitionCache.set(cacheKey, localDef);
      showDefinition(tip, localDef);
      addToStrongsNotes(number, type, localDef);
      return;
    }

    // Fallback: Show unavailable message
    const typeName = type === 'H' ? 'Hebrew' : 'Greek';
    const displayNumber = parseInt(number, 10).toString();
    const definition = {
      number: `${type}${number}`,
      type: typeName,
      note: `${typeName} ${displayNumber} — definition not available in local data.`,
      offline: !navigator.onLine
    };

    // Cache the definition for subsequent access
    definitionCache.set(cacheKey, definition);
    showDefinition(tip, definition);
    addToStrongsNotes(number, type, definition);
  }

  /**
   * Get definition from local data (injected by Hugo partial)
   * Looks up the definition in window.Michael.StrongsData
   *
   * @param {string} number - Strong's number without prefix (e.g., "430")
   * @param {string} type - 'H' for Hebrew or 'G' for Greek
   * @returns {StrongsDefinition|null} Definition object or null if not found
   */
  function getLocalDefinition(number, type) {
    const data = type === 'H' ? localHebrewData : localGreekData;
    if (!data) return null;

    // Number should already be normalized by caller, but ensure consistency
    const key = `${type}${number}`;

    const entry = data[key];
    if (!entry) return null;

    // Skip metadata entries
    if (key.startsWith('_')) return null;

    return {
      number: key,
      type: type === 'H' ? 'Hebrew' : 'Greek',
      lemma: entry.lemma || '',
      xlit: entry.xlit || '',
      pron: entry.pron || '',
      definition: entry.def || '',
      derivation: entry.derivation || '',
      source: 'local'
    };
  }


  /**
   * Renders definition content into the tooltip
   * Formats local definitions with full details (lemma, transliteration, etc.)
   * or shows simple text for fallback definitions
   *
   * @param {HTMLElement} tip - The tooltip element to update
   * @param {StrongsDefinition} def - The definition data to display
   */
  function showDefinition(tip, def) {
    const defEl = tip.querySelector('.strongs-definition');

    if (def.source === 'local') {
      // Build definition content using DOM APIs to avoid innerHTML
      const fragment = document.createDocumentFragment();

      if (def.lemma) {
        const lemmaP = document.createElement('p');
        lemmaP.className = 'strongs-lemma';

        const lemmaLabel = document.createElement('strong');
        lemmaLabel.textContent = 'Lemma:';
        lemmaP.appendChild(lemmaLabel);
        lemmaP.appendChild(document.createTextNode(' ' + def.lemma));

        if (def.xlit) {
          lemmaP.appendChild(document.createTextNode(' (' + def.xlit + ')'));
        }

        if (def.pron) {
          lemmaP.appendChild(document.createTextNode(' '));
          const pronEm = document.createElement('em');
          pronEm.textContent = '[' + def.pron + ']';
          lemmaP.appendChild(pronEm);
        }

        fragment.appendChild(lemmaP);
      }

      if (def.definition) {
        const defP = document.createElement('p');
        defP.className = 'strongs-def';

        const defLabel = document.createElement('strong');
        defLabel.textContent = 'Definition:';
        defP.appendChild(defLabel);
        defP.appendChild(document.createTextNode(' ' + def.definition));

        fragment.appendChild(defP);
      }

      if (def.derivation) {
        const derivP = document.createElement('p');
        derivP.className = 'strongs-deriv';

        const derivSmall = document.createElement('small');
        const derivLabel = document.createElement('strong');
        derivLabel.textContent = 'Derivation:';
        derivSmall.appendChild(derivLabel);
        derivSmall.appendChild(document.createTextNode(' ' + def.derivation));
        derivP.appendChild(derivSmall);

        fragment.appendChild(derivP);
      }

      defEl.textContent = '';
      defEl.appendChild(fragment);
    } else {
      // Fallback or API definition - show simple text
      defEl.textContent = def.note || 'Definition not available';

      // Add offline indicator styling if applicable
      if (def.offline) {
        defEl.style.color = '#888';
      } else {
        defEl.style.color = ''; // Reset color
      }
    }
  }

  /**
   * Escape HTML special characters to prevent XSS
   * Uses shared utility from DomUtils module
   *
   * @param {string} str - String to escape
   * @returns {string} Escaped string safe for HTML insertion
   */
  function escapeHtml(str) {
    return window.Michael.DomUtils.escapeHtml(str);
  }

  // ============================================================================
  // OSIS WORD ELEMENT PROCESSING
  // ============================================================================

  /**
   * Process OSIS <w> elements that contain Strong's numbers in their lemma attributes
   *
   * OSIS format uses <w> elements with attributes:
   * - lemma="strong:H1234" or lemma="strong:G5678" - Strong's concordance number
   * - morph="..." - Morphology codes (verb forms, noun cases, etc.)
   *
   * This function makes <w> elements clickable to show Strong's definitions,
   * while preserving the original Hebrew/Greek text display.
   *
   * @param {HTMLElement} container - The container element to scan for <w> elements
   */
  function processOsisWordElements(container) {
    // Find all <w> elements with lemma attributes
    const wordElements = container.querySelectorAll('w[lemma]');

    wordElements.forEach(wElement => {
      // Skip if already processed
      if (wElement.dataset.strongsProcessed) return;
      wElement.dataset.strongsProcessed = 'true';

      const lemma = wElement.getAttribute('lemma') || '';
      const morph = wElement.getAttribute('morph') || '';

      // Parse Strong's number from lemma attribute
      // Format: "strong:H1234" or "strong:G5678" or multiple "strong:H1234 strong:H5678"
      const strongsMatch = lemma.match(/strong:([HG])(\d+)/i);

      if (strongsMatch) {
        const type = strongsMatch[1].toUpperCase();
        const number = normalizeStrongsNumber(strongsMatch[2]);

        // Add interactive attributes to the <w> element
        wElement.classList.add('strongs-word');
        wElement.dataset.strongsType = type;
        wElement.dataset.strongsNumber = number;
        if (morph) {
          wElement.dataset.morph = morph;
        }

        // Accessibility attributes
        const displayNum = parseInt(number, 10).toString();
        wElement.setAttribute('role', 'button');
        wElement.setAttribute('tabindex', '0');
        wElement.setAttribute('aria-label',
          `${wElement.textContent} - Strong's ${type === 'H' ? 'Hebrew' : 'Greek'} ${displayNum}`
        );
      }
    });

    // Attach event listeners to all OSIS word elements
    container.querySelectorAll('.strongs-word').forEach(el => {
      // Prevent duplicate listeners
      if (el.dataset.strongsWordListenerAdded) return;
      el.dataset.strongsWordListenerAdded = 'true';

      // Mouse/touch activation
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showTooltip(el, el.dataset.strongsNumber, el.dataset.strongsType);
      });

      // Keyboard activation
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showTooltip(el, el.dataset.strongsNumber, el.dataset.strongsType);
        }
      });
    });
  }

  // ============================================================================
  // ACCESSIBILITY
  // ============================================================================

  /**
   * Scans Bible text for Strong's numbers and converts them to interactive elements
   *
   * Process:
   * 1. Find all .bible-text containers
   * 2. Use TreeWalker to traverse text nodes only (not elements)
   * 3. Identify text nodes containing Strong's patterns (H#### or G####)
   * 4. Replace patterns with accessible <span> buttons
   * 5. Attach click and keyboard event handlers
   *
   * Strong's Number Pattern:
   * - Matches: H1234, G5678 (1-5 digits)
   * - Captures: language prefix (H/G) and number separately
   * - Regex: /([HG])(\d{1,5})/g
   *
   * Accessibility Features:
   * - role="button" for semantic meaning
   * - tabindex="0" for keyboard navigation
   * - aria-label with full Strong's number description
   * - Enter and Space key activation
   * - Focus management on tooltip open/close
   */
  function processStrongsNumbers() {
    // Find all Bible text containers in the document
    // Include compare page panes and parallel content for Strong's tooltips
    const bibleTexts = document.querySelectorAll('.bible-text, .compare-pane, #parallel-content');

    bibleTexts.forEach(container => {
      // Skip containers already processed to avoid duplicate work
      if (container.dataset.strongsProcessed) return;
      container.dataset.strongsProcessed = 'true';

      // Process OSIS <w> elements with lemma attributes
      // Format: <w lemma="strong:H430" morph="...">word</w>
      processOsisWordElements(container);

      // TreeWalker efficiently traverses only text nodes (skips elements)
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      // Collect text nodes containing Strong's numbers
      const nodesToProcess = [];
      let node;
      while (node = walker.nextNode()) {
        // Quick regex test before adding to processing queue
        if (/[HG]\d{1,5}/.test(node.textContent)) {
          nodesToProcess.push(node);
        }
      }

      // Transform text nodes: replace Strong's numbers with interactive spans
      nodesToProcess.forEach(textNode => {
        const text = textNode.textContent;
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        // Match Strong's numbers: H1234 or G5678
        // Capture groups: [1] = language (H/G), [2] = number
        const regex = /([HG])(\d{1,5})/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
          // Preserve text before this Strong's number
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }

          // Normalize number for consistent lookup and display
          const normalizedNum = normalizeStrongsNumber(match[2]);
          const displayNum = parseInt(normalizedNum, 10).toString();

          // Create accessible button for the Strong's number
          const span = document.createElement('span');
          span.className = 'strongs-ref';
          span.dataset.strongsType = match[1];       // Store language type (H/G)
          span.dataset.strongsNumber = normalizedNum; // Store normalized number for lookup
          span.textContent = `${match[1]}${displayNum}`; // Display without leading zeros (e.g., "H430")

          // Accessibility attributes
          span.setAttribute('role', 'button');
          span.setAttribute('aria-label', `Strong's ${match[1] === 'H' ? 'Hebrew' : 'Greek'} ${displayNum}`);
          span.setAttribute('tabindex', '0');

          fragment.appendChild(span);
          lastIndex = regex.lastIndex;
        }

        // Preserve remaining text after last Strong's number
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        // Replace original text node with new fragment containing interactive spans
        if (nodesToProcess.length > 0) {
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      });
    });

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    // Attach event listeners to all Strong's reference buttons
    document.querySelectorAll('.strongs-ref').forEach(el => {
      // Prevent duplicate listeners on already-processed elements
      if (el.dataset.strongsListenerAdded) return;
      el.dataset.strongsListenerAdded = 'true';

      // Mouse/touch activation
      el.addEventListener('click', (e) => {
        e.preventDefault();      // Prevent default link/button behavior
        e.stopPropagation();     // Don't trigger document click listener
        showTooltip(el, el.dataset.strongsNumber, el.dataset.strongsType);
      });

      // Keyboard activation (Enter or Space per ARIA button pattern)
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Prevent page scroll on Space
          showTooltip(el, el.dataset.strongsNumber, el.dataset.strongsType);
        }
      });
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize on DOM ready
   * Handles both early script loading and deferred execution scenarios
   */
  if (document.readyState === 'loading') {
    // DOM still loading: wait for DOMContentLoaded event
    document.addEventListener('DOMContentLoaded', processStrongsNumbers);
  } else {
    // DOM already loaded: process immediately
    processStrongsNumbers();
  }

  /**
   * Monitor for dynamically added content
   * Processes Strong's numbers in content added via AJAX, SPA routing, etc.
   *
   * MutationObserver watches for:
   * - New nodes added to the DOM (childList: true)
   * - Changes anywhere in the document tree (subtree: true)
   */
  const observer = new MutationObserver((mutations) => {
    let needsReprocess = false;
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        needsReprocess = true;
        // Clear processed flag on the mutated container so it gets re-scanned
        const target = mutation.target;
        if (target.dataset && target.dataset.strongsProcessed) {
          delete target.dataset.strongsProcessed;
        }
      }
    });
    if (needsReprocess) {
      processStrongsNumbers();
    }
  });

  // Start observing the entire document body
  observer.observe(document.body, {
    childList: true,  // Monitor child node additions/removals
    subtree: true     // Monitor entire descendant tree
  });

  // Pause observer when page is hidden to save resources
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      observer.disconnect();
    } else if (document.visibilityState === 'visible') {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      processStrongsNumbers();
    }
  });
})();
