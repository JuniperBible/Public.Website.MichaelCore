# Scripture Converter

Tools for converting scripture modules from various sources (SWORD, e-Sword, Sefaria) to Hugo-compatible JSON for the website's multi-tradition scripture comparison system.

## Overview

This toolkit supports multiple biblical canons and religious traditions:

| Tradition | Books | Examples |
|-----------|-------|----------|
| Protestant | 66 | KJV, Geneva, Tyndale |
| Catholic | 73 | DRC, Vulgate, NABRE |
| Orthodox | 76-81 | Septuagint-based |
| Ethiopian | 81 | Includes 1 Enoch, Jubilees |
| Jewish | 24/39 | Tanakh (Torah, Nevi'im, Ketuvim) |
| Islamic | 114 | Quran (surahs) |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture and roadmap.

## Quick Start (Python/diatheke)

The fastest way to extract scriptures:

```bash
# Enter nix environment with dependencies
nix-shell -p python3Packages.pyyaml sword

# Extract using versification system (supports all canons)
python3 extract_scriptures.py data/

# Legacy extraction (Protestant 66-book canon only)
python3 extract_bibles.py data/
```

## Versification System

Book structures are defined in YAML files with inheritance:

```
versifications/
├── protestant.yaml    # 66 books (base)
├── catholic.yaml      # 73 books (extends protestant)
├── ethiopian.yaml     # 81 books (extends catholic)
├── tanakh.yaml        # Hebrew Bible structure
└── quran.yaml         # 114 surahs
```

Example inheritance:
```yaml
# catholic.yaml
name: Catholic
extends: protestant
additional_books:
  - id: Tob
    name: Tobit
    testament: DC  # Deuterocanonical
    chapters: 14
    insert_after: Neh
```

## SWORD Module Management

```bash
# List installed modules
installmgr -l

# List remote sources
installmgr -s

# Refresh and install from a source
installmgr -r "CrossWire"
installmgr -ri "CrossWire" "DRC"
```

## Features

### Extraction Tools (Python)
- **Versification support** - Protestant, Catholic, Orthodox, Ethiopian, Jewish canons
- **Auto-discovery** - Detects which books exist in each module
- **diatheke integration** - Uses SWORD's CLI for reliable extraction

### Go Converter (Advanced)

The Go converter now supports multiple versification systems:

| System | Description | Books |
|--------|-------------|-------|
| KJV | Protestant (default) | 66 books |
| Vulg | Vulgate (Catholic) | 73+ books including deuterocanon |
| LXX | Septuagint (Orthodox) | Greek OT with additional books |

The parser auto-detects the versification from the SWORD module's `.conf` file and uses
the appropriate verse indexing. For modules without explicit versification, KJV is assumed.

- **SWORD Format Support**
  - Bible texts (zText, zText4, RawText)
  - Commentaries (zCom, zCom4, RawCom)
  - Dictionaries/Lexicons (zLD, RawLD)
  - General Books (RawGenBook)

- **e-Sword Format Support**
  - Bibles (.bblx)
  - Commentaries (.cmtx)
  - Dictionaries (.dctx)

- **Markup Conversion**
  - OSIS XML → Markdown
  - ThML → Markdown
  - GBF → Markdown
  - TEI → Markdown

- **Configurable Output**
  - Page granularity: book, chapter, or verse level
  - Strong's number preservation
  - Morphology code preservation

## Installation

### Prerequisites

- Go 1.22 or later
- (Optional) libsword for CGo testing

### Build

```bash
cd tools/juniper
go build -o bin/juniper ./cmd/juniper
```

Or via npm:

```bash
npm run sword:build
```

## Usage

### Migrate Modules

Copy SWORD modules from the system directory to the project:

```bash
# Migrate all modules
juniper migrate --source ~/.sword --dest sword_data/incoming

# Migrate specific modules
juniper migrate --source ~/.sword --dest sword_data/incoming --modules KJV,MHC,StrongsGreek
```

### Convert to Hugo Format

Generate Hugo-compatible JSON from migrated modules:

```bash
# Convert with chapter-level pages (default)
juniper convert --input sword_data/incoming --output sword_data

# Convert with verse-level pages
juniper convert --input sword_data/incoming --output sword_data --granularity verse

# Convert specific modules
juniper convert --input sword_data/incoming --output sword_data --modules KJV
```

### Watch Mode (Development)

Automatically rebuild when modules change:

```bash
juniper watch --input sword_data/incoming --output sword_data
```

### Test Parser Accuracy

Compare pure Go parser output against CGo libsword reference:

```bash
juniper test --compare-cgo --verses "Genesis 1:1,John 3:16,Psalm 23:1"
```

## Configuration

Create `config.yaml` in the tool directory:

```yaml
swordDir: ~/.sword
eswordDir: ~/e-sword
outputDir: ../../sword_data
contentDir: ../../content/religion
granularity: chapter  # book | chapter | verse

modules: []  # empty = all modules

filters:
  languages: []  # empty = all languages
  types:
    - Bible
    - Commentary
    - Dictionary

output:
  preserveStrongs: true
  preserveMorphology: true
  generateSearchIndex: false
```

## Output Format

### Metadata JSON (`sword_data/bibles.json`)

```json
{
  "bibles": [
    {
      "id": "kjv",
      "title": "King James Version",
      "abbrev": "KJV",
      "language": "en",
      "features": ["StrongsNumbers", "Morphology"],
      "tags": ["English", "Traditional"],
      "weight": 1
    }
  ],
  "meta": {
    "granularity": "chapter",
    "generated": "2025-12-29T15:00:00Z"
  }
}
```

### Auxiliary JSON (`sword_data/bibles_auxiliary.json`)

Contains full content organized by book and chapter, with verse-level data including Strong's numbers and morphology codes.

## Project Structure

```
tools/juniper/
├── cmd/juniper/    # CLI entry point
├── pkg/
│   ├── config/            # Configuration handling
│   ├── sword/             # SWORD format parsers
│   ├── esword/            # e-Sword format parsers
│   ├── markup/            # Markup → Markdown converters
│   ├── output/            # Hugo JSON generators
│   ├── migrate/           # File migration
│   ├── repository/        # Module repository management (installmgr replacement)
│   ├── cgo/               # CGo libsword bindings
│   └── testing/           # Test framework
│       └── testdata/      # Test fixtures
├── config.yaml            # Default configuration
└── go.mod
```

### Repository Package (installmgr replacement)

The `pkg/repository/` package provides native Go module management:

| File | Purpose |
|------|---------|
| `source.go` | Remote source definitions (FTP/HTTP/HTTPS) |
| `client.go` | HTTP client with retry, timeout, progress tracking |
| `index.go` | Module index parsing from mods.d.tar.gz |
| `localconfig.go` | Local ~/.sword configuration management |
| `installer.go` | Module installation and uninstallation |

See [religion-section.md](../../docs/religion-section.md) for usage details.

## Integration with Hugo

This tool is designed to work with the AirFold Hugo theme's religion extension:

1. Run `juniper convert` to generate JSON in `sword_data/`
2. Hugo's `_content.gotmpl` templates generate pages from this JSON
3. Pages appear at `/religion/bibles/`, `/religion/commentaries/`, etc.

## Testing

```bash
# Run all tests (from project root)
npm run test:sword

# Run directly with Go
cd tools/juniper
go test ./...

# With CGo comparison (requires libsword-dev)
go test -tags libsword ./...

# Run with strict fixture matching
STRICT_FIXTURES=1 go test ./pkg/testing/...

# Update golden files
UPDATE_GOLDEN=1 go test ./pkg/testing/...
```

### Test Coverage (2025-12-31)

| Package | Coverage | Description |
|---------|----------|-------------|
| pkg/cgo | 100% | CGo bindings to libsword |
| pkg/config | 100% | Configuration handling |
| pkg/markup | 99.1% | OSIS, ThML, GBF, TEI converters |
| pkg/repository | ~95% | Module repository management (84 tests) |
| pkg/testing | 90.1% | Test framework utilities |
| pkg/sword | 89.8% | SWORD binary format parsers |
| pkg/esword | 88.6% | e-Sword SQLite parsers |
| pkg/migrate | 92.4% | File migration utilities |
| pkg/output | 86.2% | Hugo JSON generators |

### Test Framework

The test framework provides:

- **Text comparison** with configurable similarity thresholds
- **Golden file testing** for regression detection
- **CGo comparison testing** against libsword reference
- **Benchmarks** for performance measurement
- **Synthetic binary data** for SWORD format testing

Test fixtures define expected converter behavior. Some are aspirational targets that document desired improvements.

### Baseline Tools

Original Python extraction scripts are archived at `attic/baseline/tools/` for:
- Speed comparison (diatheke vs Go extractor)
- Output validation (Python baseline vs Go extractor)
- Reference implementation documentation

## License

MIT License - see LICENSE file for details.

## Development Roadmap

### Phase 1: Versification Support ✅
- [x] Define versification YAML files for major traditions
- [x] Update extract script to use versification systems
- [x] Auto-discover books from SWORD modules
- [x] Implement Go versification system infrastructure (KJV, Vulgate, LXX)
- [x] Update ztext parser to support multiple versification systems

### Phase 2: Full Canon Extraction (Current)
- [ ] Run `extract_scriptures.py` to get all deuterocanonical books
- [ ] Verify Catholic/Orthodox canon completeness
- [ ] Update compressed data files with full canon
- [ ] Add remaining versification systems (NRSV, Synodal, Luther, etc.)

### Phase 3: Multiple Source Types
- [ ] Add Sefaria API support for Jewish texts (Talmud, Mishnah)
- [ ] Add plain text/Markdown import for custom sources
- [ ] Support e-Sword format conversion

### Phase 4: Cross-Tradition Mapping
- [ ] Create book mappings for cross-references
- [ ] Generate comparison metadata
- [ ] Link to study guide categories

### Phase 5: Extended Corpora
- [ ] Add Quran support (114 surahs)
- [ ] Add Talmud structure support
- [ ] Add patristic/mystical text structure

### Phase 6: Comparison UI
- [ ] Show canonical status across traditions
- [ ] Enable parallel text viewing
- [ ] Visual indicators (canonical, deuterocanonical, etc.)

## Related Documentation

- [Architecture & Roadmap](docs/ARCHITECTURE.md)
- [Scripture Comparison Study Guide](../../content/esoterica/scripture-comparison-study-guide.md)
- [Hugo Religion Extension](../../themes/airfold/extensions/religion/)
- [AirFold Theme](../../themes/airfold/README.md)
