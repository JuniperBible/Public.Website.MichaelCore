# Hugo Module Usage Guide

This guide explains how to install and configure the Michael Hugo Bible Module.

## Installation Methods

### Method 1: Hugo Module (Recommended)

Add to your `hugo.toml`:

```toml
[module]
  [[module.imports]]
    path = "github.com/FocuswithJustin/michael"
```

Initialize Hugo modules if not already done:

```bash
hugo mod init github.com/yourusername/yoursite
hugo mod get -u
```

### Method 2: Git Submodule

```bash
git submodule add https://github.com/FocuswithJustin/michael.git themes/michael
```

Add to your `hugo.toml`:

```toml
theme = ["michael", "your-other-theme"]
```

### Method 3: Standalone

Clone the repository and run directly:

```bash
git clone https://github.com/FocuswithJustin/michael.git
cd michael
make dev
```

## Configuration

### Basic Configuration

```toml
# hugo.toml

[params.michael]
  basePath = "/bible"        # URL path for Bible section
  backLink = "/"              # Back navigation link
  defaultBible = "kjv"        # Default translation
  enableSearch = true         # Enable search functionality
  enableShare = true          # Enable sharing features
  enableStrongs = true        # Enable Strong's number tooltips
```

### Menu Integration

Add a Bible link to your site menu:

```toml
[[menus.main]]
  name = "Bible"
  url = "/bible/"
  weight = 50
```

### Multilingual Support

Michael includes translations for 43 languages. Configure in your `hugo.toml`:

```toml
[languages]
  [languages.en]
    languageName = "English"
    weight = 1
  [languages.es]
    languageName = "Español"
    weight = 2
```

## Data Requirements

### Required Data Files

Your site must provide Bible data in `data/`:

1. **bibles.json** - Translation metadata

```json
{
  "bibles": [
    {
      "id": "kjv",
      "title": "King James Version",
      "abbrev": "KJV",
      "lang": "en",
      "versification": "protestant",
      "license": "CC-PDDC"
    }
  ]
}
```

2. **bibles_auxiliary/{id}.json** - Book/chapter structure

```json
{
  "id": "kjv",
  "books": [
    {"id": "Gen", "name": "Genesis", "chapters": 50, "testament": "OT"},
    {"id": "Matt", "name": "Matthew", "chapters": 28, "testament": "NT"}
  ]
}
```

### Content Generation

Bible content pages can be generated using:

1. **Juniper tool** (recommended)
2. **Custom scripts**
3. **Manual creation**

See [DATA-FORMATS.md](DATA-FORMATS.md) for detailed schemas.

## Customization

### Overriding Templates

Copy any template from `layouts/` to your site's `layouts/` directory:

```
your-site/
└── layouts/
    └── bibles/
        └── single.html  # Override chapter display
```

### Overriding Styles

Add custom CSS in your site:

```css
/* Override Michael design tokens */
:root {
  --michael-accent: #your-brand-color;
  --michael-surface: #your-background;
}
```

### Overriding Partials

Override any partial in `layouts/partials/michael/`:

```
your-site/
└── layouts/
    └── partials/
        └── michael/
            └── bible-nav.html  # Custom navigation
```

## JavaScript Integration

### Script Loading Order

If you need to extend Michael's JavaScript:

```html
<!-- Load Michael modules first -->
{{ $domUtils := resources.Get "js/michael/dom-utils.js" }}
{{ $bibleApi := resources.Get "js/michael/bible-api.js" }}
{{ $parallel := resources.Get "js/parallel.js" }}

<script src="{{ $domUtils.RelPermalink }}" defer></script>
<script src="{{ $bibleApi.RelPermalink }}" defer></script>
<script src="{{ $parallel.RelPermalink }}" defer></script>

<!-- Then your custom scripts -->
<script src="/js/my-extensions.js" defer></script>
```

### Extending Components

```javascript
// Access Michael's namespace
const { BibleAPI, VerseGrid, ShareMenu } = window.Michael;

// Extend functionality
const myGrid = new VerseGrid({
  container: document.getElementById('my-grid'),
  onVerseSelect: (verse) => {
    console.log('Selected:', verse);
  }
});
```

## Troubleshooting

### Module Not Found

```
Error: module "github.com/FocuswithJustin/michael" not found
```

**Solution:** Run `hugo mod get -u` to update modules.

### Missing Bible Data

```
Error: .Site.Data.bibles is nil
```

**Solution:** Ensure `data/bible.json` exists with valid content.

### Styling Conflicts

If Michael's CSS conflicts with your theme:

1. Check CSS custom property names don't overlap
2. Use more specific selectors
3. Load Michael's CSS before your theme's CSS

### JavaScript Errors

If JavaScript doesn't work:

1. Check browser console for errors
2. Ensure scripts load in correct order
3. Verify `id="bible-data"` script tag is present

## Production Deployment

### Build Command

```bash
hugo --minify
```

### Environment Variables

```bash
HUGO_ENVIRONMENT=production hugo
```

### CDN Configuration

Michael uses relative URLs by default. For CDN deployment:

```toml
[params]
  cdnURL = "https://cdn.example.com"
```

## Offline Support

Michael includes a service worker for offline reading capabilities:

### Features

- **Shell Pre-caching** - CSS, JS, and fonts cached on first visit
- **Chapter Caching** - Bible chapters cached as you browse
- **Default Pre-cache** - KJV Genesis, Psalms, Matthew, John pre-cached
- **Offline Fallback** - Graceful fallback page when content not cached
- **Cache Management** - UI for clearing offline cache

### Configuration

The service worker is automatically registered when the site loads. No additional configuration required.

### Cache Management

Users can manage their offline cache through the settings panel:
- View cached content
- Clear offline cache
- See cache size

See [SERVICE-WORKER.md](SERVICE-WORKER.md) for technical details.

## Support

- **Issues:** [GitHub Issues](https://github.com/FocuswithJustin/michael/issues)
- **Documentation:** See `docs/` directory
- **Charter:** [CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md)

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [DATA-FORMATS.md](DATA-FORMATS.md) - Data structure details
- [VERSIFICATION.md](VERSIFICATION.md) - Bible versification
- [SERVICE-WORKER.md](SERVICE-WORKER.md) - Offline capabilities
- [TESTING.md](TESTING.md) - Regression testing
- [SECURITY.md](SECURITY.md) - Security model
- [README.md](README.md) - Documentation index
