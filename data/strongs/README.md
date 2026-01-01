# Strong's Concordance Definitions

This directory contains Strong's Hebrew and Greek lexicon data for offline use in the Michael Bible application.

## Files

- `hebrew.json` - Hebrew/Aramaic Strong's definitions (H0001-H8674)
- `greek.json` - Greek Strong's definitions (G0001-G5624)

## Data Format

Each JSON file contains a dictionary mapping Strong's numbers to definition objects:

```json
{
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

- `lemma` - Original Hebrew or Greek word
- `xlit` - Transliteration (romanized form)
- `pron` - Pronunciation guide
- `def` - English definition
- `derivation` - Etymology and derivation information

## Usage

### In Hugo Templates

Include the Strong's data partial in your layout:

```html
{{ partial "michael/strongs-data.html" . }}
```

This injects the data into `window.Michael.StrongsData.hebrew` and `window.Michael.StrongsData.greek`.

### In JavaScript

The `strongs.js` script automatically uses local data when available:

```javascript
// Data is accessed via window.Michael.StrongsData
// The strongs.js script handles all lookups automatically
```

## Data Source

The definitions are derived from James Strong's Exhaustive Concordance of the Bible (1890), which is in the public domain.

## Current Coverage

- **Hebrew**: 150 representative entries (most common words)
- **Greek**: 150 representative entries (most common words)

To add more definitions, simply extend the JSON files following the same format. The `_meta` key is reserved for metadata and is ignored by the lookup system.

## Metadata

Each file includes a `_meta` object with:

- `source` - Data source name
- `license` - License information (Public Domain)
- `generated` - Generation date
- `count` - Number of entries
- `description` - Brief description

## Offline Support

When local data is available, Strong's tooltips work completely offline. If a Strong's number is not in the local data:

1. **Online**: Shows a link to Blue Letter Bible for the full definition
2. **Offline**: Shows "Definition not available offline" message

## Extending the Data

To add more Strong's definitions:

1. Add entries to the appropriate JSON file (hebrew.json or greek.json)
2. Follow the existing format
3. Ensure Strong's numbers are zero-padded to 4 digits (e.g., "H0001")
4. Update the `count` field in `_meta`

## Complete Data Sources

For complete Strong's concordance data, consider these public domain sources:

- Open Scriptures Hebrew Bible project
- Berean Bible project
- CrossWire Sword module data
- Blue Letter Bible (web scraping with permission)

## License

The Strong's Concordance data is in the **Public Domain**. James Strong's original work from 1890 is no longer under copyright.
