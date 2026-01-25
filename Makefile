# Michael - Hugo Bible Module
# https://github.com/FocuswithJustin/michael

.PHONY: dev dev-hugo dev-caddy build clean help vendor vendor-fetch vendor-convert vendor-package vendor-restore juniper caddy hugo sbom ensure-data test test-compare test-search test-single test-offline test-mobile test-keyboard check push sync-submodules fmt lint watch info

# Bible modules to vendor
BIBLES := KJVA DRC Tyndale Coverdale Geneva1599 WEB Vulgate SBLGNT LXX ASV OSMHB

# Paths
JUNIPER := tools/juniper
SWORD_DIR := $(HOME)/.sword
DATA_DIR := data/example
ASSETS_DIR := assets/downloads

# Detect current branch
BRANCH := $(shell git rev-parse --abbrev-ref HEAD)

# Default target
help:
	@echo "Michael - Hugo Bible Module"
	@echo "Current branch: $(BRANCH)"
	@echo ""
	@echo "Development:"
	@echo "  make dev        Build + serve with Caddy (production-like)"
	@echo "  make dev-caddy  Alias for make dev"
	@echo "  make dev-hugo   Hugo dev server with live reload"
	@echo "  make build      Build static site to public/"
	@echo "  make clean      Remove generated files"
	@echo "  make info       Show project info and tool versions"
	@echo ""
	@echo "Quality:"
	@echo "  make check      Run all build checks (updates README.md)"
	@echo "  make fmt        Format Go code in tests/"
	@echo "  make lint       Run linters (go vet)"
	@echo "  make push       Verify checks, then push"
	@echo ""
	@echo "Testing:"
	@echo "  make test          Run all regression tests"
	@echo "  make test-compare  Run compare page tests"
	@echo "  make test-search   Run search page tests"
	@echo "  make test-single   Run single page tests"
	@echo "  make test-offline  Run offline/PWA tests"
	@echo "  make test-mobile   Run mobile touch tests"
	@echo "  make test-keyboard Run keyboard navigation tests"
	@echo ""
	@echo "Tools & Vendor:"
	@echo "  make vendor         Full vendor workflow (fetch + convert + package)"
	@echo "  make vendor-restore Restore data from xz packages"
	@echo "  make juniper        Build juniper tool"
	@echo "  make hugo           Build hugo from source"
	@echo "  make caddy          Build caddy server"
	@echo "  make sbom           Generate SBOM"
	@echo "  make sync-submodules Sync submodules to current branch"
	@echo ""

# Hugo binary - use local build if available, else system hugo
HUGO := $(shell test -x tools/hugo/hugo && echo ./tools/hugo/hugo || echo hugo)

# Caddy binary - use local build if available, else system caddy
CADDY := $(shell test -x tools/caddy/cmd/caddy/caddy && echo ./tools/caddy/cmd/caddy/caddy || echo caddy)

# Default dev: alias to dev-caddy
dev: dev-caddy

# Caddy dev server: build site and serve with Caddy (production-like, HTTP only)
dev-caddy: sync-submodules caddy build
	@echo "Starting Caddy server on http://localhost:1313"
	@echo "Press Ctrl+C to stop"
	$(CADDY) run --config Caddyfile

# Hugo's internal development server (live reload, drafts, etc.)
dev-hugo: sync-submodules
	$(HUGO) server --buildDrafts --buildFuture --disableFastRender

# Build static site (regenerates SBOM and Bible data first)
build: sbom ensure-data vendor-package
	$(HUGO) --minify

# Ensure Bible data exists, prompt for conversion if needed
ensure-data:
	@if [ -f "$(DATA_DIR)/bibles.json" ]; then \
		echo "Bible data found in $(DATA_DIR)"; \
	elif [ -d "$(SWORD_DIR)/mods.d" ] && [ -n "$$(ls -A $(SWORD_DIR)/mods.d 2>/dev/null)" ]; then \
		echo ""; \
		echo "Bible JSON data not found, but SWORD modules exist in $(SWORD_DIR)"; \
		echo "Would you like to convert them? [y/N]"; \
		read -r answer; \
		if [ "$$answer" = "y" ] || [ "$$answer" = "Y" ]; then \
			$(MAKE) juniper vendor-convert; \
		else \
			echo "Skipping conversion. Build will continue without Bible data."; \
		fi; \
	else \
		echo ""; \
		echo "No Bible data found."; \
		echo ""; \
		echo "To fetch Bible modules, first build juniper then use:"; \
		echo "  make juniper"; \
		echo "  ./tools/juniper/bin/juniper repo install CrossWire <MODULE>"; \
		echo ""; \
		echo "Available modules: KJVA, DRC, Tyndale, WEB, ASV, etc."; \
		echo "Or run 'make vendor' to fetch and convert all default modules."; \
		echo ""; \
	fi

# Clean generated files
clean:
	rm -rf public/ resources/

# Build juniper tool
juniper:
	cd $(JUNIPER) && go build -o bin/juniper ./cmd/juniper

# Build caddy server (built to cmd/caddy/caddy to match submodule's .gitignore)
caddy:
	@if [ ! -x tools/caddy/cmd/caddy/caddy ]; then \
		echo "Building Caddy..."; \
		cd tools/caddy/cmd/caddy && go build -o caddy .; \
	fi

# Full vendor workflow
vendor: juniper vendor-fetch vendor-convert vendor-package
	@echo "Vendor complete!"

# Fetch SWORD modules to ~/.sword
vendor-fetch:
	@echo "Fetching SWORD modules..."
	@for module in $(BIBLES); do \
		echo "  Fetching $$module..."; \
		$(JUNIPER)/bin/juniper repo install CrossWire $$module 2>/dev/null || \
		echo "    Warning: Could not fetch $$module"; \
	done

# Convert SWORD modules to Hugo JSON
vendor-convert:
	@echo "Converting modules to Hugo JSON..."
	$(JUNIPER)/bin/juniper convert \
		--input $(SWORD_DIR) \
		--output $(DATA_DIR) \
		--modules $(shell echo $(BIBLES) | tr ' ' ',')

# Package as compressed xz archives for download
vendor-package:
	@echo "Creating compressed packages..."
	@mkdir -p $(ASSETS_DIR)
	@# Package each Bible individually
	@for module in $(BIBLES); do \
		lower=$$(echo $$module | tr '[:upper:]' '[:lower:]'); \
		if [ -f "$(DATA_DIR)/bibles_auxiliary/$$lower.json" ]; then \
			echo "  Packaging $$lower.tar.xz..."; \
			tar -cJf $(ASSETS_DIR)/$$lower.tar.xz -C $(DATA_DIR)/bibles_auxiliary $$lower.json; \
		fi; \
	done
	@# Package all Bibles together
	@echo "  Packaging all-bibles.tar.xz..."
	@tar -cJf $(ASSETS_DIR)/all-bibles.tar.xz -C $(DATA_DIR) bibles.json bibles_auxiliary/
	@echo "Packages created in $(ASSETS_DIR)/"
	@ls -lh $(ASSETS_DIR)/*.tar.xz

# Restore from compressed packages
vendor-restore:
	@echo "Restoring from packages..."
	@mkdir -p $(DATA_DIR)/bibles_auxiliary
	@for pkg in $(ASSETS_DIR)/*.tar.xz; do \
		if [ -f "$$pkg" ]; then \
			echo "  Extracting $$(basename $$pkg)..."; \
			tar -xJf "$$pkg" -C $(DATA_DIR) --strip-components=1; \
		fi; \
	done
	@echo "Restore complete!"

# Generate SBOM in all formats (SPDX, CycloneDX, Syft)
sbom:
	./scripts/generate-sbom.sh

# ============================================================================
# Regression Testing
# ============================================================================

# Run all regression tests (starts Hugo server automatically)
test:
	@echo "Starting Hugo server for tests..."
	@hugo server --port 1313 --buildDrafts &
	@sleep 3
	@echo "Running regression tests..."
	@cd tests && go test -v ./regression/... || (pkill -f "hugo server" && exit 1)
	@pkill -f "hugo server" || true
	@echo "Tests complete!"

# Run individual test suites (assumes Hugo is running on port 1313)
test-compare:
	cd tests && go test -v ./regression/ -run TestCompare

test-search:
	cd tests && go test -v ./regression/ -run TestSearch

test-single:
	cd tests && go test -v ./regression/ -run TestSingle

test-offline:
	cd tests && go test -v ./regression/ -run TestOffline

test-mobile:
	cd tests && go test -v ./regression/ -run TestMobile

test-keyboard:
	cd tests && go test -v ./regression/ -run TestKeyboard

# ============================================================================
# Quality Checks
# ============================================================================

# Run all checks and update README.md status table
check:
	@./scripts/check-all.sh --update-readme

# Verify all checks pass, then push to remote
# Aborts with error if any check fails
# On main branch: requires explicit confirmation for production release
push: clean
	@echo ""
	@echo "========================================"
	@echo "Make Push - Pre-flight Checks"
	@echo "========================================"
	@echo "Branch: $(BRANCH)"
	@echo ""
	@# Block direct push to main without confirmation
	@if [ "$(BRANCH)" = "main" ]; then \
		echo "WARNING: You are on the main (production) branch."; \
		echo "Direct pushes to main should be releases only."; \
		echo ""; \
		echo "Consider: git checkout development && make push"; \
		echo "Then merge to main when ready for release."; \
		echo ""; \
		echo "To proceed anyway, type 'RELEASE' and press Enter:"; \
		read -r confirm; \
		if [ "$$confirm" != "RELEASE" ]; then \
			echo "Push cancelled."; \
			exit 1; \
		fi; \
	fi
	@echo "Running complete build verification..."
	@echo ""
	@# Run all checks (will update README.md)
	@if ./scripts/check-all.sh --update-readme; then \
		echo ""; \
		echo "========================================"; \
		echo "All checks passed! Pushing to remote..."; \
		echo "========================================"; \
		echo ""; \
		git add -A; \
		if ! git diff --cached --quiet; then \
			git commit -m "Update build status in README.md"; \
		fi; \
		git push; \
		echo ""; \
		echo "Push complete!"; \
	else \
		echo ""; \
		echo "========================================"; \
		echo "PUSH ABORTED"; \
		echo "========================================"; \
		echo ""; \
		echo "It's not nice to ship bad code."; \
		echo "Please fix the failing checks above and try again."; \
		echo ""; \
		exit 1; \
	fi

# Sync submodules to match current branch
# main -> tracks main branches, development -> tracks development branches
# hugo only has master branch, so always syncs to master
sync-submodules:
	@echo "Syncing submodules for branch: $(BRANCH)"
	@cd tools/hugo && git checkout master && git pull origin master
	@cd tools/caddy && git checkout master && git pull origin master
	@if [ "$(BRANCH)" = "main" ]; then \
		cd tools/juniper && git checkout main && git pull origin main; \
		cd ../magellan && git checkout main && git pull origin main; \
		echo "Submodules synced to main branches"; \
	elif [ "$(BRANCH)" = "development" ]; then \
		cd tools/juniper && git checkout development && git pull origin development; \
		cd ../magellan && git checkout development && git pull origin development; \
		echo "Submodules synced to development branches"; \
	else \
		echo "Unknown branch $(BRANCH) - skipping submodule sync"; \
	fi

# ============================================================================
# Developer Tools
# ============================================================================

# Build hugo from source
hugo:
	@if [ ! -x tools/hugo/hugo ]; then \
		echo "Building Hugo..."; \
		cd tools/hugo && go build -o hugo .; \
	else \
		echo "Hugo already built at tools/hugo/hugo"; \
	fi

# Format Go code
fmt:
	@echo "Formatting Go code..."
	@cd tests && go fmt ./...
	@cd tools/juniper && go fmt ./...
	@cd tools/magellan && go fmt ./...
	@echo "Done."

# Run linters
lint:
	@echo "Running Go vet..."
	@cd tests && go vet ./... 2>&1 || true
	@echo ""
	@echo "Checking for common issues..."
	@grep -rn "TODO" --include="*.go" tests/ 2>/dev/null | head -10 || true
	@echo "Done."

# Show project info and tool versions
info:
	@echo "========================================"
	@echo "Michael - Project Info"
	@echo "========================================"
	@echo ""
	@echo "Branch: $(BRANCH)"
	@echo "Go:     $$(go version 2>/dev/null || echo 'not installed')"
	@echo "Hugo:   $$($(HUGO) version 2>/dev/null | head -1 || echo 'not built')"
	@echo "Caddy:  $$($(CADDY) version 2>/dev/null | head -1 || echo 'not built')"
	@echo ""
	@echo "Submodules:"
	@git submodule status
	@echo ""
	@echo "Data:"
	@if [ -f "$(DATA_DIR)/bibles.json" ]; then \
		echo "  Bible data: $(DATA_DIR)/bibles.json"; \
		echo "  Bibles: $$(cat $(DATA_DIR)/bibles.json | grep -o '"id"' | wc -l) translations"; \
	else \
		echo "  Bible data: not found (run 'make vendor')"; \
	fi
	@echo ""
