#!/bin/bash
# Compare module listing between installmgr and Go implementation
# Usage: ./compare_modules.sh [source]
# Example: ./compare_modules.sh CrossWire

set -e

SOURCE="${1:-CrossWire}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONVERTER_DIR="$SCRIPT_DIR/../../../tools/sword-converter"

echo "=============================================="
echo "InstallMgr vs Go Implementation: Modules"
echo "Source: $SOURCE"
echo "=============================================="

echo ""
echo "=== installmgr -rl $SOURCE (first 50) ==="
installmgr -r "$SOURCE" 2>/dev/null || true
installmgr -rl "$SOURCE" 2>/dev/null | head -50 || echo "Error: installmgr not found"

echo ""
echo "=== Go implementation: repo list $SOURCE (first 50) ==="
cd "$CONVERTER_DIR"
go run ./cmd/sword-converter repo list "$SOURCE" 2>/dev/null | head -50 || echo "Note: Go implementation not yet complete"

echo ""
echo "=============================================="
