# Changelog

All notable changes to the Michael Hugo Bible Module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
