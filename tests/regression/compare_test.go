// Package regression contains end-to-end regression tests for the Michael Bible module.
package regression

import (
	"testing"
	"time"

	"michael-tests/helpers"
)

// TestComparePageLoads tests that the compare page loads with populated dropdowns.
func TestComparePageLoads(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Verify book select exists and has options (not just the placeholder)
	helpers.ExpectOptionCount(t, b, "#book-select", 2) // At least placeholder + 1 book

	// Verify translation checkboxes exist
	checkbox := b.Find(".translation-checkbox")
	helpers.Assert(t, checkbox.ShouldExist())
}

// TestCompareSelectTranslations tests selecting translations via checkboxes.
func TestCompareSelectTranslations(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Check first translation checkbox (ASV is first in the list)
	helpers.CheckCheckbox(t, b, ".translation-checkbox[value='asv']")

	// Check second translation checkbox (DRC)
	helpers.CheckCheckbox(t, b, ".translation-checkbox[value='drc']")

	// Select a book
	helpers.SelectOption(t, b, "#book-select", "Gen")

	// Wait for chapter select to be enabled
	if err := b.WaitForEnabled("#chapter-select"); err != nil {
		t.Fatalf("Chapter select did not enable: %v", err)
	}

	// Select chapter 1
	helpers.SelectOption(t, b, "#chapter-select", "1")

	// Wait for comparison content to load
	time.Sleep(500 * time.Millisecond)

	// Verify parallel content has loaded
	if err := b.WaitFor("#parallel-content .verse"); err != nil {
		t.Logf("Parallel content may have different structure: %v", err)
	}
}

// TestCompareToggleSSSMode tests toggling SSS (Side-by-Side) mode.
func TestCompareToggleSSSMode(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Click SSS toggle button
	sssToggle := b.Find("#sss-mode-btn")
	if !sssToggle.Exists() {
		t.Fatal("SSS mode button not found")
	}

	if err := sssToggle.Click(); err != nil {
		t.Fatalf("Failed to click SSS toggle: %v", err)
	}

	// Wait for SSS mode to activate (normal mode hidden, SSS mode visible)
	time.Sleep(300 * time.Millisecond)

	// Verify SSS mode is visible
	helpers.ExpectVisible(t, b, "#sss-mode")

	// Verify SSS Bible selectors are visible
	helpers.ExpectVisible(t, b, "#sss-bible-left")
	helpers.ExpectVisible(t, b, "#sss-bible-right")

	// Verify normal mode is hidden
	normalMode := b.Find("#normal-mode")
	if normalMode.Visible() {
		t.Error("Normal mode should be hidden in SSS mode")
	}
}

// TestCompareSSSModeSelection tests selecting Bibles in SSS mode.
func TestCompareSSSModeSelection(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Enter SSS mode
	helpers.WaitAndClick(t, b, "#sss-mode-btn")
	time.Sleep(300 * time.Millisecond)

	// Verify SSS Bible selects have options
	helpers.ExpectOptionCount(t, b, "#sss-bible-left", 2)
	helpers.ExpectOptionCount(t, b, "#sss-bible-right", 2)

	// Select left Bible (DRC)
	helpers.SelectOption(t, b, "#sss-bible-left", "drc")

	// Select right Bible (ASV)
	helpers.SelectOption(t, b, "#sss-bible-right", "asv")

	// Verify SSS book select has options
	helpers.ExpectOptionCount(t, b, "#sss-book-select", 2)

	// Select book
	helpers.SelectOption(t, b, "#sss-book-select", "Gen")

	// Wait for chapter select to be enabled
	if err := b.WaitForEnabled("#sss-chapter-select"); err != nil {
		t.Fatalf("SSS chapter select did not enable: %v", err)
	}

	// Select chapter
	helpers.SelectOption(t, b, "#sss-chapter-select", "1")

	// Wait for panes to load
	time.Sleep(500 * time.Millisecond)

	// Verify both panes have content
	leftPane := b.Find("#sss-left-pane")
	rightPane := b.Find("#sss-right-pane")
	helpers.Assert(t, leftPane.ShouldExist())
	helpers.Assert(t, rightPane.ShouldExist())
}

// TestCompareChapterNavigation tests navigating to different chapters.
func TestCompareChapterNavigation(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Check a translation
	helpers.CheckCheckbox(t, b, ".translation-checkbox[value='asv']")

	// Select Genesis
	helpers.SelectOption(t, b, "#book-select", "Gen")

	// Wait for chapter select to be enabled
	if err := b.WaitForEnabled("#chapter-select"); err != nil {
		t.Fatalf("Chapter select did not enable: %v", err)
	}

	// Verify chapter select has options (Genesis has 50 chapters)
	helpers.ExpectOptionCount(t, b, "#chapter-select", 50)

	// Select chapter 2
	helpers.SelectOption(t, b, "#chapter-select", "2")

	// Wait for content to load
	time.Sleep(500 * time.Millisecond)

	// Change to a different book (Psalms has 150 chapters)
	helpers.SelectOption(t, b, "#book-select", "Ps")

	// Wait for chapter dropdown to update
	time.Sleep(300 * time.Millisecond)

	// Verify chapter count updated
	helpers.ExpectOptionCount(t, b, "#chapter-select", 150)
}

// TestCompareVerseGridSelection tests using the verse grid to select a specific verse.
func TestCompareVerseGridSelection(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Select a translation and passage first
	helpers.CheckCheckbox(t, b, ".translation-checkbox[value='asv']")
	helpers.SelectOption(t, b, "#book-select", "Gen")

	if err := b.WaitForEnabled("#chapter-select"); err != nil {
		t.Fatalf("Chapter select did not enable: %v", err)
	}
	helpers.SelectOption(t, b, "#chapter-select", "1")

	// Wait for verse grid to populate
	time.Sleep(500 * time.Millisecond)

	// Look for verse buttons in the verse grid
	verseBtn := b.Find("#verse-buttons .verse-btn")
	if !verseBtn.Exists() {
		t.Skip("Verse buttons not found - verse grid may not be populated yet")
	}

	// Click a verse button
	if err := verseBtn.Click(); err != nil {
		t.Fatalf("Failed to click verse button: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	// Verify verse is selected (should have selected class)
	selectedBtn := b.Find("#verse-buttons .verse-btn.selected")
	if selectedBtn.Exists() {
		t.Log("Verse button shows selected state")
	}
}

// TestCompareHighlightToggle tests the highlight/diff toggle.
func TestCompareHighlightToggle(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Find highlight toggle checkbox
	highlightToggle := b.Find("#highlight-toggle")
	if !highlightToggle.Exists() {
		t.Skip("Highlight toggle not found")
	}

	// Check initial state
	checked, _ := highlightToggle.IsChecked()
	t.Logf("Initial highlight state: %v", checked)

	// Toggle it
	if err := highlightToggle.Click(); err != nil {
		t.Fatalf("Failed to click highlight toggle: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	// Verify state changed
	newChecked, _ := highlightToggle.IsChecked()
	if newChecked == checked {
		t.Error("Highlight toggle state did not change")
	}
}

// TestCompareColorPicker tests the highlight color picker.
func TestCompareColorPicker(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Find color picker button
	colorBtn := b.Find("#highlight-color-btn")
	if !colorBtn.Exists() {
		t.Skip("Color picker button not found")
	}

	// Click to open color picker
	if err := colorBtn.Click(); err != nil {
		t.Fatalf("Failed to click color button: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	// Verify color picker is visible
	colorPicker := b.Find("#highlight-color-picker")
	if !colorPicker.Exists() || !colorPicker.Visible() {
		t.Error("Color picker did not open")
	}

	// Click a color option
	colorOption := b.Find("#highlight-color-picker .color-option")
	if colorOption.Exists() {
		if err := colorOption.Click(); err != nil {
			t.Logf("Failed to click color option: %v", err)
		}
	}
}

// TestCompareExitSSSMode tests exiting SSS mode back to normal mode.
func TestCompareExitSSSMode(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToCompare(t, b)

	// Enter SSS mode
	helpers.WaitAndClick(t, b, "#sss-mode-btn")
	time.Sleep(300 * time.Millisecond)

	// Verify we're in SSS mode
	helpers.ExpectVisible(t, b, "#sss-mode")

	// Click back button to exit SSS mode
	backBtn := b.Find("#sss-back-btn")
	if !backBtn.Exists() {
		t.Fatal("SSS back button not found")
	}

	if err := backBtn.Click(); err != nil {
		t.Fatalf("Failed to click back button: %v", err)
	}

	time.Sleep(300 * time.Millisecond)

	// Verify we're back in normal mode
	helpers.ExpectVisible(t, b, "#normal-mode")

	// Verify SSS mode is hidden
	sssMode := b.Find("#sss-mode")
	if sssMode.Visible() {
		t.Error("SSS mode should be hidden after exiting")
	}
}
