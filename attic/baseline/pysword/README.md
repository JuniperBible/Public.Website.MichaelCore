# PySword Reference

Source code from the PySword project - a native Python SWORD module reader.

## Source

- Repository: https://gitlab.com/tgc-dk/pysword
- License: MIT

## Files

- `canons.py` - Bible canon definitions with verse counts for all versification systems
- `modules.py` - SWORD module format readers (ztext, rawtext, etc.)
- `__init__.py` - Package initialization

## Purpose

These files serve as reference implementations for:
1. Verse count data for KJV and other versification systems
2. Binary format parsing for SWORD zText modules
3. Verification of Go parser output

## Key Data

The `canons.py` file contains versification data in the format:
```python
canons = {
    'kjv': {
        'ot': [
            ('Genesis', 'Gen', 'Gen', [31, 25, 24, ...]),  # verse counts per chapter
            ...
        ],
        'nt': [...]
    },
    'catholic': {...},
    ...
}
```

## Usage

Extract KJV verse counts for Go:
```python
import ast
with open('canons.py') as f:
    exec(f.read())
for name, abbr, long_abbr, verses in canons['kjv']['ot']:
    print(f'"{abbr}": {{{", ".join(map(str, verses))}}},')
```
