# Changelog

All notable changes to the Michael Hugo Bible Module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Makefile with `make dev`, `make build`, and `make clean` targets
- Standalone development mode with example data

### Changed
- Updated `hugo.toml` to support both module and standalone modes
- Updated `shell.nix` with streamlined dependencies and make commands
- Homepage layout now works with both `/bibles` and `/religion/bibles` paths

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

See [docs/PROJECT-CHARTER.md](docs/PROJECT-CHARTER.md) for full documentation.
