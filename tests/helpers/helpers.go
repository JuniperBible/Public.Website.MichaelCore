// Package helpers provides shared test utilities for Michael regression tests.
package helpers

import (
	"fmt"
	"testing"
	"time"

	"github.com/FocuswithJustin/magellan/pkg/e2e"
)

// BaseURL is the default URL for the Hugo development server
const BaseURL = "http://localhost:1313"

// NewTestBrowser creates a new browser instance configured for testing.
// It automatically registers cleanup to close the browser when the test completes.
func NewTestBrowser(t *testing.T) *e2e.Browser {
	browser, err := e2e.NewBrowser(e2e.BrowserOptions{
		Headless: true,
		Viewport: e2e.Viewport{Width: 1920, Height: 1080},
		Timeout:  30 * time.Second,
	})
	if err != nil {
		t.Fatalf("Failed to create browser: %v", err)
	}
	t.Cleanup(func() { browser.Close() })
	return browser
}

// NewMobileBrowser creates a browser with mobile viewport and touch emulation.
func NewMobileBrowser(t *testing.T) *e2e.Browser {
	browser, err := e2e.NewBrowser(e2e.BrowserOptions{
		Headless: true,
		Viewport: e2e.Viewport{Width: 375, Height: 667}, // iPhone SE
		Timeout:  30 * time.Second,
		Touch:    true,
	})
	if err != nil {
		t.Fatalf("Failed to create mobile browser: %v", err)
	}
	t.Cleanup(func() { browser.Close() })
	return browser
}

// NavigateToCompare navigates to the Bible comparison page.
func NavigateToCompare(t *testing.T, b *e2e.Browser) {
	if err := b.Navigate(BaseURL + "/bible/compare/"); err != nil {
		t.Fatalf("Failed to navigate to compare page: %v", err)
	}
	// Wait for page to be ready - check for book-select which should have options
	if err := b.WaitFor("#book-select"); err != nil {
		t.Fatalf("Compare page did not load: %v", err)
	}
}

// NavigateToSearch navigates to the Bible search page.
func NavigateToSearch(t *testing.T, b *e2e.Browser) {
	if err := b.Navigate(BaseURL + "/bible/search/"); err != nil {
		t.Fatalf("Failed to navigate to search page: %v", err)
	}
	// Wait for search input
	if err := b.WaitFor("#search-query"); err != nil {
		t.Fatalf("Search page did not load: %v", err)
	}
}

// NavigateToSingle navigates to a single Bible chapter page.
func NavigateToSingle(t *testing.T, b *e2e.Browser, bible, book string, chapter int) {
	url := fmt.Sprintf("%s/bible/%s/%s/%d/", BaseURL, bible, book, chapter)
	if err := b.Navigate(url); err != nil {
		t.Fatalf("Failed to navigate to %s: %v", url, err)
	}
	// Wait for chapter content
	if err := b.WaitFor(".verse"); err != nil {
		t.Fatalf("Single page did not load: %v", err)
	}
}

// NavigateToBiblesList navigates to the Bibles listing page.
func NavigateToBiblesList(t *testing.T, b *e2e.Browser) {
	if err := b.Navigate(BaseURL + "/bible/"); err != nil {
		t.Fatalf("Failed to navigate to bibles list: %v", err)
	}
}

// Assert is a helper that fails the test if the assertion did not pass.
func Assert(t *testing.T, result e2e.AssertionResult) {
	t.Helper()
	if !result.Passed {
		t.Error(result.Message)
	}
}

// AssertFatal is a helper that fails the test immediately if the assertion did not pass.
func AssertFatal(t *testing.T, result e2e.AssertionResult) {
	t.Helper()
	if !result.Passed {
		t.Fatal(result.Message)
	}
}

// WaitAndClick waits for an element and then clicks it.
func WaitAndClick(t *testing.T, b *e2e.Browser, selector string) {
	t.Helper()
	if err := b.WaitFor(selector); err != nil {
		t.Fatalf("Element %s not found: %v", selector, err)
	}
	if err := b.Find(selector).Click(); err != nil {
		t.Fatalf("Failed to click %s: %v", selector, err)
	}
}

// WaitAndType waits for an element, clears it, and types text.
func WaitAndType(t *testing.T, b *e2e.Browser, selector, text string) {
	t.Helper()
	if err := b.WaitFor(selector); err != nil {
		t.Fatalf("Element %s not found: %v", selector, err)
	}
	elem := b.Find(selector)
	if err := elem.Clear(); err != nil {
		t.Fatalf("Failed to clear %s: %v", selector, err)
	}
	if err := elem.Type(text); err != nil {
		t.Fatalf("Failed to type into %s: %v", selector, err)
	}
}

// SelectOption selects an option in a dropdown by value.
func SelectOption(t *testing.T, b *e2e.Browser, selector, value string) {
	t.Helper()
	if err := b.WaitFor(selector); err != nil {
		t.Fatalf("Select %s not found: %v", selector, err)
	}
	if err := b.Find(selector).Select(value); err != nil {
		t.Fatalf("Failed to select %s in %s: %v", value, selector, err)
	}
}

// CheckCheckbox clicks a checkbox if it's not already checked.
func CheckCheckbox(t *testing.T, b *e2e.Browser, selector string) {
	t.Helper()
	if err := b.WaitFor(selector); err != nil {
		t.Fatalf("Checkbox %s not found: %v", selector, err)
	}
	cb := b.Find(selector)
	checked, _ := cb.IsChecked()
	if !checked {
		if err := cb.Click(); err != nil {
			t.Fatalf("Failed to check %s: %v", selector, err)
		}
	}
}

// ExpectVisible asserts that an element is visible, failing the test if not.
func ExpectVisible(t *testing.T, b *e2e.Browser, selector string) {
	t.Helper()
	if err := b.WaitForVisible(selector); err != nil {
		t.Errorf("Expected %s to be visible: %v", selector, err)
	}
}

// ExpectHidden asserts that an element is hidden, failing the test if not.
func ExpectHidden(t *testing.T, b *e2e.Browser, selector string) {
	t.Helper()
	if err := b.WaitForHidden(selector); err != nil {
		t.Errorf("Expected %s to be hidden: %v", selector, err)
	}
}

// ExpectText asserts that an element contains expected text.
func ExpectText(t *testing.T, b *e2e.Browser, selector, expectedText string) {
	t.Helper()
	if err := b.WaitForText(selector, expectedText); err != nil {
		t.Errorf("Expected %s to contain text %q: %v", selector, expectedText, err)
	}
}

// ExpectURL asserts that the current URL contains the expected pattern.
func ExpectURL(t *testing.T, b *e2e.Browser, pattern string) {
	t.Helper()
	if err := b.WaitForURL(pattern); err != nil {
		t.Errorf("Expected URL to contain %q: %v", pattern, err)
	}
}

// ExpectOptionCount verifies a select element has at least the expected number of options.
func ExpectOptionCount(t *testing.T, b *e2e.Browser, selector string, minCount int) {
	t.Helper()
	if err := b.WaitFor(selector); err != nil {
		t.Fatalf("Select %s not found: %v", selector, err)
	}
	// Count options by selecting the options within the select
	optionSelector := selector + " option"
	options := b.FindAll(optionSelector)
	count := options.Count()
	if count < minCount {
		t.Errorf("Expected %s to have at least %d options, but found %d", selector, minCount, count)
	}
}
