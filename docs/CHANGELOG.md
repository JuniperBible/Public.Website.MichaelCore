# Changelog

All notable changes to the Michael Hugo Bible Module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Code Cleanup Charter** — Comprehensive cleanup plan
  - `docs/CODE_CLEANUP_CHARTER.md` — Charter document
  - `docs/TODO.txt` — Task tracking with phases and subtasks
  - `docs/PHASE-0-BASELINE-INVENTORY.md` — Codebase inventory

- **JavaScript Modules** (`assets/js/michael/`) — DRY refactoring
  - `dom-utils.js` — Touch handling, contrast colors, messages
  - `bible-api.js` — Unified chapter fetching and caching
  - `verse-grid.js` — Verse selection component with accessibility
  - `chapter-dropdown.js` — Chapter dropdown component
  - `share-menu.js` — Share menu with ARIA and keyboard support

- **Hugo Partials** (`layouts/partials/michael/`)
  - `color-picker.html` — Highlight color selection
  - `verse-grid.html` — Verse grid markup
  - `sss-toggle.html` — SSS mode toggle button

- **CSS Components** (`assets/css/theme.css`)
  - Diff highlighting classes (`.diff-insert`, `.diff-punct`, etc.)
  - Verse button component (`.verse-btn`)
  - Share menu component (`.share-menu`)
  - Strong's tooltip component (`.strongs-tooltip`)
  - Loading states (`.loading`, `.skeleton`)
  - Error/empty states
  - `prefers-reduced-motion` support
  - `prefers-contrast` support
  - Enhanced `focus-visible` styling

- **Architecture Documentation** (`docs/`)
  - `ARCHITECTURE.md` — System overview and data flow
  - `DATA-FORMATS.md` — JSON schemas and structures
  - `VERSIFICATION.md` — Bible versification systems
  - `HUGO-MODULE-USAGE.md` — Installation and configuration

- Makefile with `make dev`, `make build`, and `make clean` targets
- Standalone development mode with example data

### Changed
- **JavaScript Refactoring**
  - `parallel.js` refactored to use shared modules (`dom-utils.js`, `bible-api.js`, `verse-grid.js`, `chapter-dropdown.js`)
  - `bible-search.js` refactored to use `bible-api.js` for chapter fetching
  - `share.js` refactored to use `ShareMenu` component with accessibility improvements
  - All inline styles removed from JavaScript files (replaced with CSS classes)
- **Template Improvements**
  - `compare.html` refactored to use partials (color-picker, verse-grid, sss-toggle)
  - All templates now have documentation headers explaining purpose and dependencies
  - All inline styles removed from HTML templates
  - Added section comments to complex template blocks
- **Accessibility Enhancements**
  - `strongs.js` updated with ARIA tooltip pattern (role="tooltip", aria-describedby, aria-expanded)
  - Strong's tooltips now support keyboard activation and Escape key to close
  - ShareMenu component includes full keyboard navigation and focus management
- Updated `hugo.toml` to support both module and standalone modes
- Updated `shell.nix` with streamlined dependencies and make commands
- Homepage layout now works with both `/bibles` and `/religion/bibles` paths

### Security
- **CSP Implementation**
  - CSP meta tag added to `baseof.html`
  - CSP audit completed (21 innerHTML usages documented)
  - XSS vulnerability patched in `bible-search.js` `highlightMatches()` function
  - User search terms now properly escaped to prevent code injection

### Pending (Code Cleanup Charter)
- Bundle Strong's definitions locally
- Add service worker for offline support
- Enhance print stylesheet
- Complete WCAG 2.1 AA compliance testing

## [1.0.0] - 2026-01-24

### Added
- Complete Bible reading and comparison module for Hugo sites
- Bible layouts: list, single, compare, and search pages
- Bible navigation partial with book/chapter dropdown selectors
- Canonical traditions comparison table partial
- JavaScript assets for Bible functionality:
  - `parallel.js` - Parallel translation view controller
  - `share.js` - Verse sharing (Twitter/X, Facebook)
  - `strongs.js` - Strong's number processing with Blue Letter Bible integration
  - `text-compare.js` - Text diff/comparison engine
  - `bible-search.js` - Client-side Bible search
- Content templates for dynamic page generation (`_content.gotmpl`)
- Internationalization support for 40+ languages
- JSON schemas for Bible data validation (`bibles.schema.json`, `bibles-auxiliary.schema.json`)
- Example data files for testing
- Juniper submodule for Bible data generation tools
- FocuswithJustin data tool with book mappings
- Clickable tags on Bible cards for filtering
- Compare Translations button on bibles list page
- Comprehensive SWORD module selection documentation
- `shell.nix` for standalone Nix development environment

### Changed
- Refactored from Tailwind CSS to PicoCSS with semantic HTML5
- CSS architecture uses CSS variables for AirFold paper theme integration
- Templates use semantic CSS classes instead of utility classes
- Layouts namespaced under `religion/bibles/` for Hugo module compatibility
- Partials namespaced under `michael/` to avoid conflicts with consuming sites
- Content mount removed - consuming sites provide their own content

### Fixed
- Language prefix in Bible content links for i18n support
- Navigation URLs use i18n-aware paths
- Menu links include language prefix in multilingual sites
- Bible cards generated from data with auxiliary data filtering
- Dropdowns only show Bibles with available auxiliary data
- License links use i18n-aware URLs
- Tag filtering uses text content instead of data-tag attribute
- TOML syntax errors from unescaped quotes in i18n files
- Section template handles bibles list page correctly
- Hardcoded colors removed from CSS (uses CSS variables)

## [0.1.0] - 2026-01-01

### Added
- Initial repository structure
- Hugo module configuration (`go.mod`, `hugo.toml`)
- Module mount configuration for layouts, assets, i18n, static, and data
- Goldmark configuration for raw HTML in markdown
- README.md with module overview
- PROJECT-CHARTER.md with project goals and scope

---

## Project Overview

Michael is a standalone Hugo module that provides Bible reading, comparison, and search functionality. It was extracted from FocuswithJustin.com to be reusable across multiple Hugo sites.

**Repository:** [github.com/FocuswithJustin/michael](https://github.com/FocuswithJustin/michael)

### Data Requirements

Consuming sites must provide:
1. `data/bibles.json` - Bible metadata
2. `data/bibles_auxiliary/{id}.json` - Per-translation verse data

See the `docs/` directory for full documentation:
- [ARCHITECTURE.md](ARCHITECTURE.md) — System overview
- [DATA-FORMATS.md](DATA-FORMATS.md) — JSON schemas
- [VERSIFICATION.md](VERSIFICATION.md) — Bible versification
- [HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md) — Installation guide
- [CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md) — Cleanup objectives
