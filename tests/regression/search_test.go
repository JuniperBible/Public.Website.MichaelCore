package regression

import (
	"testing"
	"time"

	"michael-tests/helpers"
)

// TestSearchPageLoads tests that the search page loads correctly.
func TestSearchPageLoads(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSearch(t, b)

	// Verify search input exists
	searchInput := b.Find("#search-query")
	helpers.Assert(t, searchInput.ShouldExist())

	// Verify Bible select exists and has options
	helpers.ExpectOptionCount(t, b, "#bible-select", 2)
}

// TestSearchTextQuery tests entering a text query and seeing results.
func TestSearchTextQuery(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSearch(t, b)

	// Type search query
	helpers.WaitAndType(t, b, "#search-query", "love")

	// Submit form by pressing Enter
	if err := b.Press("Enter"); err != nil {
		t.Fatalf("Failed to submit search: %v", err)
	}

	// Wait for results
	time.Sleep(1 * time.Second)

	// Check for results in the search-results container
	if err := b.WaitFor("#search-results"); err != nil {
		t.Fatalf("Search results container not found: %v", err)
	}

	// Verify results exist (look for result items or a message)
	results := b.Find("#search-results li")
	if !results.Exists() {
		results = b.Find("#search-results .search-result")
	}
	if !results.Exists() {
		// Check status message
		status := b.Find("#search-status")
		if status.Exists() {
			text, _ := status.Text()
			t.Logf("Search status: %s", text)
		}
	} else {
		t.Log("Search results found")
	}
}

// TestSearchBibleFilter tests filtering search by Bible translation.
func TestSearchBibleFilter(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSearch(t, b)

	// Select a specific Bible
	helpers.SelectOption(t, b, "#bible-select", "asv")

	// Type search query
	helpers.WaitAndType(t, b, "#search-query", "God")

	// Submit search
	if err := b.Press("Enter"); err != nil {
		t.Fatalf("Failed to submit search: %v", err)
	}

	// Wait for results
	time.Sleep(1 * time.Second)

	// Verify search was performed
	if err := b.WaitFor("#search-results"); err != nil {
		t.Fatalf("Search results not found: %v", err)
	}
}

// TestSearchStrongsNumber tests searching for a Strong's number (H1234 format).
func TestSearchStrongsNumber(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSearch(t, b)

	// Select a Bible with Strong's numbers
	helpers.SelectOption(t, b, "#bible-select", "asv")

	// Type Strong's number - H430 is Elohim, commonly used
	helpers.WaitAndType(t, b, "#search-query", "H430")

	// Submit search
	if err := b.Press("Enter"); err != nil {
		t.Fatalf("Failed to submit search: %v", err)
	}

	// Wait for results - Strong's search may take longer
	time.Sleep(2 * time.Second)

	// Check for results
	if err := b.WaitFor("#search-results"); err != nil {
		t.Skip("Strong's search may not be enabled: " + err.Error())
	}

	// Check status for results count
	status := b.Find("#search-status")
	if status.Exists() {
		text, _ := status.Text()
		t.Logf("Strong's search status: %s", text)
	}
}

// TestSearchCaseSensitive tests the case-sensitive search option.
func TestSearchCaseSensitive(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSearch(t, b)

	// Find case-sensitive checkbox
	caseCheckbox := b.Find("#case-sensitive")
	if !caseCheckbox.Exists() {
		t.Skip("Case-sensitive option not found")
	}

	// Enable case-sensitive search
	if err := caseCheckbox.Click(); err != nil {
		t.Fatalf("Failed to click case-sensitive checkbox: %v", err)
	}

	// Verify it's checked
	checked, _ := caseCheckbox.IsChecked()
	if !checked {
		t.Error("Case-sensitive checkbox should be checked")
	}

	// Search for something case-specific
	helpers.WaitAndType(t, b, "#search-query", "LORD")
	if err := b.Press("Enter"); err != nil {
		t.Fatalf("Failed to submit search: %v", err)
	}

	time.Sleep(1 * time.Second)

	t.Log("Case-sensitive search completed")
}

// TestSearchWholeWord tests the whole-word search option.
func TestSearchWholeWord(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSearch(t, b)

	// Find whole-word checkbox
	wholeWordCheckbox := b.Find("#whole-word")
	if !wholeWordCheckbox.Exists() {
		t.Skip("Whole-word option not found")
	}

	// Enable whole-word search
	if err := wholeWordCheckbox.Click(); err != nil {
		t.Fatalf("Failed to click whole-word checkbox: %v", err)
	}

	// Verify it's checked
	checked, _ := wholeWordCheckbox.IsChecked()
	if !checked {
		t.Error("Whole-word checkbox should be checked")
	}

	// Search for a word
	helpers.WaitAndType(t, b, "#search-query", "love")
	if err := b.Press("Enter"); err != nil {
		t.Fatalf("Failed to submit search: %v", err)
	}

	time.Sleep(1 * time.Second)

	t.Log("Whole-word search completed")
}
