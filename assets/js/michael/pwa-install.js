/**
 * Michael PWA Install Handler
 *
 * Manages the PWA install prompt experience:
 * - Captures the beforeinstallprompt event
 * - Shows install banner when appropriate
 * - Handles iOS-specific install instructions
 * - Respects user preference to dismiss
 *
 * Copyright (c) 2025, Focus with Justin
 * SPDX-License-Identifier: MIT
 */

// Store the deferred prompt for later use
let deferredPrompt = null;

// LocalStorage keys
const STORAGE_KEY_DISMISSED = 'michael-pwa-install-dismissed';
const STORAGE_KEY_DISMISSED_TIME = 'michael-pwa-install-dismissed-time';

// Show banner after this many days if dismissed
const DAYS_BEFORE_RESHOWING = window.Michael?.Config?.pwaInstallReshowDays || 30;

/**
 * Initialize the PWA install handler
 */
export function initialize() {
  // Don't show install prompt if already installed
  if (isPWAInstalled()) {
    return;
  }

  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  // Listen for the appinstalled event
  window.addEventListener('appinstalled', handleAppInstalled);

  // Set up banner UI if it exists
  setupBannerUI();

  // Set up iOS dismiss button
  setupIOSDismissButton();

  // Check if we should show iOS instructions
  if (isIOS() && !isDismissed()) {
    showIOSInstructions();
  }
}

/**
 * Handle the beforeinstallprompt event
 */
function handleBeforeInstallPrompt(event) {
  // Prevent the mini-infobar from appearing on mobile
  event.preventDefault();

  // Store the event for later use
  deferredPrompt = event;

  // Show the install banner if not dismissed
  if (!isDismissed()) {
    showInstallBanner();
  }
}

/**
 * Handle the appinstalled event
 */
function handleAppInstalled(event) {
  // Clear the deferred prompt
  deferredPrompt = null;

  // Hide the banner
  hideInstallBanner();

  // Clear dismissed state
  localStorage.removeItem(STORAGE_KEY_DISMISSED);
  localStorage.removeItem(STORAGE_KEY_DISMISSED_TIME);

  // Request permissions after install (notifications, run on login)
  showPostInstallPermissions();
}

/**
 * Request notification permission
 * Called after app installation to enable push notifications
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('[PWA Install] Error requesting notifications:', error);
    return false;
  }
}

/**
 * Request run on OS login permission (Chromium-based browsers)
 * This uses the experimental Run On OS Login API
 */
export async function requestRunOnLogin() {
  // Check if the API is available (Chromium 120+)
  if (!('launchQueue' in window) || !navigator.runOnOsLoginEnabled) {
    return false;
  }

  try {
    // Request permission to run on OS login
    const result = await navigator.permissions.query({ name: 'run-on-os-login' });

    if (result.state === 'granted') {
      return true;
    }

    if (result.state === 'prompt') {
      // This will show a permission dialog
      const permission = await navigator.permissions.request({ name: 'run-on-os-login' });
      return permission.state === 'granted';
    }

    return false;
  } catch (error) {
    // API not supported or permission denied
    return false;
  }
}

/**
 * Show post-install permissions dialog
 * Asks for notifications and run-on-login after app installation
 */
async function showPostInstallPermissions() {
  // Small delay to let the install complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Request notification permission
  await requestNotificationPermission();

  // Try to request run on login (if supported)
  await requestRunOnLogin();
}

/**
 * Check if the PWA is already installed
 */
export function isPWAInstalled() {
  // Check if running in standalone mode (installed PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // iOS-specific check
  if (window.navigator.standalone === true) {
    return true;
  }

  return false;
}

/**
 * Check if the user is on iOS
 */
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * Check if the user has dismissed the banner recently
 */
function isDismissed() {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (!dismissed) {
      return false;
    }

    // Check if enough time has passed to show again
    const dismissedTime = localStorage.getItem(STORAGE_KEY_DISMISSED_TIME);
    if (dismissedTime) {
      // Handle empty string and non-numeric string cases
      if (dismissedTime === '' || dismissedTime.trim() === '') {
        // Empty string - clear and allow showing again
        localStorage.removeItem(STORAGE_KEY_DISMISSED);
        localStorage.removeItem(STORAGE_KEY_DISMISSED_TIME);
        return false;
      }

      const parsedTime = parseInt(dismissedTime, 10);
      if (isNaN(parsedTime) || parsedTime < 0) {
        // Corrupted data — clear and allow showing again
        localStorage.removeItem(STORAGE_KEY_DISMISSED);
        localStorage.removeItem(STORAGE_KEY_DISMISSED_TIME);
        return false;
      }

      const daysSinceDismissed = (Date.now() - parsedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed >= DAYS_BEFORE_RESHOWING) {
        localStorage.removeItem(STORAGE_KEY_DISMISSED);
        localStorage.removeItem(STORAGE_KEY_DISMISSED_TIME);
        return false;
      }
    }

    return true;
  } catch (error) {
    // localStorage access error or JSON parsing error - fail safe and allow showing
    console.warn('[PWA Install] Error checking dismissed state:', error);
    return false;
  }
}

/**
 * Set up event listeners for the banner UI
 */
function setupBannerUI() {
  // Install button
  const installBtn = document.getElementById('pwa-install-btn');
  if (!installBtn) {
    console.warn('[PWA Install] Install button not found');
  } else {
    installBtn.addEventListener('click', triggerInstallPrompt);
  }

  // Dismiss button
  const dismissBtn = document.getElementById('pwa-install-dismiss');
  if (!dismissBtn) {
    console.warn('[PWA Install] Dismiss button not found');
  } else {
    dismissBtn.addEventListener('click', dismissInstallBanner);
  }
}

/**
 * Set up iOS dismiss button event listener
 */
function setupIOSDismissButton() {
  const iosDismissBtn = document.getElementById('pwa-ios-dismiss');
  if (!iosDismissBtn) {
    console.warn('[PWA Install] iOS dismiss button not found');
    return;
  }

  iosDismissBtn.addEventListener('click', function() {
    const banner = document.getElementById('pwa-ios-instructions');
    if (banner) {
      banner.classList.add('hidden');
      banner.setAttribute('aria-hidden', 'true');
    }
    // Store dismissal
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    localStorage.setItem(STORAGE_KEY_DISMISSED_TIME, Date.now().toString());
  });
}

/**
 * Show the install banner
 */
function showInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Hide the install banner
 */
function hideInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.classList.add('hidden');
    banner.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Show a message when install prompt is unavailable
 * This happens when the deferred prompt has already been used
 */
function showInstallUnavailableMessage() {
  // Try to show a gentle notification to the user
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    const messageEl = banner.querySelector('.install-message');
    if (messageEl) {
      const originalText = messageEl.textContent;
      messageEl.textContent = 'Please reload the page to install the app.';
      // Restore original text after 5 seconds
      setTimeout(() => {
        messageEl.textContent = originalText;
      }, 5000);
    }
  }
}

/**
 * Dismiss the install banner and remember the choice
 */
function dismissInstallBanner() {
  hideInstallBanner();
  localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
  localStorage.setItem(STORAGE_KEY_DISMISSED_TIME, Date.now().toString());
}

/**
 * Trigger the install prompt
 * Note: The deferred prompt can only be used once. If the user dismisses it,
 * the prompt won't be available again until the page reloads.
 */
export async function triggerInstallPrompt() {
  if (!deferredPrompt) {
    console.warn('[PWA Install] No deferred prompt available. The prompt may have already been used, or the page needs to be reloaded.');
    // Show user-friendly message that they need to reload
    showInstallUnavailableMessage();
    return false;
  }

  try {
    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    // Clear the deferred prompt (can only be used once)
    deferredPrompt = null;

    // Hide the banner regardless of outcome
    hideInstallBanner();

    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA Install] Error triggering install prompt:', error);
    deferredPrompt = null;
    hideInstallBanner();
    return false;
  }
}

/**
 * Show iOS-specific install instructions
 */
function showIOSInstructions() {
  const iosBanner = document.getElementById('pwa-ios-instructions');
  if (iosBanner) {
    iosBanner.classList.remove('hidden');
    iosBanner.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Check if the install prompt is available
 */
export function canInstall() {
  return deferredPrompt !== null;
}

/**
 * Cleanup event listeners when page unloads
 */
export function cleanup() {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.removeEventListener('appinstalled', handleAppInstalled);

  // Clear deferred prompt
  deferredPrompt = null;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Clean up on page unload
window.addEventListener('beforeunload', cleanup);

// Expose public API for backwards compatibility
window.Michael = window.Michael || {};
window.Michael.PWAInstall = {
  canInstall,
  triggerInstallPrompt,
  isPWAInstalled,
  isIOS,
  requestNotificationPermission,
  requestRunOnLogin,
  cleanup
};
