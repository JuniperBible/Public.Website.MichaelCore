/**
 * Theme Toggle Module
 *
 * Handles theme switching functionality and updates the theme toggle button icons.
 * Manages localStorage persistence and responds to user clicks.
 */

'use strict';

// Module-level references (set after DOM ready)
let toggleBtn = null;
let lightIcon = null;
let darkIcon = null;

/**
 * Update icon visibility based on current theme
 */
function updateIcons() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const isDark = currentTheme === 'dark' ||
                 (!currentTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (lightIcon) lightIcon.style.display = isDark ? 'block' : 'none';
  if (darkIcon) darkIcon.style.display = isDark ? 'none' : 'block';
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const isDark = currentTheme === 'dark' ||
                 (!currentTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const newTheme = isDark ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  try {
    localStorage.setItem('theme', newTheme);
  } catch (e) {
    // localStorage unavailable (private browsing) - theme still applied to current page
  }
  updateIcons();
}

/**
 * Initialize the theme toggle module
 */
function init() {
  toggleBtn = document.getElementById('theme-toggle');
  lightIcon = document.getElementById('theme-icon-light');
  darkIcon = document.getElementById('theme-icon-dark');

  // Initialize icon state
  updateIcons();

  // Add toggle functionality
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);

    // Register cleanup to prevent memory leaks
    if (window.Michael && typeof window.Michael.addCleanup === 'function') {
      window.Michael.addCleanup(() => {
        if (toggleBtn) {
          toggleBtn.removeEventListener('click', toggleTheme);
        }
      });
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ES6 exports
export { toggleTheme, updateIcons };

// Backwards compatibility - attach to window.Michael namespace
if (typeof window !== 'undefined') {
  window.Michael = window.Michael || {};
  window.Michael.ThemeToggle = {
    toggle: toggleTheme,
    updateIcons
  };
}
