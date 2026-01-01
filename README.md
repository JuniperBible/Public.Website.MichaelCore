# Michael - Hugo Bible Extension

Plug-and-play Hugo module for Bible reading functionality.

## Features

- 5 base Bible translations included (KJV, Geneva, Tyndale, DRC, Vulgate)
- Side-by-side translation comparison (up to 11 translations)
- Full-text search with Strong's numbers (H####/G####)
- Verse sharing (URL, clipboard, Twitter/X, Facebook)
- Use Juniper to download, convert, and install more translations

## Installation

```toml
# hugo.toml
[module]
  [[module.imports]]
    path = "github.com/FocuswithJustin/michael"
```

Or as git submodule:

```bash
git submodule add git@github.com:FocuswithJustin/michael.git tools/michael
```

## Configuration

```toml
[params.michael]
  basePath = "/bibles"        # URL path for Bible section
  backLink = "/"              # Back navigation link
```

## Data Requirements

Consuming sites must provide:

1. `data/bibles.json` - Bible metadata
2. `data/bibles_auxiliary/{id}.json` - Per-translation verse data

See `static/schemas/` for JSON Schema validation.

## Companion Modules

| Module | Purpose |
|--------|---------|
| **AirFold** | Visual theme (CSS, base layouts) |
| **Gabriel** | Contact form functionality |
| **Juniper** | SWORD/e-Sword to JSON conversion |

## Reference

See `attic` branch for pre-modularization working implementation.

## Status

Fresh build in progress. See [TODO.txt](TODO.txt) for current tasks.

## License

Copyright (c) 2024 - Present Justin. All rights reserved.
