# Phase 0: Baseline Inventory - Michael Hugo Bible Module

**Date:** 2026-01-25
**Purpose:** Complete inventory of the codebase structure, entry points, UI flows, and known quirks before beginning the CSS refactoring project.

---

## 1. Entry Points

### 1.1 Hugo Templates (`/home/justin/Programming/Workspace/michael/layouts/`)

#### Core Layout Templates

- **`layouts/_default/baseof.html`** - Base template for all pages
  - Loads `assets/css/theme.css` (minified and fingerprinted)
  - Includes header and footer partials
  - Provides `scripts` block for page-specific JavaScript

#### Bible Page Templates

- **`layouts/bible/list.html`** - Bible translations list page
  - Displays all available Bible translations as cards
  - Quick links to Compare and Search
  - Uses `data/bible.json` for translation metadata

- **`layouts/bible/single.html`** - Single Bible page (Bible/Book/Chapter views)
  - Three view modes based on params:
    - Bible overview: Shows book list
    - Book view: Shows chapter grid
    - Chapter view: Shows verse content with Strong's tooltips
  - Conditionally loads `strongs.js` and `share.js` for chapter views
  - Uses `bible-nav.html` partial for navigation

- **`layouts/bible/compare.html`** - Translation comparison page (dual mode)
  - **Normal Mode:** Multi-translation verse-by-verse comparison
    - Translation checkboxes (max 11)
    - Book/chapter selectors
    - Verse grid for filtering
    - Diff highlighting toggle with color picker
  - **SSS Mode (Side-by-Side Scripture):**
    - Two-column layout
    - Left/right Bible selectors
    - Book/chapter selectors
    - Verse grid
    - Always-on diff highlighting
  - Loads `text-compare.js` and `parallel.js`
  - Default state: KJV, Vulgate, DRC, Geneva1599 at Isaiah 42:16 in SSS mode

- **`layouts/bible/search.html`** - Bible search page
  - Search form with query input
  - Bible translation selector
  - Case-sensitive and whole-word options
  - Supports: text search, phrase search ("quotes"), Strong's numbers (H####/G####)
  - Loads `bible-search.js`
  - Embeds Bible index as JSON for JavaScript

#### Partials

- **`layouts/partials/header.html`** - Site header
- **`layouts/partials/footer.html`** - Site footer
- **`layouts/partials/prose-content.html`** - Prose content wrapper
- **`layouts/partials/michael/bible-nav.html`** - Bible navigation component
  - Dropdown selectors for Bible/Book/Chapter
  - Prev/Next chapter buttons
  - Disabled state when at boundaries

- **`layouts/partials/michael/verse-grid.html`** - Verse selector grid (unused in current code)
- **`layouts/partials/michael/sss-toggle.html`** - SSS mode toggle (unused in current code)
- **`layouts/partials/michael/color-picker.html`** - Color picker (unused in current code)

#### License Pages

- **`layouts/licenses/list.html`** - License list page
- **`layouts/licenses/single.html`** - Individual license page

#### Default Templates

- **`layouts/_default/list.html`** - Default list template
- **`layouts/_default/single.html`** - Default single page template
- **`layouts/index.html`** - Homepage template

### 1.2 JavaScript Files (`/home/justin/Programming/Workspace/michael/assets/js/`)

#### Core Functionality

- **`assets/js/parallel.js`** (1264 lines) - Parallel translation comparison controller
  - State management for both Normal and SSS modes
  - On-demand chapter fetching (avoids loading 32MB of data)
  - Verse parsing from HTML
  - URL state management
  - localStorage persistence
  - Default state initialization (Isaiah 42:16, SSS mode)
  - Integration with `text-compare.js` for highlighting

- **`assets/js/text-compare.js`** (666 lines) - Sophisticated text comparison engine
  - Token-level diff (words, punctuation, whitespace)
  - Myers diff algorithm for optimal alignment
  - Difference classification:
    - Typo (case changes, diacritics)
    - Punctuation
    - Spelling variants (British/American, archaic)
    - Substantive (word replacement)
    - Add/Omit
  - Offset-preserving rendering
  - Extensive archaic English dictionary (126+ variants)
  - HTML-safe rendering with escape functions
  - Exposed globally as `window.TextCompare`

- **`assets/js/bible-search.js`** (372 lines) - Client-side Bible search
  - On-demand chapter fetching
  - Search types: text, phrase ("quotes"), Strong's numbers (H####/G####)
  - Case-sensitive and whole-word options
  - Incremental result display (first 100)
  - URL parameter persistence
  - Search cache for performance

- **`assets/js/strongs.js`** (215 lines) - Strong's number tooltips
  - Detects Strong's patterns: `H####` (Hebrew), `G####` (Greek)
  - Makes Strong's numbers clickable
  - Tooltip with placeholder (links to Blue Letter Bible)
  - Mutation observer for dynamic content

- **`assets/js/share.js`** (412 lines) - Verse and chapter sharing
  - Share menu with multiple options:
    - Copy link
    - Copy text
    - Share to X (Twitter)
    - Share to Facebook
  - Per-verse share buttons
  - Chapter-level share button
  - Verse URL highlighting (scroll and highlight on `?v=N`)
  - Clipboard API with fallback

- **`assets/js/michael/chapter-dropdown.js`** - Chapter dropdown functionality (not examined)

### 1.3 Data Paths

#### Primary Data Sources

- **`data/example/bible.json`** - Bible metadata
  - Schema: `/static/schemas/bible.schema.json`
  - Contains: id, title, abbrev, description, language, license, versification, features, tags, weight
  - 10 translations: ASV, DRC, Geneva1599, KJVA, LXX, OSMHB, SBLGNT, Tyndale, Vulgate, WEB
  - Granularity: chapter-level
  - Generated: 2026-01-24T23:39:10

- **`data/example/bible_auxiliary/*.json`** - Bible content (one file per translation)
  - Schema: `/static/schemas/bible-auxiliary.schema.json`
  - Contains: books array with chapters and verses
  - Structure: `{ books: [{ id, name, chapters: [{ number, verses: [{ number, text }] }] }] }`
  - Books use OSIS identifiers (Gen, Matt, Rev, etc.)
  - Versification varies by translation (protestant, catholic, kjva, lxx, orthodox, leningrad, nrsv)

- **`data/example/license_rights.json`** - License rights metadata (from choosealicense.com)
- **`data/example/software_deps.json`** - Software dependencies for SBOM

#### External Data Mounts (hugo.toml)

- **SPDX data:** `tools/juniper/vendor_external/spdx/licenses.json` → `data/spdx/`
- **choosealicense.com data:** `tools/juniper/vendor_external/choosealicense/` → `data/choosealicense/`
  - licenses.json
  - rules.json

#### JSON Schemas

- **`static/schemas/bible.schema.json`** - Metadata schema
- **`static/schemas/bible-auxiliary.schema.json`** - Content schema

### 1.4 Mount Points (hugo.toml)

```toml
[module]
  [[module.mounts]]
    source = "layouts"
    target = "layouts"

  [[module.mounts]]
    source = "assets"
    target = "assets"

  [[module.mounts]]
    source = "i18n"
    target = "i18n"

  [[module.mounts]]
    source = "static"
    target = "static"

  [[module.mounts]]
    source = "data/example"
    target = "data"

  [[module.mounts]]
    source = "tools/juniper/vendor_external/spdx"
    target = "data/spdx"
    includeFiles = ["licenses.json"]

  [[module.mounts]]
    source = "tools/juniper/vendor_external/choosealicense"
    target = "data/choosealicense"
    includeFiles = ["licenses.json", "rules.json"]

  [[module.mounts]]
    source = "content"
    target = "content"
```

#### Configuration

- **basePath:** `/bible` (configurable via `params.michael.basePath`)
- **backLink:** `/` (configurable via `params.michael.backLink`)

---

## 2. UI Flows

### 2.1 Compare Page - Normal Mode

**Entry:** `/bible/compare/`

**Flow:**

1. **Initial Load**
   - Parse URL parameters (`?bibles=kjv,drc&ref=Isa.42.16`)
   - OR restore from localStorage
   - OR apply defaults (KJV, Vulgate, DRC, Geneva1599 at Isaiah 42:16, **SSS mode ON**)
   - Display translation checkboxes (11 max limit)
   - Display book/chapter selectors
   - Hide verse grid until chapter selected

2. **Translation Selection**
   - User checks/unchecks translation checkboxes
   - Validation: max 11 translations
   - State saved to localStorage
   - Auto-reload if valid selection (book + chapter set)

3. **Book/Chapter Selection**
   - Book selection → populates chapter dropdown (defaults to chapter 1)
   - Chapter selection → triggers auto-load
   - Chapter data fetched in parallel for all selected translations
   - Verse grid populated with verse numbers

4. **Display**
   - Verse-by-verse comparison
   - Each verse shows all selected translations
   - Format: Book Chapter:Verse header, then translation labels with text
   - Missing verses shown as "Verse not available"

5. **Verse Filtering**
   - Click "All" button → show all verses
   - Click specific verse number → filter to that verse only
   - Active verse highlighted in grid
   - State persisted in URL (`?ref=Isa.42.16`)

6. **Diff Highlighting**
   - Toggle "Compare Differences" checkbox
   - Click color picker button → show color palette (5 grayscale options)
   - Select color → applies to both Normal and SSS modes
   - Highlighting uses `TextCompare` engine:
     - Token-level diff
     - Myers algorithm
     - Classified differences (typo, punct, spelling, substantive, add, omit)
     - Fallback: simple word-level comparison

7. **SSS Mode Entry**
   - Click "SSS" button → switch to Side-by-Side mode
   - Normal mode controls hidden
   - SSS mode controls shown

### 2.2 Compare Page - SSS Mode (Side-by-Side Scripture)

**Entry:** Click "SSS" button from Normal mode OR default state

**Flow:**

1. **Initial State**
   - Check if state should reset (once per day via localStorage `sss-last-date`)
   - Apply defaults if reset or first load:
     - Left: Douay-Rheims (DRC)
     - Right: King James Version (KJV)
     - Book: Isaiah (Isa)
     - Chapter: 42
     - Highlighting: ON
   - Display two-column layout

2. **Bible Selection**
   - Left/Right dropdowns independent
   - Change triggers auto-reload if book + chapter set

3. **Book/Chapter Selection**
   - Shared book/chapter selectors
   - Book selection → populates chapter dropdown (defaults to chapter 1)
   - Chapter selection → triggers auto-load
   - Both sides load same book/chapter in parallel

4. **Display**
   - Side-by-side panes
   - Header shows Bible abbreviation
   - Versification warning if different systems (e.g., "catholic versification")
   - Each verse: number + text
   - Missing verses: "No verses found"

5. **Verse Filtering**
   - Separate SSS verse grid
   - Click "All" → show all verses
   - Click verse number → filter both panes to that verse
   - Active verse highlighted

6. **Diff Highlighting**
   - Always enabled by default in SSS mode
   - Toggle checkbox to disable
   - Color picker shared with Normal mode
   - Highlighting compares left vs. right text
   - Uses `TextCompare` engine for sophisticated diffs

7. **Exit SSS Mode**
   - Click "SSS" button or back arrow
   - Return to Normal mode with preserved state

### 2.3 Search Page

**Entry:** `/bible/search/`

**Flow:**

1. **Initial Load**
   - Parse URL parameters (`?q=faith&bible=kjv&case=1&word=1`)
   - Restore search if parameters present
   - Display search form:
     - Query input (placeholder: word, "exact phrase", or H1234/G5678)
     - Bible translation selector
     - Case-sensitive checkbox
     - Whole-word checkbox

2. **Query Input**
   - User types search term
   - Query parsing:
     - **Strong's number:** Pattern `H####` or `G####` (1-5 digits)
     - **Phrase search:** Quoted text `"in the beginning"`
     - **Text search:** Default word search

3. **Search Execution**
   - Submit form or press Enter
   - Cancel any previous search (AbortController)
   - Update URL with search parameters
   - Show "Searching..." status with progress
   - Iterate through all books and chapters:
     - Fetch chapter HTML
     - Parse verses from HTML (multiple fallback parsers)
     - Cache fetched chapters
     - Match verses against query
     - Display results incrementally (first 100)
     - Small delay every 10 chapters to prevent UI blocking

4. **Results Display**
   - Header: "Found N results for [query] in [Bible]"
   - Each result:
     - Link to verse: `/bible/{bible}/{book}/{chapter}/?v={verse}`
     - Highlighted text (matches wrapped in `<mark>`)
   - Limit: First 100 results shown
   - No results: Helpful message based on search type

5. **Result Navigation**
   - Click result → navigate to chapter page
   - URL includes `?v=N` parameter
   - Chapter page scrolls to verse and highlights it

### 2.4 Single Page - Chapter Display

**Entry:** `/bible/{bible}/{book}/{chapter}/`

**Flow:**

1. **Initial Load**
   - Load Bible navigation component (dropdowns + prev/next buttons)
   - Render verse content from markdown
   - Format: `**1** verse text **2** verse text ...`
   - Process Strong's numbers (if present)
   - Add share buttons

2. **Strong's Tooltips** (if `strongs.js` loaded)
   - Detect Strong's patterns in text: `H####` or `G####`
   - Replace with clickable spans (`<span class="strongs-ref">`)
   - Click/tap Strong's number:
     - Show tooltip with:
       - Header: "Hebrew H####" or "Greek G####"
       - Definition placeholder (links to Blue Letter Bible)
       - "View Full Entry" link
   - Tooltip positioned near clicked element
   - Close on outside click or Escape key

3. **Sharing** (if `share.js` loaded)
   - **Per-verse sharing:**
     - Small share button next to each verse number
     - Click → show share menu:
       - Copy link (verse URL with `?v=N`)
       - Copy text (formatted with reference)
       - Share to X (Twitter)
       - Share to Facebook
     - Menu positioned near button
     - Close on outside click or Escape key

   - **Chapter sharing:**
     - Share button in header
     - Click → show share menu:
       - Copy link (chapter URL)
       - Share to X (Twitter)
       - Share to Facebook
     - Visual feedback on copy ("Copied!" for 2 seconds)

4. **URL Parameters**
   - `?v=N` → scroll to verse N and highlight
   - Handled on `window.load` event
   - Smooth scroll, centered in viewport
   - Adds `highlight-verse` class

5. **Navigation**
   - Dropdown selectors:
     - Bible → navigate to Bible overview
     - Book → navigate to selected book
     - Chapter → navigate to selected chapter
   - Prev/Next buttons:
     - Disabled at boundaries (chapter 1, last chapter)
     - Arrow symbols: ← →
   - Bottom actions:
     - "Back to Book" → book overview
     - "Compare Translations" → compare page with current reference

---

## 3. Known Quirks and Expected Behaviors

### 3.1 Versification Differences

**Description:** Different Bible translations use different versification systems, which can cause verse numbering mismatches.

**Versification Systems in Use:**

- **protestant** - ASV, SBLGNT, Tyndale, WEB
- **catholic** - DRC, Vulgate (includes Deuterocanonical books)
- **kjva** - KJVA (includes Apocrypha)
- **nrsv** - Geneva1599
- **orthodox** - LXX (Septuagint)
- **leningrad** - OSMHB (Hebrew Bible)

**Impact:**

- Compare page may show "Verse not available" for some translations
- SSS mode displays versification warning when comparing different systems
- Search results may differ between translations for same reference

**Example:**

- Psalm numbering differs between Protestant and Catholic Bibles
- Some books in LXX/Vulgate are not in Protestant canon
- Orthodox canon includes books not in Catholic canon

**UI Handling:**

- Missing verses: `<em style="color: var(--michael-text-muted);">Verse not available</em>`
- SSS mode warning: `<small>catholic versification</small>` (shown below Bible abbreviation)
- No error thrown - graceful degradation

### 3.2 Book/Chapter Availability Edge Cases

**Description:** Not all translations have all books or chapters.

**Examples:**

- Tyndale: Only New Testament + Pentateuch + Jonah
- OSMHB: Only Old Testament (Hebrew Bible)
- LXX: Different book order and some unique books (Prayer of Manasseh in Odes 12)
- Geneva1599: Some books have fewer chapters than expected

**Content Generation Logic:**

- `_content.gotmpl` checks for "real content" (verses with >50 characters)
- Empty books/chapters skipped during page generation
- `validBooks` list tracks only books with content
- `validChapters` list tracks only chapters with content

**UI Handling:**

- Bible overview: Only shows books with content (book grid)
- Book overview: Only shows chapters with content (chapter grid)
- Navigation dropdowns: Only include available items
- No broken links generated

### 3.3 Strong's Numbers Availability

**Description:** Only some translations include Strong's numbers.

**Translations with Strong's:**

- ASV (features: "StrongsNumbers")
- KJVA (features: "StrongsNumbers", "NoParagraphs")
- LXX (features: "StrongsNumbers", "NoParagraphs")

**Impact:**

- `strongs.js` processes all chapter pages regardless
- Search for Strong's numbers only works in translations that have them
- No Strong's → tooltips never appear (graceful failure)

**UI Handling:**

- Search page warns if no results: "Strong's numbers require Bible translations with Strong's data"
- Tooltip system doesn't load if no Strong's detected
- No errors if Strong's patterns not found

### 3.4 Default State Behavior

**Description:** Compare page defaults to SSS mode with specific reference.

**Default State (applied when no URL params or localStorage):**

- Bibles: KJV, Vulgate, DRC, Geneva1599
- Reference: Isaiah 42:16
- Mode: SSS (Side-by-Side Scripture)
- SSS Left: DRC (Douay-Rheims)
- SSS Right: KJV (King James)
- Highlighting: ON

**Reset Logic:**

- SSS mode state resets once per day (localStorage `sss-last-date`)
- Normal mode state persists in localStorage indefinitely
- URL parameters always override defaults

**Rationale:**

- Demonstrates translation differences clearly
- Isaiah 42:16 is a meaningful verse for comparison
- SSS mode is most visually compelling for first-time visitors

### 3.5 Performance Considerations

**Description:** Bible data is large (~32MB), so loading strategies are critical.

**On-Demand Loading:**

- Chapter data fetched via HTML parsing (not embedded JSON)
- Compare page: Fetches only selected translations for current chapter
- Search page: Fetches chapters one-by-one with progress indicator
- Cache: `Map` stores fetched chapters (persists for session)

**Why Not Embed All Data:**

- 32MB JSON would block initial page load
- Most users only view a few chapters per session
- Incremental loading provides better UX

**Trade-offs:**

- Search is slower (sequential chapter fetching)
- Network-dependent (offline mode not supported)
- Cache cleared on page reload

### 3.6 Text Comparison Engine Quirks

**Description:** Sophisticated diff engine has specific behaviors.

**Difference Categories:**

1. **Typo** - Case changes, diacritics (currently hidden in UI: `showTypo: false`)
2. **Punct** - Punctuation differences (shown)
3. **Spelling** - British/American, archaic variants (126+ mappings, shown)
4. **Substantive** - Word replacements (shown)
5. **Add** - Word additions (shown)
6. **Omit** - Word omissions (shown, with strikethrough)

**Archaic English Dictionary:**

- Extensive mappings: "saith" → "says", "thee" → "you", etc.
- Bidirectional lookup (forward and reverse maps)
- Case-insensitive matching

**Normalization:**

- Unicode NFC normalization
- Curly quotes → straight quotes
- Em/en dashes → hyphens
- Whitespace collapsed

**Token Types:**

- WORD: Letters + contractions (e.g., "don't")
- PUNCT: Punctuation marks
- SPACE: Whitespace (normalized to single space)
- MARKUP: Strong's numbers (H####, G####)

**Algorithm:**

- Myers diff algorithm (O(ND) complexity)
- Optimal alignment for minimal edit distance
- Backtracking for edit script

**Rendering:**

- Offset-preserving (exact character positions)
- HTML-safe escaping
- CSS classes for styling (`.diff-typo`, `.diff-punct`, etc.)

### 3.7 Mobile Compatibility

**Description:** Special handling for touch events.

**Touch Event Handling:**

- `addTapListener()` function prevents double-firing
- Tracks `touchmove` to distinguish tap from scroll
- Prevents default on `touchend` for taps
- Falls back to `click` for non-touch pointers

**Elements with Tap Listeners:**

- Verse buttons (Normal and SSS mode)
- All verses button
- SSS mode toggle button
- SSS back button
- Color picker buttons

**Why Necessary:**

- Mobile browsers fire both `touch` and `click` events
- Double-firing causes unwanted behavior (menu flicker, double navigation)
- Touch-first approach with click fallback

### 3.8 CSS Variable Dependencies

**Description:** JavaScript relies on CSS custom properties.

**Expected CSS Variables:**

- `--michael-accent` - Accent color (used for verse highlighting)
- `--michael-text-muted` - Muted text color
- `--surface-1` - Surface background color
- `--border` - Border color
- `--radius-1` - Border radius
- `--pad-1`, `--pad-2`, `--pad-3` - Padding scales
- `--highlight-color` - User-selected highlight color (set dynamically)
- `--diff-typo`, `--diff-punct`, etc. - Diff category colors

**Dynamic Updates:**

- `--highlight-color` set by color picker via `documentElement.style.setProperty()`
- Applied to `.diff-insert` spans for highlighting

**Fallback Behavior:**

- Inline styles used where CSS variables might not exist
- Graceful degradation if variables undefined

---

## 4. File Structure Summary

```
/home/justin/Programming/Workspace/michael/
├── assets/
│   ├── css/
│   │   └── theme.css                    # Main stylesheet (18KB)
│   ├── downloads/                        # Bible downloads (tar.xz files)
│   └── js/
│       ├── bible-search.js               # Search functionality (372 lines)
│       ├── parallel.js                   # Compare controller (1264 lines)
│       ├── share.js                      # Sharing functionality (412 lines)
│       ├── strongs.js                    # Strong's tooltips (215 lines)
│       ├── text-compare.js               # Diff engine (666 lines)
│       └── michael/
│           └── chapter-dropdown.js       # Chapter dropdown (not examined)
├── content/
│   ├── bibles/
│   │   ├── _content.gotmpl              # Dynamic content generation
│   │   ├── _index.*.md                  # Localized index pages (50+ languages)
│   │   ├── compare.*.md                 # Localized compare pages
│   │   └── search.*.md                  # Localized search pages
│   └── licenses/
│       └── _index.md                    # Licenses list page
├── data/
│   └── example/
│       ├── bibles.json                  # Bible metadata (10 translations)
│       ├── bibles_auxiliary/            # Bible content (10 JSON files)
│       ├── license_rights.json          # License rights
│       └── software_deps.json           # Software dependencies
├── layouts/
│   ├── _default/
│   │   ├── baseof.html                  # Base template
│   │   ├── list.html                    # Default list
│   │   └── single.html                  # Default single
│   ├── bibles/
│   │   ├── compare.html                 # Compare page (Normal + SSS)
│   │   ├── list.html                    # Bible list
│   │   ├── search.html                  # Search page
│   │   └── single.html                  # Bible/Book/Chapter pages
│   ├── licenses/
│   │   ├── list.html                    # License list
│   │   └── single.html                  # License page
│   ├── partials/
│   │   ├── footer.html                  # Footer
│   │   ├── header.html                  # Header
│   │   ├── prose-content.html           # Prose wrapper
│   │   └── michael/
│   │       ├── bible-nav.html           # Navigation component
│   │       ├── color-picker.html        # Unused
│   │       ├── sss-toggle.html          # Unused
│   │       └── verse-grid.html          # Unused
│   └── index.html                       # Homepage
├── static/
│   └── schemas/
│       ├── bibles.schema.json           # Metadata schema
│       └── bibles-auxiliary.schema.json # Content schema
├── tools/
│   └── juniper/                         # Go-based Bible import tool
│       ├── pkg/sword/                   # SWORD module handling
│       └── vendor_external/
│           ├── spdx/                    # SPDX license data
│           └── choosealicense/          # choosealicense.com data
├── hugo.toml                            # Hugo configuration
├── Makefile                             # Build automation
└── README.md                            # Project overview
```

---

## 5. Data Flow Diagram

```
Build Time:
  tools/juniper (Go) → SWORD modules → JSON
    ├── data/bible.json (metadata)
    └── data/bible_auxiliary/*.json (content)

  content/bible/_content.gotmpl → Hugo → Static pages
    ├── /bible/ (list)
    ├── /bible/{bible}/ (overview)
    ├── /bible/{bible}/{book}/ (chapter grid)
    └── /bible/{bible}/{book}/{chapter}/ (verses)

Runtime:
  User → /bible/compare/
    → parallel.js loads → Bible data JSON embedded
    → User selects → Fetch HTML (/bible/{bible}/{book}/{chapter}/)
    → Parse verses → Display comparison
    → Optional: text-compare.js → Diff highlighting

  User → /bible/search/
    → bible-search.js loads → Bible index JSON embedded
    → User searches → Sequential chapter fetching
    → Parse verses → Filter matches → Display results

  User → /bible/{bible}/{book}/{chapter}/
    → Page loads → Markdown rendered
    → strongs.js → Detect patterns → Add tooltips
    → share.js → Add share buttons → Clipboard/social
```

---

## 6. Technology Stack

- **Framework:** Hugo (static site generator)
- **Language:** Go (for Juniper tool), JavaScript (ES6+, vanilla)
- **Data Format:** JSON (schemas with JSON Schema Draft 7)
- **Styling:** CSS (custom properties/variables)
- **Build:** Make (Makefile automation)
- **APIs Used:**
  - Clipboard API (sharing)
  - Fetch API (on-demand loading)
  - DOMParser (HTML parsing)
  - MutationObserver (Strong's detection)
- **External Links:**
  - Blue Letter Bible (Strong's definitions)
  - Twitter/X (sharing)
  - Facebook (sharing)

---

## 7. Key Observations for CSS Refactoring

### 7.1 Inline Styles Detected

- **Compare page:** Extensive inline styles in template (padding, gaps, sizing)
- **Bible nav:** Inline styles for dropdown widths
- **SSS mode:** Inline color picker positioning
- **Share buttons:** Inline SVG sizing and margins
- **Verse grid:** Inline button sizing and colors

### 7.2 CSS Class Patterns

- **Utility classes:** `.hidden`, `.center`, `.muted`, `.mt-1`, `.mt-2`, `.mt-3`
- **Component classes:** `.panel`, `.panel--inner`, `.card`, `.btn`, `.btn--sm`, `.btn--secondary`
- **Grid classes:** `.grid-2`, `.row`, `.col`
- **Bible-specific:** `.bible-text`, `.verse`, `.verse-share-btn`, `.parallel-verse`, `.translation-label`
- **Diff classes:** `.diff-typo`, `.diff-punct`, `.diff-spelling`, `.diff-subst`, `.diff-add`, `.diff-omit`, `.diff-insert`
- **Strong's classes:** `.strongs-ref`, `.strongs-tooltip`
- **Share classes:** `.share-menu`, `.share-menu-item`, `.share-menu-divider`

### 7.3 JavaScript-CSS Coupling

- **Dynamic classes:** `.is-active`, `.is-disabled`, `.copied`, `.highlight-verse`
- **CSS variable reads:** `var(--michael-accent)`, `var(--michael-text-muted)`, `var(--surface-1)`, etc.
- **CSS variable writes:** `--highlight-color` (set dynamically)
- **Style attribute writes:** Background colors, text colors, display properties

### 7.4 Responsive Design Needs

- Mobile touch handling (tap listeners)
- Chapter grid (responsive layout)
- Book grid (responsive layout)
- SSS two-column layout (should adapt to mobile)
- Share menu positioning (viewport-aware)
- Tooltip positioning (viewport-aware)

---

## 8. Next Steps for CSS Refactoring

Based on this inventory, the CSS refactoring project should:

1. **Extract inline styles** from templates to CSS classes
2. **Standardize spacing** using CSS custom properties consistently
3. **Create component classes** for reusable UI elements (buttons, grids, menus)
4. **Ensure mobile responsiveness** for all layouts
5. **Document CSS variables** required by JavaScript
6. **Preserve JavaScript functionality** (no breaking changes to classes/IDs)
7. **Test all UI flows** after refactoring (compare, search, single page, share, tooltips)

---

**End of Phase 0 Baseline Inventory**
