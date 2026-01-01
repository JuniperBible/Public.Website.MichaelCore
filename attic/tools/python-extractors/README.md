# Python Extractors (Archived)

These Python extraction scripts have been superseded by the Go-based `cmd/extract` tool
in `tools/sword-converter/`.

## Files

- `extract_scriptures.py` - Full-featured Python extraction script with 27 module support
- `extract_bibles.py` - Earlier version with 5 core modules
- `test_extract_scriptures.py` - Python unittest suite for versification system

## Archived

Date: 2026-01-01

These files are kept for:
1. Reference for additional SCRIPTURES definitions (now merged into Go)
2. Test case reference for Go implementation
3. Output comparison during validation

## Current Implementation

Use the Go-based extractor:

```bash
cd tools/sword-converter
go build ./cmd/extract
./extract -o ../../data/ -v
```

Or via justfile:

```bash
just extract
```

## Test Migration Status

The Python tests in `test_extract_scriptures.py` have been migrated to:
- `tools/sword-converter/cmd/extract/main_test.go` - Extract command tests
- `tools/sword-converter/pkg/sword/versification_systems_test.go` - Versification tests
