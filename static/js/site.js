// Site JavaScript - Mobile menu and theme toggle
(function() {
  'use strict';

  // Mobile menu toggle with focus trap
  var mobileMenuBtn = document.getElementById('mobile-menu-btn');
  var mobileMenu = document.getElementById('mobile-menu');
  var lastFocusedElement = null;

  // Cache focusable elements (only queried once when menu opens)
  var focusableElements = null;

  function openMobileMenu() {
    lastFocusedElement = document.activeElement;
    mobileMenu.classList.remove('hidden');
    mobileMenuBtn.setAttribute('aria-expanded', 'true');
    // Cache focusable elements on first open
    if (!focusableElements) {
      focusableElements = mobileMenu.querySelectorAll('a, button');
    }
  }

  function closeMobileMenu() {
    mobileMenu.classList.add('hidden');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      if (mobileMenu.classList.contains('hidden')) {
        openMobileMenu();
      } else {
        closeMobileMenu();
      }
    });

    // Close on Escape key (passive: false needed for potential preventDefault)
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
        closeMobileMenu();
      }
    }, { passive: true });

    // Focus trap (uses cached focusableElements)
    mobileMenu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !focusableElements || !focusableElements.length) return;
      var firstElement = focusableElements[0];
      var lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    });
  }

  // Theme toggle functionality
  var themeToggle = document.getElementById('theme-toggle');
  var iconLight = document.getElementById('theme-icon-light');
  var iconDark = document.getElementById('theme-icon-dark');
  var html = document.documentElement;

  function updateThemeIcons(isDark) {
    if (iconLight) iconLight.classList.toggle('hidden', !isDark);
    if (iconDark) iconDark.classList.toggle('hidden', isDark);
  }

  // Initial icon state
  updateThemeIcons(html.classList.contains('dark'));

  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      var isDark = html.classList.toggle('dark');
      // Update icons immediately for visual feedback
      updateThemeIcons(isDark);
      // Defer localStorage write to avoid blocking interaction
      requestAnimationFrame(function() {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });
    });
  }
})();
