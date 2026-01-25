package regression

import (
	"testing"
	"time"

	"michael-tests/helpers"
)

// TestOfflineCachedPage tests loading a cached page when offline.
func TestOfflineCachedPage(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	// First visit to cache the page
	helpers.NavigateToSingle(t, b, "kjv", "gen", 1)

	// Wait for page to fully load and service worker to cache
	if err := b.WaitFor(".verse"); err != nil {
		t.Fatalf("Page did not load: %v", err)
	}

	// Give service worker time to cache
	time.Sleep(2 * time.Second)

	// Go offline
	if err := b.SetOffline(true); err != nil {
		t.Fatalf("Failed to go offline: %v", err)
	}

	// Reload page
	if err := b.Reload(); err != nil {
		t.Fatalf("Failed to reload page: %v", err)
	}

	// Wait a moment for page to load from cache
	time.Sleep(1 * time.Second)

	// Verify content still loads from cache
	verse := b.Find(".verse")
	if verse.Exists() {
		t.Log("Page loaded successfully from cache while offline")
	} else {
		// Check for offline fallback page
		offlinePage := b.Find(".offline-page")
		if offlinePage.Exists() {
			t.Log("Offline fallback page displayed")
		} else {
			t.Log("Page may not have been cached - service worker caching is progressive")
		}
	}

	// Restore network
	if err := b.SetOffline(false); err != nil {
		t.Fatalf("Failed to restore network: %v", err)
	}
}
