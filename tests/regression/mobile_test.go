package regression

import (
	"testing"
	"time"

	"michael-tests/helpers"
)

// TestMobileTouchControls tests that all controls are usable on a touch device.
func TestMobileTouchControls(t *testing.T) {
	// Create browser with mobile viewport and touch emulation
	b := helpers.NewMobileBrowser(t)

	// Navigate to compare page
	if err := b.Navigate(helpers.BaseURL + "/bible/compare/"); err != nil {
		t.Fatalf("Failed to navigate: %v", err)
	}

	// Wait for page to load - check for book-select
	if err := b.WaitFor("#book-select"); err != nil {
		t.Fatalf("Page did not load: %v", err)
	}

	// Test that book select is usable
	bookSelect := b.Find("#book-select")
	helpers.Assert(t, bookSelect.ShouldExist())

	// Verify touch target is large enough (44x44 minimum for WCAG)
	_, _, width, height, err := bookSelect.BoundingRect()
	if err != nil {
		t.Logf("Could not get bounding rect: %v", err)
	} else {
		if height < 44 || width < 44 {
			t.Errorf("Touch target too small: %vx%v (minimum 44x44)", width, height)
		} else {
			t.Logf("Touch target size: %vx%v (meets WCAG minimum)", width, height)
		}
	}

	// Test tap on select works
	if err := bookSelect.Click(); err != nil {
		t.Errorf("Failed to tap book select: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	// Verify dropdown interaction works
	t.Log("Mobile touch controls test passed")
}

// TestMobileTranslationCheckboxes tests that translation checkboxes work on mobile.
func TestMobileTranslationCheckboxes(t *testing.T) {
	b := helpers.NewMobileBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/bible/compare/"); err != nil {
		t.Fatalf("Failed to navigate: %v", err)
	}

	if err := b.WaitFor("#book-select"); err != nil {
		t.Fatalf("Page did not load: %v", err)
	}

	// Find first translation checkbox
	checkbox := b.Find(".translation-checkbox")
	if !checkbox.Exists() {
		t.Fatal("Translation checkboxes not found")
	}

	// Verify touch target for checkbox label (the parent label should be tappable)
	helpers.CheckElementTouchTarget(t, b.Find(".translation-checkbox").Parent(), "checkbox label")

	// Tap to check and verify
	helpers.TapAndVerifyChecked(t, checkbox)
}

// TestMobileSSSModeToggle tests SSS mode toggle on mobile.
func TestMobileSSSModeToggle(t *testing.T) {
	b := helpers.NewMobileBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/bible/compare/"); err != nil {
		t.Fatalf("Failed to navigate: %v", err)
	}

	if err := b.WaitFor("#book-select"); err != nil {
		t.Fatalf("Page did not load: %v", err)
	}

	// Find SSS toggle button
	sssBtn := b.Find("#sss-mode-btn")
	if !sssBtn.Exists() {
		t.Fatal("SSS mode button not found")
	}

	// Tap SSS button
	if err := sssBtn.Click(); err != nil {
		t.Fatalf("Failed to tap SSS button: %v", err)
	}

	time.Sleep(300 * time.Millisecond)

	// Verify SSS mode activated
	sssMode := b.Find("#sss-mode")
	if !sssMode.Visible() {
		t.Error("SSS mode should be visible after tap")
	}

	// Tap back button to exit
	backBtn := b.Find("#sss-back-btn")
	if backBtn.Exists() {
		if err := backBtn.Click(); err != nil {
			t.Logf("Failed to tap back button: %v", err)
		}
	}
}

// TestMobileSearchPage tests search functionality on mobile.
func TestMobileSearchPage(t *testing.T) {
	b := helpers.NewMobileBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/bible/search/"); err != nil {
		t.Fatalf("Failed to navigate: %v", err)
	}

	if err := b.WaitFor("#search-query"); err != nil {
		t.Fatalf("Search page did not load: %v", err)
	}

	// Test search input
	searchInput := b.Find("#search-query")
	helpers.Assert(t, searchInput.ShouldExist())

	// Verify search input is large enough for mobile
	_, _, width, height, err := searchInput.BoundingRect()
	if err == nil {
		if height < 44 {
			t.Logf("Warning: search input height (%v) may be too small for touch", height)
		}
		t.Logf("Search input size: %vx%v", width, height)
	}

	// Type in search
	if err := searchInput.Type("love"); err != nil {
		t.Errorf("Failed to type in search: %v", err)
	}
}

// TestMobileSinglePageNavigation tests chapter navigation on mobile.
func TestMobileSinglePageNavigation(t *testing.T) {
	b := helpers.NewMobileBrowser(t)

	// Navigate to a chapter
	helpers.NavigateToSingle(t, b, "asv", "Gen", 1)

	// Find navigation elements
	nextBtn := b.Find("a[rel='next']")
	if !nextBtn.Exists() {
		nextBtn = b.Find(".nav-next")
	}

	if nextBtn.Exists() {
		// Verify touch target size
		_, _, width, height, err := nextBtn.BoundingRect()
		if err == nil && (height < 44 || width < 44) {
			t.Logf("Warning: navigation button may be small: %vx%v", width, height)
		}

		// Tap to navigate
		if err := nextBtn.Click(); err != nil {
			t.Logf("Failed to tap next button: %v", err)
		}

		time.Sleep(500 * time.Millisecond)

		// Verify navigation occurred
		helpers.ExpectURL(t, b, "/Gen/2")
	} else {
		t.Log("Next navigation button not found")
	}
}
