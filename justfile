# Focus with Justin - Development Commands
# Run `just` to see available commands

set shell := ["bash", "-c"]

# Default: show help
default:
    @just --list

# ============================================================================
# Development
# ============================================================================

# Start development server with CAPTCHA test key
dev:
    nix-shell --run "HUGO_TURNSTILE_SITE_KEY=test hugo server --disableFastRender"

# Build site for production
build:
    nix-shell --run "npm run build"

# Clean generated files (Hugo only)
clean:
    rm -rf public resources

# Deep clean all build artifacts and caches
clean-all:
    @echo "Cleaning Hugo build artifacts..."
    rm -rf public resources .hugo_build.lock
    @echo "Cleaning Node modules..."
    rm -rf node_modules
    @echo "Cleaning generated CSS..."
    rm -f static/css/main.css
    @echo "Cleaning Go build artifacts..."
    rm -f tools/juniper/juniper tools/juniper/extract tools/juniper/sword-converter
    rm -f tools/juniper/coverage.out tools/juniper/coverage.html
    rm -f tools/juniper/*.test
    @echo "Cleaning Go caches..."
    nix-shell --run "cd tools/juniper && go clean -cache -testcache" 2>/dev/null || true
    @echo "Cleaning Python caches..."
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    @echo "Cleaning temporary files..."
    rm -rf tmp
    @echo "Cleaning Wrangler artifacts..."
    rm -rf .wrangler
    rm -rf workers/**/node_modules
    @echo ""
    @echo "Clean complete!"

# ============================================================================
# Testing - Tiered Approach
# ============================================================================

# Quick tests - pre-deploy validation (< 30 seconds)
# Tests 5 production bibles with integration tests only
test-quick:
    @echo "Running quick tests (5 bibles, integration only)..."
    nix-shell --run "cd tools/juniper && go test -short -timeout 60s -run 'TestIntegration_' ./pkg/sword/..."
    @echo ""
    @echo "Quick tests complete!"

# Comprehensive tests - release validation (< 5 minutes)
# Full unit tests + integration tests for all packages
test-comprehensive:
    @echo "Running comprehensive tests (full suite)..."
    nix-shell --run "cd tools/juniper && go test -timeout 300s ./pkg/sword/... ./pkg/markup/... ./pkg/output/... ./pkg/config/... ./pkg/migrate/... ./pkg/cgo/..."
    @echo ""
    @echo "Comprehensive tests complete!"

# Extensive tests - full validation (< 30 minutes)
# All tests including fuzz tests with extended duration
test-extensive:
    @echo "Running extensive tests (all tests + fuzz)..."
    nix-shell --run "cd tools/juniper && go test -v -timeout 1800s ./..."
    @echo ""
    @echo "Running fuzz tests (30s each)..."
    nix-shell --run "cd tools/juniper && go test -fuzz=FuzzOSISConverter -fuzztime=30s ./pkg/markup/" 2>/dev/null || true
    nix-shell --run "cd tools/juniper && go test -fuzz=FuzzThMLConverter -fuzztime=30s ./pkg/markup/" 2>/dev/null || true
    nix-shell --run "cd tools/juniper && go test -fuzz=FuzzGBFConverter -fuzztime=30s ./pkg/markup/" 2>/dev/null || true
    nix-shell --run "cd tools/juniper && go test -fuzz=FuzzTEIConverter -fuzztime=30s ./pkg/markup/" 2>/dev/null || true
    @echo ""
    @echo "Extensive tests complete!"

# Run all tests (alias for comprehensive)
test: test-comprehensive

# ============================================================================
# Coverage
# ============================================================================

# Generate coverage report
coverage:
    @echo "Generating coverage report..."
    nix-shell --run "cd tools/juniper && go test -coverprofile=coverage.out -timeout 300s ./pkg/sword/... ./pkg/markup/... ./pkg/output/... ./pkg/config/... ./pkg/migrate/... ./pkg/cgo/..."
    nix-shell --run "cd tools/juniper && go tool cover -func=coverage.out | tail -1"
    @echo ""
    @echo "Coverage report: tools/juniper/coverage.out"

# Generate HTML coverage report
coverage-html: coverage
    nix-shell --run "cd tools/juniper && go tool cover -html=coverage.out -o coverage.html"
    @echo "HTML report: tools/juniper/coverage.html"

# ============================================================================
# SWORD Converter
# ============================================================================

# Build juniper binary
sword-build:
    nix-shell --run "cd tools/juniper && go build -o juniper ./cmd/juniper"

# Build extract binary
extract-build:
    nix-shell --run "cd tools/juniper && go build -o extract ./cmd/extract"

# Run extraction to generate Bible JSON
extract output="data": extract-build
    nix-shell --run "cd tools/juniper && ./extract -o ../../{{output}} -v"

# List available SWORD modules
sword-list:
    @nix-shell --run "cd tools/juniper && go run ./cmd/juniper list"

# ============================================================================
# Bible Management (uses native juniper, no external installmgr)
# ============================================================================

# List remote SWORD sources
bible-sources: sword-build
    @nix-shell --run "cd tools/juniper && ./juniper repo list-sources"

# List installed SWORD Bible modules with metadata
bible-list: sword-build
    @nix-shell --run "cd tools/juniper && ./juniper repo installed"

# List available modules from a source (default: CrossWire)
bible-available source="CrossWire": sword-build
    @nix-shell --run "cd tools/juniper && ./juniper repo list {{source}}"

# Refresh module index from a source (default: CrossWire)
bible-refresh source="CrossWire": sword-build
    @nix-shell --run "cd tools/juniper && ./juniper repo refresh {{source}}"

# Download a SWORD Bible module (e.g., just bible-download DRC)
bible-download module source="CrossWire": sword-build
    @echo "Installing {{module}} from {{source}}..."
    @nix-shell --run "cd tools/juniper && ./juniper repo install {{source}} {{module}}"
    @echo "Done! Run 'just bible-convert' to convert to Hugo JSON."

# Uninstall a SWORD Bible module
bible-remove module: sword-build
    @nix-shell --run "cd tools/juniper && ./juniper repo uninstall {{module}}"

# Verify integrity of installed SWORD modules (size check, no redownload)
bible-verify module="": sword-build
    @nix-shell --run "cd tools/juniper && ./juniper repo verify {{module}}"

# Download all modules from a source (default: CrossWire), skipping already installed
# Uses parallel workers for faster downloads (default: 4 workers)
# Usage: just bible-download-all [source] [workers]
bible-download-all source="CrossWire" workers="4": sword-build
    @nix-shell --run "cd tools/juniper && ./juniper repo install-all '{{source}}' -w '{{workers}}'"

# Download all modules from ALL sources (mega download), skipping already installed
# Uses parallel workers for faster downloads (default: 4 workers)
# Usage: just bible-download-mega [workers]
bible-download-mega workers="4": sword-build
    @nix-shell --run "cd tools/juniper && ./juniper repo install-mega -w '{{workers}}'"

# Verify all modules from a source are installed (default: CrossWire)
bible-download-all-verify source="CrossWire": sword-build
    #!/usr/bin/env bash
    set -euo pipefail
    cd tools/juniper
    echo "Verifying all modules from {{source}} are installed..."

    # Get list of available modules from source (skip headers)
    available=$(./juniper repo list '{{source}}' 2>/dev/null | awk '/^[A-Za-z]/ && !/^MODULE/ && !/^Available/ && !/^No / {print $1}' | sort)

    # Get list of installed modules (skip headers)
    installed=$(./juniper repo installed 2>/dev/null | awk '/^[A-Za-z]/ && !/^MODULE/ && !/^Installed/ && !/^No / {print $1}' | sort)

    missing=0
    total=0
    for module in $available; do
        total=$((total + 1))
        if ! echo "$installed" | grep -q "^${module}$"; then
            echo "MISSING: $module"
            missing=$((missing + 1))
        fi
    done

    installed_count=$((total - missing))
    echo ""
    echo "{{source}}: $installed_count/$total installed ($missing missing)"

    if [ $missing -eq 0 ]; then
        echo "All modules from {{source}} are installed."
    else
        exit 1
    fi

# Verify all modules from ALL sources are installed
bible-download-mega-verify: sword-build
    #!/usr/bin/env bash
    set -euo pipefail
    cd tools/juniper
    echo "=== MEGA VERIFY: Checking all modules from all sources ==="

    # Get list of installed modules once (skip headers)
    installed=$(./juniper repo installed 2>/dev/null | awk '/^[A-Za-z]/ && !/^MODULE/ && !/^Installed/ && !/^No / {print $1}' | sort)

    total_missing=0
    total_available=0
    total_installed=0

    for source in "Bible.org" "CrossWire" "CrossWire Attic" "CrossWire Beta" "CrossWire Wycliffe" "Deutsche Bibelgesellschaft" "IBT" "Lockman Foundation" "STEP Bible" "Xiphos" "eBible.org"; do
        echo ""
        echo "Checking $source..."

        available=$(./juniper repo list "$source" 2>/dev/null | awk '/^[A-Za-z]/ && !/^MODULE/ && !/^Available/ && !/^No / {print $1}' | sort)

        missing=0
        count=0
        for module in $available; do
            count=$((count + 1))
            if ! echo "$installed" | grep -q "^${module}$"; then
                echo "  MISSING: $module"
                missing=$((missing + 1))
            fi
        done

        src_installed=$((count - missing))
        echo "  $source: $src_installed/$count installed ($missing missing)"

        total_available=$((total_available + count))
        total_installed=$((total_installed + src_installed))
        total_missing=$((total_missing + missing))
    done

    echo ""
    echo "=== SUMMARY ==="
    echo "Total: $total_installed/$total_available installed ($total_missing missing)"

    if [ $total_missing -eq 0 ]; then
        echo "All modules from all sources are installed."
    else
        echo "Some modules are missing. Run 'just bible-download-mega' to install them."
        exit 1
    fi

# Convert installed SWORD modules to Hugo JSON
bible-convert:
    @echo "Converting SWORD modules to Hugo JSON..."
    nix-shell -p python3Packages.pyyaml sword --run "cd tools/juniper && python3 extract_scriptures.py data/"
    @echo ""
    @echo "Done! Remember to register new Bibles in data/bibles/bibles.json"

# Backup SWORD modules and converted data to static/bible-backup.tar.xz
# Formats: auto-detected from extension, or use format arg (folder, zip, tar.gz, tar.xz, 7z)
# Usage: just bible-backup [output]
bible-backup output="static/bible-backup.tar.xz": sword-build
    @nix-shell --run "cd tools/juniper && ./juniper backup -o '../../{{output}}'"

# Backup only raw SWORD modules (~/.sword)
bible-backup-raw output="static/sword-backup.tar.xz": sword-build
    @nix-shell --run "cd tools/juniper && ./juniper backup -o '../../{{output}}' --raw-only"

# Backup only converted Hugo data (data/bibles_auxiliary/)
bible-backup-converted output="static/bibles-backup.tar.xz": sword-build
    @nix-shell --run "cd tools/juniper && ./juniper backup -o '../../{{output}}' --converted-only"

# Add a new Bible: download + convert (e.g., just bible-add DRC)
bible-add module source="CrossWire": sword-build
    @echo "=== Adding {{module}} from {{source}} ==="
    @echo ""
    @echo "Step 1: Installing..."
    @nix-shell --run "cd tools/juniper && ./juniper repo install {{source}} {{module}}"
    @echo ""
    @echo "Step 2: Converting to Hugo JSON..."
    nix-shell -p python3Packages.pyyaml sword --run "cd tools/juniper && python3 extract_scriptures.py data/"
    @echo ""
    @echo "Step 3: Register in data/bibles/bibles.json:"
    @echo '  {'
    @echo '    "id": "{{lowercase(module)}}",'
    @echo '    "name": "Full Bible Name",'
    @echo '    "abbrev": "{{module}}",'
    @echo '    "language": "en",'
    @echo '    "year": 1600'
    @echo '  }'
    @echo ""
    @echo "Step 4: Rebuild with 'just build'"

# ============================================================================
# Hugo
# ============================================================================

# Build Hugo site with test CAPTCHA key
hugo-build:
    nix-shell --run "HUGO_TURNSTILE_SITE_KEY=test hugo"

# Build Hugo site for production (requires real CAPTCHA key)
hugo-prod:
    nix-shell --run "hugo"

# Serve Hugo with drafts enabled
hugo-drafts:
    nix-shell --run "HUGO_TURNSTILE_SITE_KEY=test hugo server -D --disableFastRender"

# ============================================================================
# Benchmarks
# ============================================================================

# Run performance benchmarks
benchmark:
    @echo "Running benchmarks..."
    nix-shell --run "cd tools/juniper && go test -bench=. -benchmem -run='^$' ./pkg/markup/..."
    nix-shell --run "cd tools/juniper && go test -bench=. -benchmem -run='^$' ./pkg/sword/..."

# ============================================================================
# Utilities
# ============================================================================

# Format Go code
fmt:
    nix-shell --run "cd tools/juniper && go fmt ./..."

# Run go vet
vet:
    nix-shell --run "cd tools/juniper && go vet ./..."

# Check for common issues
lint: fmt vet
    @echo "Lint complete!"

# Update Go dependencies
deps:
    nix-shell --run "cd tools/juniper && go mod tidy"
