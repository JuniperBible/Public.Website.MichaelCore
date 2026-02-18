# Regression Testing with Magellan

This document describes the automated regression testing setup for the Michael Hugo Bible Module using [Magellan](https://github.com/FocuswithJustin/magellan), a pure Go browser testing framework.

## Overview

The test suite consists of 15 end-to-end browser tests covering:

- Compare page functionality (5 tests)
- Search page functionality (2 tests)
- Single chapter page functionality (5 tests)
- Offline/PWA functionality (1 test)
- Mobile touch controls (1 test)
- Keyboard navigation (1 test)

## Prerequisites

1. **Go 1.22+** - Required for running tests
2. **Chrome/Chromium** - Required for browser automation (chromedp)
3. **Hugo** - Required for running the development server

## Directory Structure

```
michael/
├── tests/
│   ├── go.mod              # Test module definition
│   ├── Makefile            # Test runner commands
│   ├── helpers/
│   │   └── helpers.go      # Shared test utilities
│   └── regression/
│       ├── compare_test.go     # Compare page tests
│       ├── search_test.go      # Search page tests
│       ├── single_test.go      # Single chapter tests
│       ├── offline_test.go     # Offline/PWA tests
│       ├── mobile_test.go      # Mobile touch tests
│       └── keyboard_test.go    # Keyboard navigation tests
└── tools/
    └── magellan/           # Magellan submodule with E2E package
        └── pkg/e2e/        # Browser automation package
```

## Running Tests

### Quick Start

From the project root:

```bash
# Run all regression tests
make test

# Or from the tests directory:
cd tests
make serve  # Start Hugo server in background
make test   # Run all tests
```

### Individual Test Suites

```bash
# Run specific test suites
make test-compare   # Compare page tests
make test-search    # Search page tests
make test-single    # Single chapter tests
make test-offline   # Offline/PWA tests
make test-mobile    # Mobile touch tests
make test-keyboard  # Keyboard navigation tests
```

### From Tests Directory

```bash
cd tests

# Run all tests
go test -v ./regression/...

# Run specific tests by name
go test -v ./regression/ -run TestCompare
go test -v ./regression/ -run TestSearch
go test -v ./regression/ -run TestSingle
go test -v ./regression/ -run TestOffline
go test -v ./regression/ -run TestMobile
go test -v ./regression/ -run TestKeyboard

# Run a single specific test
go test -v ./regression/ -run TestCompareSelectTranslations
```

### Clean Up

```bash
# Stop background Hugo server
make clean

# From tests directory
cd tests && make clean
```

## Test Descriptions

### Compare Page Tests (`compare_test.go`)

| Test | Description |
|------|-------------|
| `TestCompareSelectTranslations` | Selects 2+ Bible translations and verifies parallel display |
| `TestCompareToggleSSSMode` | Toggles Side-by-Side mode and verifies panes appear |
| `TestCompareVerseGridSelection` | Clicks verse grid buttons and verifies selection |
| `TestCompareHighlightColor` | Changes highlight color for diff display |
| `TestCompareChapterNavigation` | Navigates between chapters using dropdowns |

### Search Page Tests (`search_test.go`)

| Test | Description |
|------|-------------|
| `TestSearchTextQuery` | Searches for text and verifies results appear |
| `TestSearchStrongsNumber` | Searches for Strong's numbers (H430) |

### Single Page Tests (`single_test.go`)

| Test | Description |
|------|-------------|
| `TestSingleChapterArrowNavigation` | Uses prev/next arrows to navigate chapters |
| `TestSingleStrongsTooltip` | Clicks Strong's number and verifies tooltip |
| `TestSingleShareMenu` | Opens share menu and verifies items |
| `TestSingleShareCopyLink` | Copies link and verifies toast notification |
| `TestSingleVerseShare` | Clicks verse share button |

### Cross-Cutting Tests

| Test | File | Description |
|------|------|-------------|
| `TestOfflineCachedPage` | `offline_test.go` | Caches page and loads it while offline |
| `TestMobileTouchControls` | `mobile_test.go` | Tests touch targets on mobile viewport |
| `TestKeyboardNavigation` | `keyboard_test.go` | Tab/Enter/Escape/Arrow key navigation |

## Magellan E2E Package

The tests use the `pkg/e2e` package in Magellan which provides:

### Browser Management
```go
browser, err := e2e.NewBrowser(e2e.BrowserOptions{
    Headless: true,
    Viewport: e2e.Viewport{Width: 1920, Height: 1080},
    Timeout:  30 * time.Second,
})
defer browser.Close()
```

### Element Queries
```go
element := browser.Find("#selector")
element.Exists()     // bool
element.Visible()    // bool
element.Text()       // (string, error)
element.Value()      // (string, error)
element.Attribute("name")  // (string, error)
```

### User Actions
```go
element.Click()
element.Type("text")
element.Clear()
element.Select("option-value")
element.Focus()

browser.Press("Tab")
browser.Press("Enter")
browser.Press("Escape")
browser.Press("ArrowDown")
```

### Wait Conditions
```go
browser.WaitFor("#selector")
browser.WaitForVisible("#selector")
browser.WaitForHidden("#selector")
browser.WaitForText("#selector", "expected text")
browser.WaitForURL("/path/pattern")
```

### Assertions
```go
element.ShouldExist()
element.ShouldBeVisible()
element.ShouldHaveText("text")
element.ShouldHaveAttribute("name", "value")
element.ShouldHaveClass("classname")
```

## Writing New Tests

1. Create a new test file in `tests/regression/`
2. Import the helpers package:
   ```go
   import "michael-tests/helpers"
   ```
3. Use `helpers.NewTestBrowser(t)` to create a browser
4. Use navigation helpers like `helpers.NavigateToCompare(t, b)`
5. Use assertion helpers like `helpers.Assert(t, result)`

Example:
```go
func TestNewFeature(t *testing.T) {
    b := helpers.NewTestBrowser(t)
    helpers.NavigateToCompare(t, b)

    // Interact with elements
    helpers.WaitAndClick(t, b, "#my-button")

    // Verify results
    helpers.Assert(t, b.Find("#result").ShouldBeVisible())
}
```

## Troubleshooting

### Tests timeout

- Increase timeout in `helpers.NewTestBrowser()`
- Check that Hugo server is running on port 1313
- Verify Chrome/Chromium is installed

### Element not found

- Check selector matches current HTML structure
- Add wait conditions before interacting
- Use browser DevTools to verify selectors

### Offline test fails

- Service worker may not be registered yet
- Increase wait time after initial page load
- Check service worker registration in browser DevTools

## CI/CD Integration

For CI environments, ensure:

1. Chrome/Chromium is available (use `chromedp/headless-shell` container)
2. Hugo is installed for building the site
3. Port 1313 is available for the dev server

Example GitHub Actions step:
```yaml
- name: Run regression tests
  run: |
    hugo server --port 1313 &
    sleep 5
    cd tests && go test -v ./regression/...
```

## Test Coverage

The regression test suite covers all items from the manual QA checklist:

### Compare Page Coverage (5 tests)

- ✅ Select 2+ translations, see parallel display
- ✅ Toggle SSS mode, see side-by-side panes
- ✅ Use verse grid to select specific verse
- ✅ Change highlight color, see diff highlighting
- ✅ Navigate to different chapter

### Search Page Coverage (2 tests)

- ✅ Enter text query, see results
- ✅ Enter Strong's number (H430), see results

### Single Page Coverage (5 tests)
- ✅ Navigate between chapters with arrows
- ✅ Click Strong's number, see tooltip
- ✅ Click share button, see menu
- ✅ Copy link from share menu
- ✅ Click verse share button

### Cross-Cutting Coverage (3 tests)
- ✅ Load cached page when offline
- ✅ All controls usable on touch device
- ✅ Navigate all controls with Tab/Enter/Escape/Arrows

## Magellan E2E Package Structure

```
tools/magellan/pkg/e2e/
├── browser.go      # Browser session management (258 lines)
├── element.go      # Element queries and properties (262 lines)
├── actions.go      # User interactions - click, type, keyboard (321 lines)
├── wait.go         # Wait conditions - visible, hidden, text, URL (232 lines)
├── assertions.go   # Test assertions - exist, visible, text, class (336 lines)
└── e2e_test.go     # Unit tests for the package
```

## References

- [Magellan Repository](https://github.com/FocuswithJustin/magellan)
- [chromedp Documentation](https://pkg.go.dev/github.com/chromedp/chromedp)
- [Hugo Documentation](https://gohugo.io/documentation/)

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture including test structure
- [CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md) - Phase 5 testing tasks
- [TODO.txt](TODO.txt) - Task tracking with test implementation status
