# Michael - Hugo Bible Module
# https://github.com/FocuswithJustin/michael

.PHONY: dev build clean help vendor vendor-fetch vendor-convert vendor-package vendor-restore juniper

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
	@echo ""
	@echo "Vendor commands:"
	@echo "  make vendor    Full vendor workflow (fetch + convert + package)"
	@echo "  make vendor-restore  Restore data from xz packages"
	@echo "  make juniper   Build the juniper tool"
	@echo ""

# Start Hugo development server
dev:
	hugo server --buildDrafts --buildFuture --disableFastRender

# Build static site
build:
	hugo --minify

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
