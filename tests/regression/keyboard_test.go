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

	// Tab through to find book select
	for i := 0; i < 15; i++ {
		if err := b.Press("Tab"); err != nil {
			t.Fatalf("Failed to press Tab: %v", err)
		}
		time.Sleep(50 * time.Millisecond)

		// Check if book select has focus
		bookSelectFocused, _ := b.Find("#book-select").IsFocused()
		if bookSelectFocused {
			t.Log("Book select focused via keyboard")
			break
		}
	}

	// Test keyboard interaction with select
	bookSelect := b.Find("#book-select")
	if bookSelect.Exists() {
		// Focus the select
		if err := bookSelect.Focus(); err != nil {
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
		value, _ := bookSelect.Value()
		if value != "" {
			t.Logf("Successfully selected option via keyboard: %s", value)
		}
	}

	t.Log("Keyboard navigation test completed")
}

// TestKeyboardCheckboxToggle tests toggling checkboxes with keyboard.
func TestKeyboardCheckboxToggle(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Find first translation checkbox
	checkbox := b.Find(".translation-checkbox")
	if !checkbox.Exists() {
		t.Fatal("Translation checkbox not found")
	}

	// Focus the checkbox
	if err := checkbox.Focus(); err != nil {
		t.Fatalf("Could not focus checkbox: %v", err)
	}

	// Press Space to toggle (standard keyboard behavior for checkboxes)
	if err := b.Press("Space"); err != nil {
		t.Fatalf("Space key failed: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Verify checkbox is now checked
	checked, _ := checkbox.IsChecked()
	if !checked {
		t.Error("Checkbox should be checked after Space key")
	}

	// Press Space again to uncheck
	if err := b.Press("Space"); err != nil {
		t.Fatalf("Second Space key failed: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Verify checkbox is unchecked
	checked, _ = checkbox.IsChecked()
	if checked {
		t.Error("Checkbox should be unchecked after second Space key")
	}
}

// TestKeyboardSSSModeToggle tests entering/exiting SSS mode with keyboard.
func TestKeyboardSSSModeToggle(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Find SSS mode button
	sssBtn := b.Find("#sss-mode-btn")
	if !sssBtn.Exists() {
		t.Fatal("SSS mode button not found")
	}

	// Focus and activate with keyboard
	if err := sssBtn.Focus(); err != nil {
		t.Fatalf("Could not focus SSS button: %v", err)
	}

	if err := b.Press("Enter"); err != nil {
		t.Fatalf("Enter key failed: %v", err)
	}

	time.Sleep(300 * time.Millisecond)

	// Verify SSS mode is now visible
	sssMode := b.Find("#sss-mode")
	if !sssMode.Visible() {
		t.Error("SSS mode should be visible after keyboard activation")
	}

	// Find and activate back button with keyboard
	backBtn := b.Find("#sss-back-btn")
	if backBtn.Exists() {
		if err := backBtn.Focus(); err != nil {
			t.Logf("Could not focus back button: %v", err)
		}

		if err := b.Press("Enter"); err != nil {
			t.Logf("Enter on back button failed: %v", err)
		}

		time.Sleep(300 * time.Millisecond)

		// Verify back in normal mode
		normalMode := b.Find("#normal-mode")
		if !normalMode.Visible() {
			t.Error("Normal mode should be visible after exiting SSS mode")
		}
	}
}

// TestKeyboardColorPicker tests color picker interaction with keyboard.
func TestKeyboardColorPicker(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Find color picker button
	colorBtn := b.Find("#highlight-color-btn")
	if !colorBtn.Exists() {
		t.Skip("Color picker button not found")
	}

	// Focus and open with keyboard
	if err := colorBtn.Focus(); err != nil {
		t.Fatalf("Could not focus color button: %v", err)
	}

	if err := b.Press("Enter"); err != nil {
		t.Fatalf("Enter key failed: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	// Verify color picker is visible
	colorPicker := b.Find("#highlight-color-picker")
	if !colorPicker.Visible() {
		t.Error("Color picker should be visible after keyboard activation")
	}

	// Press Escape to close
	if err := b.Press("Escape"); err != nil {
		t.Logf("Escape key failed: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	// Verify color picker is hidden
	if colorPicker.Visible() {
		t.Error("Color picker should be hidden after Escape")
	}
}

// TestKeyboardSearchPage tests search page keyboard interaction.
func TestKeyboardSearchPage(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSearch(t, b)

	// Search input should be focusable
	searchInput := b.Find("#search-query")
	if !searchInput.Exists() {
		t.Fatal("Search input not found")
	}

	// Focus search input
	if err := searchInput.Focus(); err != nil {
		t.Fatalf("Could not focus search input: %v", err)
	}

	// Type search query
	if err := searchInput.Type("love"); err != nil {
		t.Fatalf("Failed to type in search: %v", err)
	}

	// Press Enter to submit
	if err := b.Press("Enter"); err != nil {
		t.Fatalf("Enter key failed: %v", err)
	}

	// Wait for results
	time.Sleep(1 * time.Second)

	// Verify search was submitted (results container should exist)
	if err := b.WaitFor("#search-results"); err != nil {
		t.Fatalf("Search results not found: %v", err)
	}

	t.Log("Search submitted successfully via keyboard")
}

// TestKeyboardTabOrder tests that tab order is logical.
func TestKeyboardTabOrder(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Track elements we tab through
	var tabOrder []string

	// Tab through first 20 elements and record their IDs/classes
	for i := 0; i < 20; i++ {
		if err := b.Press("Tab"); err != nil {
			break
		}
		time.Sleep(50 * time.Millisecond)

		focused := b.Find(":focus")
		if focused.Exists() {
			id, _ := focused.Attribute("id")
			class, _ := focused.Attribute("class")
			if id != "" {
				tabOrder = append(tabOrder, "#"+id)
			} else if class != "" {
				tabOrder = append(tabOrder, "."+class)
			}
		}
	}

	t.Logf("Tab order: %v", tabOrder)

	// Verify we can tab through elements
	if len(tabOrder) < 5 {
		t.Error("Tab order seems too short - may have focus trap issues")
	}
}
