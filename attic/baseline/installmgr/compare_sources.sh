#!/bin/bash
# Compare remote sources listing between installmgr and Go implementation
# Usage: ./compare_sources.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONVERTER_DIR="$SCRIPT_DIR/../../../tools/sword-converter"

echo "=============================================="
echo "InstallMgr vs Go Implementation: Sources"
echo "=============================================="

echo ""
echo "=== installmgr -s (list sources) ==="
installmgr -s 2>/dev/null || echo "Error: installmgr not found. Run: nix-shell -p sword"

echo ""
echo "=== Go implementation: repo list-sources ==="
cd "$CONVERTER_DIR"
go run ./cmd/sword-converter repo list-sources 2>/dev/null || echo "Note: Go implementation not yet complete"

echo ""
echo "=============================================="
