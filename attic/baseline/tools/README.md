# Baseline Tools

This directory contains the original Python extraction scripts that serve as reference implementations for comparison against the Go-based sword-converter tool.

## Files

- `extract_scriptures.py` - Main Python extraction script using diatheke CLI
- `extract_bibles.py` - Earlier version of the extraction script

## Purpose

These baseline scripts are kept for:
1. **Speed comparison**: Benchmark Go extractor vs Python+diatheke
2. **Output validation**: Verify Go parser produces identical output
3. **Reference implementation**: Document expected behavior

## Usage

```bash
# Python extraction (baseline)
python3 extract_scriptures.py ../../../data/

# Go extraction (new implementation)
cd ../../../tools/sword-converter
go build ./cmd/extract
./extract -o ../../../data/ -v
```

## Testing

The `pkg/testing/tool_comparison_test.go` file contains tests that compare output from both tools.

## Note

These files are snapshots from the development process and should not be modified.
The active development happens in `tools/sword-converter/`.
