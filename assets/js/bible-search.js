/**
 * @file bible-search.js - Client-side Bible search functionality
 * @description Provides text and Strong's number search across Bible
 *              translations with result highlighting and navigation.
 * @requires michael/bible-api.js
 * @version 2.0.0
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * DOM element references for the search interface
   * @private
   */
  const form = document.getElementById('search-form');
  const queryInput = document.getElementById('search-query');
  const bibleSelect = document.getElementById('bible-select');
  const caseSensitiveCheckbox = document.getElementById('case-sensitive');
  const wholeWordCheckbox = document.getElementById('whole-word');
  const statusEl = document.getElementById('search-status');
  const resultsEl = document.getElementById('search-results');
  const announcer = document.getElementById('search-announcer');

  /**
   * Bible index data containing metadata for all available translations.
   * Retrieved from inline JSON script element with id 'bible-index'.
   * @private
   * @type {Object}
   */
  const indexData = JSON.parse(document.getElementById('bible-index')?.textContent || '{}');

  /**
   * Base URL path for Bible data endpoints.
   * Defaults to '/bibles' if not specified in index data.
   * @private
   * @type {string}
   */
  const basePath = indexData.basePath || '/bibles';

  /**
   * Regular expression pattern for Strong's Concordance numbers.
   * Matches H or G (Hebrew/Greek) followed by 1-5 digits.
   * Examples: H1234, G5678, h1, g99999
   * @private
   * @const {RegExp}
   */
  const STRONGS_PATTERN = /^[HG]\d{1,5}$/i;

  /**
   * Regular expression pattern for phrase search queries.
   * Matches text enclosed in double quotes.
   * Example: "in the beginning"
   * @private
   * @const {RegExp}
   */
  const PHRASE_PATTERN = /^"(.+)"$/;

  /**
   * AbortController for canceling ongoing search operations.
   * Allows new searches to cancel previous ones to prevent race conditions.
   * @private
   * @type {AbortController|null}
   */
  let searchAbortController = null;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Escapes HTML special characters to prevent XSS attacks.
   * Uses the browser's native HTML encoding via textContent/innerHTML.
   *
   * This is critical for security when displaying user-generated content
   * or search results that may contain special characters.
   *
   * @private
   * @param {string} str - The string to escape
   * @returns {string} HTML-safe string with special characters encoded
   *
   * @example
   * escapeHtml('<script>alert("xss")</script>')
   * // Returns: '&lt;script&gt;alert("xss")&lt;/script&gt;'
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Escapes special characters in a string for use in regular expressions.
   * All regex metacharacters are prefixed with backslash for literal matching.
   *
   * @private
   * @param {string} string - The string to escape
   * @returns {string} Regex-safe string with metacharacters escaped
   *
   * @example
   * escapeRegex('hello.*world')
   * // Returns: 'hello\\.\\*world'
   */
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Announces a message to screen readers via the aria-live region.
   * Updates the announcer element which has aria-live="polite" for accessibility.
   *
   * @private
   * @param {string} message - The message to announce to screen reader users
   *
   * @example
   * announce('Searching for "love"...')
   * announce('Found 42 results')
   * announce('No results found')
   */
  function announce(message) {
    if (announcer) {
      announcer.textContent = message;
    }
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  /**
   * Initializes the search interface from URL query parameters.
   * Reads search parameters from the URL and populates form fields,
   * then automatically triggers a search if a query is present.
   *
   * URL Parameters:
   * - q: Search query string
   * - bible: Bible translation ID
   * - case: Case-sensitive flag ('1' for true)
   * - word: Whole-word search flag ('1' for true)
   *
   * @private
   *
   * @example
   * // URL: /search/?q=love&bible=kjv&case=1
   * // Sets queryInput.value = "love"
   * // Sets bibleSelect.value = "kjv"
   * // Checks caseSensitiveCheckbox
   * // Triggers performSearch()
   */
  function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const bible = params.get('bible');

    if (q) queryInput.value = q;
    if (bible && bibleSelect.querySelector(`option[value="${bible}"]`)) {
      bibleSelect.value = bible;
    }
    if (params.get('case') === '1') caseSensitiveCheckbox.checked = true;
    if (params.get('word') === '1') wholeWordCheckbox.checked = true;

    if (q) {
      performSearch();
    }
  }

  /**
   * Updates the browser URL with current search parameters.
   * Uses replaceState to update URL without creating new history entry.
   * This allows users to bookmark or share specific searches.
   *
   * @private
   * @param {string} query - The search query
   * @param {string} bible - Bible translation ID
   * @param {boolean} caseSensitive - Whether search is case-sensitive
   * @param {boolean} wholeWord - Whether to match whole words only
   *
   * @example
   * updateUrl('love', 'kjv', true, false)
   * // Updates URL to: /search/?q=love&bible=kjv&case=1
   */
  function updateUrl(query, bible, caseSensitive, wholeWord) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (bible) params.set('bible', bible);
    if (caseSensitive) params.set('case', '1');
    if (wholeWord) params.set('word', '1');

    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }

  /**
   * Fetches chapter content from the Bible API module.
   * Retrieves verse data on-demand rather than loading entire Bible upfront.
   * This approach keeps memory usage low (fetches ~1-2KB per chapter vs 32MB total).
   *
   * @private
   * @async
   * @param {string} bible - Bible translation ID (e.g., 'kjv', 'nasb')
   * @param {string} bookId - Book identifier (e.g., 'gen', 'mat')
   * @param {number} chapterNum - Chapter number (1-indexed)
   * @param {AbortSignal} signal - Signal for canceling the fetch operation
   * @returns {Promise<Array<{num: string, text: string}>|null>} Array of verse objects or null if fetch fails
   *
   * @example
   * const verses = await fetchChapter('kjv', 'gen', 1, signal);
   * // Returns: [{ num: '1', text: 'In the beginning...' }, ...]
   */
  async function fetchChapter(bible, bookId, chapterNum, signal) {
    const verses = await window.Michael.BibleAPI.fetchChapter(basePath, bible, bookId, chapterNum, signal);

    // Convert from BibleAPI format { number: int, text: string }
    // to search format { num: string, text: string }
    if (!verses) return null;

    return verses.map(v => ({
      num: String(v.number),
      text: v.text
    }));
  }

  // ============================================================================
  // SEARCH ENGINE
  // ============================================================================

  /**
   * Parses a search query to determine its type and extract the search value.
   *
   * Search Algorithm:
   * 1. Strong's Number Detection: Checks if query matches H#### or G#### pattern
   *    - H prefix indicates Hebrew (Old Testament)
   *    - G prefix indicates Greek (New Testament)
   *    - Numbers can be 1-5 digits (e.g., H1, G5678)
   *
   * 2. Phrase Search Detection: Checks if query is enclosed in quotes
   *    - Extracts quoted content for exact phrase matching
   *    - Example: "in the beginning" matches only that exact phrase
   *
   * 3. Text Search (default): Regular keyword search
   *    - Can be modified by case-sensitive and whole-word options
   *    - Supports partial word matching unless whole-word is enabled
   *
   * @private
   * @param {string} query - The raw search query from user input
   * @returns {{type: string, value: string, language?: string}} Parsed query object
   *
   * @example
   * parseQuery('H1234')
   * // Returns: { type: 'strongs', value: 'H1234', language: 'Hebrew' }
   *
   * @example
   * parseQuery('"in the beginning"')
   * // Returns: { type: 'phrase', value: 'in the beginning' }
   *
   * @example
   * parseQuery('love')
   * // Returns: { type: 'text', value: 'love' }
   */
  function parseQuery(query) {
    // Check for Strong's number (H1234 or G5678)
    if (STRONGS_PATTERN.test(query)) {
      return {
        type: 'strongs',
        value: query.toUpperCase(),
        language: query.charAt(0).toUpperCase() === 'H' ? 'Hebrew' : 'Greek'
      };
    }

    // Check for phrase search ("exact phrase")
    const phraseMatch = query.match(PHRASE_PATTERN);
    if (phraseMatch) {
      return {
        type: 'phrase',
        value: phraseMatch[1]
      };
    }

    // Default to text search
    return {
      type: 'text',
      value: query
    };
  }

  /**
   * Tests whether a verse text matches the search query.
   *
   * Matching Algorithm:
   *
   * 1. Strong's Number Search:
   *    - Creates word-boundary regex: \bH1234\b or \bG5678\b
   *    - Always case-insensitive (Strong's numbers are standardized)
   *    - Requires exact number match with word boundaries
   *    - Note: Only works with Bibles that include Strong's concordance data
   *
   * 2. Phrase Search:
   *    - Uses String.includes() for substring matching
   *    - Respects case-sensitive option
   *    - Finds exact phrase anywhere in verse
   *
   * 3. Text Search:
   *    - Default: Uses String.includes() for partial matching
   *    - Whole-word option: Uses regex with word boundaries (\b)
   *    - Respects both case-sensitive and whole-word options
   *
   * Performance: String.includes() is faster than regex for simple searches.
   * Regex is only used when necessary (whole-word or Strong's search).
   *
   * @private
   * @param {string} text - The verse text to search within
   * @param {string} query - The search query
   * @param {boolean} caseSensitive - Whether to match case exactly
   * @param {boolean} wholeWord - Whether to match whole words only (ignored for phrase/Strong's)
   * @returns {boolean} True if text matches the query
   *
   * @example
   * matchesQuery('For God so loved the world', 'love', false, false)
   * // Returns: true (partial match)
   *
   * @example
   * matchesQuery('For God so loved the world', 'love', false, true)
   * // Returns: false ('love' doesn't match 'loved' as whole word)
   */
  function matchesQuery(text, query, caseSensitive, wholeWord) {
    const parsed = parseQuery(query);

    if (parsed.type === 'strongs') {
      // Strong's number search - look for the exact pattern
      // Strong's numbers in text appear as H1234 or G5678
      // Always case-insensitive since Strong's numbers are standardized
      const strongsRegex = new RegExp(`\\b${escapeRegex(parsed.value)}\\b`, 'i');
      return strongsRegex.test(text);
    }

    if (parsed.type === 'phrase') {
      // Phrase search - exact substring match
      // More efficient than regex for simple substring search
      let searchText = caseSensitive ? text : text.toLowerCase();
      let searchPhrase = caseSensitive ? parsed.value : parsed.value.toLowerCase();
      return searchText.includes(searchPhrase);
    }

    // Default text search
    let searchText = caseSensitive ? text : text.toLowerCase();
    let searchQuery = caseSensitive ? query : query.toLowerCase();

    if (wholeWord) {
      // Word-boundary regex: \bword\b ensures complete word match
      const regex = new RegExp(`\\b${escapeRegex(searchQuery)}\\b`, caseSensitive ? '' : 'i');
      return regex.test(text);
    }

    // Simple substring search - fastest option
    return searchText.includes(searchQuery);
  }

  // ============================================================================
  // HIGHLIGHTING
  // ============================================================================

  /**
   * Highlights matching text within a verse using <mark> tags.
   *
   * Security: This function is CSP-compliant and XSS-safe.
   * - HTML is escaped BEFORE regex replacement to prevent injection
   * - Only <mark> tags are added, no user content becomes HTML
   * - Uses Content Security Policy safe inline styles (via CSS variables)
   *
   * Highlighting Process:
   * 1. Parse query to extract search term and determine type
   * 2. Escape HTML in both verse text and search term (XSS prevention)
   * 3. Build regex with appropriate flags based on search type
   * 4. Replace matches with <mark>$1</mark> wrapper
   *
   * Regex Flags:
   * - Strong's numbers: 'gi' (always case-insensitive, global)
   * - Case-sensitive text: 'g' (global only)
   * - Case-insensitive text: 'gi' (case-insensitive, global)
   *
   * @private
   * @param {string} text - The verse text to highlight (may contain HTML-unsafe chars)
   * @param {string} query - The original search query
   * @param {boolean} caseSensitive - Whether search was case-sensitive
   * @returns {string} HTML string with matches wrapped in <mark> tags
   *
   * @example
   * highlightMatches('For God so loved the world', 'love', false)
   * // Returns: 'For God so <mark>love</mark>d the world'
   *
   * @example
   * highlightMatches('<script>alert("xss")</script>', 'script', false)
   * // Returns: '&lt;<mark>script</mark>&gt;alert("xss")&lt;/<mark>script</mark>&gt;'
   * // Note: HTML is escaped, preventing XSS attack
   */
  function highlightMatches(text, query, caseSensitive) {
    const parsed = parseQuery(query);
    let searchTerm = parsed.value;

    // CRITICAL XSS FIX: Escape HTML BEFORE applying regex highlighting
    // This prevents malicious verse content or search terms from injecting HTML/JS
    // The escapeHtml() function converts characters like < > & " to entities
    const escapedText = escapeHtml(text);
    const escapedTerm = escapeHtml(searchTerm);

    // For Strong's numbers, use case-insensitive matching (Strong's are standardized)
    // For text search, respect the caseSensitive parameter
    const flags = (parsed.type === 'strongs') ? 'gi' : (caseSensitive ? 'g' : 'gi');
    const regex = new RegExp(`(${escapeRegex(escapedTerm)})`, flags);

    // Replace matches with <mark> wrapper - this is safe because we escaped HTML first
    return escapedText.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Performs a search across all chapters of the selected Bible translation.
   *
   * Search Strategy:
   * 1. Validation: Ensures query is at least 2 characters
   * 2. Cancellation: Aborts any previous search to prevent race conditions
   * 3. Sequential Scanning: Iterates through all books and chapters in order
   * 4. On-Demand Loading: Fetches each chapter only when needed (~1-2KB per fetch)
   * 5. Incremental Display: Shows first 100 results as they're found
   * 6. UI Yielding: Yields to event loop every 10 chapters to keep UI responsive
   *
   * Performance Characteristics:
   * - Memory: Low (fetches chapters individually vs loading 32MB upfront)
   * - Time: O(n) where n = total verses (~31,000 for complete Bible)
   * - Network: Makes ~1,189 HTTP requests (one per chapter)
   * - Typical search time: 10-30 seconds for complete Bible scan
   *
   * Result Ranking:
   * Results are returned in canonical Bible order (Genesis to Revelation).
   * No relevance ranking is applied. First match in book order appears first.
   *
   * Cancellation:
   * Uses AbortController to cancel network requests when:
   * - User starts a new search
   * - User navigates away from page
   * - Search form is resubmitted
   *
   * @async
   * @throws {Error} Network errors during chapter fetch (caught and displayed to user)
   *
   * @example
   * // User enters "love" and clicks search
   * // Function validates input, cancels previous search,
   * // iterates through all chapters, and displays results
   */
  async function performSearch() {
    const query = queryInput.value.trim();
    const bible = bibleSelect.value;
    const caseSensitive = caseSensitiveCheckbox.checked;
    const wholeWord = wholeWordCheckbox.checked;

    if (!query || query.length < 2) {
      showMessage('Please enter at least 2 characters to search.');
      return;
    }

    // Cancel any previous search to prevent race conditions and wasted resources
    if (searchAbortController) {
      searchAbortController.abort();
    }
    searchAbortController = new AbortController();
    const signal = searchAbortController.signal;

    // Update URL for bookmarking/sharing
    updateUrl(query, bible, caseSensitive, wholeWord);

    // Show searching status and announce to screen readers
    statusEl.classList.remove('hidden');
    resultsEl.innerHTML = '';
    announce(`Searching for "${query}" in ${bibleSelect.options[bibleSelect.selectedIndex]?.text || 'Bible'}...`);

    const bibleData = indexData.bibles?.[bible];
    if (!bibleData) {
      showMessage('Bible not found.');
      announce('Error: Bible not found.');
      return;
    }

    const results = [];
    let chaptersSearched = 0;
    const totalChapters = bibleData.books.reduce((sum, b) => sum + b.chapters, 0);

    try {
      // Sequential search through each book and chapter
      // Results appear in canonical Bible order (no relevance ranking)
      for (const book of bibleData.books) {
        for (let ch = 1; ch <= book.chapters; ch++) {
          // Check if search was canceled
          if (signal.aborted) return;

          chaptersSearched++;
          statusEl.textContent = `Searching ${book.name} ${ch}... (${chaptersSearched}/${totalChapters})`;

          const verses = await fetchChapter(bible, book.id, ch, signal);

          if (verses) {
            for (const verse of verses) {
              if (matchesQuery(verse.text, query, caseSensitive, wholeWord)) {
                results.push({
                  book: book.name,
                  bookId: book.id,
                  chapter: ch,
                  verse: verse.num,
                  text: verse.text
                });

                // Show results incrementally (first 100 only to prevent DOM bloat)
                if (results.length <= 100) {
                  renderResults(results, query, caseSensitive, bible, bibleData);
                }
              }
            }
          }

          // Yield to event loop every 10 chapters to keep UI responsive
          // setTimeout(fn, 0) allows browser to process events/render updates
          if (chaptersSearched % 10 === 0) {
            await new Promise(r => setTimeout(r, 0));
          }
        }
      }

      // Final render with complete results
      statusEl.classList.add('hidden');
      renderResults(results, query, caseSensitive, bible, bibleData);

      if (results.length === 0) {
        const parsed = parseQuery(query);
        let message = '';
        if (parsed.type === 'strongs') {
          message = `No verses containing Strong's number "${parsed.value}" found in ${bibleData.title}. Note: Strong's numbers require Bible translations with Strong's data.`;
        } else if (parsed.type === 'phrase') {
          message = `No results found for phrase "${parsed.value}" in ${bibleData.title}.`;
        } else {
          message = `No results found for "${query}" in ${bibleData.title}.`;
        }
        showMessage(message);
        announce('No results found.');
      } else {
        // Announce result count to screen readers
        const resultText = results.length === 1 ? 'result' : 'results';
        announce(`Found ${results.length} ${resultText} for "${query}".`);
      }

    } catch (e) {
      // Ignore AbortError (happens when user cancels search)
      // Log and display other errors
      if (e.name !== 'AbortError') {
        console.error('Search error:', e);
        showMessage('An error occurred during search. Please try again.');
      }
    }
  }

  // ============================================================================
  // RESULT DISPLAY
  // ============================================================================

  /**
   * Renders search results to the DOM.
   *
   * Display Strategy:
   * - Shows maximum of 100 results to prevent DOM bloat
   * - Displays total count even if more than 100 found
   * - Generates unique URL for each verse result
   * - Applies syntax highlighting to matched terms
   *
   * Result Format:
   * Each result is rendered as an <article> with:
   * - Header containing linked verse reference (Book Chapter:Verse)
   * - Verse text with search terms highlighted in <mark> tags
   * - URL includes verse parameter (?v=N) for auto-scrolling
   *
   * @private
   * @param {Array<Object>} results - Array of search result objects
   * @param {string} results[].book - Book name (e.g., 'Genesis')
   * @param {string} results[].bookId - Book ID (e.g., 'gen')
   * @param {number} results[].chapter - Chapter number
   * @param {string} results[].verse - Verse number (as string)
   * @param {string} results[].text - Full verse text
   * @param {string} query - Original search query
   * @param {boolean} caseSensitive - Whether search was case-sensitive
   * @param {string} bible - Bible translation ID
   * @param {Object} bibleData - Bible metadata object
   * @param {string} bibleData.title - Display title of the Bible
   *
   * @example
   * renderResults([
   *   { book: 'John', bookId: 'jhn', chapter: 3, verse: '16', text: 'For God so loved...' }
   * ], 'love', false, 'kjv', { title: 'King James Version' });
   */
  function renderResults(results, query, caseSensitive, bible, bibleData) {
    const limitedResults = results.slice(0, 100);
    const parsed = parseQuery(query);

    // Build search type description for header
    let searchDesc = '';
    if (parsed.type === 'strongs') {
      searchDesc = ` for Strong's ${parsed.language} ${parsed.value}`;
    } else if (parsed.type === 'phrase') {
      searchDesc = ` for phrase "${parsed.value}"`;
    } else {
      searchDesc = ` for "${query}"`;
    }

    let html = `
      <p style="color: var(--michael-text-muted); margin-bottom: 1rem;">
        Found ${results.length} result${results.length !== 1 ? 's' : ''}${searchDesc} in ${bibleData.title}
        ${results.length > 100 ? ' (showing first 100)' : ''}
      </p>
    `;

    for (const result of limitedResults) {
      // Build URL: /bibles/{bible}/{book}/{chapter}/?v={verse}
      // The ?v= parameter triggers auto-scroll to verse in reader view
      const url = `${basePath}/${bible}/${result.bookId.toLowerCase()}/${result.chapter}/?v=${result.verse}`;
      const highlightedText = highlightMatches(result.text, query, caseSensitive);

      html += `
        <article class="search-result">
          <header>
            <h3>
              <a href="${url}">${result.book} ${result.chapter}:${result.verse}</a>
            </h3>
          </header>
          <div class="verse-text">
            ${highlightedText}
          </div>
        </article>
      `;
    }

    resultsEl.innerHTML = html;
  }

  /**
   * Displays a status or error message to the user.
   * Hides the search status indicator and replaces results area with message.
   *
   * @private
   * @param {string} msg - The message to display (plain text, will be rendered as-is)
   *
   * @example
   * showMessage('Please enter at least 2 characters to search.')
   */
  function showMessage(msg) {
    statusEl.classList.add('hidden');
    resultsEl.innerHTML = `
      <p style="text-align: center; color: var(--michael-text-muted); padding: 3rem 0;">
        ${msg}
      </p>
    `;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Form submission handler.
   * Prevents default form submission and triggers client-side search.
   *
   * @private
   * @listens submit
   */
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch();
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize search interface from URL parameters.
   * Runs immediately when script loads.
   */
  initFromUrl();
})();
