# Changelog

All notable changes to the Michael Hugo Bible Module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Unified Toast Notification System** - Generic notification component
  - `assets/js/michael/dom-utils.js` - `showMessage()` with type variants
    - Supports `info`, `success`, `warning`, `error` types
    - Configurable duration and position (top/bottom)
    - `dismissToast()` for programmatic dismissal
    - ARIA live regions for screen reader accessibility
  - `assets/css/theme.css` - Toast CSS components
    - `.toast` base class with CSS transitions
    - `.toast--success`, `.toast--warning`, `.toast--error` variants
    - `.toast--top` position modifier
    - Backwards compatible with `.share-toast`
- **SBOM (Software Bill of Materials)** - Multiple SBOM formats generated
  - `assets/downloads/sbom/sbom.spdx.json` - SPDX 2.3 format
  - `assets/downloads/sbom/sbom.cdx.json` - CycloneDX JSON format
  - `assets/downloads/sbom/sbom.cdx.xml` - CycloneDX XML format
  - `assets/downloads/sbom/sbom.syft.json` - Syft native format
  - `scripts/generate-sbom.sh` - Automated SBOM generation script
- **WCAG Accessibility Audit** - Comprehensive accessibility compliance audit
  - `docs/ACCESSIBILITY-AUDIT-2026-01-25.md` - Full WCAG 2.1 AA audit report
  - Documented 0 WCAG violations in core flows
  - All form controls properly labeled
  - Color contrast meets WCAG AA standards (4.5:1 minimum)
- **Magellan E2E Testing Framework** - Browser automation for regression testing
  - Added Magellan as git submodule (`tools/magellan`)
  - New `pkg/e2e/` package with chromedp-based browser automation
    - `browser.go` - Browser session management (258 lines)
    - `element.go` - Element querying and properties (262 lines)
    - `actions.go` - User interactions (321 lines)
    - `wait.go` - Wait conditions (232 lines)
    - `assertions.go` - Test assertions (336 lines)
  - Merged Magellan development branch to main
- **Regression Test Suite** (`tests/`)
  - `tests/go.mod` - Go module with Magellan dependency
  - `tests/Makefile` - Test runner with targets for each test suite
  - `tests/helpers/helpers.go` - Shared test utilities (169 lines)
  - 15 regression tests covering:
    - Compare page (5 tests): translations, SSS mode, verse grid, colors, navigation
    - Search page (2 tests): text query, Strong's number
    - Single page (5 tests): navigation, tooltips, share menu
    - Cross-cutting (3 tests): offline, mobile touch, keyboard navigation
- **Build Verification System** - Automated quality gates
  - `README.md` - Auto-generated Build Checks status table
  - `scripts/check-all.sh` - Build verification script
    - Runs Hugo build, SBOM generation, JuniperBible tests, E2E tests
    - Updates README.md status table automatically
    - Color-coded pass/fail/skip output
  - `Makefile` - New quality commands
    - `make check` - Run all checks and update README status
    - `make push` - Verify all checks pass, then push to remote
    - Aborts with "It's not nice to ship bad code" on failure

### Changed
- **Juniper Submodule Update** - Migrated to JuniperBible repository
  - Changed submodule URL from `juniper.git` to `JuniperBible.git`
  - Now tracking `development` branch for latest features
  - JuniperBible includes capsule commands and versification system
  - All 100+ JuniperBible tests passing
- **Code Cleanup** - Security and quality improvements from code review
  - `share-menu.js` - Added HTML escaping for UI strings (XSS prevention)
  - `share-menu.js` - Fixed race condition in click handler setup
  - `strongs.js` - Fixed MutationObserver memory leak with cleanup handlers
  - `parallel.js` - Fixed color picker event conflict between click/touch
  - `theme.css` - Consolidated duplicate toast/share-toast rules
  - `theme.css` - Fixed conflicting focus-visible CSS rules
  - `theme.css` - Added clip-path for .sr-only (modern replacement)
- **Documentation Overhaul** - Comprehensive update to all documentation
  - `README.md` - Complete rewrite with features, quick start, and status table
  - `docs/README.md` - New quick links section and project metrics table
  - `docs/ARCHITECTURE.md` - Added testing infrastructure and service worker sections
  - `docs/HUGO-MODULE-USAGE.md` - Updated offline support (was marked "Planned", now implemented)
  - `docs/TESTING.md` - Added test coverage checklist and Magellan package structure
  - All documents now have consistent cross-references and "See Also" sections
- Updated `docs/TODO.txt` with Phase 5-8 tasks - all complete

## [1.1.0] - 2026-01-25

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
  - `strongs-data.html` — Data injection partial for Strong's definitions
  - `offline-settings.html` — Cache management panel

- **Strong's Concordance Bundle** — Offline lexicon support
  - `data/strongs/hebrew.json` — 150+ Hebrew/Aramaic definitions (H0001-H8674)
  - `data/strongs/greek.json` — 150+ Greek definitions (G0001-G5624)
  - `data/strongs/README.md` — Documentation for Strong's data format
  - `layouts/partials/michael/strongs-data.html` — Hugo partial to inject definitions
  - `assets/js/strongs.js` — Updated to use local data first, with API fallback

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
  - Enhanced print stylesheet for Bible chapters

- **Strong's Definitions Bundle** (`data/strongs/`)
  - `hebrew.json` — Local Hebrew Strong's definitions (H0001-H8674)
  - `greek.json` — Local Greek Strong's definitions (G0001-G5624)
  - Provenance metadata (source, version, license)
  - `layouts/partials/michael/strongs-data.html` — Data injection partial

- **Service Worker** (`static/sw.js`)
  - Progressive caching with shell pre-cache
  - Cache versioning and cleanup
  - Pre-cache default chapters (KJV Gen/Ps/Matt/John)
  - Cache-on-navigate for Bible chapters
  - Offline fallback page (`static/offline.html`)
  - Service worker registration in baseof.html (guarded)

- **Offline Settings UI**
  - `layouts/partials/michael/offline-settings.html` — Cache management panel
  - `assets/js/michael/offline-manager.js` — SW communication layer
  - Clear offline cache control

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
  - `strongs.js` now uses local definitions first, external API as fallback
  - `share.js` and `share-menu.js` support offline mode with clipboard fallback
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

### Documentation
- Added comprehensive JSDoc to `parallel.js`, `bible-search.js`, `share.js`, `strongs.js`
- Added section separators to all main JavaScript files
- Added documentation header to `list.html`
- All JavaScript modules in `assets/js/michael/` have full JSDoc coverage

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
