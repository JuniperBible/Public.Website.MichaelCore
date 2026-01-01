# SWORD Project Reference

The SWORD Project provides the Bible module format and diatheke CLI tool.

## Source

- Website: https://www.crosswire.org/sword/
- Source: https://crosswire.org/svn/sword/trunk/
- GitHub Mirror: https://github.com/mdbergmann/Sword/tree/main

## Key Components

### diatheke

Command-line interface for reading SWORD modules.

```bash
# Install on NixOS
nix-shell -p sword

# Usage examples
diatheke -b KJV -k Gen 1:1           # Get Genesis 1:1
diatheke -b KJV -k "Gen 1:1-3"       # Get verse range
diatheke -b KJV -f plain -k Gen 1:1  # Plain text output (no OSIS)
```

### Module Format

SWORD modules use these file types:
- `.conf` - Module configuration (in mods.d/)
- `.bzs` - Block/buffer index for zText
- `.bzv` - Verse index for zText
- `.bzz` - Compressed text data

### Versification

SWORD supports multiple Bible canons:
- KJV (66 books, Protestant)
- KJVA (with Apocrypha)
- Catholic, Orthodox, Synodal, etc.

Verse counts come from SWORD source code canon definitions.

## Reference Source Files

The SWORD library source code contains the canonical versification data:
- `include/canon_*.h` - Header files with verse counts
- `src/keys/versekey.cpp` - VerseKey implementation

These are used to derive the verse count tables in our converter.

## Usage for Validation

```bash
# Compare Go output vs diatheke
diatheke -b KJV -f plain -k "Gen 1:1" | diff - go_output.txt
```

## Documentation

- Format specification: https://wiki.crosswire.org/Module_Development
- API documentation: https://www.crosswire.org/sword/docs/api/
