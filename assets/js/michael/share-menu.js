/**
 * ShareMenu Component
 *
 * A reusable, accessible share menu with ARIA compliance, focus management,
 * and keyboard navigation. Supports both online sharing and offline fallback.
 *
 * Copyright (c) 2025, Focus with Justin
 */
window.Michael = window.Michael || {};
window.Michael.ShareMenu = (function() {
  'use strict';

  // UI strings (can be overridden via options)
  const DEFAULT_UI = {
    copyLink: 'Copy link',
    copyText: 'Copy text',
    shareTwitter: 'Share on X',
    shareFacebook: 'Share on Facebook',
    copied: 'Copied!',
    copyFailed: 'Copy failed'
  };

  /**
   * ShareMenu constructor
   * @param {Object} options - Configuration options
   * @param {boolean} options.includeTextCopy - Whether to include "Copy text" option
   * @param {boolean} options.offline - Whether to start in offline mode
   * @param {Function} options.getShareUrl - Function to generate share URL
   * @param {Function} options.getShareText - Function to generate share text (for Twitter/copy)
   * @param {Function} options.getOfflineText - Function to generate formatted offline text
   * @param {Function} options.getShareTitle - Function to generate share title
   * @param {Function} options.onOfflineCopy - Callback when offline copy is performed
   * @param {Object} options.ui - UI string overrides
   */
  function ShareMenu(options) {
    this.options = Object.assign({
      includeTextCopy: false,
      offline: false,
      getShareUrl: () => window.location.href,
      getShareText: () => document.title,
      getOfflineText: null,
      getShareTitle: () => document.title,
      onOfflineCopy: null,
      ui: {}
    }, options);

    this.ui = Object.assign({}, DEFAULT_UI, this.options.ui);
    this.menu = null;
    this.anchorBtn = null;
    this.menuItems = [];
    this.currentFocusIndex = 0;
    this.clickHandler = null;
    this.escHandler = null;
    this.keyHandler = null;
    this.offlineMode = this.options.offline;

    // Listen for network changes
    this.onlineHandler = () => this.handleNetworkChange(true);
    this.offlineHandler = () => this.handleNetworkChange(false);
  }

  /**
   * Show the share menu anchored to a button
   * @param {HTMLElement} anchorBtn - Button that triggered the menu
   */
  ShareMenu.prototype.show = function(anchorBtn) {
    // Remove any existing menu first
    this.hide();

    // Update offline mode based on current network status
    this.offlineMode = !this.isOnline();

    this.anchorBtn = anchorBtn;
    this.menu = this.buildMenuHTML();
    this.positionMenu();

    document.body.appendChild(this.menu);

    // Get all menu items for keyboard navigation
    this.menuItems = Array.from(this.menu.querySelectorAll('[role="menuitem"]'));
    this.currentFocusIndex = 0;

    // Focus first menu item
    if (this.menuItems.length > 0) {
      this.menuItems[0].focus();
    }

    // Setup event handlers
    this.setupCloseHandlers();
    this.setupKeyboardNavigation();
    this.setupMenuActions();
    this.setupNetworkListeners();
  };

  /**
   * Hide the share menu and cleanup
   */
  ShareMenu.prototype.hide = function() {
    // Remove any existing menu
    const existingMenu = document.querySelector('.share-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Clean up event listeners
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
    }
    if (this.keyHandler && this.menu) {
      this.menu.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    // Clean up network listeners
    this.removeNetworkListeners();

    // Return focus to trigger button
    if (this.anchorBtn) {
      this.anchorBtn.focus();
      this.anchorBtn = null;
    }

    this.menu = null;
    this.menuItems = [];
    this.currentFocusIndex = 0;
  };

  /**
   * Build the menu HTML structure with ARIA attributes
   * @returns {HTMLElement} The menu element
   */
  ShareMenu.prototype.buildMenuHTML = function() {
    const menu = document.createElement('div');
    menu.className = 'share-menu';

    // Add offline modifier class if offline
    if (this.offlineMode) {
      menu.classList.add('share-menu--offline');
    }

    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Share options');

    const items = [];

    // Copy link option
    items.push(`
      <button class="share-menu-item" role="menuitem" data-action="copy-link">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>
        ${this.ui.copyLink}
      </button>
    `);

    // Copy text option (if enabled)
    if (this.options.includeTextCopy) {
      items.push(`
        <button class="share-menu-item" role="menuitem" data-action="copy-text">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
          </svg>
          ${this.ui.copyText}
        </button>
      `);
    }

    // If offline, show only copy options with special formatted text
    if (this.offlineMode) {
      // If we have offline text formatter, add special offline copy option
      if (this.options.getOfflineText) {
        items.push('<hr class="share-menu-divider" role="separator">');
        items.push(`
          <button class="share-menu-item" role="menuitem" data-action="copy-offline">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
            </svg>
            Copy for sharing
          </button>
        `);
      }

      // Show disabled social share buttons with tooltip
      items.push('<hr class="share-menu-divider" role="separator">');
      items.push(`
        <button class="share-menu-item share-btn--disabled" role="menuitem" disabled
                title="Unavailable offline" aria-label="Share on X (unavailable offline)">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          ${this.ui.shareTwitter}
        </button>
      `);
      items.push(`
        <button class="share-menu-item share-btn--disabled" role="menuitem" disabled
                title="Unavailable offline" aria-label="Share on Facebook (unavailable offline)">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          ${this.ui.shareFacebook}
        </button>
      `);
    } else {
      // Online mode - show all social sharing options
      items.push('<hr class="share-menu-divider" role="separator">');

      // Twitter/X share option
      items.push(`
        <button class="share-menu-item" role="menuitem" data-action="share-twitter">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          ${this.ui.shareTwitter}
        </button>
      `);

      // Facebook share option
      items.push(`
        <button class="share-menu-item" role="menuitem" data-action="share-facebook">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          ${this.ui.shareFacebook}
        </button>
      `);
    }

    menu.innerHTML = items.join('');
    return menu;
  };

  /**
   * Position the menu relative to the anchor button
   */
  ShareMenu.prototype.positionMenu = function() {
    if (!this.menu || !this.anchorBtn) return;

    const rect = this.anchorBtn.getBoundingClientRect();
    this.menu.style.position = 'absolute';
    this.menu.style.left = `${rect.left}px`;
    this.menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    this.menu.style.zIndex = '50';
  };

  /**
   * Handle menu action clicks
   * @param {string} action - The action to perform
   */
  ShareMenu.prototype.handleAction = async function(action) {
    switch (action) {
      case 'copy-link':
        {
          const url = this.options.getShareUrl();
          await this.copyToClipboard(url);
        }
        break;

      case 'copy-text':
        {
          const text = this.options.getShareText();
          await this.copyToClipboard(text);
        }
        break;

      case 'copy-offline':
        {
          // Use specialized offline text formatter if available
          const text = this.options.getOfflineText
            ? this.options.getOfflineText()
            : this.options.getShareText();
          const success = await this.copyToClipboard(text);

          // Trigger offline copy callback
          if (success && this.options.onOfflineCopy) {
            this.options.onOfflineCopy();
          }
        }
        break;

      case 'share-twitter':
        {
          const text = this.options.getShareText();
          const url = this.options.getShareUrl();
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
          window.open(twitterUrl, '_blank', 'width=550,height=420,noopener,noreferrer');
        }
        break;

      case 'share-facebook':
        {
          const url = this.options.getShareUrl();
          const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
          window.open(facebookUrl, '_blank', 'width=550,height=420,noopener,noreferrer');
        }
        break;
    }

    this.hide();
  };

  /**
   * Copy text to clipboard with visual feedback
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} True if successful
   */
  ShareMenu.prototype.copyToClipboard = async function(text) {
    if (!this.anchorBtn) return false;

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error('Copy command failed');
        }
      }

      // Show visual feedback on anchor button
      const originalTitle = this.anchorBtn.getAttribute('title');
      const originalAriaLabel = this.anchorBtn.getAttribute('aria-label');

      this.anchorBtn.setAttribute('title', this.ui.copied);
      if (originalAriaLabel) {
        this.anchorBtn.setAttribute('aria-label', this.ui.copied);
      }
      this.anchorBtn.classList.add('copied');

      setTimeout(() => {
        if (this.anchorBtn) {
          this.anchorBtn.setAttribute('title', originalTitle);
          if (originalAriaLabel) {
            this.anchorBtn.setAttribute('aria-label', originalAriaLabel);
          }
          this.anchorBtn.classList.remove('copied');
        }
      }, 2000);

      return true;
    } catch (err) {
      console.error('Copy failed:', err);
      if (this.anchorBtn) {
        this.anchorBtn.setAttribute('title', this.ui.copyFailed);
      }
      return false;
    }
  };

  /**
   * Setup handlers to close the menu
   */
  ShareMenu.prototype.setupCloseHandlers = function() {
    // Close on click outside
    this.clickHandler = (e) => {
      if (this.menu && !this.menu.contains(e.target) && e.target !== this.anchorBtn) {
        this.hide();
      }
    };
    // Use setTimeout to avoid immediate triggering from the button click that opened the menu
    setTimeout(() => {
      document.addEventListener('click', this.clickHandler);
    }, 0);

    // Close on Escape key
    this.escHandler = (e) => {
      if (e.key === 'Escape' && this.menu) {
        this.hide();
      }
    };
    document.addEventListener('keydown', this.escHandler);
  };

  /**
   * Setup keyboard navigation (arrow keys, Enter, Space)
   */
  ShareMenu.prototype.setupKeyboardNavigation = function() {
    if (!this.menu) return;

    this.keyHandler = (e) => {
      // Only handle navigation keys on menu items
      if (!e.target.hasAttribute('role') || e.target.getAttribute('role') !== 'menuitem') {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.focusNextItem();
          break;

        case 'ArrowUp':
          e.preventDefault();
          this.focusPreviousItem();
          break;

        case 'Home':
          e.preventDefault();
          this.focusFirstItem();
          break;

        case 'End':
          e.preventDefault();
          this.focusLastItem();
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          e.target.click();
          break;
      }
    };

    this.menu.addEventListener('keydown', this.keyHandler);
  };

  /**
   * Setup click handlers for menu actions
   */
  ShareMenu.prototype.setupMenuActions = function() {
    if (!this.menu) return;

    this.menu.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) {
        this.handleAction(action);
      }
    });
  };

  /**
   * Focus next menu item
   */
  ShareMenu.prototype.focusNextItem = function() {
    if (this.menuItems.length === 0) return;

    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.menuItems.length;
    this.menuItems[this.currentFocusIndex].focus();
  };

  /**
   * Focus previous menu item
   */
  ShareMenu.prototype.focusPreviousItem = function() {
    if (this.menuItems.length === 0) return;

    this.currentFocusIndex = (this.currentFocusIndex - 1 + this.menuItems.length) % this.menuItems.length;
    this.menuItems[this.currentFocusIndex].focus();
  };

  /**
   * Focus first menu item
   */
  ShareMenu.prototype.focusFirstItem = function() {
    if (this.menuItems.length === 0) return;

    this.currentFocusIndex = 0;
    this.menuItems[0].focus();
  };

  /**
   * Focus last menu item
   */
  ShareMenu.prototype.focusLastItem = function() {
    if (this.menuItems.length === 0) return;

    this.currentFocusIndex = this.menuItems.length - 1;
    this.menuItems[this.currentFocusIndex].focus();
  };

  /**
   * Check if browser is online
   * @returns {boolean} True if online
   */
  ShareMenu.prototype.isOnline = function() {
    return navigator.onLine !== false;
  };

  /**
   * Set offline mode and optionally re-render menu
   * @param {boolean} offline - True to enable offline mode
   * @param {boolean} rerender - Whether to re-render the menu if open
   */
  ShareMenu.prototype.setOfflineMode = function(offline, rerender = false) {
    const wasOffline = this.offlineMode;
    this.offlineMode = offline;

    // Re-render menu if it's currently open and mode changed
    if (rerender && this.menu && wasOffline !== offline) {
      const currentAnchor = this.anchorBtn;
      this.hide();
      this.show(currentAnchor);
    }
  };

  /**
   * Setup network status listeners
   */
  ShareMenu.prototype.setupNetworkListeners = function() {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  };

  /**
   * Remove network status listeners
   */
  ShareMenu.prototype.removeNetworkListeners = function() {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  };

  /**
   * Handle network status changes
   * @param {boolean} online - True if coming online, false if going offline
   */
  ShareMenu.prototype.handleNetworkChange = function(online) {
    // Update offline mode
    this.setOfflineMode(!online, true);
  };

  // Export the constructor
  return ShareMenu;
})();
