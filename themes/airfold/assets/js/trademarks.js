/**
 * Trademark Auto-Styling
 * Automatically identifies trademark names in page content and applies styling.
 * - In headings (h1-h6): adds ™ symbol only
 * - In body text: adds ™ symbol with trademark class (bold gold + purple outline)
 */
(function() {
  'use strict';

  // Trademark names to identify (loaded from inline script or hardcoded fallback)
  var trademarks = window.TRADEMARKS || [
    'Focus with Justin',
    'Side by Side Scripture',
    'Christian Canon Compared',
    'SSS',
    'CCC'
  ];

  // Elements to skip (don't process these)
  var skipTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'A'];
  var skipClasses = ['trademark', 'no-trademark'];

  // Check if element should be skipped
  function shouldSkip(el) {
    if (skipTags.indexOf(el.tagName) !== -1) return true;
    for (var i = 0; i < skipClasses.length; i++) {
      if (el.classList && el.classList.contains(skipClasses[i])) return true;
    }
    return false;
  }

  // Check if node is inside a heading
  function isInHeading(node) {
    var el = node.parentElement;
    while (el) {
      if (/^H[1-6]$/.test(el.tagName)) return true;
      el = el.parentElement;
    }
    return false;
  }

  // Build regex pattern for all trademarks
  function buildPattern() {
    // Sort by length descending so longer matches are found first
    var sorted = trademarks.slice().sort(function(a, b) {
      return b.length - a.length;
    });
    // Escape special regex chars and join with |
    var escaped = sorted.map(function(tm) {
      return tm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    // Match trademark names NOT already followed by ™
    return new RegExp('(' + escaped.join('|') + ')(?!™)', 'g');
  }

  // Process text nodes
  function processTextNode(textNode) {
    var text = textNode.nodeValue;
    var pattern = buildPattern();

    if (!pattern.test(text)) return;

    // Reset regex
    pattern.lastIndex = 0;

    var inHeading = isInHeading(textNode);
    var fragments = [];
    var lastIndex = 0;
    var match;

    while ((match = pattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        fragments.push(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      // Create styled element for trademark
      if (inHeading) {
        // Headings: just add ™ symbol
        fragments.push(document.createTextNode(match[1] + '™'));
      } else {
        // Body text: wrap in span with trademark class
        var span = document.createElement('span');
        span.className = 'trademark';
        span.textContent = match[1] + '™';
        fragments.push(span);
      }

      lastIndex = pattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      fragments.push(document.createTextNode(text.slice(lastIndex)));
    }

    // Replace text node with fragments
    if (fragments.length > 0) {
      var parent = textNode.parentNode;
      fragments.forEach(function(frag) {
        parent.insertBefore(frag, textNode);
      });
      parent.removeChild(textNode);
    }
  }

  // Walk DOM tree and process text nodes
  function walkTree(root) {
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (shouldSkip(node.parentElement)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    // Collect nodes first (can't modify while walking)
    var textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    // Process each text node
    textNodes.forEach(processTextNode);
  }

  // Run after DOM is ready
  function init() {
    var main = document.getElementById('main-content');
    if (main) {
      walkTree(main);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
