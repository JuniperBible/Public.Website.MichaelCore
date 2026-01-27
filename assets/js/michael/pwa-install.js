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

(function() {
  'use strict';

  // Store the deferred prompt for later use
  let deferredPrompt = null;

  // LocalStorage keys
  const STORAGE_KEY_DISMISSED = 'michael-pwa-install-dismissed';
  const STORAGE_KEY_DISMISSED_TIME = 'michael-pwa-install-dismissed-time';

  // Show banner after this many days if dismissed
  const DAYS_BEFORE_RESHOWING = 30;

  /**
   * Initialize the PWA install handler
   */
  function initialize() {
    // Don't show install prompt if already installed
    if (isPWAInstalled()) {
      console.log('[PWA Install] App is already installed');
      return;
    }

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for the appinstalled event
    window.addEventListener('appinstalled', handleAppInstalled);

    // Set up banner UI if it exists
    setupBannerUI();

    // Check if we should show iOS instructions
    if (isIOS() && !isDismissed()) {
      showIOSInstructions();
    }
  }

  /**
   * Handle the beforeinstallprompt event
   */
  function handleBeforeInstallPrompt(event) {
    console.log('[PWA Install] beforeinstallprompt captured');

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
    console.log('[PWA Install] App was installed');

    // Clear the deferred prompt
    deferredPrompt = null;

    // Hide the banner
    hideInstallBanner();

    // Clear dismissed state
    localStorage.removeItem(STORAGE_KEY_DISMISSED);
    localStorage.removeItem(STORAGE_KEY_DISMISSED_TIME);
  }

  /**
   * Check if the PWA is already installed
   */
  function isPWAInstalled() {
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
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /**
   * Check if the user has dismissed the banner recently
   */
  function isDismissed() {
    const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (!dismissed) {
      return false;
    }

    // Check if enough time has passed to show again
    const dismissedTime = localStorage.getItem(STORAGE_KEY_DISMISSED_TIME);
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed >= DAYS_BEFORE_RESHOWING) {
        // Clear the dismissed state and allow showing again
        localStorage.removeItem(STORAGE_KEY_DISMISSED);
        localStorage.removeItem(STORAGE_KEY_DISMISSED_TIME);
        return false;
      }
    }

    return true;
  }

  /**
   * Set up event listeners for the banner UI
   */
  function setupBannerUI() {
    // Install button
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.addEventListener('click', triggerInstallPrompt);
    }

    // Dismiss button
    const dismissBtn = document.getElementById('pwa-install-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', dismissInstallBanner);
    }
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
   * Dismiss the install banner and remember the choice
   */
  function dismissInstallBanner() {
    hideInstallBanner();
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    localStorage.setItem(STORAGE_KEY_DISMISSED_TIME, Date.now().toString());
  }

  /**
   * Trigger the install prompt
   */
  async function triggerInstallPrompt() {
    if (!deferredPrompt) {
      console.warn('[PWA Install] No deferred prompt available');
      return false;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Install] User response: ${outcome}`);

    // Clear the deferred prompt (can only be used once)
    deferredPrompt = null;

    // Hide the banner regardless of outcome
    hideInstallBanner();

    return outcome === 'accepted';
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
  function canInstall() {
    return deferredPrompt !== null;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Expose public API
  window.Michael = window.Michael || {};
  window.Michael.PWAInstall = {
    canInstall,
    triggerInstallPrompt,
    isPWAInstalled,
    isIOS
  };

})();
