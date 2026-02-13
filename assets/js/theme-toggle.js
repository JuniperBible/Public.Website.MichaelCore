/**
 * Theme Toggle Module
 *
 * Handles theme switching functionality and updates the theme toggle button icons.
 * Manages localStorage persistence and responds to user clicks.
 */

'use strict';

(function() {
  const toggleBtn = document.getElementById('theme-toggle');
  const lightIcon = document.getElementById('theme-icon-light');
  const darkIcon = document.getElementById('theme-icon-dark');

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

  // Initialize icon state
  updateIcons();

  // Add toggle functionality
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const isDark = currentTheme === 'dark' ||
                     (!currentTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const newTheme = isDark ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateIcons();
    });
  }
})();
