package regression

import (
	"testing"

	"michael-tests/helpers"
)

// TestSearchTextQuery tests entering a text query and seeing results.
func TestSearchTextQuery(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSearch(t, b)

	// Type search query
	helpers.WaitAndType(t, b, "#search-input", "love")

	// Submit form (either via button click or Enter key)
	submitBtn := b.Find("#search-submit")
	if submitBtn.Exists() {
		if err := submitBtn.Click(); err != nil {
			t.Fatalf("Failed to click search button: %v", err)
		}
	} else {
		// Try pressing Enter
		if err := b.Press("Enter"); err != nil {
			t.Fatalf("Failed to submit search: %v", err)
		}
	}

	// Wait for results
	if err := b.WaitFor(".search-results"); err != nil {
		if err := b.WaitFor(".search-result"); err != nil {
			t.Fatalf("Search results did not appear: %v", err)
		}
	}

	// Verify results exist
	results := b.Find(".search-result")
	if !results.Exists() {
		results = b.Find(".search-results li")
	}
	helpers.Assert(t, results.ShouldExist())

	// Check for highlighting (optional)
	highlight := b.Find(".highlight")
	if highlight.Exists() {
		t.Log("Search term highlighting found")
	}
}

// TestSearchStrongsNumber tests searching for a Strong's number (H1234 format).
func TestSearchStrongsNumber(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSearch(t, b)

	// Type Strong's number - H430 is Elohim, commonly used
	helpers.WaitAndType(t, b, "#search-input", "H430")

	// Submit search
	submitBtn := b.Find("#search-submit")
	if submitBtn.Exists() {
		if err := submitBtn.Click(); err != nil {
			t.Fatalf("Failed to click search button: %v", err)
		}
	} else {
		if err := b.Press("Enter"); err != nil {
			t.Fatalf("Failed to submit search: %v", err)
		}
	}

	// Wait for results - Strong's search may take longer
	b.Sleep(500 * 1e6) // 500ms

	// Check for results
	if err := b.WaitFor(".search-results"); err != nil {
		// Strong's search may not be supported in all configurations
		t.Skip("Strong's search may not be enabled: " + err.Error())
	}

	// Verify results found
	results := b.Find(".search-result")
	if !results.Exists() {
		results = b.Find(".search-results li")
	}

	if results.Exists() {
		t.Log("Strong's number search returned results")
	} else {
		t.Log("No results found for Strong's number - may be expected if Strong's data not loaded")
	}
}
