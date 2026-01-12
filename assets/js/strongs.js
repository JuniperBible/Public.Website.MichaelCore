/**
 * Strong's Number Tooltip Handler
 *
 * Detects Strong's numbers in Bible text and provides tooltips with definitions.
 * Strong's numbers appear as H#### (Hebrew) or G#### (Greek).
 */
(function() {
  'use strict';

  // Strong's dictionary URLs (Blue Letter Bible has excellent Strong's definitions)
  const STRONGS_URLS = {
    hebrew: 'https://www.blueletterbible.org/lexicon/h',
    greek: 'https://www.blueletterbible.org/lexicon/g'
  };

  // Cache for fetched definitions
  const definitionCache = new Map();

  // Create tooltip element
  let tooltip = null;

  function createTooltip() {
    if (tooltip) return tooltip;

    tooltip = document.createElement('div');
    tooltip.className = 'strongs-tooltip';
    tooltip.innerHTML = `
      <h4 class="strongs-number"></h4>
      <p class="strongs-definition"></p>
      <a class="strongs-link" href="#" target="_blank" rel="noopener">View Full Entry</a>
    `;
    document.body.appendChild(tooltip);

    // Close tooltip when clicking outside
    document.addEventListener('click', (e) => {
      if (!tooltip.contains(e.target) && !e.target.classList.contains('strongs-ref')) {
        hideTooltip();
      }
    });

    return tooltip;
  }

  function showTooltip(element, number, type) {
    const tip = createTooltip();
    const rect = element.getBoundingClientRect();

    // Position tooltip
    let top = rect.bottom + 8;
    let left = rect.left;

    // Adjust if would go off screen
    if (left + 300 > window.innerWidth) {
      left = window.innerWidth - 310;
    }
    if (top + 200 > window.innerHeight) {
      top = rect.top - 200;
    }

    tip.style.top = top + 'px';
    tip.style.left = Math.max(10, left) + 'px';
    tip.style.display = 'block';

    // Update header
    const typeName = type === 'H' ? 'Hebrew' : 'Greek';
    tip.querySelector('.strongs-number').textContent = `${typeName} ${number}`;

    const baseUrl = type === 'H' ? STRONGS_URLS.hebrew : STRONGS_URLS.greek;
    tip.querySelector('.strongs-link').href = `${baseUrl}${number}/kjv/`;

    // Load definition
    loadDefinition(number, type, tip);
  }

  function hideTooltip() {
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  async function loadDefinition(number, type, tip) {
    const cacheKey = `${type}${number}`;

    if (definitionCache.has(cacheKey)) {
      showDefinition(tip, definitionCache.get(cacheKey));
      return;
    }

    // For now, show a placeholder with the Strong's number info
    // Full API integration would require a backend or CORS-friendly API
    const typeName = type === 'H' ? 'Hebrew' : 'Greek';
    const definition = {
      number: `${type}${number}`,
      type: typeName,
      note: `Click "View Full Entry" for the complete ${typeName} definition from Strong's Concordance.`
    };

    definitionCache.set(cacheKey, definition);
    showDefinition(tip, definition);
  }

  function showDefinition(tip, def) {
    const defEl = tip.querySelector('.strongs-definition');
    defEl.textContent = def.note;
  }

  function processStrongsNumbers() {
    // Find all Bible text containers
    const bibleTexts = document.querySelectorAll('.bible-text');

    bibleTexts.forEach(container => {
      // Skip if already processed
      if (container.dataset.strongsProcessed) return;
      container.dataset.strongsProcessed = 'true';

      // Find Strong's number patterns in text nodes
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const nodesToProcess = [];
      let node;
      while (node = walker.nextNode()) {
        if (/[HG]\d{1,5}/g.test(node.textContent)) {
          nodesToProcess.push(node);
        }
      }

      // Process nodes (replace Strong's numbers with clickable spans)
      nodesToProcess.forEach(textNode => {
        const text = textNode.textContent;
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        // Match Strong's numbers: H1234 or G5678
        const regex = /([HG])(\d{1,5})/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
          // Add text before match
          if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
          }

          // Create clickable span for Strong's number
          const span = document.createElement('span');
          span.className = 'strongs-ref';
          span.dataset.strongsType = match[1];
          span.dataset.strongsNumber = match[2];
          span.textContent = match[0];
          span.setAttribute('role', 'button');
          span.setAttribute('aria-label', `Strong's ${match[1] === 'H' ? 'Hebrew' : 'Greek'} ${match[2]}`);
          span.setAttribute('tabindex', '0');

          fragment.appendChild(span);
          lastIndex = regex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        // Replace original text node
        if (nodesToProcess.length > 0) {
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      });
    });

    // Add event listeners to Strong's references
    document.querySelectorAll('.strongs-ref').forEach(el => {
      if (el.dataset.strongsListenerAdded) return;
      el.dataset.strongsListenerAdded = 'true';

      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showTooltip(el, el.dataset.strongsNumber, el.dataset.strongsType);
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showTooltip(el, el.dataset.strongsNumber, el.dataset.strongsType);
        }
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processStrongsNumbers);
  } else {
    processStrongsNumbers();
  }

  // Also process after any dynamic content loads
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        processStrongsNumbers();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
