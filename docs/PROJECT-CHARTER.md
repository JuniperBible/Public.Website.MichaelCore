# Michael - Project Charter

## 1. Vision & Purpose

### Mission Statement
A plug-and-play Hugo module for Bible reading and comparison functionality, providing feature-rich Scripture study tools that can be easily integrated into any Hugo site.

### Problem Being Solved
- Bible functionality is tightly coupled to the parent website
- No reusable Hugo module exists for comprehensive Bible study
- Scripture comparison tools require significant custom development
- Text diff highlighting between translations is complex to implement

### Target Users/Audience
- **Hugo site developers**: Need drop-in Bible reading functionality
- **Church websites**: Want to display Scripture with modern features
- **Bible study platforms**: Need comparison and search capabilities
- **Educational sites**: Require accessible Scripture presentation

## 2. Scope

### In-Scope Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Translation Browsing** | Complete | List and navigate Bible translations |
| **Chapter Reading** | Complete | Book/chapter navigation with verse display |
| **Translation Comparison** | Complete | Up to 11 translations side-by-side (SSS mode) |
| **Full-Text Search** | Complete | Text, phrase, and Strong's number search |
| **Strong's Tooltips** | Complete | Clickable tooltips linking to lexicon |
| **Verse Sharing** | Complete | URL, clipboard, social media sharing |
| **Canonical Comparison** | Complete | Compare book status across traditions |
| **Text Diff Highlighting** | Complete | Word-level difference visualization |
| **JavaScript Assets** | In Progress | Extracting from parent site |
| **i18n Support** | Pending | UI strings for multiple languages |

### Out-of-Scope Items
- Bible data generation (handled by Juniper)
- Audio/video playback
- User accounts and annotations storage
- Server-side search
- Non-Bible content types

### Dependencies

| Component | Purpose | Status |
|-----------|---------|--------|
| Hugo 0.120+ | Static site generator | Required |
| Tailwind CSS | Styling framework | Required |
| Juniper | Bible data generation | Optional (data can be provided separately) |
| Blue Letter Bible | Strong's definitions | External service |

## 3. Current Status

### Phase/Milestone
**In Progress** - Extraction from parent site (~60% complete)

### Completed Components

| Component | Description |
|-----------|-------------|
| Repository setup | Git submodule, go.mod |
| Layouts (4) | list, single, compare, search |
| Partials (2) | bible-nav, canonical-comparison |
| README | Installation and configuration |

### Pending Components

| Component | Lines | Description |
|-----------|-------|-------------|
| parallel.js | 1220 | Comparison view controller |
| share.js | 400 | Sharing functionality |
| strongs.js | 248 | Strong's number processing |
| text-compare.js | 665 | Text diff engine |
| bible-search.js | 370 | Client-side search |
| Content templates | - | Page generation |
| i18n strings | ~50 | UI text |

## 4. Roadmap

### Phase: JavaScript Extraction (Current)
- [ ] Extract parallel.js - Comparison view
- [ ] Extract share.js - Verse sharing
- [ ] Extract strongs.js - Strong's tooltips
- [ ] Extract text-compare.js - Diff highlighting
- [ ] Extract bible-search.js - Search functionality
- [ ] Update paths for module configuration

### Phase: Content & i18n
- [ ] Create _content.gotmpl page generator
- [ ] Create content mount points (_index.md, compare.md, search.md)
- [ ] Extract Bible i18n strings
- [ ] Add Spanish, French, German, Italian support

### Phase: Documentation & Examples
- [ ] Create installation.md
- [ ] Create configuration.md
- [ ] Create data-format.md
- [ ] Create customization.md
- [ ] Add example data files
- [ ] Add JSON schemas

### Phase: Testing & Validation
- [ ] Test import in clean Hugo site
- [ ] Verify all layouts render
- [ ] Test JavaScript functionality
- [ ] Verify i18n fallbacks
- [ ] Test with minimal data

## 5. Success Criteria

### Feature Parity

| Metric | Target |
|--------|--------|
| Layouts working | 4/4 |
| JS features working | 5/5 |
| i18n strings | 100% coverage |
| Parent site equivalence | Functional parity |

### Quality Metrics

| Metric | Target |
|--------|--------|
| Clean import | Works first try |
| Configuration docs | Complete |
| Data schema | Validated |
| Mobile support | Full responsive |

### Performance Goals

| Metric | Target |
|--------|--------|
| Chapter load time | < 500ms |
| Search response | < 100ms |
| Comparison render | < 200ms (4 translations) |

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Path hardcoding | High | Abstract to configuration variables |
| CSS class dependencies | Medium | Document required classes, provide defaults |
| Data format changes | Medium | Versioned JSON schemas |
| JavaScript complexity | Low | Well-documented API |
| Blue Letter Bible availability | Low | Graceful degradation |

## 7. Stakeholders

### Owner/Maintainer
- **Justin Williams** - Primary developer

### Consumers
- Focus with Justin website (first consumer)
- External Hugo sites (potential)

### External Dependencies
- Blue Letter Bible (Strong's definitions)
- Juniper (data generation)

## 8. Related Documentation

### Internal Documentation
| Document | Purpose |
|----------|---------|
| [README.md](../README.md) | Installation and overview |
| [TODO.txt](../TODO.txt) | Detailed task tracking |
| [THIRD-PARTY-LICENSES.md](../THIRD-PARTY-LICENSES.md) | Attribution |

### Parent Project
- [Focus with Justin Project Charter](../../../docs/project-charter.md)
- [STEPBible Interface Charter](../../../docs/stepbible-interface-charter.md)

### Related Submodules
- [Juniper Project Charter](../../juniper/docs/PROJECT-CHARTER.md)

## 9. Architecture

### Module Structure
```
michael/
├── layouts/
│   └── michael/
│       ├── bibles/
│       │   ├── list.html    # Translation list
│       │   └── single.html  # Book/chapter pages
│       ├── compare.html     # Side-by-side comparison
│       └── search.html      # Search interface
│
├── layouts/partials/
│   └── michael/
│       ├── bible-nav.html   # Navigation dropdowns
│       └── canonical-comparison.html
│
├── assets/js/               # JavaScript modules
│   ├── parallel.js          # Comparison view
│   ├── share.js             # Sharing features
│   ├── strongs.js           # Strong's tooltips
│   ├── text-compare.js      # Diff highlighting
│   └── bible-search.js      # Search engine
│
├── content/bibles/          # Content templates
│   ├── _content.gotmpl      # Page generator
│   ├── _index.md            # Section root
│   ├── compare.md           # Compare page
│   └── search.md            # Search page
│
├── i18n/                    # UI strings
│
└── static/schemas/          # JSON validation
```

### Data Flow
```
data/bibles.json          → Metadata
data/bibles_auxiliary/*.json → Verse content
                    ↓
            [_content.gotmpl]
                    ↓
        Hugo Generated Pages
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
   Static HTML              JavaScript
   (list, single)       (search, compare)
```

### JavaScript Components
| Module | Purpose | Dependencies |
|--------|---------|--------------|
| parallel.js | Comparison view | text-compare.js |
| share.js | Verse sharing | None |
| strongs.js | Lexicon tooltips | None |
| text-compare.js | Diff algorithm | None |
| bible-search.js | Search engine | None |

---

**Charter Created:** 2026-01-01
**Last Updated:** 2026-01-01
**Next Review:** After JavaScript extraction complete
