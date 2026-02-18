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
   * Defaults to '/bible' if not specified in index data.
   * @private
   * @type {string}
   */
  const basePath = indexData.basePath || '/bible';

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
    return window.Michael.DomUtils.escapeHtml(str);
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
   * Highlights matching text within a verse using DOM <mark> elements.
   *
   * Security: This function is XSS-safe by construction.
   * - Text content is set via textContent, never innerHTML
   * - No HTML string concatenation or parsing is performed
   * - Only <mark> elements are created programmatically; no user content becomes markup
   *
   * Highlighting Process:
   * 1. Parse query to extract search term and determine type
   * 2. Build regex with appropriate flags based on search type
   * 3. Split plain text on match boundaries
   * 4. Append alternating text nodes and <mark> elements to a DocumentFragment
   *
   * Regex Flags:
   * - Strong's numbers: 'gi' (always case-insensitive, global)
   * - Case-sensitive text: 'g' (global only)
   * - Case-insensitive text: 'gi' (case-insensitive, global)
   *
   * @private
   * @param {string} text - The verse text to highlight
   * @param {string} query - The original search query
   * @param {boolean} caseSensitive - Whether search was case-sensitive
   * @returns {DocumentFragment} Fragment with text nodes and <mark> elements
   *
   * @example
   * // highlightMatches('For God so loved the world', 'love', false)
   * // Returns a DocumentFragment equivalent to: 'For God so <mark>love</mark>d the world'
   */
  function highlightMatches(text, query, caseSensitive) {
    const parsed = parseQuery(query);
    const searchTerm = parsed.value;

    // For Strong's numbers, use case-insensitive matching (Strong's are standardized)
    // For text search, respect the caseSensitive parameter
    const flags = (parsed.type === 'strongs') ? 'gi' : (caseSensitive ? 'g' : 'gi');
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, flags);

    const fragment = document.createDocumentFragment();
    const parts = text.split(regex);

    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === '') continue;
      // Every odd-indexed part is a regex capture group match (the highlighted term)
      if (i % 2 === 1) {
        const mark = document.createElement('mark');
        mark.textContent = parts[i];
        fragment.appendChild(mark);
      } else {
        fragment.appendChild(document.createTextNode(parts[i]));
      }
    }

    return fragment;
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
  /**
   * Validates the search query string.
   * Returns an error message string if invalid, or null if valid.
   *
   * @param {string} query - The trimmed search query.
   * @returns {string|null} Error message, or null when the query is acceptable.
   */
  function validateSearchInput(query) {
    if (!query || query.length < 2) {
      return 'Please enter at least 2 characters to search.';
    }
    if (query.length > 256) {
      return 'Search query too long (max 256 characters).';
    }
    return null;
  }

  /**
   * Searches a single chapter's verses and appends matching results.
   * Triggers an incremental render for every new match up to the first 100.
   *
   * @param {Array}    verses        - Verse objects returned by fetchChapter.
   * @param {string}   query         - The raw search query.
   * @param {boolean}  caseSensitive - Whether the match is case-sensitive.
   * @param {boolean}  wholeWord     - Whether to match whole words only.
   * @param {Array}    results       - Accumulator array for matched verses.
   * @param {Object}   book          - Book metadata (name, id, chapters).
   * @param {number}   ch            - Chapter number being searched.
   * @param {Function} renderFn      - Callback invoked with updated results array.
   */
  function searchChapterVerses(verses, query, caseSensitive, wholeWord, results, book, ch, renderFn) {
    for (const verse of verses) {
      if (!matchesQuery(verse.text, query, caseSensitive, wholeWord)) continue;

      results.push({
        book: book.name,
        bookId: book.id,
        chapter: ch,
        verse: verse.num,
        text: verse.text
      });

      // Show results incrementally (first 100 only to prevent DOM bloat)
      if (results.length <= 100) {
        renderFn(results);
      }
    }
  }

  /**
   * Builds the "no results" message based on the parsed query type.
   *
   * @param {string} query     - The raw search query.
   * @param {Object} bibleData - Metadata for the selected Bible translation.
   * @returns {string} Human-readable message explaining why nothing was found.
   */
  function buildNoResultsMessage(query, bibleData) {
    const parsed = parseQuery(query);
    if (parsed.type === 'strongs') {
      return `No verses containing Strong's number "${parsed.value}" found in ${bibleData.title}. Note: Strong's numbers require Bible translations with Strong's data.`;
    }
    if (parsed.type === 'phrase') {
      return `No results found for phrase "${parsed.value}" in ${bibleData.title}.`;
    }
    return `No results found for "${query}" in ${bibleData.title}.`;
  }

  /**
   * Iterates every book and chapter in bibleData, fetching and searching each.
   * Yields to the event loop every 10 chapters to keep the UI responsive.
   * Returns early (without throwing) when the AbortSignal fires.
   *
   * @async
   * @param {Object}   bibleData     - Metadata for the selected Bible translation.
   * @param {string}   bible         - Bible translation identifier.
   * @param {string}   query         - The raw search query.
   * @param {boolean}  caseSensitive - Whether the match is case-sensitive.
   * @param {boolean}  wholeWord     - Whether to match whole words only.
   * @param {AbortSignal} signal     - Signal used to cancel in-flight fetches.
   * @param {Function} renderFn      - Callback invoked with updated results array.
   * @returns {Promise<Array>} Array of all matched verse result objects.
   */
  async function searchAllBooks(bibleData, bible, query, caseSensitive, wholeWord, signal, renderFn) {
    const results = [];
    let chaptersSearched = 0;
    const totalChapters = bibleData.books.reduce((sum, b) => sum + b.chapters, 0);

    // Sequential search through each book and chapter.
    // Results appear in canonical Bible order (no relevance ranking).
    for (const book of bibleData.books) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        // Check if search was canceled
        if (signal.aborted) return results;

        chaptersSearched++;
        statusEl.textContent = `Searching ${book.name} ${ch}... (${chaptersSearched}/${totalChapters})`;

        const verses = await fetchChapter(bible, book.id, ch, signal);

        if (verses) {
          searchChapterVerses(verses, query, caseSensitive, wholeWord, results, book, ch, renderFn);
        }

        // Yield to event loop every 10 chapters to keep UI responsive.
        // setTimeout(fn, 0) allows browser to process events/render updates.
        if (chaptersSearched % 10 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }
    }

    return results;
  }

  async function performSearch() {
    const query = queryInput.value.trim();
    const bible = bibleSelect.value;
    const caseSensitive = caseSensitiveCheckbox.checked;
    const wholeWord = wholeWordCheckbox.checked;

    const validationError = validateSearchInput(query);
    if (validationError) {
      showMessage(validationError);
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
    resultsEl.textContent = '';
    announce(`Searching for "${query}" in ${bibleSelect.options[bibleSelect.selectedIndex]?.text || 'Bible'}...`);

    const bibleData = indexData.bibles?.[bible];
    if (!bibleData) {
      showMessage('Bible not found.');
      announce('Error: Bible not found.');
      return;
    }

    const renderFn = (results) => renderResults(results, query, caseSensitive, bible, bibleData);

    try {
      const results = await searchAllBooks(bibleData, bible, query, caseSensitive, wholeWord, signal, renderFn);

      // Final render with complete results
      statusEl.classList.add('hidden');
      renderResults(results, query, caseSensitive, bible, bibleData);

      if (results.length === 0) {
        showMessage(buildNoResultsMessage(query, bibleData));
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

    const fragment = document.createDocumentFragment();

    // Build summary paragraph
    const summary = document.createElement('p');
    summary.style.color = 'var(--michael-text-muted)';
    summary.style.marginBottom = '1rem';

    let summaryText = `Found ${results.length} result${results.length !== 1 ? 's' : ''}`;
    if (parsed.type === 'strongs') {
      summaryText += ` for Strong's ${parsed.language} ${parsed.value}`;
    } else if (parsed.type === 'phrase') {
      summaryText += ` for phrase "${parsed.value}"`;
    } else {
      summaryText += ` for "${query}"`;
    }
    summaryText += ` in ${bibleData.title}`;
    if (results.length > 100) {
      summaryText += ' (showing first 100)';
    }
    summary.textContent = summaryText;
    fragment.appendChild(summary);

    for (const result of limitedResults) {
      // Build URL: /bible/{bible}/{book}/{chapter}/?v={verse}
      // The ?v= parameter triggers auto-scroll to verse in reader view
      const url = `${basePath}/${bible}/${result.bookId.toLowerCase()}/${result.chapter}/?v=${result.verse}`;

      const article = document.createElement('article');
      article.className = 'search-result';

      const header = document.createElement('header');
      const h3 = document.createElement('h3');
      const a = document.createElement('a');
      a.href = url;
      a.textContent = `${result.book} ${result.chapter}:${result.verse}`;
      h3.appendChild(a);
      header.appendChild(h3);
      article.appendChild(header);

      const verseDiv = document.createElement('div');
      verseDiv.className = 'verse-text';
      verseDiv.appendChild(highlightMatches(result.text, query, caseSensitive));
      article.appendChild(verseDiv);

      fragment.appendChild(article);
    }

    resultsEl.textContent = '';
    resultsEl.appendChild(fragment);
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
    resultsEl.textContent = '';
    const p = document.createElement('p');
    p.className = 'center muted';
    p.style.padding = '3rem 0';
    p.textContent = msg;
    resultsEl.appendChild(p);
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
