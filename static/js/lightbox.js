/**
 * Lightbox Component for Tables, Charts, and Graphs
 *
 * Auto-wraps tables and Mermaid diagrams with enlargeable containers.
 * Provides zoom, rotation, and touch gesture support.
 *
 * Use .no-lightbox class to disable for specific elements.
 */
(function() {
  'use strict';

  // Configuration
  var ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  var DEFAULT_ZOOM_INDEX = 3; // 1x

  // State
  var overlay = null;
  var inner = null;
  var currentZoomIndex = DEFAULT_ZOOM_INDEX;
  var currentRotation = 0;
  var sourceElement = null;
  var hammerInstance = null;
  var toolbarHint = null;
  var zoomInBtn = null;
  var zoomOutBtn = null;
  var rotateCcwBtn = null;
  var rotateCwBtn = null;

  // SVG Icons (for lightbox toolbar)
  var ICONS = {
    rotateCcw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    rotateCw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>',
    zoomOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    zoomIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
  };

  /**
   * Create the lightbox overlay DOM structure (lazy)
   */
  function createLightbox() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Enlarged content viewer');

    // Toolbar
    var toolbar = document.createElement('div');
    toolbar.className = 'lightbox-toolbar';

    // Auto-rotation hint
    toolbarHint = document.createElement('span');
    toolbarHint.className = 'lightbox-toolbar-hint';
    toolbarHint.textContent = 'Tip: Rotate for better fit';
    toolbar.appendChild(toolbarHint);

    // Rotate CCW button
    rotateCcwBtn = createButton(ICONS.rotateCcw, 'Rotate counter-clockwise (Shift+R)', function() {
      rotate(-90);
    });
    rotateCcwBtn.id = 'lightbox-rotate-ccw-btn';
    toolbar.appendChild(rotateCcwBtn);

    // Rotate CW button
    rotateCwBtn = createButton(ICONS.rotateCw, 'Rotate clockwise (R)', function() {
      rotate(90);
    });
    rotateCwBtn.id = 'lightbox-rotate-cw-btn';
    toolbar.appendChild(rotateCwBtn);

    // Zoom out button
    zoomOutBtn = createButton(ICONS.zoomOut, 'Zoom out (-)', function() {
      setZoom(currentZoomIndex - 1);
    });
    toolbar.appendChild(zoomOutBtn);

    // Zoom in button
    zoomInBtn = createButton(ICONS.zoomIn, 'Zoom in (+)', function() {
      setZoom(currentZoomIndex + 1);
    });
    toolbar.appendChild(zoomInBtn);

    // Close button
    var closeBtn = createButton(ICONS.close, 'Close (Escape)', closeLightbox);
    toolbar.appendChild(closeBtn);

    overlay.appendChild(toolbar);

    // Content container
    var content = document.createElement('div');
    content.className = 'lightbox-content';
    content.addEventListener('click', function(e) {
      if (e.target === content) {
        closeLightbox();
      }
    });

    inner = document.createElement('div');
    inner.className = 'lightbox-inner';
    content.appendChild(inner);
    overlay.appendChild(content);

    document.body.appendChild(overlay);

    // Keyboard handling
    overlay.addEventListener('keydown', handleKeydown);
  }

  /**
   * Create a toolbar button
   */
  function createButton(iconSvg, label, onClick) {
    var btn = document.createElement('button');
    btn.className = 'lightbox-btn';
    btn.innerHTML = iconSvg;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.addEventListener('click', onClick);
    return btn;
  }

  /**
   * Handle keyboard events in lightbox
   */
  function handleKeydown(e) {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeLightbox();
        break;
      case '+':
      case '=':
        e.preventDefault();
        setZoom(currentZoomIndex + 1);
        break;
      case '-':
        e.preventDefault();
        setZoom(currentZoomIndex - 1);
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        rotate(e.shiftKey ? -90 : 90);
        break;
      case 'Tab':
        // Focus trap within toolbar
        trapFocus(e);
        break;
    }
  }

  /**
   * Trap focus within lightbox toolbar
   */
  function trapFocus(e) {
    var focusable = overlay.querySelectorAll('button:not([disabled])');
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /**
   * Set zoom level by index
   */
  function setZoom(index) {
    if (index < 0 || index >= ZOOM_LEVELS.length) return;
    currentZoomIndex = index;
    inner.style.setProperty('--lb-scale', ZOOM_LEVELS[index]);
    updateZoomButtons();
  }

  /**
   * Update zoom button disabled states
   */
  function updateZoomButtons() {
    if (zoomOutBtn) {
      zoomOutBtn.disabled = currentZoomIndex <= 0;
    }
    if (zoomInBtn) {
      zoomInBtn.disabled = currentZoomIndex >= ZOOM_LEVELS.length - 1;
    }
  }

  /**
   * Rotate content by degrees
   */
  function rotate(degrees) {
    currentRotation = (currentRotation + degrees) % 360;
    inner.style.setProperty('--lb-rotate', currentRotation + 'deg');
  }

  /**
   * Check if content aspect ratio suggests rotation would help
   */
  function shouldSuggestRotation(element) {
    var rect = element.getBoundingClientRect();
    var contentRatio = rect.width / rect.height;
    var viewportRatio = window.innerWidth / window.innerHeight;

    // If content is wide (ratio > 1.5) and viewport is portrait (ratio < 1)
    // Or content is tall and viewport is landscape
    return (contentRatio > 1.5 && viewportRatio < 1) ||
           (contentRatio < 0.67 && viewportRatio > 1);
  }

  /**
   * Open lightbox with cloned content
   */
  function openLightbox(element) {
    createLightbox();

    sourceElement = element;
    currentZoomIndex = DEFAULT_ZOOM_INDEX;
    currentRotation = 0;

    // Clone the content (table, mermaid, svg, img, or figure)
    var content = element.querySelector('table, .mermaid, svg, img, figure');
    if (!content) {
      content = element.cloneNode(true);
      // Remove the hints from clone
      var hints = content.querySelectorAll('.enlargeable-hint');
      hints.forEach(function(h) { h.remove(); });
    } else {
      content = content.cloneNode(true);
    }

    inner.innerHTML = '';
    inner.appendChild(content);
    inner.style.setProperty('--lb-scale', 1);
    inner.style.setProperty('--lb-rotate', '0deg');

    // Check if rotation would help
    if (shouldSuggestRotation(element)) {
      toolbarHint.classList.add('visible');
    } else {
      toolbarHint.classList.remove('visible');
    }

    updateZoomButtons();

    // Show overlay
    overlay.classList.add('active');
    document.body.classList.add('lightbox-open');

    // Focus first button
    var firstBtn = overlay.querySelector('.lightbox-btn');
    if (firstBtn) firstBtn.focus();

    // Initialize touch gestures if Hammer.js is available
    initTouchGestures();
  }

  /**
   * Close lightbox and return focus
   */
  function closeLightbox() {
    if (!overlay) return;

    overlay.classList.remove('active');
    document.body.classList.remove('lightbox-open');
    toolbarHint.classList.remove('visible');

    // Destroy Hammer instance
    if (hammerInstance) {
      hammerInstance.destroy();
      hammerInstance = null;
    }

    // Return focus to source
    if (sourceElement) {
      sourceElement.focus();
      sourceElement = null;
    }
  }

  /**
   * Initialize Hammer.js touch gestures if available
   */
  function initTouchGestures() {
    if (typeof Hammer === 'undefined' || !inner) return;

    hammerInstance = new Hammer(inner);

    // Enable pinch and rotate
    hammerInstance.get('pinch').set({ enable: true });
    hammerInstance.get('rotate').set({ enable: true });

    var startScale = 1;
    var startRotation = 0;

    hammerInstance.on('pinchstart rotatestart', function() {
      startScale = ZOOM_LEVELS[currentZoomIndex];
      startRotation = currentRotation;
    });

    hammerInstance.on('pinchmove', function(e) {
      var newScale = startScale * e.scale;
      // Clamp to min/max zoom
      newScale = Math.max(ZOOM_LEVELS[0], Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1], newScale));
      inner.style.setProperty('--lb-scale', newScale);
    });

    hammerInstance.on('pinchend', function(e) {
      // Snap to nearest zoom level
      var finalScale = startScale * e.scale;
      var closest = 0;
      var minDiff = Math.abs(ZOOM_LEVELS[0] - finalScale);
      for (var i = 1; i < ZOOM_LEVELS.length; i++) {
        var diff = Math.abs(ZOOM_LEVELS[i] - finalScale);
        if (diff < minDiff) {
          minDiff = diff;
          closest = i;
        }
      }
      setZoom(closest);
    });

    hammerInstance.on('rotatemove', function(e) {
      var newRotation = startRotation + e.rotation;
      inner.style.setProperty('--lb-rotate', newRotation + 'deg');
    });

    hammerInstance.on('rotateend', function(e) {
      // Snap to nearest 90 degrees
      var finalRotation = startRotation + e.rotation;
      currentRotation = Math.round(finalRotation / 90) * 90;
      inner.style.setProperty('--lb-rotate', currentRotation + 'deg');
    });
  }

  /**
   * Check if element content overflows its container
   */
  function detectOverflow(element) {
    return element.scrollWidth > element.clientWidth ||
           element.scrollHeight > element.clientHeight;
  }

  /**
   * Create hint elements for all four sides
   */
  function createHints() {
    var positions = ['top', 'bottom', 'left', 'right'];
    var hints = [];

    positions.forEach(function(pos) {
      var hint = document.createElement('div');
      hint.className = 'enlargeable-hint enlargeable-hint-' + pos;
      hint.innerHTML = '<svg class="enlargeable-hint-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><polygon points="12,2 22,20 2,20" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="14" r="5" stroke-width="2"/><circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none"/></svg>';
      hints.push(hint);
    });

    return hints;
  }

  /**
   * Wrap enlargeable content with container and hint
   */
  function wrapContent(element) {
    // Skip if already wrapped, has no-lightbox class, or is inside a no-lightbox container
    if (element.closest('.enlargeable') || element.classList.contains('no-lightbox') || element.closest('.no-lightbox')) {
      return;
    }

    // Create wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'enlargeable';
    wrapper.setAttribute('role', 'button');
    wrapper.setAttribute('tabindex', '0');
    wrapper.setAttribute('aria-label', 'Click to enlarge');

    // Create hints for all four sides
    var hints = createHints();

    // Wrap element
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    hints.forEach(function(hint) {
      wrapper.appendChild(hint);
    });

    // Check for overflow on mobile
    if (window.innerWidth < 768 && detectOverflow(element)) {
      wrapper.classList.add('enlargeable-overflow');
    }

    // Click handler - only on hint icons, not on table links
    hints.forEach(function(hint) {
      hint.addEventListener('click', function(e) {
        if (!wrapper.classList.contains('no-lightbox')) {
          e.preventDefault();
          e.stopPropagation();
          openLightbox(wrapper);
        }
      });
    });

    // Keyboard handler
    wrapper.addEventListener('keydown', function(e) {
      if ((e.key === 'Enter' || e.key === ' ') && !wrapper.classList.contains('no-lightbox')) {
        e.preventDefault();
        openLightbox(wrapper);
      }
    });
  }

  /**
   * Initialize: wrap all tables, images, mermaid diagrams, and charts
   */
  function init() {
    // Wrap tables in .prose
    var tables = document.querySelectorAll('.prose table');
    tables.forEach(wrapContent);

    // Wrap images in .prose (but not small icons or logos)
    var images = document.querySelectorAll('.prose img');
    images.forEach(function(img) {
      // Skip small images (icons, logos) - must be at least 150px wide
      if (img.naturalWidth < 150 && img.width < 150) return;
      // Skip images that are already in a link
      if (img.closest('a')) return;
      wrapContent(img);
    });

    // Wrap figure elements (which may contain images or charts)
    var figures = document.querySelectorAll('.prose figure');
    figures.forEach(wrapContent);

    // Wrap Mermaid diagrams
    var mermaids = document.querySelectorAll('.mermaid');
    mermaids.forEach(function(el) {
      // Mermaid might be the pre or the rendered svg container
      wrapContent(el);
    });

    // Wrap standalone SVG charts/graphs in .prose
    var svgs = document.querySelectorAll('.prose > svg, .prose .chart, .prose .graph');
    svgs.forEach(wrapContent);

    // Wire up header control panel
    initHeaderControlPanel();

    // Re-check overflow on resize
    var resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        var wrappers = document.querySelectorAll('.enlargeable');
        wrappers.forEach(function(wrapper) {
          var content = wrapper.querySelector('table, .mermaid, svg, img, figure');
          if (content && window.innerWidth < 768 && detectOverflow(content)) {
            wrapper.classList.add('enlargeable-overflow');
          } else {
            wrapper.classList.remove('enlargeable-overflow');
          }
        });
      }, 250);
    });
  }

  /**
   * Initialize the header control panel (theme toggle, print)
   */
  function initHeaderControlPanel() {
    var controlPanelBtn = document.getElementById('control-panel-btn');
    var controlPanel = document.getElementById('control-panel');
    var themeBtn = document.getElementById('header-theme-btn');
    var panelThemeBtn = document.getElementById('panel-theme-btn');
    var printBtn = document.getElementById('header-print-btn');

    if (!controlPanelBtn || !controlPanel) return;

    // Toggle control panel visibility
    // Using click event which works on both desktop and mobile (iOS synthesizes click from tap)
    controlPanelBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var isExpanded = controlPanel.classList.contains('flex');
      if (isExpanded) {
        controlPanel.classList.remove('flex');
        controlPanel.classList.add('hidden');
        controlPanelBtn.setAttribute('aria-expanded', 'false');
      } else {
        controlPanel.classList.remove('hidden');
        controlPanel.classList.add('flex');
        controlPanelBtn.setAttribute('aria-expanded', 'true');
      }
    });

    // Theme toggle function
    function toggleTheme(e) {
      e.preventDefault();
      e.stopPropagation();
      var html = document.documentElement;
      if (html.classList.contains('dark')) {
        localStorage.setItem('theme', 'light');
      } else {
        localStorage.setItem('theme', 'dark');
      }
      // Reload page to force external resources (Cloudflare, etc.) to reload
      window.location.reload();
    }

    // Theme toggle (header button under logo)
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }

    // Theme toggle (control panel button)
    if (panelThemeBtn) {
      panelThemeBtn.addEventListener('click', toggleTheme);
    }

    // Print button
    if (printBtn) {
      printBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.print();
      });
    }

    // Close control panel when clicking/tapping outside
    document.addEventListener('click', function(e) {
      if (!controlPanel.classList.contains('hidden') &&
          !controlPanel.contains(e.target) &&
          !controlPanelBtn.contains(e.target)) {
        controlPanel.classList.remove('flex');
        controlPanel.classList.add('hidden');
        controlPanelBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
