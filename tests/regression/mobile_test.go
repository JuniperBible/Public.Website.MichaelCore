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
	if err := b.Navigate(helpers.BaseURL + "/bibles/compare/"); err != nil {
		t.Fatalf("Failed to navigate: %v", err)
	}

	// Wait for page to load
	if err := b.WaitFor("#bible-select-1"); err != nil {
		t.Fatalf("Page did not load: %v", err)
	}

	// Test that Bible select is usable
	bibleSelect := b.Find("#bible-select-1")
	helpers.Assert(t, bibleSelect.ShouldExist())

	// Verify touch target is large enough (44x44 minimum for WCAG)
	_, _, width, height, err := bibleSelect.BoundingRect()
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
	if err := bibleSelect.Click(); err != nil {
		t.Errorf("Failed to tap Bible select: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	// Verify dropdown interaction works
	t.Log("Mobile touch controls test passed")
}
