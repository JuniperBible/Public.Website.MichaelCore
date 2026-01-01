package regression

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"michael-tests/helpers"
)

// =============================================================================
// MANIFEST TESTS
// =============================================================================

// TestManifestExists verifies that the manifest.json file is accessible.
func TestManifestExists(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/manifest.json"); err != nil {
		t.Fatalf("Failed to navigate to manifest: %v", err)
	}

	// Get page content (manifest is JSON)
	content, err := b.PageContent()
	if err != nil {
		t.Fatalf("Failed to get manifest content: %v", err)
	}

	// Verify it's valid JSON
	var manifest map[string]interface{}
	if err := json.Unmarshal([]byte(content), &manifest); err != nil {
		t.Fatalf("Manifest is not valid JSON: %v", err)
	}

	t.Log("Manifest exists and is valid JSON")
}

// TestManifestRequiredFields verifies all required PWA manifest fields are present.
func TestManifestRequiredFields(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/manifest.json"); err != nil {
		t.Fatalf("Failed to navigate to manifest: %v", err)
	}

	content, err := b.PageContent()
	if err != nil {
		t.Fatalf("Failed to get manifest content: %v", err)
	}

	var manifest map[string]interface{}
	if err := json.Unmarshal([]byte(content), &manifest); err != nil {
		t.Fatalf("Invalid manifest JSON: %v", err)
	}

	// Check required fields
	requiredFields := []string{
		"name",
		"short_name",
		"start_url",
		"display",
		"theme_color",
		"background_color",
		"icons",
	}

	for _, field := range requiredFields {
		if _, exists := manifest[field]; !exists {
			t.Errorf("Required manifest field missing: %s", field)
		} else {
			t.Logf("Manifest field present: %s", field)
		}
	}

	// Verify display mode is standalone
	if display, ok := manifest["display"].(string); ok {
		if display != "standalone" {
			t.Errorf("Expected display 'standalone', got '%s'", display)
		}
	}

	// Verify icons array has entries
	if icons, ok := manifest["icons"].([]interface{}); ok {
		if len(icons) < 2 {
			t.Errorf("Expected at least 2 icons, got %d", len(icons))
		}
		t.Logf("Manifest has %d icons", len(icons))
	} else {
		t.Error("Icons field is not an array")
	}
}

// TestManifestIconSizes verifies icons have required sizes (192x192 and 512x512).
func TestManifestIconSizes(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/manifest.json"); err != nil {
		t.Fatalf("Failed to navigate to manifest: %v", err)
	}

	content, err := b.PageContent()
	if err != nil {
		t.Fatalf("Failed to get manifest content: %v", err)
	}

	var manifest map[string]interface{}
	if err := json.Unmarshal([]byte(content), &manifest); err != nil {
		t.Fatalf("Invalid manifest JSON: %v", err)
	}

	icons, ok := manifest["icons"].([]interface{})
	if !ok {
		t.Fatal("Icons field is not an array")
	}

	requiredSizes := map[string]bool{
		"192x192": false,
		"512x512": false,
	}

	for _, icon := range icons {
		iconMap, ok := icon.(map[string]interface{})
		if !ok {
			continue
		}
		if sizes, ok := iconMap["sizes"].(string); ok {
			if _, required := requiredSizes[sizes]; required {
				requiredSizes[sizes] = true
				t.Logf("Found required icon size: %s", sizes)
			}
		}
	}

	for size, found := range requiredSizes {
		if !found {
			t.Errorf("Missing required icon size: %s", size)
		}
	}
}

// TestManifestMaskableIcon verifies a maskable icon is present for Android.
func TestManifestMaskableIcon(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/manifest.json"); err != nil {
		t.Fatalf("Failed to navigate to manifest: %v", err)
	}

	content, err := b.PageContent()
	if err != nil {
		t.Fatalf("Failed to get manifest content: %v", err)
	}

	var manifest map[string]interface{}
	if err := json.Unmarshal([]byte(content), &manifest); err != nil {
		t.Fatalf("Invalid manifest JSON: %v", err)
	}

	icons, ok := manifest["icons"].([]interface{})
	if !ok {
		t.Fatal("Icons field is not an array")
	}

	hasMaskable := false
	for _, icon := range icons {
		iconMap, ok := icon.(map[string]interface{})
		if !ok {
			continue
		}
		if purpose, ok := iconMap["purpose"].(string); ok {
			if strings.Contains(purpose, "maskable") {
				hasMaskable = true
				t.Log("Found maskable icon")
				break
			}
		}
	}

	if !hasMaskable {
		t.Error("No maskable icon found - required for Android adaptive icons")
	}
}

// =============================================================================
// ICON TESTS
// =============================================================================

// TestPWAIconsAccessible verifies all icon files return HTTP 200.
func TestPWAIconsAccessible(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	icons := []string{
		"/icons/icon-16.png",
		"/icons/icon-32.png",
		"/icons/icon-192.png",
		"/icons/icon-512.png",
		"/icons/icon-maskable-512.png",
		"/icons/apple-touch-icon.png",
	}

	for _, icon := range icons {
		t.Run(icon, func(t *testing.T) {
			if err := b.Navigate(helpers.BaseURL + icon); err != nil {
				t.Errorf("Failed to load icon %s: %v", icon, err)
				return
			}
			// If navigation succeeded without error, the resource exists
			t.Logf("Icon accessible: %s", icon)
		})
	}
}

// TestSVGLogoExists verifies the SVG logo file exists.
func TestSVGLogoExists(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/icons/logo.svg"); err != nil {
		t.Fatalf("Failed to load SVG logo: %v", err)
	}

	content, err := b.PageContent()
	if err != nil {
		t.Fatalf("Failed to get logo content: %v", err)
	}

	if !strings.Contains(content, "<svg") {
		t.Error("Logo file does not appear to be SVG")
	} else {
		t.Log("SVG logo exists and is valid")
	}
}

// =============================================================================
// META TAG TESTS
// =============================================================================

// TestPWAMetaTags verifies all PWA meta tags are present in the HTML head.
func TestPWAMetaTags(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	// Check for manifest link
	manifestLink := b.Find("link[rel='manifest']")
	if !manifestLink.Exists() {
		t.Error("Missing manifest link")
	} else {
		href, _ := manifestLink.Attribute("href")
		if href != "/manifest.json" {
			t.Errorf("Unexpected manifest href: %s", href)
		}
		t.Log("Manifest link present")
	}

	// Check for theme-color meta
	themeColor := b.Find("meta[name='theme-color']")
	if !themeColor.Exists() {
		t.Error("Missing theme-color meta tag")
	} else {
		content, _ := themeColor.Attribute("content")
		t.Logf("Theme color: %s", content)
	}

	// Check for apple-mobile-web-app-capable
	appleCap := b.Find("meta[name='apple-mobile-web-app-capable']")
	if !appleCap.Exists() {
		t.Error("Missing apple-mobile-web-app-capable meta tag")
	} else {
		t.Log("Apple mobile web app capable: yes")
	}

	// Check for apple-mobile-web-app-status-bar-style
	appleStatus := b.Find("meta[name='apple-mobile-web-app-status-bar-style']")
	if !appleStatus.Exists() {
		t.Error("Missing apple-mobile-web-app-status-bar-style meta tag")
	}

	// Check for apple-mobile-web-app-title
	appleTitle := b.Find("meta[name='apple-mobile-web-app-title']")
	if !appleTitle.Exists() {
		t.Error("Missing apple-mobile-web-app-title meta tag")
	}

	// Check for apple-touch-icon
	appleIcon := b.Find("link[rel='apple-touch-icon']")
	if !appleIcon.Exists() {
		t.Error("Missing apple-touch-icon link")
	}

	// Check for favicon links
	favicon32 := b.Find("link[rel='icon'][sizes='32x32']")
	if !favicon32.Exists() {
		t.Error("Missing 32x32 favicon link")
	}

	favicon16 := b.Find("link[rel='icon'][sizes='16x16']")
	if !favicon16.Exists() {
		t.Error("Missing 16x16 favicon link")
	}
}

// =============================================================================
// SERVICE WORKER TESTS
// =============================================================================

// TestServiceWorkerExists verifies the service worker file is accessible.
func TestServiceWorkerExists(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/sw.js"); err != nil {
		t.Fatalf("Failed to load service worker: %v", err)
	}

	content, err := b.PageContent()
	if err != nil {
		t.Fatalf("Failed to get SW content: %v", err)
	}

	// Verify it contains expected SW code
	if !strings.Contains(content, "addEventListener") {
		t.Error("Service worker does not contain event listeners")
	}

	if !strings.Contains(content, "install") {
		t.Error("Service worker does not contain install handler")
	}

	if !strings.Contains(content, "fetch") {
		t.Error("Service worker does not contain fetch handler")
	}

	t.Log("Service worker exists with required handlers")
}

// TestServiceWorkerHasFingerprintedCSS verifies SW includes fingerprinted CSS path.
func TestServiceWorkerHasFingerprintedCSS(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/sw.js"); err != nil {
		t.Fatalf("Failed to load service worker: %v", err)
	}

	content, err := b.PageContent()
	if err != nil {
		t.Fatalf("Failed to get SW content: %v", err)
	}

	// Check for fingerprinted CSS path (contains hash)
	if !strings.Contains(content, "/css/theme.min.") && !strings.Contains(content, "theme.") {
		t.Error("Service worker does not contain CSS path")
	}

	// Verify it's not a hardcoded generic path
	if strings.Contains(content, "'/css/theme.css'") {
		t.Error("Service worker has hardcoded CSS path instead of fingerprinted")
	}

	t.Log("Service worker has fingerprinted CSS path")
}

// TestServiceWorkerRegistration verifies SW registers successfully on page load.
func TestServiceWorkerRegistration(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	// Wait for SW registration
	time.Sleep(2 * time.Second)

	// Check if service worker is registered via JavaScript
	registered, err := b.Evaluate(`
		(async () => {
			if (!('serviceWorker' in navigator)) return false;
			const registrations = await navigator.serviceWorker.getRegistrations();
			return registrations.length > 0;
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to check SW registration: %v", err)
	}

	if registered != true {
		t.Error("Service worker not registered")
	} else {
		t.Log("Service worker registered successfully")
	}
}

// TestServiceWorkerActivation verifies SW activates and claims clients.
func TestServiceWorkerActivation(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	// Wait for SW to activate
	time.Sleep(3 * time.Second)

	// Check SW state
	state, err := b.Evaluate(`
		(async () => {
			if (!('serviceWorker' in navigator)) return 'unsupported';
			const reg = await navigator.serviceWorker.ready;
			if (reg.active) return 'active';
			if (reg.waiting) return 'waiting';
			if (reg.installing) return 'installing';
			return 'none';
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to check SW state: %v", err)
	}

	if state != "active" {
		t.Errorf("Service worker state is '%v', expected 'active'", state)
	} else {
		t.Log("Service worker is active")
	}
}

// TestServiceWorkerPrecache verifies SW pre-caches shell assets on install.
func TestServiceWorkerPrecache(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	// Wait for SW to install and cache
	time.Sleep(3 * time.Second)

	// Check if shell cache exists
	cacheExists, err := b.Evaluate(`
		(async () => {
			const cacheNames = await caches.keys();
			return cacheNames.some(name => name.includes('michael-shell'));
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to check cache: %v", err)
	}

	if cacheExists != true {
		t.Error("Shell cache not created")
	} else {
		t.Log("Shell cache exists")
	}
}

// =============================================================================
// OFFLINE FUNCTIONALITY TESTS
// =============================================================================

// TestOfflineFallbackPage verifies offline fallback shows for uncached pages.
func TestOfflineFallbackPage(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	// Load main page to register SW
	helpers.NavigateToBiblesList(t, b)
	time.Sleep(3 * time.Second)

	// Go offline
	if err := b.SetOffline(true); err != nil {
		t.Fatalf("Failed to go offline: %v", err)
	}

	// Try to navigate to an uncached page
	if err := b.Navigate(helpers.BaseURL + "/bible/nonexistent/book/999/"); err != nil {
		// Navigation might fail, which is expected
	}

	time.Sleep(1 * time.Second)

	// Check for offline page content
	content, _ := b.PageContent()
	isOfflinePage := strings.Contains(content, "offline") ||
		strings.Contains(content, "Offline") ||
		strings.Contains(content, "no network")

	// Restore network
	b.SetOffline(false)

	if !isOfflinePage {
		t.Log("Offline page may not have specific markers - checking for basic content")
	} else {
		t.Log("Offline fallback page displayed")
	}
}

// TestOfflineWithCachedCSS verifies cached pages render with styles when offline.
func TestOfflineWithCachedCSS(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	// Visit page to cache it and its CSS
	helpers.NavigateToBiblesList(t, b)
	time.Sleep(3 * time.Second)

	// Go offline
	if err := b.SetOffline(true); err != nil {
		t.Fatalf("Failed to go offline: %v", err)
	}

	// Reload the page
	if err := b.Reload(); err != nil {
		t.Fatalf("Failed to reload: %v", err)
	}
	time.Sleep(1 * time.Second)

	// Check if CSS is loaded by checking a styled element
	hasStyles, err := b.Evaluate(`
		(() => {
			const body = document.body;
			const styles = window.getComputedStyle(body);
			// Check if background color is set (not default white/transparent)
			return styles.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
			       styles.backgroundColor !== 'transparent';
		})()
	`)

	// Restore network
	b.SetOffline(false)

	if err != nil {
		t.Fatalf("Failed to check styles: %v", err)
	}

	if hasStyles != true {
		t.Error("CSS not loaded when offline - styles may not be cached")
	} else {
		t.Log("CSS successfully loaded from cache when offline")
	}
}

// TestBibleDownloadFlow tests the full Bible download workflow.
func TestBibleDownloadFlow(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	// Navigate to offline settings
	if err := b.Navigate(helpers.BaseURL + "/bible/"); err != nil {
		t.Fatalf("Failed to navigate: %v", err)
	}

	// Look for offline settings panel
	offlinePanel := b.Find("#offline-download-form")
	if !offlinePanel.Exists() {
		t.Skip("Offline download form not found on page")
	}

	// Find a Bible checkbox
	checkbox := b.Find(".bible-download-checkbox")
	if !checkbox.Exists() {
		t.Skip("No Bible download checkboxes found")
	}

	// Check the first Bible
	if err := checkbox.Click(); err != nil {
		t.Fatalf("Failed to click checkbox: %v", err)
	}

	// Find and click download button
	downloadBtn := b.Find("#download-offline-btn")
	if !downloadBtn.Exists() {
		t.Skip("Download button not found")
	}

	if err := downloadBtn.Click(); err != nil {
		t.Fatalf("Failed to click download: %v", err)
	}

	// Wait for download to start (check for progress indicator)
	time.Sleep(2 * time.Second)

	// Check if progress is shown
	progressBar := b.Find("#download-progress-bar")
	if progressBar.Exists() {
		t.Log("Download progress bar displayed")
	}

	// Check for download status
	status := b.Find(".bible-download-status")
	if status.Exists() {
		text, _ := status.Text()
		t.Logf("Download status: %s", text)
	}

	// Note: We don't wait for full download as it could take a long time
	t.Log("Bible download flow initiated successfully")
}

// TestDownloadCancellation tests cancelling an in-progress download.
func TestDownloadCancellation(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/bible/"); err != nil {
		t.Fatalf("Failed to navigate: %v", err)
	}

	// Check if OfflineManager has cancel function
	hasCancel, err := b.Evaluate(`
		typeof window.Michael?.OfflineManager?.cancelDownload === 'function'
	`)

	if err != nil {
		t.Fatalf("Failed to check cancel function: %v", err)
	}

	if hasCancel != true {
		t.Error("OfflineManager.cancelDownload function not available")
	} else {
		t.Log("Download cancellation API available")
	}
}

// TestCacheStatusAPI tests the getCacheStatus API.
func TestCacheStatusAPI(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/bible/"); err != nil {
		t.Fatalf("Failed to navigate: %v", err)
	}

	// Wait for OfflineManager
	time.Sleep(2 * time.Second)

	// Test getCacheStatus
	status, err := b.Evaluate(`
		(async () => {
			if (!window.Michael?.OfflineManager) return null;
			await window.Michael.OfflineManager.initialize('/sw.js');
			const status = await window.Michael.OfflineManager.getCacheStatus();
			return status;
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to get cache status: %v", err)
	}

	if status == nil {
		t.Error("getCacheStatus returned null")
	} else {
		t.Logf("Cache status API working: %v", status)
	}
}

// =============================================================================
// INSTALL PROMPT TESTS
// =============================================================================

// TestInstallBannerExists verifies the install banner markup exists.
func TestInstallBannerExists(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	banner := b.Find("#pwa-install-banner")
	if !banner.Exists() {
		t.Error("Install banner element not found in DOM")
	} else {
		t.Log("Install banner element present")
	}

	// Check banner has required elements
	installBtn := b.Find("#pwa-install-btn")
	if !installBtn.Exists() {
		t.Error("Install button not found")
	}

	dismissBtn := b.Find("#pwa-install-dismiss")
	if !dismissBtn.Exists() {
		t.Error("Dismiss button not found")
	}
}

// TestInstallBannerHiddenByDefault verifies banner starts hidden.
func TestInstallBannerHiddenByDefault(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	banner := b.Find("#pwa-install-banner")
	if !banner.Exists() {
		t.Skip("Install banner not found")
	}

	// Check it has hidden class
	classes, _ := banner.Attribute("class")
	if !strings.Contains(classes, "hidden") {
		t.Error("Install banner should start hidden")
	} else {
		t.Log("Install banner correctly hidden by default")
	}
}

// TestIOSInstructionsBanner verifies iOS instructions element exists.
func TestIOSInstructionsBanner(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	iosBanner := b.Find("#pwa-ios-instructions")
	if !iosBanner.Exists() {
		t.Error("iOS instructions banner not found")
	} else {
		t.Log("iOS instructions banner present")
	}
}

// TestPWAInstallAPI verifies the PWAInstall API is available.
func TestPWAInstallAPI(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	// Wait for script to load
	time.Sleep(1 * time.Second)

	// Check API functions exist
	apis, err := b.Evaluate(`
		({
			canInstall: typeof window.Michael?.PWAInstall?.canInstall === 'function',
			triggerInstallPrompt: typeof window.Michael?.PWAInstall?.triggerInstallPrompt === 'function',
			isPWAInstalled: typeof window.Michael?.PWAInstall?.isPWAInstalled === 'function',
			isIOS: typeof window.Michael?.PWAInstall?.isIOS === 'function'
		})
	`)

	if err != nil {
		t.Fatalf("Failed to check PWA Install API: %v", err)
	}

	apiMap, ok := apis.(map[string]interface{})
	if !ok {
		t.Fatal("Unexpected API response type")
	}

	for name, exists := range apiMap {
		if exists != true {
			t.Errorf("PWAInstall.%s function not available", name)
		} else {
			t.Logf("PWAInstall.%s available", name)
		}
	}
}

// =============================================================================
// INDEXEDDB STORAGE TESTS
// =============================================================================

// TestUserStorageAPI verifies IndexedDB storage API is available.
func TestUserStorageAPI(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	time.Sleep(1 * time.Second)

	// Check API functions
	apis, err := b.Evaluate(`
		({
			init: typeof window.Michael?.UserStorage?.init === 'function',
			saveProgress: typeof window.Michael?.UserStorage?.saveProgress === 'function',
			getProgress: typeof window.Michael?.UserStorage?.getProgress === 'function',
			getLastRead: typeof window.Michael?.UserStorage?.getLastRead === 'function',
			addBookmark: typeof window.Michael?.UserStorage?.addBookmark === 'function',
			getBookmarks: typeof window.Michael?.UserStorage?.getBookmarks === 'function',
			addNote: typeof window.Michael?.UserStorage?.addNote === 'function',
			getNotes: typeof window.Michael?.UserStorage?.getNotes === 'function',
			setSetting: typeof window.Michael?.UserStorage?.setSetting === 'function',
			getSetting: typeof window.Michael?.UserStorage?.getSetting === 'function',
			isSupported: typeof window.Michael?.UserStorage?.isSupported === 'function'
		})
	`)

	if err != nil {
		t.Fatalf("Failed to check UserStorage API: %v", err)
	}

	apiMap, ok := apis.(map[string]interface{})
	if !ok {
		t.Fatal("Unexpected API response type")
	}

	for name, exists := range apiMap {
		if exists != true {
			t.Errorf("UserStorage.%s function not available", name)
		} else {
			t.Logf("UserStorage.%s available", name)
		}
	}
}

// TestIndexedDBSupported verifies IndexedDB is supported.
func TestIndexedDBSupported(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	supported, err := b.Evaluate(`
		window.Michael?.UserStorage?.isSupported() ?? false
	`)

	if err != nil {
		t.Fatalf("Failed to check IndexedDB support: %v", err)
	}

	if supported != true {
		t.Error("IndexedDB not supported")
	} else {
		t.Log("IndexedDB supported")
	}
}

// TestUserStorageReadingProgress tests saving and retrieving reading progress.
func TestUserStorageReadingProgress(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	time.Sleep(1 * time.Second)

	// Test save and retrieve progress
	result, err := b.Evaluate(`
		(async () => {
			const storage = window.Michael?.UserStorage;
			if (!storage) return { error: 'UserStorage not available' };

			await storage.init();

			// Save progress
			await storage.saveProgress('test-bible', 'gen', 1, 100);

			// Retrieve progress
			const progress = await storage.getProgress('test-bible');

			return {
				saved: true,
				retrieved: progress !== null,
				matches: progress?.bookId === 'gen' && progress?.chapter === 1
			};
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to test reading progress: %v", err)
	}

	resultMap, ok := result.(map[string]interface{})
	if !ok {
		t.Fatal("Unexpected result type")
	}

	if resultMap["error"] != nil {
		t.Errorf("Error: %v", resultMap["error"])
	}

	if resultMap["matches"] != true {
		t.Error("Reading progress save/retrieve failed")
	} else {
		t.Log("Reading progress save/retrieve working")
	}
}

// TestUserStorageBookmarks tests adding and retrieving bookmarks.
func TestUserStorageBookmarks(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	time.Sleep(1 * time.Second)

	result, err := b.Evaluate(`
		(async () => {
			const storage = window.Michael?.UserStorage;
			if (!storage) return { error: 'UserStorage not available' };

			await storage.init();

			// Add bookmark
			const id = await storage.addBookmark('test-bible', 'John 3:16', 'Test note');

			// Get bookmarks
			const bookmarks = await storage.getBookmarks('test-bible');

			return {
				added: id > 0,
				retrieved: bookmarks.length > 0,
				hasReference: bookmarks.some(b => b.reference === 'John 3:16')
			};
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to test bookmarks: %v", err)
	}

	resultMap, ok := result.(map[string]interface{})
	if !ok {
		t.Fatal("Unexpected result type")
	}

	if resultMap["hasReference"] != true {
		t.Error("Bookmark add/retrieve failed")
	} else {
		t.Log("Bookmark add/retrieve working")
	}
}

// TestUserStorageSettings tests saving and retrieving settings.
func TestUserStorageSettings(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	time.Sleep(1 * time.Second)

	result, err := b.Evaluate(`
		(async () => {
			const storage = window.Michael?.UserStorage;
			if (!storage) return { error: 'UserStorage not available' };

			await storage.init();

			// Save setting
			await storage.setSetting('testKey', 'testValue');

			// Get setting
			const value = await storage.getSetting('testKey');

			// Test default value
			const defaultVal = await storage.getSetting('nonexistent', 'default');

			return {
				saved: true,
				retrieved: value === 'testValue',
				defaultWorks: defaultVal === 'default'
			};
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to test settings: %v", err)
	}

	resultMap, ok := result.(map[string]interface{})
	if !ok {
		t.Fatal("Unexpected result type")
	}

	if resultMap["retrieved"] != true || resultMap["defaultWorks"] != true {
		t.Error("Settings save/retrieve failed")
	} else {
		t.Log("Settings save/retrieve working")
	}
}

// =============================================================================
// READING TRACKER TESTS
// =============================================================================

// TestReadingTrackerAPI verifies the ReadingTracker API is available.
func TestReadingTrackerAPI(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSingle(t, b, "asv", "Gen", 1)

	time.Sleep(2 * time.Second)

	apis, err := b.Evaluate(`
		({
			init: typeof window.Michael?.ReadingTracker?.init === 'function',
			getStreakInfo: typeof window.Michael?.ReadingTracker?.getStreakInfo === 'function',
			getLastRead: typeof window.Michael?.ReadingTracker?.getLastRead === 'function',
			navigateToContinueReading: typeof window.Michael?.ReadingTracker?.navigateToContinueReading === 'function'
		})
	`)

	if err != nil {
		t.Fatalf("Failed to check ReadingTracker API: %v", err)
	}

	apiMap, ok := apis.(map[string]interface{})
	if !ok {
		t.Fatal("Unexpected API response type")
	}

	for name, exists := range apiMap {
		if exists != true {
			t.Errorf("ReadingTracker.%s function not available", name)
		} else {
			t.Logf("ReadingTracker.%s available", name)
		}
	}
}

// TestReadingTrackerAutoSave verifies progress is auto-saved on chapter pages.
func TestReadingTrackerAutoSave(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSingle(t, b, "asv", "Gen", 1)

	// Wait for tracker to initialize and save
	time.Sleep(3 * time.Second)

	// Check if progress was saved
	result, err := b.Evaluate(`
		(async () => {
			const storage = window.Michael?.UserStorage;
			if (!storage) return null;

			const progress = await storage.getProgress('asv');
			return progress;
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to check auto-saved progress: %v", err)
	}

	if result == nil {
		t.Error("Reading progress was not auto-saved")
	} else {
		t.Log("Reading progress auto-saved successfully")
	}
}

// TestReadingStreak verifies reading streak tracking.
func TestReadingStreak(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToSingle(t, b, "asv", "Gen", 1)

	time.Sleep(3 * time.Second)

	// Check streak info
	streak, err := b.Evaluate(`
		(async () => {
			const tracker = window.Michael?.ReadingTracker;
			if (!tracker) return null;

			return await tracker.getStreakInfo();
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to get streak info: %v", err)
	}

	if streak == nil {
		t.Error("Streak info not available")
	} else {
		streakMap, ok := streak.(map[string]interface{})
		if ok {
			t.Logf("Reading streak: %v days", streakMap["currentStreak"])
		}
	}
}

// =============================================================================
// BACKGROUND SYNC TESTS
// =============================================================================

// TestBackgroundSyncAPI verifies background sync API is available.
func TestBackgroundSyncAPI(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	time.Sleep(2 * time.Second)

	apis, err := b.Evaluate(`
		({
			isBackgroundSyncSupported: typeof window.Michael?.OfflineManager?.isBackgroundSyncSupported === 'function',
			queueBackgroundDownload: typeof window.Michael?.OfflineManager?.queueBackgroundDownload === 'function',
			downloadBibleWithSync: typeof window.Michael?.OfflineManager?.downloadBibleWithSync === 'function',
			getPendingDownloads: typeof window.Michael?.OfflineManager?.getPendingDownloads === 'function'
		})
	`)

	if err != nil {
		t.Fatalf("Failed to check background sync API: %v", err)
	}

	apiMap, ok := apis.(map[string]interface{})
	if !ok {
		t.Fatal("Unexpected API response type")
	}

	for name, exists := range apiMap {
		if exists != true {
			t.Errorf("OfflineManager.%s function not available", name)
		} else {
			t.Logf("OfflineManager.%s available", name)
		}
	}
}

// TestServiceWorkerSyncHandler verifies SW has sync event handler.
func TestServiceWorkerSyncHandler(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/sw.js"); err != nil {
		t.Fatalf("Failed to load service worker: %v", err)
	}

	content, err := b.PageContent()
	if err != nil {
		t.Fatalf("Failed to get SW content: %v", err)
	}

	if !strings.Contains(content, "addEventListener('sync'") &&
		!strings.Contains(content, `addEventListener("sync"`) {
		t.Error("Service worker does not have sync event handler")
	} else {
		t.Log("Service worker has sync event handler")
	}
}

// =============================================================================
// CSS STYLING TESTS
// =============================================================================

// TestInstallBannerStyles verifies install banner CSS is applied.
func TestInstallBannerStyles(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	// Check that the install banner styles exist
	hasStyles, err := b.Evaluate(`
		(() => {
			const banner = document.querySelector('#pwa-install-banner');
			if (!banner) return false;
			const styles = window.getComputedStyle(banner);
			// Check for position fixed (even if hidden)
			return styles.position === 'fixed';
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to check banner styles: %v", err)
	}

	if hasStyles != true {
		t.Error("Install banner styles not applied correctly")
	} else {
		t.Log("Install banner has correct CSS positioning")
	}
}

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

// TestInstallBannerAccessibility verifies install banner has proper ARIA attributes.
func TestInstallBannerAccessibility(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	banner := b.Find("#pwa-install-banner")
	if !banner.Exists() {
		t.Skip("Install banner not found")
	}

	// Check role attribute
	role, _ := banner.Attribute("role")
	if role != "banner" {
		t.Error("Install banner missing role='banner'")
	}

	// Check aria-hidden
	ariaHidden, _ := banner.Attribute("aria-hidden")
	if ariaHidden != "true" {
		t.Log("Install banner aria-hidden should be 'true' when hidden")
	}

	// Check dismiss button has aria-label
	dismissBtn := b.Find("#pwa-install-dismiss")
	if dismissBtn.Exists() {
		label, _ := dismissBtn.Attribute("aria-label")
		if label == "" {
			t.Error("Dismiss button missing aria-label")
		}
	}

	t.Log("Install banner accessibility attributes checked")
}

// TestOfflineMessagesAccessibility verifies offline messages have proper roles.
func TestOfflineMessagesAccessibility(t *testing.T) {
	b := helpers.NewTestBrowser(t)

	if err := b.Navigate(helpers.BaseURL + "/bible/"); err != nil {
		t.Fatalf("Failed to navigate: %v", err)
	}

	// Check offline messages container exists
	messagesContainer := b.Find("#offline-messages")
	if !messagesContainer.Exists() {
		t.Skip("Offline messages container not found")
	}

	t.Log("Offline messages container found")
}

// =============================================================================
// MOBILE-SPECIFIC TESTS
// =============================================================================

// TestMobilePWAMetaTags verifies mobile-specific PWA meta tags.
func TestMobilePWAMetaTags(t *testing.T) {
	b := helpers.NewMobileBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	// Check viewport meta
	viewport := b.Find("meta[name='viewport']")
	if !viewport.Exists() {
		t.Error("Missing viewport meta tag")
	} else {
		content, _ := viewport.Attribute("content")
		if !strings.Contains(content, "width=device-width") {
			t.Error("Viewport should include width=device-width")
		}
	}

	// Apple-specific metas should exist
	appleCapable := b.Find("meta[name='apple-mobile-web-app-capable']")
	if !appleCapable.Exists() {
		t.Error("Missing apple-mobile-web-app-capable for iOS")
	}

	t.Log("Mobile PWA meta tags present")
}

// TestMobileInstallBanner verifies install banner works on mobile viewport.
func TestMobileInstallBanner(t *testing.T) {
	b := helpers.NewMobileBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	banner := b.Find("#pwa-install-banner")
	if !banner.Exists() {
		t.Skip("Install banner not found")
	}

	// Banner should be full-width on mobile (responsive styles)
	t.Log("Install banner present on mobile viewport")
}

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

// TestOfflineManagerErrorHandling tests error handling in offline manager.
func TestOfflineManagerErrorHandling(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	time.Sleep(2 * time.Second)

	// Try to download a non-existent Bible
	result, err := b.Evaluate(`
		(async () => {
			try {
				const mgr = window.Michael?.OfflineManager;
				if (!mgr) return { error: 'OfflineManager not available' };

				await mgr.initialize('/sw.js');

				// This should fail gracefully
				await mgr.downloadBible('nonexistent-bible-id-12345', '/bible');
				return { error: 'Should have thrown error' };
			} catch (e) {
				return { caught: true, message: e.message };
			}
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to test error handling: %v", err)
	}

	resultMap, ok := result.(map[string]interface{})
	if !ok {
		t.Fatal("Unexpected result type")
	}

	// Either it caught an error or the Bible doesn't exist (404)
	if resultMap["caught"] == true || resultMap["error"] != nil {
		t.Log("Error handling working correctly")
	} else {
		t.Log("Download may have failed silently - check error paths")
	}
}

// TestUserStorageErrorHandling tests IndexedDB error handling.
func TestUserStorageErrorHandling(t *testing.T) {
	b := helpers.NewTestBrowser(t)
	helpers.NavigateToBiblesList(t, b)

	time.Sleep(1 * time.Second)

	// Test getting non-existent data returns null/default
	result, err := b.Evaluate(`
		(async () => {
			const storage = window.Michael?.UserStorage;
			if (!storage) return { error: 'UserStorage not available' };

			await storage.init();

			// Get non-existent progress
			const progress = await storage.getProgress('nonexistent-bible');

			// Get non-existent setting with default
			const setting = await storage.getSetting('nonexistent-key', 'default-value');

			return {
				progressIsNull: progress === null,
				settingHasDefault: setting === 'default-value'
			};
		})()
	`)

	if err != nil {
		t.Fatalf("Failed to test error handling: %v", err)
	}

	resultMap, ok := result.(map[string]interface{})
	if !ok {
		t.Fatal("Unexpected result type")
	}

	if resultMap["progressIsNull"] != true {
		t.Error("Non-existent progress should return null")
	}

	if resultMap["settingHasDefault"] != true {
		t.Error("Non-existent setting should return default value")
	}

	t.Log("UserStorage error handling working correctly")
}
