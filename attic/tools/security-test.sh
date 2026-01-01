#!/usr/bin/env bash
#
# Security Test Suite for Contact Form
# Run before deployment to verify security controls are working
#
# Usage: ./scripts/security-test.sh [base_url] [worker_url]
#
# Defaults:
#   base_url: https://focuswithjustin.com
#   worker_url: https://focuswithjustin-email-sender.domains-ca9.workers.dev
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-https://focuswithjustin.com}"
WORKER_URL="${2:-https://focuswithjustin-email-sender.domains-ca9.workers.dev}"
CONTACT_API="${BASE_URL}/api/contact"
CONTACT_PAGE="${BASE_URL}/contact/"

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test result tracking
declare -a FAILED_TESTS=()

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
}

run_test() {
    local test_name="$1"
    ((TESTS_RUN++))
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Test $TESTS_RUN: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ==============================================================================
# Test 1: CAPTCHA widget renders on contact page
# ==============================================================================
test_captcha_widget_renders() {
    run_test "CAPTCHA widget renders on contact page"

    local response
    response=$(curl -s "$CONTACT_PAGE")

    if echo "$response" | grep -q 'cf-turnstile\|g-recaptcha\|h-captcha\|frc-captcha'; then
        log_pass "CAPTCHA widget found in page HTML"
    else
        log_fail "CAPTCHA widget not found - check HUGO_*_SITE_KEY env var"
        return 1
    fi

    if echo "$response" | grep -q 'captcha_provider'; then
        log_pass "captcha_provider hidden field present"
    else
        log_fail "captcha_provider hidden field missing"
        return 1
    fi
}

# ==============================================================================
# Test 2: Submit button is disabled by default
# ==============================================================================
test_submit_button_disabled() {
    run_test "Submit button is disabled until CAPTCHA completed"

    local response
    response=$(curl -s "$CONTACT_PAGE")

    # Check if submit button has disabled attribute
    if echo "$response" | grep -q 'id="submit-btn"[^>]*disabled\|id=submit-btn[^>]*disabled'; then
        log_pass "Submit button is disabled by default"
    else
        # Also check for the pattern without quotes (minified HTML)
        if echo "$response" | grep -q 'submit-btn.*disabled'; then
            log_pass "Submit button is disabled by default"
        else
            log_fail "Submit button is NOT disabled - users can submit without CAPTCHA"
            return 1
        fi
    fi
}

# ==============================================================================
# Test 3: API rejects requests without CAPTCHA token
# ==============================================================================
test_api_requires_captcha_token() {
    run_test "API rejects requests without CAPTCHA token"

    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" -X POST "$CONTACT_API" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "name=SecurityTest&email=test@example.com&subject=Test&message=No+token&captcha_provider=turnstile")

    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "400" ]] && echo "$body" | grep -q "CAPTCHA verification required"; then
        log_pass "API correctly rejects missing CAPTCHA token (HTTP $http_code)"
    else
        log_fail "API should reject missing token with 400, got HTTP $http_code: $body"
        return 1
    fi
}

# ==============================================================================
# Test 4: API rejects requests with fake CAPTCHA token
# ==============================================================================
test_api_rejects_fake_token() {
    run_test "API rejects fake/invalid CAPTCHA token"

    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" -X POST "$CONTACT_API" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "name=SecurityTest&email=test@example.com&subject=Test&message=Fake+token&captcha_provider=turnstile&cf-turnstile-response=fake-invalid-token-12345")

    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "400" ]] && echo "$body" | grep -q "CAPTCHA verification failed"; then
        log_pass "API correctly rejects fake CAPTCHA token (HTTP $http_code)"
    else
        log_fail "API should reject fake token with 400, got HTTP $http_code: $body"
        return 1
    fi
}

# ==============================================================================
# Test 5: API rejects requests without captcha_provider when CAPTCHA is configured
# ==============================================================================
test_api_requires_provider_field() {
    run_test "API rejects requests without captcha_provider field"

    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" -X POST "$CONTACT_API" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "name=SecurityTest&email=test@example.com&subject=Test&message=No+provider+field")

    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | sed '$d')

    # Should either require CAPTCHA or fail - should NOT succeed (303)
    if [[ "$http_code" == "303" ]]; then
        log_fail "API accepted request without captcha_provider - CAPTCHA bypass possible!"
        return 1
    else
        log_pass "API rejected request without captcha_provider (HTTP $http_code)"
    fi
}

# ==============================================================================
# Test 6: Email worker rejects unsigned requests
# ==============================================================================
test_worker_rejects_unsigned() {
    run_test "Email worker rejects unsigned requests (HMAC)"

    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL" \
        -H "Content-Type: application/json" \
        -d '{"name":"Attacker","email":"attacker@example.com","subject":"Direct Attack","body":"Unsigned request"}')

    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "401" ]]; then
        log_pass "Worker correctly rejects unsigned request (HTTP 401)"
    elif [[ "$http_code" == "500" ]] && echo "$body" | grep -q "misconfigured"; then
        log_fail "Worker secret not configured - run: npx wrangler secret put TURNSTILE_SECRET_KEY"
        return 1
    elif [[ "$http_code" == "200" ]]; then
        log_fail "Worker accepted unsigned request - HMAC auth not working!"
        return 1
    else
        log_fail "Unexpected response from worker: HTTP $http_code: $body"
        return 1
    fi
}

# ==============================================================================
# Test 7: Email worker rejects requests with invalid signature
# ==============================================================================
test_worker_rejects_bad_signature() {
    run_test "Email worker rejects requests with invalid signature"

    local response
    local http_code
    local timestamp
    timestamp=$(date +%s)000

    response=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL" \
        -H "Content-Type: application/json" \
        -H "X-Timestamp: $timestamp" \
        -H "X-Signature: aW52YWxpZC1zaWduYXR1cmU=" \
        -d '{"name":"Attacker","email":"attacker@example.com","subject":"Bad Sig","body":"Invalid signature"}')

    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "401" ]] && echo "$body" | grep -q "Invalid signature"; then
        log_pass "Worker correctly rejects invalid signature (HTTP 401)"
    else
        log_fail "Worker should reject invalid signature, got HTTP $http_code: $body"
        return 1
    fi
}

# ==============================================================================
# Test 8: Email worker rejects expired requests (replay protection)
# ==============================================================================
test_worker_rejects_expired() {
    run_test "Email worker rejects expired requests (replay protection)"

    local response
    local http_code
    # Timestamp from 10 minutes ago
    local old_timestamp
    old_timestamp=$(($(date +%s) - 600))000

    response=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL" \
        -H "Content-Type: application/json" \
        -H "X-Timestamp: $old_timestamp" \
        -H "X-Signature: c29tZS1zaWduYXR1cmU=" \
        -d '{"name":"Replayer","email":"replay@example.com","subject":"Replay","body":"Old request"}')

    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "401" ]] && echo "$body" | grep -q "expired"; then
        log_pass "Worker correctly rejects expired request (HTTP 401)"
    else
        log_fail "Worker should reject expired request, got HTTP $http_code: $body"
        return 1
    fi
}

# ==============================================================================
# Main
# ==============================================================================
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║           CONTACT FORM SECURITY TEST SUITE                        ║"
    echo "╠═══════════════════════════════════════════════════════════════════╣"
    echo "║  Base URL:   $BASE_URL"
    echo "║  Worker URL: $WORKER_URL"
    echo "╚═══════════════════════════════════════════════════════════════════╝"

    # Run all tests
    test_captcha_widget_renders || true
    test_submit_button_disabled || true
    test_api_requires_captcha_token || true
    test_api_rejects_fake_token || true
    test_api_requires_provider_field || true
    test_worker_rejects_unsigned || true
    test_worker_rejects_bad_signature || true
    test_worker_rejects_expired || true

    # Summary
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                         TEST SUMMARY                              ║"
    echo "╠═══════════════════════════════════════════════════════════════════╣"
    echo -e "║  Tests Run:    $TESTS_RUN"
    echo -e "║  ${GREEN}Passed:${NC}        $TESTS_PASSED"
    echo -e "║  ${RED}Failed:${NC}        $TESTS_FAILED"
    echo "╚═══════════════════════════════════════════════════════════════════╝"

    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo ""
        echo -e "${RED}FAILED TESTS:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "  ${RED}✗${NC} $test"
        done
        echo ""
        exit 1
    else
        echo ""
        echo -e "${GREEN}All security tests passed!${NC}"
        echo ""
        exit 0
    fi
}

main "$@"
