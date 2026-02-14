# Changelog

All notable changes to the Michael Hugo Bible Module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-02-13

Security, accessibility, and robustness sprint with comprehensive fixes across JavaScript, CSS, Hugo templates, and build scripts.

### Changed

#### Service Worker Improvements

- Moved `skipWaiting()` to execute after successful cache completion
- Added path validation for static asset caching (whitelist approach)
- Added retry tracking for background sync with `MAX_SYNC_RETRIES = 3`
- Returns `offline.html` for HTML requests when network and cache fail

#### PWA & Offline Manager

- Added `isUserBusy()` check to prevent reload during downloads/form entry
- Added 7-day TTL for background sync localStorage entries with auto-cleanup
- Added comprehensive `isNetworkRelatedError()` with multiple detection methods
- User storage functions now return `false`/`null` on QuotaExceededError

#### Build System

- Removed `vendor-package` from default build target (now on-demand only)
- Added Hugo server startup verification in test target
- Made `pkill` more specific with port matching
- Made RELEASE confirmation case-insensitive
- Added `--quiet` flag to `generate-sbom.sh`

### Added

#### JavaScript Null Safety & Memory Leak Prevention

- Null guards for DOM elements in `theme-toggle.js`, `pwa-install.js`, `share-menu.js`
- HTML escaping for XSS protection in `chapter-reader.js` verse rendering
- Try-catch and validation for localStorage in `pwa-install.js`
- Cleanup handlers registered via `Michael.addCleanup()` in:
  - `theme-toggle.js` (click listener)
  - `footnotes.js` (footnote link listeners)
  - `reading-tracker.js` (scroll/beforeunload listeners)
  - `dom-utils.js` (tap listeners)

#### Accessibility (WCAG 2.1 AA)

- Error announcer region with `role="alert"` in search page
- `role="region"` and `aria-label` on search results container
- `aria-live` and `aria-atomic` on cache status and progress elements
- Improved color picker button `aria-label` descriptions
- `data-pwa-banner` attribute for JavaScript `aria-hidden` toggling

### Fixed

#### Hugo Template Security

- XSS vulnerability in `sw-register.html` — replaced innerHTML with DOM methods
- Added `$bibleData` nil checks in `bible/single.html`
- Added `$bookData` nil check in `bible-nav.html`
- Made `basePath` configurable via data attribute in `continue-reading.html`

#### CSS Dark Mode & Contrast (WCAG AA Compliance)

- Toast backgrounds darkened for proper text contrast (`theme-colors.css`)
- Diff highlight colors adjusted for 4.5:1 ratio
- Dark mode text colors lightened (`--text-500: #b8b8b8`, `--text-400: #909090`)
- Added `focus-visible` state for reader toggles
- Replaced hardcoded `rgba()` with CSS variables in `theme-pwa.css`
- Added `prefers-reduced-motion` for SSS verse transitions and offline animations
- Increased tile touch targets from 40px to 44px (WCAG minimum)

#### Build Script Error Handling

- Added README existence check in `check-all.sh`
- Captured stderr separately for debugging instead of swallowing
- Added warning comments for destructive operations

---

## [0.3.0] - 2026-02-13

Post-ES6 cleanup sprint addressing null safety, accessibility, and configuration centralization.

### Changed

#### Complete ES6 Migration

- `chapter-reader.js` — Converted from IIFE to ES6 module with exports
- `bible-filter.js` — Converted from IIFE to ES6 module with exports
- `theme-toggle.js` — Converted from IIFE to ES6 module with exports
- `theme-init.js` — Converted from IIFE to ES6 module (immediate execution preserved)

#### Configuration Centralization

- Added `serviceWorkerPath`, `pwaInstallReshowDays`, `toastAnimationMs` to `config.js`
- Updated `offline-manager.js`, `pwa-install.js`, `dom-utils.js` to use centralized config
- Removed hardcoded paths and magic numbers throughout codebase

### Added

#### Null/Undefined Safety

- AbortController in `chapter-reader.js` for SSS loading race conditions
- Null checks for DOM elements in `offline-settings-ui.js`
- `CSS.escape()` for querySelector security in `chapter-dropdown.js`
- `cleanup()` function in `offline-manager.js` for SW message handler lifecycle
- Improved error handling with proper `error.message` checks

#### Accessibility Improvements

- `role="presentation" aria-hidden="true"` on logo image in header
- `aria-label` on continue reading placeholder link
- `required` attribute on search input

### Fixed

#### Hugo Template Nil Safety

- Added `$bibleData` condition check in `bible-nav.html`
- Added nil check for `$firstBible` in `book-chapter-selects.html`
- Changed to proper `{{ with }}` statement in `bible-select.html`
- Added nil checks for `$firstBible` and `$aux` in `compare.html`

#### CSS Dark Mode & Accessibility

- `.sss-verse-num` contrast ratio improved to 4.5:1 (WCAG AA)
- `.reader-toggles` button contrast fixed for dark mode pressed states
- Focus ring opacity increased from 0.35/0.45 to 0.6 in `theme-colors.css`
- Added hover states for `.sss-verse-row`
- Added SSS header focus styles

#### Service Worker & PWA

- Extended cache hash from 12 to 32 characters (reduced collision risk)
- Standardized AbortError checking to `error.name === 'AbortError'`
- Fixed chapter page regex to handle query params (`?v=1`)

---

## [0.2.0] - 2026-02-13

ES6 Module Migration and comprehensive bug fixes backported from JuniperBible.org production audits.

### Changed

#### ES6 Module Architecture

- **Complete ES6 module migration** — All 20+ JavaScript files converted from IIFE/revealing module patterns to ES6 modules
- **Module registry system** — New `core.js` with `Michael.register/get/init/cleanup` pattern
- **Centralized configuration** — New `config.js` with storage keys prefixed `michael-`
- **DOM utilities** — New `dom-ready.js` for consistent initialization
- **Event cleanup** — New `listener-registry.js` for memory leak prevention
- **Clipboard utilities** — New `clipboard-utils.js` with fallback support
- **Theme system** — Extracted `theme-init.js` and `theme-toggle.js` from inline scripts
- All modules maintain backwards compatibility via `window.Michael` namespace

#### Core Module Conversions

- `dom-utils.js` — ES6 exports with backwards compatibility
- `bible-api.js` — ES6 module with race condition fix
- `user-storage.js` — ES6 module with QuotaExceededError handling
- `verse-grid.js` — ES6 module with cleanup support
- `chapter-dropdown.js` — ES6 module

#### Feature Module Conversions

- `bible-nav.js` — ES6 module, removed inline onclick handler
- `bible-search.js` — ES6 module with race condition fix using request counter
- `sss-mode.js` — ES6 module with race condition fix and Number.isInteger validation
- `share-menu.js` — ES6 module with null checks in setTimeout
- `share.js` — ES6 module
- `footnotes.js` — ES6 module with duplicate listener prevention

#### Remaining Module Conversions

- `parallel.js` — ES6 module
- `strongs.js` — ES6 module
- `text-compare.js` — ES6 module with named exports
- `diff-highlight.js` — ES6 module
- `show-more.js` — ES6 module
- `reading-tracker.js` — ES6 module with cleanup, removed debug logs
- `pwa-install.js` — ES6 module, removed debug console.log statements
- `offline-manager.js` — ES6 module with 5-second SW ready timeout
- `offline-settings-ui.js` — ES6 module

### Added

#### Accessibility Improvements

- `id="main-content"` added to all 9 layout files for skip-link navigation:
  - `layouts/index.html`
  - `layouts/_default/list.html`
  - `layouts/_default/single.html`
  - `layouts/bible/list.html`
  - `layouts/bible/compare.html`
  - `layouts/bible/search.html`
  - `layouts/bible/single.html`
  - `layouts/license/list.html`
  - `layouts/license/single.html`

#### New Hugo Partials

- `bible-data-map.html` — O(1) Bible lookup by ID using Hugo dict

### Fixed

#### Security

- External links now include `noreferrer` in addition to `noopener`
- Nil checks added to license template external link rendering

#### CSS

- Fixed undefined CSS variable (`--shadow-2` → `--shadow-1`)
- Removed duplicate light mode CSS block (34 lines)
- Removed obsolete `clip` property from sr-only class

#### JavaScript Bug Fixes

- Race condition in `bible-search.js` — Added request ID counter pattern
- Race condition in `sss-mode.js` — Added request ID counter pattern
- Duplicate event listeners in `footnotes.js` — Added dataset marker
- Memory leaks — Added cleanup handlers across all modules
- Service worker ready timeout — Added 5-second timeout in `offline-manager.js`

#### Code Quality

- Removed 27+ debug `console.log` statements across all modules
- Kept `console.warn` and `console.error` for genuine issues

---

## [0.1.0] - 2026-01-27

Initial public release of the Michael Hugo Bible Module — a standalone Hugo module
providing Bible reading, comparison, search, and offline support as a Progressive Web App.

### Added

#### Core Bible Features

- Complete Bible reading and comparison module for Hugo sites
- Bible layouts: list, single, compare, and search pages
- Bible navigation partial with book/chapter dropdown selectors
- Canonical traditions comparison table partial
- Content templates for dynamic page generation (`_content.gotmpl`)
- Internationalization support for 40+ languages
- JSON schemas for Bible data validation (`bibles.schema.json`, `bibles-auxiliary.schema.json`)
- Juniper submodule for Bible data generation tools
- FocuswithJustin data tool with book mappings
- Clickable tags on Bible cards for filtering
- Compare Translations button on bibles list page
- Comprehensive SWORD module selection documentation
- `shell.nix` for standalone Nix development environment
- Standalone development mode with example data
- Bible override system (`data/example/bibles_override.json`) for field overrides without touching auto-generated data

#### JavaScript Modules (`assets/js/michael/`)

- `dom-utils.js` — Touch handling, contrast colors, toast notifications
- `bible-api.js` — Unified chapter fetching and caching
- `verse-grid.js` — Verse selection component with accessibility
- `chapter-dropdown.js` — Chapter dropdown component
- `share-menu.js` — Share menu with ARIA and keyboard support
- `bible-nav.js` — Bible navigation controls
- `footnotes.js` — Footnote display and management
- `show-more.js` — Expandable content sections
- `diff-highlight.js` — Text diff highlighting
- `sss-mode.js` — Side-by-side/stacked comparison mode

#### JavaScript Assets (`assets/js/`)

- `parallel.js` — Parallel translation view controller
- `share.js` — Verse sharing (Twitter/X, Facebook) with offline clipboard fallback
- `strongs.js` — Strong's number processing with local-first definitions
- `text-compare.js` — Text diff/comparison engine
- `bible-search.js` — Client-side Bible search with XSS-safe highlighting

#### Hugo Partials (`layouts/partials/michael/`)

- `color-picker.html` — Highlight color selection
- `verse-grid.html` — Verse grid markup
- `sss-toggle.html` — SSS mode toggle button
- `strongs-data.html` — Data injection partial for Strong's definitions
- `offline-settings.html` — Cache management panel
- `bible-data.html` — Bible data merge partial with override support
- `continue-reading.html` — Continue Reading UI component
- `pwa-install-banner.html` — PWA install prompt with iOS instructions
- `sw-register.html` — Service worker registration
- `notes-section.html` — Footnotes section

#### Strong's Concordance Bundle (`data/strongs/`)

- `hebrew.json` — Local Hebrew/Aramaic definitions (H0001-H8674)
- `greek.json` — Local Greek definitions (G0001-G5624)
- Provenance metadata (source, version, license)
- Local-first lookups with external API fallback

#### CSS Architecture (`assets/css/`)

- `theme.css` — Core styles and components
- `theme-colors.css` — Color token system
- `theme-compare.css` — Compare/diff page styles
- `theme-share.css` — Share menu and toast notifications
- `theme-strongs.css` — Strong's concordance styles
- `theme-pwa.css` — PWA-specific styles (install banner, standalone mode)
- `theme-offline.css` — Offline settings styles
- `theme-print.css` — Print stylesheet for Bible chapters
- `theme-custom.css` — Site-specific overrides (juniperbible.org palette)
- CSS custom properties for full theme customization
- `prefers-reduced-motion` and `prefers-contrast` support
- Enhanced `focus-visible` styling throughout
- Diff highlighting classes (`.diff-insert`, `.diff-punct`, etc.)
- Verse button, share menu, Strong's tooltip, loading/skeleton components

#### Progressive Web App (PWA)

- Web App Manifest (`static/manifest.json`) with icons, shortcuts, categories
- SVG logo (shield + sword + crown) with PNG icons at all required sizes
- Service Worker (`layouts/_default/sw.js`) as Hugo template for CSS fingerprinting
  - Cache-first strategy for static assets
  - Network-first strategy for Bible chapters
  - Offline fallback page (`static/offline.html`)
  - Pre-caches all 20 JS modules, CSS, icons, and key pages
  - Background sync for resilient Bible downloads
  - Cache versioning and automatic cleanup
  - Pre-cache default chapters (KJV Gen/Ps/Matt/John)
- Install prompt handling (`pwa-install.js`) with iOS-specific instructions
- PWA standalone mode: 100% viewport, hidden footer nav, safe area insets
- Notification and run-on-login permission requests after install
- IndexedDB storage (`user-storage.js`) for reading progress, bookmarks, notes, settings
- Reading tracker (`reading-tracker.js`) with streak tracking and auto-save
- Continue Reading feature on home page
- Offline manager (`offline-manager.js`) with per-Bible download and progress tracking
- Offline settings UI (`offline-settings-ui.js`) with cache status display
- Bible cache status with per-Bible chapter counts and completion percentages

#### Unified Toast Notification System

- `showMessage()` with `info`, `success`, `warning`, `error` type variants
- Configurable duration and position (top/bottom)
- `dismissToast()` for programmatic dismissal
- ARIA live regions for screen reader accessibility

#### SBOM (Software Bill of Materials)

- `assets/downloads/sbom/sbom.spdx.json` — SPDX 2.3 format
- `assets/downloads/sbom/sbom.cdx.json` — CycloneDX JSON format
- `assets/downloads/sbom/sbom.cdx.xml` — CycloneDX XML format
- `assets/downloads/sbom/sbom.syft.json` — Syft native format
- `scripts/generate-sbom.sh` — Automated SBOM generation script

#### Build & Development

- Makefile with `make dev`, `make build`, `make clean`, `make check`, `make push`
- Build verification system (`scripts/check-all.sh`) with auto-updated README status table
- Branch-aware workflow (main requires `RELEASE` confirmation, development pushes freely)
- Submodule sync commands (`make sync-submodules`)
- Caddy-based dev server for production-like local testing
- Nix development shell with all dependencies

#### Verse Typography

- Content pipeline uses `<span class="verse" data-verse="N"><sup>N</sup> text</span>`
- Each verse displays as its own paragraph block
- Verse numbers styled as superscript with brand color
- Highlight-verse CSS for `?v=` URL scroll-to support

#### Juniperbible.org Theme

- Self-hosted Patrick Hand font (OFL-1.1, woff2 latin + latin-ext)
- Brand palette: muted purple (#6b4c6b), dark teal chrome (#1a3230), warm parchment surfaces
- Handwritten font applied to headings, buttons, badges, navigation

#### Architecture Documentation (`docs/`)

- `ARCHITECTURE.md` — System overview and data flow
- `DATA-FORMATS.md` — JSON schemas and structures
- `VERSIFICATION.md` — Bible versification systems
- `HUGO-MODULE-USAGE.md` — Installation and configuration guide
- `CODE_CLEANUP_CHARTER.md` — Cleanup objectives and plan
- `PHASE-0-BASELINE-INVENTORY.md` — Codebase inventory
- `TESTING.md` — Test coverage checklist
- `ACCESSIBILITY-AUDIT-2026-01-25.md` — WCAG 2.1 AA audit (0 violations)

#### Accessibility

- WCAG 2.1 AA compliance across all core flows
- All form controls properly labeled
- Color contrast meets 4.5:1 minimum ratio
- Strong's tooltips with ARIA tooltip pattern (role="tooltip", aria-describedby, aria-expanded)
- Keyboard activation and Escape key to close tooltips
- ShareMenu with full keyboard navigation and focus management
- Semantic `<button>` elements with proper `type="button"` attributes
- `focusable="false"` on all decorative SVGs
- `aria-controls` on mode toggle buttons
- `aria-hidden="true"` on hidden sections
- `prefers-reduced-motion` and `prefers-contrast` media query support

#### Security

- Content Security Policy (CSP) meta tag in `baseof.html`
- XSS vulnerability patched in `bible-search.js` `highlightMatches()`
- HTML escaping for UI strings in `share-menu.js`
- User search terms properly escaped to prevent code injection
- `rel="noopener noreferrer"` on all external links
- CSP audit completed (21 innerHTML usages documented and reviewed)

### Changed

- CSS architecture: Refactored from Tailwind CSS to PicoCSS with semantic HTML5
- CSS uses custom properties for AirFold paper theme integration
- Templates use semantic CSS classes instead of utility classes
- Layouts namespaced under `religion/bible/` for Hugo module compatibility
- Partials namespaced under `michael/` to avoid conflicts with consuming sites
- Content mount removed — consuming sites provide their own content
- `parallel.js` refactored to use shared modules (dom-utils, bible-api, verse-grid, chapter-dropdown)
- `bible-search.js` refactored to use `bible-api.js` for chapter fetching
- `share.js` refactored to use `ShareMenu` component
- `strongs.js` uses local definitions first, external API as fallback
- All inline styles removed from JavaScript files and HTML templates
- `compare.html` refactored to use partials (color-picker, verse-grid, sss-toggle)
- All templates have documentation headers explaining purpose and dependencies
- `hugo.toml` supports both module and standalone modes
- Homepage layout works with both `/bible` and `/religion/bible` paths
- Juniper submodule migrated to JuniperBible repository with HTTPS URLs

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
- Hardcoded colors removed from CSS (uses CSS variables throughout)
- `user-storage.js` ensureDB() race condition — cached init promise
- `offline-settings-ui.js` clear cache button stuck after success
- `parallel.js` nested RAF handle tracking for proper cancellation
- `pwa-install.js` parseInt NaN guard for corrupted localStorage
- `strongs.js` MutationObserver memory leak with cleanup handlers
- `parallel.js` color picker event conflict between click/touch
- `share-menu.js` race condition in click handler setup
- Conflicting focus-visible CSS rules consolidated
- Duplicate @page print rules consolidated
- Duplicate compare styles removed (181 lines)
- Strong's tooltip no longer scrolls page on click
- Footer copyright text sized appropriately

---

## Project Overview

Michael is a standalone Hugo module that provides Bible reading, comparison, and search functionality. It was extracted from FocuswithJustin.com to be reusable across multiple Hugo sites.

**Repository:** [github.com/FocuswithJustin/michael](https://github.com/FocuswithJustin/michael)

### Data Requirements

Consuming sites must provide:
1. `data/bible.json` — Bible metadata
2. `data/bible_auxiliary/{id}.json` — Per-translation verse data

See the `docs/` directory for full documentation:
- [ARCHITECTURE.md](ARCHITECTURE.md) — System overview
- [DATA-FORMATS.md](DATA-FORMATS.md) — JSON schemas
- [VERSIFICATION.md](VERSIFICATION.md) — Bible versification
- [HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md) — Installation guide
- [CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md) — Cleanup objectives
