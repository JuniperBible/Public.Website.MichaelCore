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

'use strict';

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
 * Tokenize text into words, punctuation, and whitespace tokens
 * Preserves exact character offsets for reconstruction
 *
 * @param {string} text - The text to tokenize
 * @returns {Token[]} Array of tokens
 */
function tokenize(text) {
  const tokens = [];
  let offset = 0;

  // Regex patterns
  const wordPattern = /^[\w\u0080-\uFFFF]+(?:[''][\w\u0080-\uFFFF]+)*/;  // Words with contractions
  const strongsPattern = /^[HG]\d+/i;  // Strong's numbers (H1234, G5678)
  const punctPattern = /^[.,;:!?'"()[\]{}\-–—…«»""'']/;
  const spacePattern = /^\s+/;

  while (offset < text.length) {
    const remaining = text.slice(offset);

    // Try Strong's numbers first (they're atomic tokens)
    let match = remaining.match(strongsPattern);
    if (match) {
      tokens.push(new Token(TokenType.MARKUP, match[0], offset));
      offset += match[0].length;
      continue;
    }

    // Try word
    match = remaining.match(wordPattern);
    if (match) {
      tokens.push(new Token(TokenType.WORD, match[0], offset));
      offset += match[0].length;
      continue;
    }

    // Try punctuation
    match = remaining.match(punctPattern);
    if (match) {
      tokens.push(new Token(TokenType.PUNCT, match[0], offset));
      offset += match[0].length;
      continue;
    }

    // Try whitespace
    match = remaining.match(spacePattern);
    if (match) {
      tokens.push(new Token(TokenType.SPACE, match[0], offset));
      offset += match[0].length;
      continue;
    }

    // Unknown character - treat as punctuation
    tokens.push(new Token(TokenType.PUNCT, remaining[0], offset));
    offset += 1;
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
 * Classify the type of difference between two tokens
 *
 * @param {Token} aToken - Token from first text (or null if insert)
 * @param {Token} bToken - Token from second text (or null if delete)
 * @returns {string} DiffCategory value
 */
function classifyDifference(aToken, bToken) {
  // Pure insert
  if (!aToken) return DiffCategory.ADD;

  // Pure delete
  if (!bToken) return DiffCategory.OMIT;

  // Both exist - compare for category

  // Check if only punctuation changed
  if (aToken.type === TokenType.PUNCT && bToken.type === TokenType.PUNCT) {
    return DiffCategory.PUNCT;
  }

  // Check if case-only difference
  if (aToken.normalized === bToken.normalized) {
    return DiffCategory.TYPO;
  }

  // Check spelling variants
  const aNorm = aToken.normalized;
  const bNorm = bToken.normalized;

  if (spellingVariants.has(aNorm) && spellingVariants.get(aNorm) === bNorm) {
    return DiffCategory.SPELLING;
  }
  if (spellingVariantsReverse.has(aNorm) && spellingVariantsReverse.get(aNorm) === bNorm) {
    return DiffCategory.SPELLING;
  }

  // Check both directions
  const aVariant = spellingVariants.get(aNorm) || spellingVariantsReverse.get(aNorm);
  const bVariant = spellingVariants.get(bNorm) || spellingVariantsReverse.get(bNorm);
  if (aVariant === bNorm || bVariant === aNorm) {
    return DiffCategory.SPELLING;
  }

  // Default: substantive difference
  return DiffCategory.SUBSTANTIVE;
}

// ==================== Main Comparison Function ====================

/**
 * Compare two texts and return classified differences
 *
 * @param {string} textA - First text (base)
 * @param {string} textB - Second text (compare)
 * @returns {Object} Comparison result with diffs and metadata
 */
function compareTexts(textA, textB) {
  // Normalize texts
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  // Tokenize
  const tokensA = tokenize(normA);
  const tokensB = tokenize(normB);

  // Run Myers diff
  const editScript = myersDiff(tokensA, tokensB);

  // Process edit script into classified diffs
  const diffs = [];
  let i = 0;

  while (i < editScript.length) {
    const edit = editScript[i];

    if (edit.op === DiffOp.EQUAL) {
      // No diff needed for equal tokens
      i++;
      continue;
    }

    // Check for replace pattern (delete followed by insert)
    if (edit.op === DiffOp.DELETE &&
        i + 1 < editScript.length &&
        editScript[i + 1].op === DiffOp.INSERT) {

      const aToken = tokensA[edit.aIndex];
      const bToken = tokensB[editScript[i + 1].bIndex];
      const category = classifyDifference(aToken, bToken);

      diffs.push({
        op: DiffOp.REPLACE,
        aToken,
        bToken,
        category,
        aOffset: aToken.offset,
        bOffset: bToken.offset
      });

      i += 2;
      continue;
    }

    // Single delete
    if (edit.op === DiffOp.DELETE) {
      const aToken = tokensA[edit.aIndex];
      diffs.push({
        op: DiffOp.DELETE,
        aToken,
        bToken: null,
        category: DiffCategory.OMIT,
        aOffset: aToken.offset,
        bOffset: null
      });
      i++;
      continue;
    }

    // Single insert
    if (edit.op === DiffOp.INSERT) {
      const bToken = tokensB[edit.bIndex];
      diffs.push({
        op: DiffOp.INSERT,
        aToken: null,
        bToken,
        category: DiffCategory.ADD,
        aOffset: null,
        bOffset: bToken.offset
      });
      i++;
      continue;
    }

    i++;
  }

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
 * Render text with highlighted differences
 *
 * @param {string} text - Original text to render
 * @param {Array} diffs - Diff results from compareTexts
 * @param {string} side - 'a' for base text, 'b' for compare text
 * @param {Object} options - Rendering options
 * @returns {string} HTML with highlighted spans
 */
function renderWithHighlights(text, diffs, side, options = {}) {
  const {
    showTypo = false,      // Typo differences are subtle, often hidden
    showPunct = true,
    showSpelling = true,
    showSubstantive = true,
    showAddOmit = true
  } = options;

  // Build list of ranges to highlight
  const highlights = [];

  for (const diff of diffs) {
    const token = side === 'a' ? diff.aToken : diff.bToken;
    if (!token) continue;  // Skip if no token on this side

    // Check if this category should be shown
    const shouldShow =
      (diff.category === DiffCategory.TYPO && showTypo) ||
      (diff.category === DiffCategory.PUNCT && showPunct) ||
      (diff.category === DiffCategory.SPELLING && showSpelling) ||
      (diff.category === DiffCategory.SUBSTANTIVE && showSubstantive) ||
      ((diff.category === DiffCategory.ADD || diff.category === DiffCategory.OMIT) && showAddOmit);

    if (!shouldShow) continue;

    highlights.push({
      offset: token.offset,
      length: token.length,
      category: diff.category,
      original: token.original
    });
  }

  // Sort by offset
  highlights.sort((a, b) => a.offset - b.offset);

  // Build HTML
  let result = '';
  let pos = 0;

  for (const h of highlights) {
    // Add text before this highlight
    if (h.offset > pos) {
      result += escapeHtml(text.slice(pos, h.offset));
    }

    // Add highlighted span
    result += `<span class="diff-${h.category}">${escapeHtml(h.original)}</span>`;
    pos = h.offset + h.length;
  }

  // Add remaining text
  if (pos < text.length) {
    result += escapeHtml(text.slice(pos));
  }

  return result;
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

// ==================== ES6 Exports ====================

// Export core functions
export {
  tokenize,
  compareTexts,
  renderWithHighlights,
  normalizeText,
  unicodeNormalize,
  normalizeQuotes,
  normalizeDashes,
  normalizeWhitespace,
  TokenType,
  DiffOp,
  DiffCategory,
  escapeHtml,
  classifyDifference
};

// ==================== Export for use in parallel.js ====================

// Make available globally for backwards compatibility
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
