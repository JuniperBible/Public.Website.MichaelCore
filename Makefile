# Michael - Hugo Bible Module
# https://github.com/FocuswithJustin/michael

.PHONY: dev build clean help vendor vendor-fetch vendor-convert vendor-package vendor-restore juniper sbom ensure-data test test-compare test-search test-single test-offline test-mobile test-keyboard

# Bible modules to vendor
BIBLES := KJVA DRC Tyndale Coverdale Geneva1599 WEB Vulgate SBLGNT LXX ASV OSMHB

# Paths
JUNIPER := tools/juniper
SWORD_DIR := $(HOME)/.sword
DATA_DIR := data/example
ASSETS_DIR := assets/downloads

# Default target
help:
	@echo "Michael - Hugo Bible Module"
	@echo ""
	@echo "Usage:"
	@echo "  make dev       Start Hugo development server"
	@echo "  make build     Build static site to public/"
	@echo "  make clean     Remove generated files"
	@echo "  make sbom      Generate SBOM in all formats"
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
	@echo "Vendor commands:"
	@echo "  make vendor    Full vendor workflow (fetch + convert + package)"
	@echo "  make vendor-restore  Restore data from xz packages"
	@echo "  make juniper   Build the juniper tool"
	@echo ""

# Start Hugo development server
dev:
	hugo server --buildDrafts --buildFuture --disableFastRender

# Build static site (regenerates SBOM and Bible data first)
build: sbom ensure-data vendor-package
	hugo --minify

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
