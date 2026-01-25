# Michael - Hugo Bible Module

A standalone Hugo module for Bible reading and comparison functionality.

**Michael is a self-contained Bible application module.** It provides all layouts, JavaScript, and i18n strings needed for Bible functionality. Pair with AirFold theme for styling.

**[Project Charter](docs/PROJECT-CHARTER.md)** | **[TODO](TODO.txt)**

| Status | Value |
|--------|-------|
| Layouts | 4 (list, single, compare, search) |
| JavaScript | 5 scripts (parallel, share, strongs, text-compare, bible-search) |
| Languages | 5 (en, es, fr, de, it) |
| Translations | Up to 11 side-by-side |

## Companion Modules

| Module | Purpose |
|--------|---------|
| **AirFold** | Visual theme (CSS, base layouts) |
| **Gabriel** | Contact form functionality |
| **Juniper** | SWORD/e-Sword to JSON conversion |

> **Note:** The `attic` branch contains the pre-separation project state at commit ca5d7d8.

## Features

- **Multiple Bible Translations** - Browse and read various Bible translations
- **Translation Comparison** - Compare up to 11 translations side-by-side
- **SSS Mode** - Side-by-Side Scripture comparison with diff highlighting
- **Full-Text Search** - Search across Bible translations with phrase and Strong's number support
- **Strong's Numbers** - Clickable Strong's number tooltips with lexicon links
- **Verse Sharing** - Share verses via URL, clipboard, or social media
- **Responsive Design** - Works on desktop, tablet, and mobile
- **i18n Support** - Internationalized UI strings

## Quick Start

### 1. Add the Module

Add to your `hugo.toml`:

```toml
[module]
  [[module.imports]]
    path = "github.com/FocuswithJustin/michael"
```

### 2. Configure the Module

```toml
[params.michael]
  basePath = "/bibles"        # URL path for Bible section (default: /religion/bibles)
  backLink = "/"              # Back navigation link
```

### 3. Mount Content

The module mounts content to `/religion/bibles/` by default. Override if needed:

```toml
[[module.mounts]]
  source = "github.com/FocuswithJustin/michael/content/bibles"
  target = "content/my-path/bibles"
```

### 4. Provide Bible Data

Copy the example data structure or generate using Juniper:

```
data/
├── bibles.json               # Bible metadata
└── bibles_auxiliary/
    ├── kjv.json              # Per-translation content
    ├── drc.json
    └── ...
```

## Data Format

### bibles.json

```json
{
  "bibles": [
    {
      "id": "kjv",
      "title": "King James Version",
      "abbrev": "KJV",
      "description": "1769 Edition",
      "language": "English",
      "license": "public-domain",
      "features": ["Strong's Numbers"],
      "tags": ["Historic", "Protestant"],
      "weight": 1
    }
  ]
}
```

### bibles_auxiliary/{id}.json

```json
{
  "books": [
    {
      "id": "Gen",
      "name": "Genesis",
      "testament": "OT",
      "chapters": [
        {
          "number": 1,
          "verses": [
            { "number": 1, "text": "In the beginning..." }
          ]
        }
      ]
    }
  ]
}
```

See `static/schemas/` for complete JSON schemas.

## Generating Bible Data

Use the included Juniper tool to convert SWORD modules:

```bash
cd tools/juniper
go build ./cmd/juniper
./juniper convert --module KJV --output ../../data/bibles_auxiliary/kjv.json
```

See [Juniper README](tools/juniper/README.md) for complete documentation.

## Layouts

The module provides these layouts:

| Layout | Description |
|--------|-------------|
| `michael/bibles/list.html` | Bible translations list with filtering |
| `michael/bibles/single.html` | Bible/book/chapter pages |
| `michael/compare.html` | Translation comparison interface |
| `michael/search.html` | Full-text search interface |

## Partials

| Partial | Description |
|---------|-------------|
| `michael/bible-nav.html` | Bible/book/chapter dropdown navigation |
| `michael/canonical-comparison.html` | Canonical traditions comparison table |

## JavaScript

| Script | Description |
|--------|-------------|
| `parallel.js` | Parallel translation view controller |
| `share.js` | Verse sharing functionality |
| `strongs.js` | Strong's number tooltips |
| `text-compare.js` | Text diff/comparison engine |
| `bible-search.js` | Client-side search |

## i18n

The module provides English strings in `i18n/en.toml`. Override or add translations in your site's `i18n/` directory.

Key strings:
- `bibles`, `biblesDescription` - Section header
- `selectBible`, `selectBook`, `selectChapter` - Navigation
- `compareTranslations`, `searchBible` - Features
- `previousChapter`, `nextChapter` - Navigation buttons

## CSS Requirements

The module uses Tailwind CSS classes and expects these CSS variables:

```css
:root {
  --color-accent: #7a00b0;
  --color-paper-black: #1a1a1a;
  --color-paper-gray: #666;
  --color-paper-cream: #f5f5eb;
  --color-paper-border: #ddd;
  --font-hand: 'Patrick Hand', cursive;
}
```

Required Tailwind classes:
- `btn-paper`, `btn-paper-dark` - Buttons
- `card-paper` - Card containers
- `input-paper` - Form inputs
- `font-hand` - Handwriting font

## License

Copyright (c) 2024 - Present Justin. All rights reserved.

See [LICENSE.txt](LICENSE.txt) for terms.

## Third-Party

See [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) for attribution of:
- STEPBible interface patterns (BSD 3-Clause)
- SWORD Project (GPL-2.0)
- Blue Letter Bible (external service)
