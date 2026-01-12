/**
 * Bible Search - Client-side search across Bible translations
 *
 * Fetches chapter pages on-demand to search verse content
 * without loading all 32MB of Bible data upfront.
 *
 * Supports:
 * - Text search (regular words)
 * - Strong's number search (H#### for Hebrew, G#### for Greek)
 * - Phrase search (quoted phrases like "in the beginning")
 */

(function() {
  'use strict';

  // Elements
  const form = document.getElementById('search-form');
  const queryInput = document.getElementById('search-query');
  const bibleSelect = document.getElementById('bible-select');
  const caseSensitiveCheckbox = document.getElementById('case-sensitive');
  const wholeWordCheckbox = document.getElementById('whole-word');
  const statusEl = document.getElementById('search-status');
  const resultsEl = document.getElementById('search-results');
  const indexData = JSON.parse(document.getElementById('bible-index')?.textContent || '{}');

  // Configurable base path (from index data or default)
  const basePath = indexData.basePath || '/religion/bibles';

  // Strong's number pattern: H or G followed by 1-5 digits
  const STRONGS_PATTERN = /^[HG]\d{1,5}$/i;
  // Phrase search pattern: text in quotes
  const PHRASE_PATTERN = /^"(.+)"$/;

  // Search state
  let searchAbortController = null;
  let searchCache = new Map(); // Cache fetched chapter data

  // Initialize from URL params
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

  // Update URL with search params
  function updateUrl(query, bible, caseSensitive, wholeWord) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (bible) params.set('bible', bible);
    if (caseSensitive) params.set('case', '1');
    if (wholeWord) params.set('word', '1');

    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }

  // Fetch chapter content
  async function fetchChapter(bible, bookId, chapterNum, signal) {
    const cacheKey = `${bible}/${bookId}/${chapterNum}`;

    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey);
    }

    const url = `${basePath}/${bible}/${bookId.toLowerCase()}/${chapterNum}/`;

    try {
      const response = await fetch(url, { signal });
      if (!response.ok) return null;

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract verses from the page
      const verses = [];
      const verseElements = doc.querySelectorAll('.verse, [data-verse]');

      verseElements.forEach(el => {
        const verseNum = el.dataset.verse || el.querySelector('.verse-num')?.textContent?.trim();
        const text = el.textContent?.replace(/^\d+\s*/, '').trim();

        if (verseNum && text) {
          verses.push({ num: verseNum, text });
        }
      });

      // Fallback: try to parse verse spans directly
      if (verses.length === 0) {
        const spans = doc.querySelectorAll('span[id^="v"]');
        spans.forEach(span => {
          const id = span.id;
          const match = id.match(/v(\d+)/);
          if (match) {
            verses.push({ num: match[1], text: span.textContent?.trim() || '' });
          }
        });
      }

      // Another fallback: parse the prose content
      if (verses.length === 0) {
        const prose = doc.querySelector('.bible-text, .prose, article');
        if (prose) {
          // Look for verse numbers in superscript or as prefixes
          const text = prose.innerHTML;
          let versePattern = /<sup[^>]*>(\d+)<\/sup>\s*([^<]+)/g;
          let match;
          while ((match = versePattern.exec(text)) !== null) {
            verses.push({ num: match[1], text: match[2].trim() });
          }

          // Also try strong tags (Hugo renders **1** as <strong>1</strong>)
          if (verses.length === 0) {
            versePattern = /<strong>(\d+)<\/strong>\s*([^<]+)/g;
            while ((match = versePattern.exec(text)) !== null) {
              verses.push({ num: match[1], text: match[2].trim() });
            }
          }
        }
      }

      searchCache.set(cacheKey, verses);
      return verses;
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      console.warn(`Failed to fetch ${url}:`, e);
      return null;
    }
  }

  // Parse query to determine search type
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

  // Search within text
  function matchesQuery(text, query, caseSensitive, wholeWord) {
    const parsed = parseQuery(query);

    if (parsed.type === 'strongs') {
      // Strong's number search - look for the exact pattern
      // Strong's numbers in text appear as H1234 or G5678
      const strongsRegex = new RegExp(`\\b${escapeRegex(parsed.value)}\\b`, 'i');
      return strongsRegex.test(text);
    }

    if (parsed.type === 'phrase') {
      // Phrase search - exact match
      let searchText = caseSensitive ? text : text.toLowerCase();
      let searchPhrase = caseSensitive ? parsed.value : parsed.value.toLowerCase();
      return searchText.includes(searchPhrase);
    }

    // Default text search
    let searchText = caseSensitive ? text : text.toLowerCase();
    let searchQuery = caseSensitive ? query : query.toLowerCase();

    if (wholeWord) {
      const regex = new RegExp(`\\b${escapeRegex(searchQuery)}\\b`, caseSensitive ? '' : 'i');
      return regex.test(text);
    }

    return searchText.includes(searchQuery);
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Highlight matches in text
  function highlightMatches(text, query, caseSensitive) {
    const parsed = parseQuery(query);
    let searchTerm = parsed.value;

    // For Strong's numbers, use case-insensitive matching
    const flags = (parsed.type === 'strongs') ? 'gi' : (caseSensitive ? 'g' : 'gi');
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, flags);
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Perform search
  async function performSearch() {
    const query = queryInput.value.trim();
    const bible = bibleSelect.value;
    const caseSensitive = caseSensitiveCheckbox.checked;
    const wholeWord = wholeWordCheckbox.checked;

    if (!query || query.length < 2) {
      showMessage('Please enter at least 2 characters to search.');
      return;
    }

    // Cancel any previous search
    if (searchAbortController) {
      searchAbortController.abort();
    }
    searchAbortController = new AbortController();
    const signal = searchAbortController.signal;

    // Update URL
    updateUrl(query, bible, caseSensitive, wholeWord);

    // Show searching status
    statusEl.classList.remove('hidden');
    resultsEl.innerHTML = '';

    const bibleData = indexData.bibles?.[bible];
    if (!bibleData) {
      showMessage('Bible not found.');
      return;
    }

    const results = [];
    let chaptersSearched = 0;
    const totalChapters = bibleData.books.reduce((sum, b) => sum + b.chapters, 0);

    try {
      // Search through each book and chapter
      for (const book of bibleData.books) {
        for (let ch = 1; ch <= book.chapters; ch++) {
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

                // Show results incrementally
                if (results.length <= 100) {
                  renderResults(results, query, caseSensitive, bible, bibleData);
                }
              }
            }
          }

          // Small delay to prevent UI blocking
          if (chaptersSearched % 10 === 0) {
            await new Promise(r => setTimeout(r, 0));
          }
        }
      }

      // Final render
      statusEl.classList.add('hidden');
      renderResults(results, query, caseSensitive, bible, bibleData);

      if (results.length === 0) {
        const parsed = parseQuery(query);
        if (parsed.type === 'strongs') {
          showMessage(`No verses containing Strong's number "${parsed.value}" found in ${bibleData.title}. Note: Strong's numbers require Bible translations with Strong's data.`);
        } else if (parsed.type === 'phrase') {
          showMessage(`No results found for phrase "${parsed.value}" in ${bibleData.title}.`);
        } else {
          showMessage(`No results found for "${query}" in ${bibleData.title}.`);
        }
      }

    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Search error:', e);
        showMessage('An error occurred during search. Please try again.');
      }
    }
  }

  // Render results
  function renderResults(results, query, caseSensitive, bible, bibleData) {
    const limitedResults = results.slice(0, 100);
    const parsed = parseQuery(query);

    // Build search type description
    let searchDesc = '';
    if (parsed.type === 'strongs') {
      searchDesc = ` for Strong's ${parsed.language} ${parsed.value}`;
    } else if (parsed.type === 'phrase') {
      searchDesc = ` for phrase "${parsed.value}"`;
    } else {
      searchDesc = ` for "${query}"`;
    }

    let html = `
      <p class="font-hand" style="color: var(--michael-gray); margin-bottom: 1rem;">
        Found ${results.length} result${results.length !== 1 ? 's' : ''}${searchDesc} in ${bibleData.title}
        ${results.length > 100 ? ' (showing first 100)' : ''}
      </p>
    `;

    for (const result of limitedResults) {
      const url = `${basePath}/${bible}/${result.bookId.toLowerCase()}/${result.chapter}/?v=${result.verse}`;
      const highlightedText = highlightMatches(result.text, query, caseSensitive);

      html += `
        <article class="search-result">
          <header>
            <h3>
              <a href="${url}">${result.book} ${result.chapter}:${result.verse}</a>
            </h3>
          </header>
          <div class="verse-text font-hand">
            ${highlightedText}
          </div>
        </article>
      `;
    }

    resultsEl.innerHTML = html;
  }

  // Show message
  function showMessage(msg) {
    statusEl.classList.add('hidden');
    resultsEl.innerHTML = `
      <p class="font-hand" style="text-align: center; color: var(--michael-gray); padding: 3rem 0;">
        ${msg}
      </p>
    `;
  }

  // Event handlers
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch();
  });

  // Initialize
  initFromUrl();
})();
