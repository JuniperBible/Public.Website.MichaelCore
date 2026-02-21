// Package helpers provides shared test utilities for Michael regression tests.
package helpers

import (
	"fmt"
	"testing"
	"time"

	"github.com/JuniperBible/magellan/pkg/e2e"
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
	options, err := b.FindAll(optionSelector)
	if err != nil {
		t.Fatalf("Failed to find options in %s: %v", selector, err)
	}
	count := options.Count()
	if count < minCount {
		t.Errorf("Expected %s to have at least %d options, but found %d", selector, minCount, count)
	}
}

// =============================================================================
// PWA Test Helpers
// =============================================================================

// WaitForServiceWorker waits for the service worker to be registered and active.
func WaitForServiceWorker(t *testing.T, b *e2e.Browser) {
	t.Helper()
	// Wait up to 10 seconds for SW to activate
	for i := 0; i < 20; i++ {
		time.Sleep(500 * time.Millisecond)
		result, err := b.Evaluate(`
			(async () => {
				if (!('serviceWorker' in navigator)) return 'unsupported';
				const reg = await navigator.serviceWorker.ready;
				return reg.active ? 'active' : 'waiting';
			})()
		`)
		if err == nil && result == "active" {
			return
		}
	}
	t.Log("Service worker may not be fully active")
}

// NavigateToOfflineSettings navigates to the offline settings page/section.
func NavigateToOfflineSettings(t *testing.T, b *e2e.Browser) {
	t.Helper()
	if err := b.Navigate(BaseURL + "/bible/"); err != nil {
		t.Fatalf("Failed to navigate to Bible page: %v", err)
	}
	// Look for offline settings section
	if err := b.WaitFor("#offline-download-form"); err != nil {
		t.Log("Offline settings form not found on page")
	}
}

// GetCacheStatus retrieves cache status information from the OfflineManager.
func GetCacheStatus(t *testing.T, b *e2e.Browser) map[string]interface{} {
	t.Helper()
	result, err := b.Evaluate(`
		(async () => {
			if (!window.Michael?.OfflineManager) return null;
			await window.Michael.OfflineManager.initialize('/sw.js');
			return await window.Michael.OfflineManager.getCacheStatus();
		})()
	`)
	if err != nil {
		t.Fatalf("Failed to get cache status: %v", err)
	}
	if result == nil {
		return nil
	}
	if m, ok := result.(map[string]interface{}); ok {
		return m
	}
	return nil
}

// SimulateOffline sets the browser to offline mode.
func SimulateOffline(t *testing.T, b *e2e.Browser, offline bool) {
	t.Helper()
	if err := b.SetOffline(offline); err != nil {
		t.Fatalf("Failed to set offline mode: %v", err)
	}
}

// FindWithFallbacks searches for an element using multiple selector fallbacks in order,
// returning the first one that exists. If none exist, the last selector's result is returned.
func FindWithFallbacks(b *e2e.Browser, selectors ...string) *e2e.Element {
	for _, sel := range selectors[:len(selectors)-1] {
		el := b.Find(sel)
		if el.Exists() {
			return el
		}
	}
	return b.Find(selectors[len(selectors)-1])
}

// VerifyStrongsTooltip checks visibility and content of the Strong's tooltip, then tests closing it.
func VerifyStrongsTooltip(t *testing.T, b *e2e.Browser, tooltip *e2e.Element) {
	t.Helper()
	Assert(t, tooltip.ShouldBeVisible())

	// Verify tooltip has content
	text, _ := tooltip.Text()
	if len(text) > 0 {
		limit := 50
		if len(text) < limit {
			limit = len(text)
		}
		t.Logf("Strong's tooltip displayed: %s...", text[:limit])
	}

	// Test Escape to close
	if err := b.Press("Escape"); err == nil {
		time.Sleep(200 * time.Millisecond)
		ExpectHidden(t, b, ".strongs-tooltip")
	}
}

// LogToastResult finds a toast/alert notification and logs whether it was displayed.
func LogToastResult(t *testing.T, b *e2e.Browser) {
	t.Helper()
	toast := FindWithFallbacks(b, ".toast", "[role='alert']", ".notification")
	if toast.Exists() {
		t.Log("Copy success notification displayed")
	} else {
		t.Log("No toast notification found - copy may have succeeded silently")
	}
}

// CheckManifestField verifies a specific field exists in the manifest.
func CheckManifestField(t *testing.T, manifest map[string]interface{}, field string) bool {
	t.Helper()
	if _, exists := manifest[field]; !exists {
		t.Errorf("Manifest missing required field: %s", field)
		return false
	}
	return true
}

// CheckElementTouchTarget logs a warning if an element's touch target is smaller than 44x44 pixels.
func CheckElementTouchTarget(t *testing.T, label *e2e.Element, description string) {
	t.Helper()
	if !label.Exists() {
		return
	}
	_, _, width, height, err := label.BoundingRect()
	if err == nil && (height < 44 || width < 44) {
		t.Logf("Warning: %s may be small for touch: %vx%v", description, width, height)
	}
}

// TapAndVerifyChecked clicks a checkbox element and verifies it becomes checked.
func TapAndVerifyChecked(t *testing.T, checkbox *e2e.Element) {
	t.Helper()
	if err := checkbox.Click(); err != nil {
		t.Errorf("Failed to tap checkbox: %v", err)
	}
	time.Sleep(100 * time.Millisecond)
	checked, _ := checkbox.IsChecked()
	if !checked {
		t.Error("Checkbox should be checked after tap")
	}
}
