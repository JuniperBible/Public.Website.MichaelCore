# Michael Component Inventory

This document provides a comprehensive inventory of all components that make up the Michael Hugo Bible module.

## Table of Contents

- [Overview](#overview)
- [Hugo Templates](#hugo-templates)
- [JavaScript Modules](#javascript-modules)
- [CSS Components](#css-components)
- [Data Files](#data-files)
- [Static Assets](#static-assets)
- [Build Tools](#build-tools)
- [License Summary](#license-summary)

---

## Overview

Michael is designed as a **zero-runtime-dependency** static site generator that produces pure HTML, CSS, and vanilla JavaScript. All components are either:

1. **Authored by the project** - Custom code written specifically for Michael
2. **Public domain data** - Bible texts and concordance data
3. **Build-time dependencies** - Tools used only during development/build

**Key principle:** No runtime JavaScript frameworks or libraries. Everything runs in the browser with native Web APIs.

---

## Hugo Templates

Michael includes **23 Hugo template files** that render Bible content and navigation.

### Template Categories

#### Layout Templates (7 files)

| Template | Purpose | Location |
|----------|---------|----------|
| `baseof.html` | Base template with HTML structure | `layouts/_default/baseof.html` |
| `single.html` | Single page layout (chapters, verses) | `layouts/_default/single.html` |
| `list.html` | List layout (book indexes) | `layouts/_default/list.html` |
| `home.html` | Homepage layout | `layouts/index.html` |
| `404.html` | Error page | `layouts/404.html` |
| `robots.txt` | Robots.txt template | `layouts/robots.txt` |
| `sitemap.xml` | Sitemap template | `layouts/sitemap.xml` |

#### Bible-Specific Templates (6 files)

| Template | Purpose | Location |
|----------|---------|----------|
| `book.html` | Book index (e.g., Genesis chapters) | `layouts/bible/book.html` |
| `chapter.html` | Chapter view with verses | `layouts/bible/chapter.html` |
| `verse.html` | Single verse permalink | `layouts/bible/verse.html` |
| `compare.html` | Parallel translation comparison | `layouts/bible/compare.html` |
| `search.html` | Bible search interface | `layouts/bible/search.html` |
| `strongs.html` | Strong's concordance lookup | `layouts/strongs/single.html` |

#### Partial Templates (8 files)

| Partial | Purpose | Location |
|---------|---------|----------|
| `head.html` | HTML `<head>` metadata | `layouts/partials/head.html` |
| `header.html` | Site header and navigation | `layouts/partials/header.html` |
| `footer.html` | Site footer | `layouts/partials/footer.html` |
| `bible-nav.html` | Bible navigation controls | `layouts/partials/bible-nav.html` |
| `verse-text.html` | Verse formatting logic | `layouts/partials/verse-text.html` |
| `strongs-tooltip.html` | Strong's number tooltips | `layouts/partials/strongs-tooltip.html` |
| `offline-banner.html` | Offline mode indicator | `layouts/partials/offline-banner.html` |
| `translation-selector.html` | Bible version dropdown | `layouts/partials/translation-selector.html` |

#### License Templates (2 files)

| Template | Purpose | Location |
|----------|---------|----------|
| `licenses/list.html` | License overview page | `layouts/licenses/list.html` |
| `licenses/single.html` | Individual license pages | `layouts/licenses/single.html` |

### Template Language

All templates use:

- **Hugo template syntax** - Go's `text/template` and `html/template` packages
- **No JavaScript templating** - Templates render at build time, not in the browser
- **OSIS markup support** - Handles OSIS XML structure from SWORD modules

### Versioning

Templates are versioned with the Michael project:

- **License:** Same as Michael project (see root `LICENSE`)
- **No separate versioning** - Templates are integral to the module

---

## JavaScript Modules

Michael includes **9 custom JavaScript modules** in the `michael` namespace, plus **4 standalone scripts**.

### Core Modules (`assets/js/michael/`)

| Module | Version | Purpose | Lines of Code |
|--------|---------|---------|---------------|
| `bible-api.js` | 1.0.0 | Bible data fetching and caching | ~250 |
| `offline-manager.js` | 1.0.0 | Service worker and offline storage | ~400 |
| `offline-settings-ui.js` | 1.0.0 | Offline settings interface | ~200 |
| `chapter-dropdown.js` | 1.0.0 | Chapter navigation dropdown | ~150 |
| `verse-grid.js` | 1.0.0 | Verse grid rendering | ~180 |
| `dom-utils.js` | 1.0.0 | DOM manipulation utilities | ~120 |
| `share-menu.js` | 1.0.0 | Share menu (native Web Share API) | ~100 |
| `sss-mode.js` | 1.0.0 | Scripture Study Sidebar mode | ~80 |
| `diff-highlight.js` | 1.0.0 | Text comparison highlighting | ~160 |

### Standalone Scripts

| Script | Version | Purpose | Lines of Code |
|--------|---------|---------|---------------|
| `text-compare.js` | 1.0.0 | Parallel translation comparison | ~300 |
| `strongs.js` | 1.0.0 | Strong's concordance lookup | ~220 |
| `parallel.js` | 1.0.0 | Parallel view rendering | ~180 |
| `bible-search.js` | 1.0.0 | Client-side Bible search | ~400 |

### Service Worker

| File | Version | Purpose | Lines of Code |
|------|---------|---------|---------------|
| `sw.js` | 1.0.0 | Service worker for offline functionality | ~350 |

### JavaScript Features Used

All JavaScript modules use **modern vanilla JavaScript**:

- **ES6+ syntax** - Arrow functions, template literals, destructuring
- **Native APIs only:**
  - `fetch()` - For loading Bible JSON files
  - `localStorage` - For persistent settings
  - `IndexedDB` - For offline Bible storage (via service worker)
  - `Cache API` - For offline resource caching
  - Web Share API - For native sharing on mobile
  - IntersectionObserver - For lazy loading
  - History API - For navigation without page reloads

- **NO external dependencies:**
  - No jQuery
  - No React/Vue/Angular
  - No Lodash or utility libraries
  - No polyfills (assumes modern browsers)

### Browser Compatibility

Modules are tested on:

- Chrome/Edge 90+ (Chromium)
- Firefox 88+
- Safari 14+

Older browsers are not supported (no polyfills included).

### JavaScript License

All JavaScript modules:

- **Author:** Michael project contributors
- **License:** Same as Michael project (see root `LICENSE`)
- **Copyright:** 2024-Present

---

## CSS Components

Michael uses a **single CSS file** with no external frameworks.

### Main Stylesheet

| File | Purpose | Lines of Code | Minified Size |
|------|---------|---------------|---------------|
| `assets/css/theme.css` | All site styles | ~1200 | ~25 KB |

### CSS Architecture

The stylesheet is organized into logical sections:

1. **CSS Variables** - Theme colors, spacing, typography
2. **Reset and Base** - Normalize browser defaults
3. **Layout** - Grid, flexbox, responsive containers
4. **Typography** - Headings, paragraphs, verse text
5. **Navigation** - Header, footer, Bible nav controls
6. **Components** - Buttons, dropdowns, modals
7. **Bible-Specific** - Verse formatting, Strong's tooltips
8. **Utilities** - Helper classes (hide, show, etc.)
9. **Responsive** - Media queries for mobile/tablet/desktop

### CSS Features Used

- **CSS Grid** - For parallel translation layout
- **CSS Flexbox** - For navigation and controls
- **CSS Custom Properties** - For theming (`--primary-color`, etc.)
- **Media Queries** - For responsive design
- **CSS Containment** - For performance (verse rendering)

### NO CSS Frameworks

Michael does **not** use:

- Bootstrap
- Tailwind CSS
- Foundation
- Bulma
- Material UI

Rationale: Keep the project lightweight and eliminate runtime dependencies.

### CSS Processing

CSS is processed by **Hugo's asset pipeline**:

- Minification (via `hugo --minify`)
- Fingerprinting (cache-busting hashes)
- PostCSS (optional, if configured)

### CSS License

- **Author:** Michael project contributors
- **License:** Same as Michael project (see root `LICENSE`)

---

## Data Files

Michael includes extensive JSON data files for Bible texts and metadata.

### Bible Texts

**Location:** `data/example/bible_auxiliary/*.json`

| File | Translation | Testament | Verses | Size (JSON) | Size (Compressed) |
|------|-------------|-----------|--------|-------------|-------------------|
| `kjva.json` | King James Version + Apocrypha | OT + NT + Apocrypha | ~31,100 | ~5.2 MB | ~950 KB (.tar.xz) |
| `asv.json` | American Standard Version | OT + NT | ~31,100 | ~4.8 MB | ~880 KB |
| `drc.json` | Douay-Rheims Challoner | OT + NT + Apocrypha | ~31,900 | ~5.0 MB | ~920 KB |
| `geneva1599.json` | Geneva Bible (1599) | OT + NT | ~31,100 | ~4.9 MB | ~890 KB |
| `tyndale.json` | Tyndale Bible | OT (partial) + NT | ~8,000 | ~1.2 MB | ~220 KB |
| `web.json` | World English Bible | OT + NT | ~31,100 | ~4.7 MB | ~850 KB |
| `vulgate.json` | Latin Vulgate | OT + NT | ~31,100 | ~4.5 MB | ~820 KB |
| `sblgnt.json` | SBL Greek New Testament | NT only | ~7,950 | ~1.1 MB | ~200 KB |
| `lxx.json` | Septuagint (Greek OT) | OT only | ~23,150 | ~3.8 MB | ~680 KB |
| `osmhb.json` | Open Scriptures Hebrew Bible | OT only | ~23,150 | ~4.2 MB | ~750 KB |

**Total Bible data:** ~39.4 MB uncompressed, ~7.2 MB compressed

### Bible Metadata

**File:** `data/example/bible.json`
**Purpose:** Index of all available Bible translations
**Size:** ~15 KB

Contains:

- Translation names and abbreviations
- Language codes (ISO 639)
- Testament coverage (OT, NT, Apocrypha)
- Versification schemas (KJV, Vulgate, LXX)
- License information

### Strong's Concordance Data

**Location:** `data/strongs/*.json`

| File | Purpose | Entries | Size |
|------|---------|---------|------|
| `hebrew.json` | Hebrew/Aramaic definitions | 150 (representative) | ~85 KB |
| `greek.json` | Greek definitions | 150 (representative) | ~72 KB |

**Note:** Currently includes only the most common Strong's numbers. Full concordance data is available from SWORD modules.

Each entry includes:

- `lemma` - Original Hebrew or Greek word
- `xlit` - Transliteration (romanized)
- `pron` - Pronunciation guide
- `def` - English definition
- `derivation` - Etymology and derivation

### License Rights Data

**File:** `data/example/license_rights.json`
**Purpose:** Machine-readable license metadata for Bible translations
**Size:** ~35 KB
**Generated from:** SPDX license data + SWORD module metadata

### Software Dependencies Data

**File:** `data/example/software_deps.json`
**Purpose:** Software bill of materials (SBOM) in JSON format
**Size:** Varies (depends on dependencies)
**Generated by:** Syft SBOM scanner

### Data Licenses

| Data Type | License | Source |
|-----------|---------|--------|
| Public domain Bibles | CC-PDDC (Public Domain) | SWORD Project |
| GPL-licensed Bibles | GPL-3.0-or-later | CrossWire Bible Society |
| Copyrighted-free Bibles | Copyrighted-Free | SBL, CCAT |
| Strong's Concordance | Public Domain | James Strong (1890) |
| License metadata | CC0-1.0 (Public Domain) | SPDX project |

See: [../THIRD-PARTY-LICENSES.md](../THIRD-PARTY-LICENSES.md)

---

## Static Assets

Michael includes minimal static assets.

### Images and Icons

**Current status:** None included (planned for future)

Potential future assets:

- Favicon (`.ico`, `.png`)
- App icons for PWA (Progressive Web App)
- Social media preview images (Open Graph)

### Fonts

**Current status:** Uses system fonts only

Font stack:
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

No web fonts are loaded (performance and privacy).

### Downloadable Packages

**Location:** `assets/downloads/*.tar.xz`

Compressed Bible packages for offline use:

| File | Contents | Size |
|------|----------|------|
| `all-bibles.tar.xz` | All Bible translations | ~7.2 MB |
| `kjva.tar.xz` | KJVA only | ~950 KB |
| `asv.tar.xz` | ASV only | ~880 KB |
| `drc.tar.xz` | DRC only | ~920 KB |
| `geneva1599.tar.xz` | Geneva 1599 only | ~890 KB |
| `tyndale.tar.xz` | Tyndale only | ~220 KB |
| `web.tar.xz` | WEB only | ~850 KB |
| `vulgate.tar.xz` | Vulgate only | ~820 KB |
| `sblgnt.tar.xz` | SBLGNT only | ~200 KB |
| `lxx.tar.xz` | LXX only | ~680 KB |
| `osmhb.tar.xz` | OSMHB only | ~750 KB |

These packages can be extracted and used with the offline manager.

---

## Build Tools

Michael uses several build-time tools (not included in runtime).

### Juniper (Scripture Conversion Toolkit)

**Location:** `tools/juniper/`
**Language:** Go
**Purpose:** Converts SWORD and e-Sword modules to Hugo-compatible JSON

#### Dependencies (Go modules)

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| `github.com/spf13/cobra` | v1.8.1 | Apache-2.0 | CLI framework |
| `github.com/spf13/pflag` | v1.0.5 | BSD-3-Clause | Command-line flags |
| `github.com/hashicorp/go-multierror` | v1.1.1 | MPL-2.0 | Error handling |
| `github.com/hashicorp/errwrap` | v1.0.0 | MPL-2.0 | Error wrapping |
| `github.com/jlaffaye/ftp` | v0.2.0 | ISC | FTP client (for SWORD repos) |
| `github.com/mattn/go-sqlite3` | v1.14.24 | MIT | SQLite (for e-Sword) |
| `gopkg.in/yaml.v3` | v3.0.1 | Apache-2.0 / MIT | YAML parsing |
| Go standard library | go1.25.4 | BSD-3-Clause | Core Go packages |

**Total dependencies:** 7 third-party packages + Go stdlib

See: `tools/juniper/go.mod` for full dependency tree

### Vendored External Data

**Location:** `tools/juniper/vendor_external/`

| Component | Purpose | License |
|-----------|---------|---------|
| `choosealicense/` | License templates and data | MIT |
| `spdx/licenses.json` | SPDX license database | CC0-1.0 |

#### choosealicense.com Vendored Package

**Source:** https://github.com/github/choosealicense.com
**License:** MIT
**Files:**

- `licenses.json` - License metadata
- `rules.json` - License permission/condition/limitation rules
- `assets/vendor/hint.css/` - CSS tooltips (MIT licensed)

**NPM dependency (vendored):**

| Package | Version | License |
|---------|---------|---------|
| `hint.css` | 2.6.0 | MIT |

This is the **only** NPM package in the entire project, and it's vendored (not a runtime dependency).

### Hugo (Static Site Generator)

**Version:** Latest (no version pinning, uses system Hugo)
**License:** Apache-2.0
**Purpose:** Builds static HTML from templates and data
**Website:** https://gohugo.io/

**Not bundled** - Users install Hugo separately:
```bash
nix-shell  # Provides Hugo via Nix
# OR
brew install hugo  # macOS
# OR
apt install hugo   # Debian/Ubuntu
```

### Syft (SBOM Generator)

**Version:** 1.38.0 (or latest available)
**License:** Apache-2.0
**Purpose:** Generates Software Bill of Materials
**Website:** https://github.com/anchore/syft

**Not bundled** - Users install Syft separately:
```bash
nix-shell -p syft  # Nix
# OR
brew install syft  # macOS
# OR
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh
```

### Make (Build Automation)

**Version:** GNU Make (any version)
**License:** GPL-3.0-or-later
**Purpose:** Build orchestration (`Makefile`)
**Standard tool** - Included in most Unix-like systems

---

## License Summary

### Project-Authored Components

All components authored specifically for Michael:

- Hugo templates (23 files)
- JavaScript modules (13 files)
- CSS stylesheet (1 file)
- Build scripts (`Makefile`, `scripts/`)

**License:** Same as Michael project (see root `LICENSE`)

### Third-Party Data

| Component | License | Type |
|-----------|---------|------|
| Bible texts (public domain) | CC-PDDC | Data |
| Bible texts (GPL) | GPL-3.0-or-later | Data |
| Bible texts (copyrighted-free) | Various | Data |
| Strong's Concordance | Public Domain | Data |
| SPDX license data | CC0-1.0 | Data |

See: [../THIRD-PARTY-LICENSES.md](../THIRD-PARTY-LICENSES.md)

### Third-Party Code (Build Tools)

| Tool | License | Usage |
|------|---------|-------|
| Hugo | Apache-2.0 | Build-time only |
| Syft | Apache-2.0 | Build-time only |
| Juniper dependencies (Go) | Apache-2.0, MIT, BSD-3-Clause, MPL-2.0, ISC | Build-time only |
| hint.css (vendored) | MIT | Build-time only (CSS for license pages) |

All build tools are **not distributed** with the final static site.

---

## Component Verification

To verify components in your local Michael installation:

```bash
# Count Hugo templates
find layouts -name "*.html" | wc -l

# List JavaScript modules
ls -1 assets/js/michael/*.js

# Check CSS file
ls -lh assets/css/theme.css

# List Bible data files
ls -1 data/example/bible_auxiliary/*.json

# View SBOM
cat assets/downloads/sbom/sbom.syft.json | jq '.artifacts[] | .name'
```

---

## Updates and Maintenance

This inventory is maintained alongside the codebase.

To update:

1. Add new components as they're created
2. Update version numbers when dependencies change
3. Regenerate SBOM: `make sbom`
4. Update this document with new component details

**Last Updated:** 2026-01-25
