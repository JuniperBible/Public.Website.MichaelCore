# Michael - Hugo Bible Module
# https://github.com/FocuswithJustin/michael

.PHONY: dev build clean help

# Default target
help:
	@echo "Michael - Hugo Bible Module"
	@echo ""
	@echo "Usage:"
	@echo "  make dev     Start Hugo development server"
	@echo "  make build   Build static site to public/"
	@echo "  make clean   Remove generated files"
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
