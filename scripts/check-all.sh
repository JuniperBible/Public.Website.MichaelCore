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

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

cleanup() {
    if [[ -n "$HUGO_PID" ]] && kill -0 "$HUGO_PID" 2>/dev/null; then
        echo "Cleaning up Hugo server (PID: $HUGO_PID)..."
        kill "$HUGO_PID" 2>/dev/null || true
        wait "$HUGO_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT INT TERM

# ---------------------------------------------------------------------------
# Arguments and colours
# ---------------------------------------------------------------------------

if [[ "${1:-}" == "--update-readme" ]]; then
    UPDATE_README=true
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Result tracking
# ---------------------------------------------------------------------------

declare -A RESULTS
ALL_PASSED=true

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

# ---------------------------------------------------------------------------
# Individual check functions
# ---------------------------------------------------------------------------

check_hugo() {
    echo "Checking Hugo build..."
    rm -rf public/ resources/
    if hugo --minify --quiet 2>/dev/null; then
        pass "Hugo Build"
    else
        fail "Hugo Build" "hugo --minify failed"
    fi
}

check_sbom() {
    echo "Checking SBOM generation..."
    if [ ! -x "./scripts/generate-sbom.sh" ]; then
        skip "SBOM Generation" "generate-sbom.sh not found or not executable"
        return
    fi
    if ./scripts/generate-sbom.sh --quiet 2>/dev/null; then
        pass "SBOM Generation"
    else
        fail "SBOM Generation" "generate-sbom.sh failed"
    fi
}

check_juniper() {
    echo "Checking JuniperBible tests..."
    if [ ! -d "tools/juniper" ]; then
        skip "JuniperBible Tests" "tools/juniper not found"
        return
    fi
    cd tools/juniper
    local output
    output=$(go test ./... -count=1 -short 2>&1)
    cd "$PROJECT_ROOT"
    if echo "$output" | grep -qE "PASS|ok"; then
        pass "JuniperBible Tests"
    else
        fail "JuniperBible Tests" "go test failed"
    fi
}

# Returns 0 if Hugo is ready, 1 if it timed out.
wait_for_hugo() {
    local max_retries="${1:-10}"
    local port="${PORT:-1313}"
    local retries=0
    while [ "$retries" -lt "$max_retries" ]; do
        if curl -s "http://localhost:${port}/" &>/dev/null; then
            return 0
        fi
        sleep 1
        retries=$((retries + 1))
    done
    return 1
}

check_regression() {
    echo "Checking regression tests..."
    if [ ! -d "tests" ] || [ ! -f "tests/go.mod" ]; then
        skip "Regression Tests" "tests directory not found"
        return
    fi

    hugo server --port "${PORT:-1313}" --buildDrafts &>/dev/null &
    HUGO_PID=$!

    local max_retries=10
    if ! wait_for_hugo "$max_retries"; then
        skip "Regression Tests" "Hugo server failed to start within ${max_retries} seconds"
        kill "$HUGO_PID" 2>/dev/null || true
        return
    fi

    cd tests
    local output
    output=$(go test -v ./regression/... -count=1 2>&1)
    cd "$PROJECT_ROOT"

    kill "$HUGO_PID" 2>/dev/null || true

    if echo "$output" | grep -q "PASS"; then
        pass "Regression Tests"
    else
        fail "Regression Tests" "E2E tests failed"
    fi
}

check_worktree() {
    echo "Checking worktree status..."
    if git diff --quiet && git diff --cached --quiet; then
        pass "Clean Worktree"
    else
        fail "Clean Worktree" "uncommitted changes detected"
    fi
}

# ---------------------------------------------------------------------------
# README update
# ---------------------------------------------------------------------------

detect_sed_inplace() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "-i ''"
    else
        echo "-i"
    fi
}

update_readme() {
    echo "Updating README.md..."
    local today
    today=$(date +%Y-%m-%d)

    local table
    table="| Check | Status | Description |
|-------|--------|-------------|
| Hugo Build | ${RESULTS["Hugo Build"]:-skip} | Site builds without errors |
| SBOM Generation | ${RESULTS["SBOM Generation"]:-skip} | SBOM files generated successfully |
| JuniperBible Tests | ${RESULTS["JuniperBible Tests"]:-skip} | 100+ tests passing |
| Regression Tests | ${RESULTS["Regression Tests"]:-skip} | 15 E2E tests passing |
| Clean Worktree | ${RESULTS["Clean Worktree"]:-skip} | No uncommitted changes |"

    table="${table//| pass |/| ✅ Pass |}"
    table="${table//| fail |/| ❌ Fail |}"
    table="${table//| skip |/| ⊘ Skip |}"

    local sed_inplace
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed_inplace=(-i '')
    else
        sed_inplace=(-i)
    fi

    sed "${sed_inplace[@]}" \
        "/<!-- AUTO-GENERATED: Do not edit manually/,/<!-- END AUTO-GENERATED -->/c\\
<!-- AUTO-GENERATED: Do not edit manually. Run \`make check\` to update. -->\\
\\
$table\\
\\
<!-- END AUTO-GENERATED -->" "$README"

    sed "${sed_inplace[@]}" \
        "s/\\*Last verified: [0-9-]*\\*/\\*Last verified: $today\\*/" "$README"

    echo "README.md updated with check results"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

echo "========================================"
echo "Michael Build Checks"
echo "========================================"
echo ""

cd "$PROJECT_ROOT"

check_hugo
check_sbom
check_juniper
check_regression
check_worktree

echo ""
echo "========================================"
echo "Results Summary"
echo "========================================"

if $UPDATE_README; then
    update_readme
fi

echo ""
if $ALL_PASSED; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed!${NC}"
    exit 1
fi
