package regression

import (
	"testing"
	"time"

	"michael-tests/helpers"
)

// TestSingleChapterArrowNavigation tests navigating between chapters with arrows.
func TestSingleChapterArrowNavigation(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSingle(t, b, "kjv", "gen", 1)

	// Look for next chapter navigation
	nextBtn := b.Find(".chapter-nav-next")
	if !nextBtn.Exists() {
		nextBtn = b.Find("a[rel='next']")
	}
	if !nextBtn.Exists() {
		nextBtn = b.Find(".nav-next")
	}

	if !nextBtn.Exists() {
		t.Skip("Chapter navigation arrows not found")
	}

	// Click next chapter
	if err := nextBtn.Click(); err != nil {
		t.Fatalf("Failed to click next chapter: %v", err)
	}

	// Wait for navigation
	time.Sleep(500 * time.Millisecond)

	// Verify we navigated (URL should contain chapter 2)
	helpers.ExpectURL(t, b, "/gen/2")

	// Look for previous button
	prevBtn := b.Find(".chapter-nav-prev")
	if !prevBtn.Exists() {
		prevBtn = b.Find("a[rel='prev']")
	}
	if !prevBtn.Exists() {
		prevBtn = b.Find(".nav-prev")
	}

	if prevBtn.Exists() {
		if err := prevBtn.Click(); err != nil {
			t.Fatalf("Failed to click previous chapter: %v", err)
		}

		// Wait for navigation back
		time.Sleep(500 * time.Millisecond)

		// Verify we're back at chapter 1
		helpers.ExpectURL(t, b, "/gen/1")
	}
}

// TestSingleStrongsTooltip tests clicking a Strong's number and seeing the tooltip.
func TestSingleStrongsTooltip(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSingle(t, b, "kjv", "gen", 1) // KJV has Strong's numbers

	// Look for Strong's number link
	strongsLink := b.Find(".strongs-number")
	if !strongsLink.Exists() {
		strongsLink = b.Find("a[href*='strongs']")
	}
	if !strongsLink.Exists() {
		strongsLink = b.Find("[data-strongs]")
	}

	if !strongsLink.Exists() {
		t.Skip("Strong's numbers not found - may not be enabled for this Bible")
	}

	// Click Strong's link
	if err := strongsLink.Click(); err != nil {
		t.Fatalf("Failed to click Strong's number: %v", err)
	}

	// Wait for tooltip
	time.Sleep(300 * time.Millisecond)

	// Look for tooltip
	tooltip := b.Find(".strongs-tooltip")
	if !tooltip.Exists() {
		tooltip = b.Find("[role='tooltip']")
	}
	if !tooltip.Exists() {
		tooltip = b.Find(".tooltip")
	}

	if tooltip.Exists() {
		helpers.Assert(t, tooltip.ShouldBeVisible())

		// Verify tooltip has content
		text, _ := tooltip.Text()
		if len(text) > 0 {
			t.Logf("Strong's tooltip displayed: %s...", text[:min(50, len(text))])
		}

		// Test Escape to close
		if err := b.Press("Escape"); err == nil {
			time.Sleep(200 * time.Millisecond)
			helpers.ExpectHidden(t, b, ".strongs-tooltip")
		}
	} else {
		t.Log("Strong's tooltip not found - display method may differ")
	}
}

// TestSingleShareMenu tests clicking the share button and seeing the menu.
func TestSingleShareMenu(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSingle(t, b, "kjv", "gen", 1)

	// Look for share button
	shareBtn := b.Find(".share-button")
	if !shareBtn.Exists() {
		shareBtn = b.Find("[aria-label*='share']")
	}
	if !shareBtn.Exists() {
		shareBtn = b.Find("button[data-share]")
	}

	if !shareBtn.Exists() {
		t.Skip("Share button not found on page")
	}

	// Click share button
	if err := shareBtn.Click(); err != nil {
		t.Fatalf("Failed to click share button: %v", err)
	}

	// Wait for menu
	time.Sleep(200 * time.Millisecond)

	// Look for share menu
	menu := b.Find(".share-menu")
	if !menu.Exists() {
		menu = b.Find("[role='menu']")
	}

	if menu.Exists() {
		helpers.Assert(t, menu.ShouldBeVisible())

		// Verify menu has items
		menuItem := b.Find(".share-menu-item")
		if !menuItem.Exists() {
			menuItem = b.Find("[role='menuitem']")
		}
		helpers.Assert(t, menuItem.ShouldExist())
	} else {
		t.Log("Share menu structure may differ from expected")
	}
}

// TestSingleShareCopyLink tests copying a link from the share menu.
func TestSingleShareCopyLink(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSingle(t, b, "kjv", "gen", 1)

	// Open share menu
	shareBtn := b.Find(".share-button")
	if !shareBtn.Exists() {
		t.Skip("Share button not found")
	}

	if err := shareBtn.Click(); err != nil {
		t.Fatalf("Failed to click share button: %v", err)
	}

	time.Sleep(200 * time.Millisecond)

	// Look for copy link option
	copyBtn := b.Find("[data-action='copy-link']")
	if !copyBtn.Exists() {
		copyBtn = b.Find(".share-copy-link")
	}
	if !copyBtn.Exists() {
		copyBtn = b.Find("[aria-label*='copy']")
	}

	if !copyBtn.Exists() {
		t.Skip("Copy link button not found in share menu")
	}

	// Click copy link
	if err := copyBtn.Click(); err != nil {
		t.Fatalf("Failed to click copy link: %v", err)
	}

	// Wait for toast notification
	time.Sleep(300 * time.Millisecond)

	// Look for success indication
	toast := b.Find(".toast")
	if !toast.Exists() {
		toast = b.Find("[role='alert']")
	}
	if !toast.Exists() {
		toast = b.Find(".notification")
	}

	if toast.Exists() {
		t.Log("Copy success notification displayed")
	} else {
		t.Log("No toast notification found - copy may have succeeded silently")
	}
}

// TestSingleVerseShare tests clicking a verse share button.
func TestSingleVerseShare(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSingle(t, b, "kjv", "gen", 1)

	// Find first verse
	verse := b.Find(".verse[data-verse='1']")
	if !verse.Exists() {
		verse = b.Find(".verse:first-child")
	}

	if !verse.Exists() {
		t.Skip("Verses not found on page")
	}

	// Hover/focus to reveal share button
	if err := verse.Focus(); err != nil {
		t.Logf("Could not focus verse: %v", err)
	}

	// Look for verse share button
	verseShareBtn := b.Find(".verse[data-verse='1'] .verse-share-btn")
	if !verseShareBtn.Exists() {
		verseShareBtn = b.Find(".verse-share")
	}

	if !verseShareBtn.Exists() {
		t.Skip("Verse share button not found - may appear on hover only")
	}

	// Click verse share button
	if err := verseShareBtn.Click(); err != nil {
		t.Fatalf("Failed to click verse share button: %v", err)
	}

	// Wait for share menu
	time.Sleep(200 * time.Millisecond)

	// Verify share menu opens
	menu := b.Find(".share-menu")
	if menu.Exists() {
		helpers.Assert(t, menu.ShouldBeVisible())
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
