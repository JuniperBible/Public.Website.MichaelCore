#!/bin/bash
# check-all.sh - Run all build checks and update README.md status
# Usage: ./scripts/check-all.sh [--update-readme]
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
README="$PROJECT_ROOT/README.md"
UPDATE_README=false
HUGO_PID=""

# Validate README exists
if [[ ! -f "$README" ]]; then
    echo "Warning: README not found at $README"
fi

# Cleanup function to kill background processes
cleanup() {
    if [[ -n "$HUGO_PID" ]] && kill -0 "$HUGO_PID" 2>/dev/null; then
        echo "Cleaning up Hugo server (PID: $HUGO_PID)..."
        kill "$HUGO_PID" 2>/dev/null || true
        wait "$HUGO_PID" 2>/dev/null || true
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Parse arguments
if [[ "${1:-}" == "--update-readme" ]]; then
    UPDATE_README=true
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
declare -A RESULTS
ALL_PASSED=true

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    RESULTS["$1"]="pass"
}

fail() {
    echo -e "${RED}✗${NC} $1: $2"
    RESULTS["$1"]="fail"
    ALL_PASSED=false
}

skip() {
    echo -e "${YELLOW}⊘${NC} $1: $2"
    RESULTS["$1"]="skip"
}

echo "========================================"
echo "Michael Build Checks"
echo "========================================"
echo ""

cd "$PROJECT_ROOT"

# 1. Clean Build Check
echo "Checking Hugo build..."
# WARNING: Removing build artifacts (public/, resources/)
rm -rf public/ resources/
STDERR_CAPTURE=$(mktemp)
if hugo --minify --quiet 2>"$STDERR_CAPTURE"; then
    pass "Hugo Build"
else
    fail "Hugo Build" "hugo --minify failed"
    if [[ -s "$STDERR_CAPTURE" ]]; then
        echo "  Error details:" >&2
        cat "$STDERR_CAPTURE" >&2
    fi
fi
rm -f "$STDERR_CAPTURE"

# 2. SBOM Generation Check
echo "Checking SBOM generation..."
if [ -x "./scripts/generate-sbom.sh" ]; then
    STDERR_CAPTURE=$(mktemp)
    if ./scripts/generate-sbom.sh --quiet 2>"$STDERR_CAPTURE"; then
        pass "SBOM Generation"
    else
        fail "SBOM Generation" "generate-sbom.sh failed"
        if [[ -s "$STDERR_CAPTURE" ]]; then
            echo "  Error details:" >&2
            cat "$STDERR_CAPTURE" >&2
        fi
    fi
    rm -f "$STDERR_CAPTURE"
else
    skip "SBOM Generation" "generate-sbom.sh not found or not executable"
fi

# 3. JuniperBible Tests
echo "Checking JuniperBible tests..."
if [ -d "tools/juniper" ]; then
    cd tools/juniper
    if go test ./... -count=1 -short 2>/dev/null | grep -q "PASS"; then
        pass "JuniperBible Tests"
    elif go test ./... -count=1 -short 2>&1 | grep -q "ok"; then
        pass "JuniperBible Tests"
    else
        fail "JuniperBible Tests" "go test failed"
    fi
    cd "$PROJECT_ROOT"
else
    skip "JuniperBible Tests" "tools/juniper not found"
fi

# 4. Regression Tests (only if Hugo server can be started)
echo "Checking regression tests..."
if [ -d "tests" ] && [ -f "tests/go.mod" ]; then
    # Start Hugo server in background
    hugo server --port ${PORT:-1313} --buildDrafts &>/dev/null &
    HUGO_PID=$!

    # Wait for Hugo to start with retry logic
    RETRY_COUNT=0
    MAX_RETRIES=10
    HUGO_READY=false

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -s http://localhost:${PORT:-1313}/ &>/dev/null; then
            HUGO_READY=true
            break
        fi
        sleep 1
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done

    # Check if Hugo started successfully
    if [ "$HUGO_READY" = true ]; then
        cd tests
        if go test -v ./regression/... -count=1 2>&1 | grep -q "PASS"; then
            pass "Regression Tests"
        else
            fail "Regression Tests" "E2E tests failed"
        fi
        cd "$PROJECT_ROOT"
    else
        skip "Regression Tests" "Hugo server failed to start within ${MAX_RETRIES} seconds"
    fi

    # Stop Hugo (cleanup trap will handle this, but try anyway)
    kill "$HUGO_PID" 2>/dev/null || true
else
    skip "Regression Tests" "tests directory not found"
fi

# 5. Clean Worktree Check
echo "Checking worktree status..."
if git diff --quiet && git diff --cached --quiet; then
    pass "Clean Worktree"
else
    fail "Clean Worktree" "uncommitted changes detected"
fi

echo ""
echo "========================================"
echo "Results Summary"
echo "========================================"

# Update README.md if requested
if $UPDATE_README; then
    echo "Updating README.md..."

    TODAY=$(date +%Y-%m-%d)

    # Build the new table
    TABLE="| Check | Status | Description |
|-------|--------|-------------|
| Hugo Build | ${RESULTS["Hugo Build"]:-skip} | Site builds without errors |
| SBOM Generation | ${RESULTS["SBOM Generation"]:-skip} | SBOM files generated successfully |
| JuniperBible Tests | ${RESULTS["JuniperBible Tests"]:-skip} | 100+ tests passing |
| Regression Tests | ${RESULTS["Regression Tests"]:-skip} | 15 E2E tests passing |
| Clean Worktree | ${RESULTS["Clean Worktree"]:-skip} | No uncommitted changes |"

    # Convert pass/fail/skip to emoji
    TABLE=$(echo "$TABLE" | sed 's/| pass |/| ✅ Pass |/g')
    TABLE=$(echo "$TABLE" | sed 's/| fail |/| ❌ Fail |/g')
    TABLE=$(echo "$TABLE" | sed 's/| skip |/| ⊘ Skip |/g')

    # Update README using sed (with macOS compatibility)
    # Detect macOS vs Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SED_INPLACE=(-i '')
    else
        SED_INPLACE=(-i)
    fi

    # Match from AUTO-GENERATED to END AUTO-GENERATED and replace
    sed "${SED_INPLACE[@]}" "/<!-- AUTO-GENERATED: Do not edit manually/,/<!-- END AUTO-GENERATED -->/c\\
<!-- AUTO-GENERATED: Do not edit manually. Run \`make check\` to update. -->\\
\\
$TABLE\\
\\
<!-- END AUTO-GENERATED -->" "$README"

    # Update last verified date
    sed "${SED_INPLACE[@]}" "s/\\*Last verified: [0-9-]*\\*/\\*Last verified: $TODAY\\*/" "$README"

    echo "README.md updated with check results"
fi

echo ""
if $ALL_PASSED; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed!${NC}"
    exit 1
fi
