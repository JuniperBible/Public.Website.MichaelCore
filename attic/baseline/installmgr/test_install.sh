#!/bin/bash
# Test module installation parity between installmgr and Go implementation
# Usage: ./test_install.sh [module] [source]
# Example: ./test_install.sh KJV CrossWire

set -e

MODULE="${1:-KJV}"
SOURCE="${2:-CrossWire}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONVERTER_DIR="$SCRIPT_DIR/../../../tools/sword-converter"

echo "=============================================="
echo "InstallMgr vs Go Implementation: Install"
echo "Module: $MODULE"
echo "Source: $SOURCE"
echo "=============================================="

# Create temporary directories
ORIG_DIR=$(mktemp -d)
GO_DIR=$(mktemp -d)

trap "rm -rf $ORIG_DIR $GO_DIR" EXIT

echo ""
echo "=== Installing with installmgr ==="
echo "Target: $ORIG_DIR/.sword"
mkdir -p "$ORIG_DIR/.sword/mods.d"
export SWORD_PATH="$ORIG_DIR/.sword"
installmgr -init 2>/dev/null || true
installmgr -sc 2>/dev/null || true
installmgr -r "$SOURCE" 2>/dev/null || true
installmgr -ri "$SOURCE" "$MODULE" 2>/dev/null || echo "Error: installmgr install failed"

echo ""
echo "=== Installing with Go implementation ==="
echo "Target: $GO_DIR/.sword"
cd "$CONVERTER_DIR"
go run ./cmd/sword-converter repo install "$SOURCE" "$MODULE" --sword-path "$GO_DIR/.sword" 2>/dev/null || echo "Note: Go implementation not yet complete"

echo ""
echo "=== Comparing results ==="

MODULE_LOWER=$(echo "$MODULE" | tr '[:upper:]' '[:lower:]')

echo ""
echo "--- Conf file comparison ---"
ORIG_CONF="$ORIG_DIR/.sword/mods.d/${MODULE_LOWER}.conf"
GO_CONF="$GO_DIR/.sword/mods.d/${MODULE_LOWER}.conf"

if [[ -f "$ORIG_CONF" ]] && [[ -f "$GO_CONF" ]]; then
    diff "$ORIG_CONF" "$GO_CONF" && echo "Conf files match!" || echo "Conf files differ"
elif [[ -f "$ORIG_CONF" ]]; then
    echo "Only installmgr created conf file"
    head -20 "$ORIG_CONF"
elif [[ -f "$GO_CONF" ]]; then
    echo "Only Go implementation created conf file"
    head -20 "$GO_CONF"
else
    echo "No conf files created by either tool"
fi

echo ""
echo "--- Data files comparison ---"
ORIG_MODULES="$ORIG_DIR/.sword/modules"
GO_MODULES="$GO_DIR/.sword/modules"

if [[ -d "$ORIG_MODULES" ]] && [[ -d "$GO_MODULES" ]]; then
    echo "installmgr files:"
    find "$ORIG_MODULES" -type f | head -10
    echo ""
    echo "Go implementation files:"
    find "$GO_MODULES" -type f | head -10
    echo ""
    diff -rq "$ORIG_MODULES" "$GO_MODULES" && echo "Data files match!" || echo "Data files differ"
elif [[ -d "$ORIG_MODULES" ]]; then
    echo "Only installmgr created data files:"
    find "$ORIG_MODULES" -type f | head -10
elif [[ -d "$GO_MODULES" ]]; then
    echo "Only Go implementation created data files:"
    find "$GO_MODULES" -type f | head -10
else
    echo "No data files created by either tool"
fi

echo ""
echo "=============================================="
