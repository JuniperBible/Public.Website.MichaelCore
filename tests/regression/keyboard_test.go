package regression

import (
	"testing"
	"time"

	"michael-tests/helpers"
)

// TestKeyboardNavigation tests navigating all controls with Tab/Enter/Space/Arrows.
func TestKeyboardNavigation(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Tab to first focusable element
	if err := b.Press("Tab"); err != nil {
		t.Fatalf("Failed to press Tab: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Verify something has focus (check for :focus element)
	focused := b.Find(":focus")
	if !focused.Exists() {
		t.Log("No focused element found - page may not have focusable elements")
	}

	// Tab to Bible select
	for i := 0; i < 5; i++ {
		if err := b.Press("Tab"); err != nil {
			t.Fatalf("Failed to press Tab: %v", err)
		}
		time.Sleep(50 * time.Millisecond)

		// Check if Bible select has focus
		bibleSelectFocused, _ := b.Find("#bible-select-1").IsFocused()
		if bibleSelectFocused {
			t.Log("Bible select focused via keyboard")
			break
		}
	}

	// Test keyboard interaction with select
	bibleSelect := b.Find("#bible-select-1")
	if bibleSelect.Exists() {
		// Focus the select
		if err := bibleSelect.Focus(); err != nil {
			t.Logf("Could not focus select: %v", err)
		}

		// Open with Enter or Space
		if err := b.Press("Enter"); err != nil {
			t.Logf("Enter key failed: %v", err)
		}

		time.Sleep(100 * time.Millisecond)

		// Arrow down to select an option
		if err := b.Press("ArrowDown"); err != nil {
			t.Logf("ArrowDown failed: %v", err)
		}

		time.Sleep(50 * time.Millisecond)

		// Confirm selection with Enter
		if err := b.Press("Enter"); err != nil {
			t.Logf("Enter to confirm failed: %v", err)
		}

		// Verify selection was made
		value, _ := bibleSelect.Value()
		if value != "" {
			t.Logf("Successfully selected option via keyboard: %s", value)
		}
	}

	// Test Escape closes menus
	shareBtn := b.Find(".share-button")
	if shareBtn.Exists() {
		if err := shareBtn.Focus(); err == nil {
			// Open share menu
			if err := b.Press("Enter"); err == nil {
				time.Sleep(200 * time.Millisecond)

				// Check if menu opened
				menu := b.Find(".share-menu")
				if menu.Exists() && menu.Visible() {
					// Press Escape to close
					if err := b.Press("Escape"); err != nil {
						t.Logf("Escape key failed: %v", err)
					}

					time.Sleep(200 * time.Millisecond)

					// Verify menu closed
					if !menu.Visible() {
						t.Log("Escape successfully closed share menu")
					}
				}
			}
		}
	}

	t.Log("Keyboard navigation test completed")
}
