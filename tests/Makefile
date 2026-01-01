.PHONY: test test-compare test-search test-single test-offline test-mobile test-keyboard serve clean

HUGO_PORT ?= 1313
BASE_URL ?= http://localhost:$(HUGO_PORT)

# Start Hugo server in background for tests
serve:
	@echo "Starting Hugo server on port $(HUGO_PORT)..."
	@cd .. && hugo server --port $(HUGO_PORT) --buildDrafts &
	@sleep 3

# Run all regression tests
test: serve
	go test -v ./regression/...

# Run individual test suites
test-compare:
	go test -v ./regression/ -run TestCompare

test-search:
	go test -v ./regression/ -run TestSearch

test-single:
	go test -v ./regression/ -run TestSingle

test-offline:
	go test -v ./regression/ -run TestOffline

test-mobile:
	go test -v ./regression/ -run TestMobile

test-keyboard:
	go test -v ./regression/ -run TestKeyboard

# Clean up background processes
clean:
	@pkill -f "hugo server" 2>/dev/null || true
	@echo "Cleaned up Hugo server processes"

# Run tests with verbose output and keep server running
test-debug:
	go test -v -count=1 ./regression/...

# Check if tests compile
build:
	go build ./...

# Run go mod tidy
tidy:
	go mod tidy
