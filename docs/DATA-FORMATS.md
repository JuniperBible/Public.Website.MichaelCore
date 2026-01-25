# Data Formats

This document describes the JSON data structures used by the Michael Hugo Bible Module.

## Overview

Michael requires two types of data files:

1. **bibles.json** - Metadata about available Bible translations
2. **bibles_auxiliary/{id}.json** - Book/chapter structure for each translation

## bibles.json

Location: `data/bibles.json` (or `data/example/bibles.json` for standalone)

### Schema

```json
{
  "bibles": [
    {
      "id": "kjv",
      "title": "King James Version",
      "abbrev": "KJV",
      "lang": "en",
      "year": "1611",
      "versification": "kjva",
      "license": "CC-PDDC",
      "hasStrongs": true,
      "tags": ["english", "protestant", "historic"]
    }
  ]
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (lowercase, no spaces) |
| `title` | string | Yes | Full translation name |
| `abbrev` | string | Yes | Short abbreviation (3-6 chars) |
| `lang` | string | Yes | ISO 639-1 language code |
| `year` | string | No | Publication year |
| `versification` | string | Yes | Versification system (see below) |
| `license` | string | Yes | SPDX license identifier |
| `hasStrongs` | boolean | No | Whether Strong's numbers are included |
| `tags` | array | No | Searchable tags for filtering |

### Versification Systems

| System | Books | Used By |
|--------|-------|---------|
| `protestant` | 66 | Most English Bibles (NIV, ESV, etc.) |
| `kjva` | 73 | KJV with Apocrypha |
| `catholic` | 73 | Catholic Bibles (DRC, NAB) |
| `orthodox` | 76-78 | Orthodox Bibles (RusSynodal) |
| `lxx` | 53 | Septuagint |
| `leningrad` | 39 | Hebrew Bible (OSMHB) |

## bibles_auxiliary/{id}.json

Location: `data/bibles_auxiliary/{id}.json`

### Schema

```json
{
  "id": "kjv",
  "books": [
    {
      "id": "Gen",
      "name": "Genesis",
      "chapters": 50,
      "testament": "OT"
    },
    {
      "id": "Matt",
      "name": "Matthew",
      "chapters": 28,
      "testament": "NT"
    }
  ]
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Matches parent Bible ID |
| `books` | array | Yes | Array of book objects |
| `books[].id` | string | Yes | OSIS book ID (Gen, Exod, Matt, etc.) |
| `books[].name` | string | Yes | Display name |
| `books[].chapters` | number | Yes | Number of chapters |
| `books[].testament` | string | Yes | "OT", "NT", or "AP" (Apocrypha) |

### OSIS Book IDs

**Old Testament (39 books):**
```
Gen, Exod, Lev, Num, Deut, Josh, Judg, Ruth, 1Sam, 2Sam,
1Kgs, 2Kgs, 1Chr, 2Chr, Ezra, Neh, Esth, Job, Ps, Prov,
Eccl, Song, Isa, Jer, Lam, Ezek, Dan, Hos, Joel, Amos,
Obad, Jonah, Mic, Nah, Hab, Zeph, Hag, Zech, Mal
```

**New Testament (27 books):**
```
Matt, Mark, Luke, John, Acts, Rom, 1Cor, 2Cor, Gal, Eph,
Phil, Col, 1Thess, 2Thess, 1Tim, 2Tim, Titus, Phlm, Heb,
Jas, 1Pet, 2Pet, 1John, 2John, 3John, Jude, Rev
```

**Apocrypha/Deuterocanonical (7+ books):**
```
Tob, Jdt, AddEsth, Wis, Sir, Bar, EpJer, PrAzar, Sus,
Bel, 1Macc, 2Macc, 3Macc, 4Macc, 1Esd, 2Esd, PrMan
```

## Chapter Content

Chapter content is generated as static HTML pages at:
```
/bibles/{bible-id}/{book-id}/{chapter}/
```

Example: `/bibles/kjv/john/3/`

### Verse HTML Structure

```html
<div class="bible-text">
  <span class="verse" data-verse="16">
    <sup class="verse-num">16</sup>
    For God so loved the world...
    <span class="strongs" data-strongs="G3779">οὕτως</span>
  </span>
</div>
```

### Strong's Number Format

- Hebrew: `H0001` to `H8674`
- Greek: `G0001` to `G5624`

Example: `<span class="strongs" data-strongs="H430">אֱלֹהִים</span>`

## Strong's Definitions

Location: `data/strongs/hebrew.json` and `data/strongs/greek.json`

Strong's definitions provide offline lexicon data for Hebrew and Greek words referenced by Strong's numbers in Bible texts.

### Schema

```json
{
  "_meta": {
    "source": "Strong's Hebrew Lexicon",
    "license": "Public Domain",
    "generated": "2026-01-25",
    "count": 150,
    "description": "Representative sample of Strong's Hebrew definitions"
  },
  "H0001": {
    "lemma": "אָב",
    "xlit": "'ab",
    "pron": "awb",
    "def": "father, in a literal and immediate, or figurative and remote application",
    "derivation": "a primitive word"
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lemma` | string | Yes | Original Hebrew/Greek word |
| `xlit` | string | Yes | Transliteration (romanized form) |
| `pron` | string | Yes | Pronunciation guide |
| `def` | string | Yes | English definition |
| `derivation` | string | Yes | Etymology and derivation information |

### Metadata (_meta)

Each Strong's JSON file includes a `_meta` object with:

- `source` - Data source name
- `license` - License information (Public Domain)
- `generated` - Generation date (YYYY-MM-DD)
- `count` - Number of definitions included
- `description` - Brief description of the data set

### Usage in Hugo

Include the Strong's data partial in Bible layouts:

```html
{{ partial "michael/strongs-data.html" . }}
```

This injects definitions into `window.Michael.StrongsData.hebrew` and `window.Michael.StrongsData.greek` for offline use.

### JavaScript Integration

The `strongs.js` script automatically uses local data when available:

1. **Local data available**: Shows rich definition with lemma, transliteration, pronunciation, definition, and derivation
2. **Online without local data**: Shows link to Blue Letter Bible
3. **Offline without local data**: Shows "Definition not available offline" message

### Coverage

Current implementation includes representative samples:

- **Hebrew**: 150+ common entries (H0001-H8674)
- **Greek**: 150+ common entries (G0001-G5624)

To add more definitions, extend the JSON files following the same format. Strong's numbers must be zero-padded to 4 digits (e.g., "H0001").

## JSON Schema Validation

Validation schemas are available in `static/schemas/`:

- `bibles.schema.json` - Validates bibles.json
- `bibles-auxiliary.schema.json` - Validates auxiliary files

### Using with Hugo

```toml
# hugo.toml
[params.michael]
  validateData = true  # Enable schema validation
```

## Data Generation

Bible data is generated using the Juniper tool:

```bash
# List available SWORD modules
juniper list

# Extract a Bible
juniper extract --module=KJV --output=data/

# Generate Hugo content
juniper hugo --input=data/kjv/ --output=content/bibles/kjv/
```

See [tools/juniper/README.md](../tools/juniper/README.md) for details.

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [VERSIFICATION.md](VERSIFICATION.md) - Versification details
- [static/schemas/](../static/schemas/) - JSON Schema files
