# Michael Architecture

This document describes the architecture of the Michael Hugo Bible Module.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MICHAEL SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        BUILD TIME (Hugo)                             │   │
│  │  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │   │
│  │  │ data/bible/  │   │   layouts/    │   │   assets/     │         │   │
│  │  │   *.json      │──▶│   *.html      │──▶│   css/js      │         │   │
│  │  └───────────────┘   └───────────────┘   └───────────────┘         │   │
│  │                              │                                       │   │
│  │                              ▼                                       │   │
│  │                      ┌───────────────┐                              │   │
│  │                      │   public/     │                              │   │
│  │                      │  (static)     │                              │   │
│  │                      └───────────────┘                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        RUNTIME (Browser)                             │   │
│  │                                                                       │   │
│  │  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │   │
│  │  │  bible-api    │   │  UI Components│   │  Controllers  │         │   │
│  │  │  (data layer) │◀─▶│  (dom-utils)  │◀─▶│  (parallel)   │         │   │
│  │  └───────────────┘   └───────────────┘   └───────────────┘         │   │
│  │         │                    │                    │                  │   │
│  │         ▼                    ▼                    ▼                  │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                         DOM                                    │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
michael/
├── assets/
│   ├── css/
│   │   └── theme.css              # Design tokens + components
│   ├── js/
│   │   ├── michael/               # Shared modules (NEW)
│   │   │   ├── dom-utils.js       # DOM utilities
│   │   │   ├── bible-api.js       # Data fetching/caching
│   │   │   ├── verse-grid.js      # Verse selection component
│   │   │   ├── chapter-dropdown.js # Chapter selection component
│   │   │   └── share-menu.js      # Share menu component
│   │   ├── parallel.js            # Compare page controller
│   │   ├── share.js               # Sharing functionality
│   │   ├── strongs.js             # Strong's tooltips
│   │   ├── bible-search.js        # Search functionality
│   │   └── text-compare.js        # Diff algorithm
│   └── downloads/                 # Bible data packages
├── content/
│   ├── bibles/                    # Bible content pages
│   └── licenses/                  # License pages
├── data/
│   └── example/                   # Example data for standalone
│       ├── bibles.json            # Bible metadata
│       └── bibles_auxiliary/      # Per-bible verse data
├── docs/                          # Documentation
├── i18n/                          # 43 language translations
├── layouts/
│   ├── _default/                  # Base templates
│   ├── bibles/                    # Bible-specific templates
│   ├── licenses/                  # License templates
│   └── partials/
│       └── michael/               # Reusable partials
└── static/
    └── schemas/                   # JSON validation schemas
```

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JavaScript Modules                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐                                                   │
│   │ dom-utils   │◀──────────────────────────────────────┐          │
│   │ (utilities) │                                        │          │
│   └─────────────┘                                        │          │
│         ▲                                                │          │
│         │                                                │          │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │          │
│   │ bible-api   │   │ verse-grid  │   │ share-menu  │  │          │
│   │ (data)      │   │ (component) │   │ (component) │  │          │
│   └─────────────┘   └─────────────┘   └─────────────┘  │          │
│         ▲                 ▲                 ▲           │          │
│         │                 │                 │           │          │
│         │           ┌─────────────┐         │           │          │
│         │           │chapter-drop │         │           │          │
│         │           │(component)  │         │           │          │
│         │           └─────────────┘         │           │          │
│         │                 ▲                 │           │          │
│         │                 │                 │           │          │
│   ┌─────┴─────────────────┴─────────────────┴───────────┴───┐      │
│   │                      parallel.js                         │      │
│   │                    (orchestrator)                        │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│   │ share.js    │   │ strongs.js  │   │bible-search │              │
│   │             │   │             │   │             │              │
│   └─────────────┘   └─────────────┘   └─────────────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                           │                                         │
│                     ┌─────────────┐                                 │
│                     │text-compare │                                 │
│                     │(algorithm)  │                                 │
│                     └─────────────┘                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Build-Time Flow

1. **Data Sources** → Hugo processes `data/bible.json` and `data/bible_auxiliary/*.json`
2. **Templates** → Layouts merge data with HTML templates
3. **Content Generation** → `_content.gotmpl` generates book/chapter pages
4. **Asset Pipeline** → CSS and JS are processed and fingerprinted
5. **Output** → Static files written to `public/`

### Runtime Flow

1. **Page Load** → Browser loads static HTML with embedded Bible data
2. **Initialization** → JavaScript modules initialize from `<script id="bible-data">`
3. **User Interaction** → Events trigger controller methods
4. **Data Fetching** → `bible-api.js` fetches chapters on-demand via XHR
5. **Rendering** → UI components update DOM with fetched content
6. **Caching** → Fetched chapters cached in memory Map

## State Management

### URL State (shareable)
- `?bibles=kjv,drc,asv` - Selected translations
- `?ref=John.3.16` - Current reference
- `?sss=1` - SSS mode enabled
- `?verse=16` - Selected verse

### Local Storage (persistent)
- `michael-translations` - Remembered translation selections
- `michael-sss-state` - SSS mode preferences

### Memory State (session)
- Chapter cache (`Map` in bible-api.js)
- Current UI state (selections, toggles)

## Component Responsibilities

### dom-utils.js
- Touch/click event handling
- Contrast color calculation
- Message display utilities
- **No application state**

### bible-api.js
- Chapter fetching with caching
- HTML parsing to verse objects
- **No DOM manipulation**

### verse-grid.js
- Verse button grid rendering
- Selection state management
- Accessibility (aria-pressed)
- **Receives data, emits events**

### chapter-dropdown.js
- Chapter dropdown population
- Book-aware chapter counts
- **Receives data, emits events**

### share-menu.js
- Share menu rendering
- Focus management
- Keyboard navigation
- Online/offline handling
- **Self-contained UI**

### parallel.js (Orchestrator)
- Page initialization
- Event coordination
- State synchronization
- URL parameter handling
- **Coordinates all components**

## Hugo Template Structure

### Base Template (`baseof.html`)
```html
<!DOCTYPE html>
<html lang="{{ .Site.Language.Lang }}">
<head>
  {{ partial "head.html" . }}
</head>
<body>
  {{ partial "header.html" . }}
  <main>{{ block "main" . }}{{ end }}</main>
  {{ partial "footer.html" . }}
</body>
</html>
```

### Bible Templates
- `bibles/list.html` - Translation grid
- `bibles/single.html` - Chapter view
- `bibles/compare.html` - Comparison view
- `bibles/search.html` - Search interface

### Partials
- `michael/bible-nav.html` - Navigation component
- `michael/color-picker.html` - Highlight color selection
- `michael/verse-grid.html` - Verse selection grid
- `michael/sss-toggle.html` - SSS mode toggle

## Testing Infrastructure

```
michael/
├── tests/                        # Regression test suite
│   ├── go.mod                    # Test module (requires Go 1.22+)
│   ├── Makefile                  # Test runner commands
│   ├── helpers/
│   │   └── helpers.go            # Shared test utilities
│   └── regression/
│       ├── compare_test.go       # Compare page tests (5)
│       ├── search_test.go        # Search page tests (2)
│       ├── single_test.go        # Single chapter tests (5)
│       ├── offline_test.go       # Offline/PWA tests (1)
│       ├── mobile_test.go        # Mobile touch tests (1)
│       └── keyboard_test.go      # Keyboard navigation tests (1)
└── tools/
    └── magellan/                 # E2E testing framework (submodule)
        └── pkg/e2e/              # Browser automation package
```

### Test Commands

```bash
make test           # Run all 15 regression tests
make test-compare   # Compare page tests
make test-search    # Search page tests
make test-single    # Single chapter tests
make test-offline   # Offline/PWA tests
make test-mobile    # Mobile touch tests
make test-keyboard  # Keyboard navigation tests
```

## Service Worker Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVICE WORKER (sw.js)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Install Event                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Pre-cache: CSS, JS, fonts, default chapters (KJV Gen/Ps/Mt/Jn)│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Fetch Event                                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Cache-first for shell assets                                  │  │
│  │ Network-first for Bible chapters (cache on success)           │  │
│  │ Offline fallback for uncached pages                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Activate Event                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Clean up old cache versions                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Security Model

- **Zero external runtime dependencies** - All JavaScript is self-contained
- **Content Security Policy** - CSP meta tag in baseof.html
- **XSS Prevention** - User input properly escaped
- **No eval()** - No dynamic code execution
- **No inline handlers** - All event handlers attached via JavaScript

See [SECURITY.md](SECURITY.md) for comprehensive security documentation.

## See Also

- [DATA-FORMATS.md](DATA-FORMATS.md) - JSON schemas and data structures
- [VERSIFICATION.md](VERSIFICATION.md) - Bible versification systems
- [HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md) - Installation guide
- [TESTING.md](TESTING.md) - Regression testing guide
- [SERVICE-WORKER.md](SERVICE-WORKER.md) - Offline capabilities
- [SECURITY.md](SECURITY.md) - Security model
- [CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md) - Cleanup objectives
