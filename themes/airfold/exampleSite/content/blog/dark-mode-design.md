---
title: Designing for Dark Mode
description: Best practices for implementing dark mode in your website
date: 2024-01-10
tags: [design, css, accessibility]
---

Dark mode has become an essential feature for modern websites. Here's how AirFold handles it.

## System Preference Detection

AirFold automatically detects your system's color scheme preference:

```javascript
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark');
}
```

## CSS Variables

The theme uses CSS variables for all colors, making dark mode a simple class toggle:

```css
:root {
  --color-paper-white: #f8f8f8;
  --color-paper-black: #1a1a1a;
}

html.dark {
  --color-paper-white: #1a1a1a;
  --color-paper-black: #f0f0f0;
}
```

## User Preference Persistence

User choices are stored in localStorage to persist across sessions:

```javascript
localStorage.setItem('darkMode', 'true');
```

## Accessibility Considerations

- Maintain sufficient contrast ratios in both modes
- Test with color blindness simulators
- Ensure focus states are visible in both themes
