# Baseline Reference Implementations

This directory contains reference implementations and source code from third-party projects used for comparison and validation of the scripture converter tools.

## Contents

| Directory | Source | Purpose |
|-----------|--------|---------|
| `tools/` | Original Python scripts | Baseline extraction using diatheke |
| `pysword/` | [PySword](https://gitlab.com/tgc-dk/pysword) | Python SWORD reader with versification data |
| `sword/` | [SWORD Project](https://crosswire.org/sword/) | Documentation for diatheke and format specs |

## Usage

### Speed Comparison

Compare Go extractor vs Python+diatheke:

```bash
# Python baseline
time python3 tools/extract_scriptures.py ../../data/

# Go extractor
time go run ../../tools/sword-converter/cmd/extract/main.go -o ../../data/
```

### Output Validation

Verify Go parser produces identical output to diatheke:

```bash
# Get verse via diatheke
nix-shell -p sword --run 'diatheke -b KJV -f plain -k "Gen 1:1"'

# Compare with Go output
go run ../../tools/sword-converter/cmd/extract/main.go -verse "Gen 1:1"
```

### Versification Data

Extract KJV verse counts from PySword:

```bash
python3 -c "
import sys
sys.path.insert(0, 'pysword')
from canons import canons
for name, abbr, _, verses in canons['kjv']['ot'] + canons['kjv']['nt']:
    print(f'{abbr}: {verses}')
"
```

## Notes

- These files are snapshots preserved for reference
- Active development occurs in `tools/sword-converter/`
- Do not modify these files; they serve as baselines
