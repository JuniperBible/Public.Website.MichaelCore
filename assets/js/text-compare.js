/**
 * Text Comparison Engine for Bible Translation Comparison
 *
 * Provides sophisticated text comparison with:
 * - Token-level diff (words, punctuation, whitespace)
 * - Myers diff algorithm for optimal alignment
 * - Difference classification (typo, punctuation, spelling, substantive)
 * - Offset-preserving rendering
 *
 * Copyright (c) 2026, Focus with Justin
 */

// ==================== Token Types ====================

const TokenType = {
  WORD: 'WORD',
  PUNCT: 'PUNCT',
  SPACE: 'SPACE',
  MARKUP: 'MARKUP'  // For Strong's numbers, HTML tags, etc.
};

// ==================== Diff Operation Types ====================

const DiffOp = {
  EQUAL: 'EQUAL',
  INSERT: 'INSERT',
  DELETE: 'DELETE',
  REPLACE: 'REPLACE'
};

// ==================== Difference Categories ====================

const DiffCategory = {
  TYPO: 'typo',           // Case changes, diacritics only
  PUNCT: 'punct',         // Punctuation changes
  SPELLING: 'spelling',   // British/American, archaic variants
  SUBSTANTIVE: 'subst',   // Word replacement
  ADD: 'add',             // Word added
  OMIT: 'omit',           // Word omitted
  MOVE: 'move'            // Transposed phrase (future)
};

// ==================== Spelling Variants Dictionary ====================

const spellingVariants = new Map([
  // British/American
  ['colour', 'color'],
  ['favour', 'favor'],
  ['honour', 'honor'],
  ['labour', 'labor'],
  ['neighbour', 'neighbor'],
  ['saviour', 'savior'],
  ['behaviour', 'behavior'],
  ['centre', 'center'],
  ['theatre', 'theater'],
  ['metre', 'meter'],
  ['litre', 'liter'],
  ['defence', 'defense'],
  ['offence', 'offense'],
  ['licence', 'license'],
  ['practise', 'practice'],
  ['recognise', 'recognize'],
  ['realise', 'realize'],
  ['organise', 'organize'],
  ['apologise', 'apologize'],

  // Archaic English (common in Bible translations)
  ['saith', 'says'],
  ['doth', 'does'],
  ['hath', 'has'],
  ['goeth', 'goes'],
  ['cometh', 'comes'],
  ['maketh', 'makes'],
  ['taketh', 'takes'],
  ['giveth', 'gives'],
  ['liveth', 'lives'],
  ['loveth', 'loves'],
  ['knoweth', 'knows'],
  ['believeth', 'believes'],
  ['doeth', 'does'],
  ['shew', 'show'],
  ['shewed', 'showed'],
  ['sheweth', 'shows'],
  ['spake', 'spoke'],
  ['speaketh', 'speaks'],
  ['heareth', 'hears'],
  ['seeth', 'sees'],
  ['findeth', 'finds'],
  ['bringeth', 'brings'],
  ['seeketh', 'seeks'],
  ['walketh', 'walks'],
  ['worketh', 'works'],
  ['abideth', 'abides'],
  ['remaineth', 'remains'],
  ['passeth', 'passes'],
  ['pleaseth', 'pleases'],
  ['wilt', 'will'],
  ['shalt', 'shall'],
  ['wouldest', 'would'],
  ['shouldest', 'should'],
  ['couldest', 'could'],
  ['mightest', 'might'],
  ['didst', 'did'],
  ['dost', 'do'],
  ['hadst', 'had'],
  ['hast', 'have'],
  ['wast', 'was'],
  ['wert', 'were'],
  ['art', 'are'],
  ['canst', 'can'],
  ['mayest', 'may'],
  ['thee', 'you'],
  ['thou', 'you'],
  ['thy', 'your'],
  ['thine', 'your'],
  ['ye', 'you'],
  ['unto', 'to'],
  ['wherefore', 'why'],
  ['whence', 'where'],
  ['thither', 'there'],
  ['hither', 'here'],
  ['hence', 'from here'],
  ['begat', 'fathered'],
  ['begotten', 'fathered'],
  ['brethren', 'brothers'],
  ['kine', 'cattle']
]);

// Build reverse lookup
const spellingVariantsReverse = new Map();
for (const [archaic, modern] of spellingVariants) {
  spellingVariantsReverse.set(modern, archaic);
}

// ==================== Token Class ====================

/**
 * Represents a single token from the text
 */
class Token {
  constructor(type, original, offset) {
    this.type = type;
    this.original = original;
    this.normalized = this.normalize(original);
    this.offset = offset;
  }

  normalize(text) {
    if (this.type === TokenType.SPACE) {
      return ' ';  // Normalize all whitespace to single space
    }
    if (this.type === TokenType.PUNCT) {
      return text;  // Keep punctuation as-is for comparison
    }
    // For words: lowercase and remove diacritics
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  get length() {
    return this.original.length;
  }
}

// ==================== Tokenizer ====================

/**
 * Return the compiled regex patterns used by the tokenizer.
 *
 * @returns {Object} pattern map keyed by TokenType (plus 'strongs')
 */
function makeTokenPatterns() {
  return {
    strongs: /^[HG]\d+/i,                                    // Strong's numbers (H1234, G5678)
    word:    /^[\w\u0080-\uFFFF]+(?:[''][\w\u0080-\uFFFF]+)*/,  // Words with contractions
    punct:   /^[.,;:!?'"()[\]{}\-–—…«»""'']/,
    space:   /^\s+/
  };
}

/**
 * Match the next token at the start of `remaining` and return it,
 * or return null when no pattern matches (caller handles unknown chars).
 *
 * @param {string} remaining - Unconsumed portion of the source text
 * @param {number} offset    - Absolute character offset in the original text
 * @param {Object} patterns  - Pattern map from makeTokenPatterns()
 * @returns {Token|null}
 */
function matchNextToken(remaining, offset, patterns) {
  let match;

  // Strong's numbers are atomic markup tokens (checked before word pattern)
  match = remaining.match(patterns.strongs);
  if (match) return new Token(TokenType.MARKUP, match[0], offset);

  match = remaining.match(patterns.word);
  if (match) return new Token(TokenType.WORD, match[0], offset);

  match = remaining.match(patterns.punct);
  if (match) return new Token(TokenType.PUNCT, match[0], offset);

  match = remaining.match(patterns.space);
  if (match) return new Token(TokenType.SPACE, match[0], offset);

  return null;
}

/**
 * Tokenize text into words, punctuation, and whitespace tokens.
 * Preserves exact character offsets for reconstruction.
 *
 * @param {string} text - The text to tokenize
 * @returns {Token[]} Array of tokens
 */
function tokenize(text) {
  const tokens = [];
  const patterns = makeTokenPatterns();
  let offset = 0;

  while (offset < text.length) {
    const remaining = text.slice(offset);
    const token = matchNextToken(remaining, offset, patterns);

    if (token) {
      tokens.push(token);
      offset += token.length;
    } else {
      // Unknown character - treat as single-character punctuation
      tokens.push(new Token(TokenType.PUNCT, remaining[0], offset));
      offset += 1;
    }
  }

  return tokens;
}

// ==================== Normalizers ====================

/**
 * Unicode NFC normalization
 */
function unicodeNormalize(text) {
  return text.normalize('NFC');
}

/**
 * Normalize curly quotes to straight quotes
 */
function normalizeQuotes(text) {
  return text
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
}

/**
 * Normalize dashes (em/en-dash to hyphen)
 */
function normalizeDashes(text) {
  return text.replace(/[–—]/g, '-');
}

/**
 * Normalize whitespace (collapse runs, trim)
 */
function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Full text normalization pipeline
 */
function normalizeText(text) {
  return normalizeWhitespace(
    normalizeDashes(
      normalizeQuotes(
        unicodeNormalize(text)
      )
    )
  );
}

// ==================== Myers Diff Algorithm ====================

/**
 * Myers diff algorithm for optimal token sequence alignment
 * Based on "An O(ND) Difference Algorithm" (Myers 1986)
 *
 * @param {Token[]} a - First token sequence
 * @param {Token[]} b - Second token sequence
 * @returns {Array} Edit script (sequence of operations)
 */
function myersDiff(a, b) {
  const n = a.length;
  const m = b.length;
  const max = n + m;

  // V array for storing furthest reaching points
  const v = new Map();
  v.set(1, 0);

  // Trace for backtracking
  const trace = [];

  // Find the shortest edit script
  for (let d = 0; d <= max; d++) {
    trace.push(new Map(v));

    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && (v.get(k - 1) || 0) < (v.get(k + 1) || 0))) {
        x = v.get(k + 1) || 0;  // Move down (insert)
      } else {
        x = (v.get(k - 1) || 0) + 1;  // Move right (delete)
      }

      let y = x - k;

      // Follow diagonal (equal elements)
      while (x < n && y < m && tokensEqual(a[x], b[y])) {
        x++;
        y++;
      }

      v.set(k, x);

      // Check if we've reached the end
      if (x >= n && y >= m) {
        return backtrack(trace, a, b, n, m);
      }
    }
  }

  // Should never reach here for valid input
  return [];
}

/**
 * Check if two tokens are equal for diff purposes
 */
function tokensEqual(a, b) {
  if (a.type !== b.type) return false;
  return a.normalized === b.normalized;
}

/**
 * Backtrack through the trace to build the edit script
 */
function backtrack(trace, a, b, n, m) {
  const result = [];
  let x = n;
  let y = m;

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    let prevK;
    if (k === -d || (k !== d && (v.get(k - 1) || 0) < (v.get(k + 1) || 0))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v.get(prevK) || 0;
    const prevY = prevX - prevK;

    // Follow diagonal backwards (equal elements)
    while (x > prevX && y > prevY) {
      x--;
      y--;
      result.unshift({ op: DiffOp.EQUAL, aIndex: x, bIndex: y });
    }

    if (d > 0) {
      if (x === prevX) {
        // Insert from b
        y--;
        result.unshift({ op: DiffOp.INSERT, bIndex: y });
      } else {
        // Delete from a
        x--;
        result.unshift({ op: DiffOp.DELETE, aIndex: x });
      }
    }
  }

  return result;
}

// ==================== Difference Classifier ====================

/**
 * Look up the canonical (modern) form of a word in either spelling direction.
 * Returns undefined when the word is not in either variant map.
 *
 * @param {string} norm - Normalized word
 * @returns {string|undefined}
 */
function canonicalSpelling(norm) {
  return spellingVariants.get(norm) || spellingVariantsReverse.get(norm);
}

/**
 * Return true when aNorm and bNorm are known spelling variants of each other
 * (British/American or archaic/modern), checking all four pairing directions.
 *
 * @param {string} aNorm
 * @param {string} bNorm
 * @returns {boolean}
 */
function isSpellingVariant(aNorm, bNorm) {
  const aCanon = canonicalSpelling(aNorm);
  const bCanon = canonicalSpelling(bNorm);
  return aCanon === bNorm || bCanon === aNorm;
}

/**
 * Classify the type of difference between two tokens
 *
 * @param {Token} aToken - Token from first text (or null if insert)
 * @param {Token} bToken - Token from second text (or null if delete)
 * @returns {string} DiffCategory value
 */
function classifyDifference(aToken, bToken) {
  if (!aToken) return DiffCategory.ADD;
  if (!bToken) return DiffCategory.OMIT;

  if (aToken.type === TokenType.PUNCT && bToken.type === TokenType.PUNCT) {
    return DiffCategory.PUNCT;
  }

  if (aToken.normalized === bToken.normalized) {
    return DiffCategory.TYPO;
  }

  if (isSpellingVariant(aToken.normalized, bToken.normalized)) {
    return DiffCategory.SPELLING;
  }

  return DiffCategory.SUBSTANTIVE;
}

// ==================== Main Comparison Function ====================

/**
 * Return true when the edit at index i is the start of a delete+insert pair
 * (i.e. a token replacement rather than a standalone deletion).
 *
 * @param {Array} editScript
 * @param {number} i - current index
 * @returns {boolean}
 */
function isReplacePair(editScript, i) {
  return (
    editScript[i].op === DiffOp.DELETE &&
    i + 1 < editScript.length &&
    editScript[i + 1].op === DiffOp.INSERT
  );
}

/**
 * Build a REPLACE diff entry from a delete+insert pair.
 *
 * @param {Array} editScript
 * @param {number} i - index of the DELETE edit
 * @param {Token[]} tokensA
 * @param {Token[]} tokensB
 * @returns {Object} diff entry
 */
function buildReplaceDiff(editScript, i, tokensA, tokensB) {
  const aToken = tokensA[editScript[i].aIndex];
  const bToken = tokensB[editScript[i + 1].bIndex];
  return {
    op: DiffOp.REPLACE,
    aToken,
    bToken,
    category: classifyDifference(aToken, bToken),
    aOffset: aToken.offset,
    bOffset: bToken.offset
  };
}

/**
 * Build a DELETE (omission) diff entry.
 *
 * @param {Object} edit
 * @param {Token[]} tokensA
 * @returns {Object} diff entry
 */
function buildDeleteDiff(edit, tokensA) {
  const aToken = tokensA[edit.aIndex];
  return {
    op: DiffOp.DELETE,
    aToken,
    bToken: null,
    category: DiffCategory.OMIT,
    aOffset: aToken.offset,
    bOffset: null
  };
}

/**
 * Build an INSERT (addition) diff entry.
 *
 * @param {Object} edit
 * @param {Token[]} tokensB
 * @returns {Object} diff entry
 */
function buildInsertDiff(edit, tokensB) {
  const bToken = tokensB[edit.bIndex];
  return {
    op: DiffOp.INSERT,
    aToken: null,
    bToken,
    category: DiffCategory.ADD,
    aOffset: null,
    bOffset: bToken.offset
  };
}

/**
 * Process a Myers edit script into classified diff entries.
 *
 * @param {Array} editScript
 * @param {Token[]} tokensA
 * @param {Token[]} tokensB
 * @returns {Array} classified diffs
 */
function processEditScript(editScript, tokensA, tokensB) {
  const diffs = [];
  let i = 0;

  while (i < editScript.length) {
    const edit = editScript[i];

    if (edit.op === DiffOp.EQUAL) { i++; continue; }

    if (isReplacePair(editScript, i)) {
      diffs.push(buildReplaceDiff(editScript, i, tokensA, tokensB));
      i += 2;
      continue;
    }

    if (edit.op === DiffOp.DELETE) {
      diffs.push(buildDeleteDiff(edit, tokensA));
      i++;
      continue;
    }

    if (edit.op === DiffOp.INSERT) {
      diffs.push(buildInsertDiff(edit, tokensB));
      i++;
      continue;
    }

    i++;
  }

  return diffs;
}

/**
 * Compare two texts and return classified differences
 *
 * @param {string} textA - First text (base)
 * @param {string} textB - Second text (compare)
 * @returns {Object} Comparison result with diffs and metadata
 */
function compareTexts(textA, textB) {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  const tokensA = tokenize(normA);
  const tokensB = tokenize(normB);

  const editScript = myersDiff(tokensA, tokensB);
  const diffs = processEditScript(editScript, tokensA, tokensB);

  return {
    textA: normA,
    textB: normB,
    tokensA,
    tokensB,
    diffs,
    stats: {
      totalDiffs: diffs.length,
      byCategory: countByCategory(diffs)
    }
  };
}

/**
 * Count diffs by category
 */
function countByCategory(diffs) {
  const counts = {};
  for (const category of Object.values(DiffCategory)) {
    counts[category] = 0;
  }
  for (const diff of diffs) {
    counts[diff.category]++;
  }
  return counts;
}

// ==================== Rendering ====================

/**
 * Build a lookup map from DiffCategory to the corresponding show-flag value.
 * This replaces the multi-branch ||/&& chain in renderWithHighlights.
 *
 * @param {Object} flags - The resolved options flags
 * @returns {Map<string,boolean>} category -> visible
 */
function buildCategoryVisibilityMap(flags) {
  return new Map([
    [DiffCategory.TYPO,        flags.showTypo],
    [DiffCategory.PUNCT,       flags.showPunct],
    [DiffCategory.SPELLING,    flags.showSpelling],
    [DiffCategory.SUBSTANTIVE, flags.showSubstantive],
    [DiffCategory.ADD,         flags.showAddOmit],
    [DiffCategory.OMIT,        flags.showAddOmit]
  ]);
}

/**
 * Collect the highlight ranges that should be rendered for one side of the diff.
 *
 * @param {Array} diffs - Classified diffs from compareTexts
 * @param {string} side - 'a' or 'b'
 * @param {Map<string,boolean>} visibility - category visibility map
 * @returns {Array} Sorted highlight descriptors
 */
function collectHighlights(diffs, side, visibility) {
  const highlights = [];

  for (const diff of diffs) {
    const token = side === 'a' ? diff.aToken : diff.bToken;
    if (!token) continue;
    if (!visibility.get(diff.category)) continue;

    highlights.push({
      offset: token.offset,
      length: token.length,
      category: diff.category,
      original: token.original
    });
  }

  highlights.sort((a, b) => a.offset - b.offset);
  return highlights;
}

/**
 * Convert a sorted list of highlight descriptors into an HTML string.
 *
 * @param {string} text - The original (normalized) text
 * @param {Array} highlights - Sorted highlight descriptors
 * @returns {string} HTML with diff spans
 */
function buildHighlightedHtml(text, highlights) {
  let result = '';
  let pos = 0;

  for (const h of highlights) {
    if (h.offset > pos) {
      result += escapeHtml(text.slice(pos, h.offset));
    }

    const span = document.createElement('span');
    span.className = `diff-${h.category}`;
    span.textContent = h.original;
    result += span.outerHTML;
    pos = h.offset + h.length;
  }

  if (pos < text.length) {
    result += escapeHtml(text.slice(pos));
  }

  return result;
}

/**
 * Render text with highlighted differences
 *
 * @param {string} text - Original text to render
 * @param {Array} diffs - Diff results from compareTexts
 * @param {string} side - 'a' for base text, 'b' for compare text
 * @param {Object} options - Rendering options
 * @returns {string} HTML with highlighted spans
 */
function renderWithHighlights(text, diffs, side, options = {}) {
  const flags = {
    showTypo:        options.showTypo        ?? false,
    showPunct:       options.showPunct        ?? true,
    showSpelling:    options.showSpelling     ?? true,
    showSubstantive: options.showSubstantive  ?? true,
    showAddOmit:     options.showAddOmit      ?? true
  };

  const visibility = buildCategoryVisibilityMap(flags);
  const highlights = collectHighlights(diffs, side, visibility);
  return buildHighlightedHtml(text, highlights);
}

/**
 * Escape HTML special characters
 * Uses shared utility from DomUtils module
 */
function escapeHtml(text) {
  return window.Michael.DomUtils.escapeHtml(text);
}

// ==================== CSS Classes (for reference) ====================
/*
.diff-typo { background: var(--diff-typo); }
.diff-punct { background: var(--diff-punct); }
.diff-spelling { background: var(--diff-spelling); }
.diff-subst { background: var(--diff-subst); }
.diff-add { background: var(--diff-add); }
.diff-omit { background: var(--diff-omit); text-decoration: line-through; }
.diff-move { background: var(--diff-move); }
*/

// ==================== Export for use in parallel.js ====================

// Make available globally for use in parallel.js
window.TextCompare = {
  // Core functions
  tokenize,
  compareTexts,
  renderWithHighlights,

  // Normalizers
  normalizeText,
  unicodeNormalize,
  normalizeQuotes,
  normalizeDashes,
  normalizeWhitespace,

  // Types and constants
  TokenType,
  DiffOp,
  DiffCategory,

  // Utilities
  escapeHtml,
  classifyDifference
};
