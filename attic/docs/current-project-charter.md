# Current Project Charter: SWORD/e-Sword to Hugo Converter

## Project Overview

**Project Name:** SWORD Bible Module to Hugo Converter
**Start Date:** 2025-12-29
**Status:** Phase 7 Complete - Multi-Tradition Canonical Comparison

### Vision

Create a comprehensive Go-based tool and Hugo extension that transforms SWORD and e-Sword Bible modules into Hugo-compatible markdown content, making religious texts accessible at `/religion/*` on the Focus with Justin website.

### Objectives

1. **Primary Goal:** Convert 647+ SWORD Bible modules from `~/.sword` to Hugo-compatible JSON/markdown
2. **Secondary Goal:** Support e-Sword format (.bblx, .cmtx, .dctx) for broader compatibility
3. **Quality Goal:** Validate pure Go parser against CGo libsword bindings for accuracy
4. **Integration Goal:** Seamlessly integrate with existing AirFold theme data-driven architecture

## Scope

### In Scope

- SWORD module parsing (zText, zCom, zLD, rawGenBook formats)
- e-Sword SQLite database parsing
- Markup conversion (OSIS, ThML, GBF, TEI → Markdown)
- Hugo extension with layouts for Bible, Commentary, Dictionary display
- Strong's number integration and tooltips
- Configurable page granularity (book, chapter, verse)
- Migration tool for periodic sync from ~/.sword
- CGo test suite for parser validation

### Out of Scope (Future Phases)

- Full-text search functionality
- User annotations/bookmarks
- Audio Bible integration
- Mobile-specific layouts
- Translation comparison matrix

## Architecture

```
~/.sword/                     → sword_data/incoming/
                              → sword_data/*.json
                              → content/religion/*
                              → /religion/* (website)
```

### Components

1. **Go CLI Tool** (`tools/sword-converter/`)
   - `migrate` command: Copy modules from ~/.sword
   - `convert` command: Parse and generate Hugo JSON
   - `watch` command: Development mode with auto-rebuild
   - `test` command: Validate against CGo reference

2. **Hugo Extension** (`themes/airfold/extensions/religion/`)
   - `_content.gotmpl` templates for page generation
   - Layouts for bibles, commentaries, dictionaries
   - Partials for navigation, verse display, Strong's popups

3. **Test Suite**
   - Pure Go unit tests
   - CGo comparison tests (requires libsword)
   - Integration tests with sample modules

## Success Criteria

| Metric | Target |
|--------|--------|
| Module types supported | All 4 (Bible, Commentary, Dictionary, GenBook) |
| Markup formats | All 4 (OSIS, ThML, GBF, TEI) |
| Pure Go vs CGo accuracy | 99%+ match |
| Test coverage | >80% on parsers |
| Single Bible conversion | <10 seconds |
| Hugo build (10 Bibles) | <30 seconds |

## Implementation Phases

### Phase 1: Foundation ✓ Complete
- [x] Go module structure (go.mod, config.yaml, pkg/ directories)
- [x] .conf file parser (pkg/sword/conf.go)
- [x] Versification mappings (pkg/sword/versification.go - 66 books)
- [x] Migration package (pkg/migrate/migrator.go)
- [x] CLI with cobra (cmd/sword-converter/main.go)
  - Commands: migrate, convert, list, watch, test
  - Config loading (pkg/config/config.go)
  - Full help text and examples

### Phase 2: SWORD Parsing ✓ Complete
- [x] zText parser (pkg/sword/ztext.go)
  - Parses .bzs, .bzv, .bzz files
  - zlib decompression
  - Implements Parser interface
- [x] OSIS → Markdown converter (pkg/markup/osis.go)
  - Strong's numbers, red-letter, divine names
  - Unit tests passing
- [x] Test with KJV module

### Phase 3: Hugo Integration ✓ Complete
- [x] Extension directory structure
  - themes/airfold/extensions/religion/
  - content/bibles/, layouts/bibles/
- [x] JSON generator (pkg/output/json.go)
  - bibles.json, bibles_auxiliary.json
- [x] _content.gotmpl templates
  - Generates Bible, book, chapter pages
- [x] Layouts (list.html, single.html)
- [x] Convert command implementation

### Phase 4: Additional Parsers ✓ Complete
- [x] Commentary parser (pkg/sword/zcom.go)
- [x] Dictionary parser (pkg/sword/zld.go)
- [x] ThML converter (pkg/markup/thml.go)
- [x] GBF converter (pkg/markup/gbf.go)
- [x] TEI converter (pkg/markup/tei.go)
- [x] Unit tests for all converters

### Phase 5: e-Sword Support ✓ Complete
- [x] SQLite Bible parser (pkg/esword/bible.go)
- [x] Commentary parser (pkg/esword/commentary.go)
- [x] Dictionary parser (pkg/esword/dictionary.go)
- [x] Added go-sqlite3 dependency

### Phase 6: CGo Test Suite ✓ Complete
- [x] libsword CGo bindings (pkg/cgo/libsword.go)
      - Build with: go build -tags libsword
      - Stub for non-CGo builds (pkg/cgo/stub.go)
- [x] Test framework (pkg/testing/)
      - Text comparison with similarity scoring
      - Golden file testing
      - Test runner with benchmarks
- [x] Test fixtures (pkg/testing/testdata/fixtures.go)
      - OSIS, ThML, GBF, TEI converter fixtures
      - Edge case and Unicode fixtures
- [x] Unit and integration tests
      - 57+ tests across packages
      - Fixture tests for all converters
      - Benchmark tests for performance
- [x] npm script integration
      - npm run test:sword - run all tests
      - npm run sword:build - compile binary
      - npm run sword:migrate/convert - CLI commands

### Phase 7: Features & Polish ✓ Complete
- [x] Strong's tooltips (assets/js/strongs.js)
- [x] Parallel translation view (/religion/bibles/compare/)
- [x] npm script integration
- [x] Multi-tradition canonical comparison (14 traditions, 198 texts)
      - Roman Catholic, Eastern Orthodox, Protestant, Evangelical
      - Ethiopian Orthodox, Latter-day Saints, Anglican, Jehovah's Witnesses
      - Coptic Orthodox, Armenian Apostolic, Syriac Orthodox, Assyrian
      - Samaritan (Torah only), Orthodox Jewish
- [x] LDS scriptures (Book of Mormon, D&C, Pearl of Great Price)
- [x] Armenian distinctives (3 Corinthians)
- [x] Canon Summary table with book counts per tradition

### Phase 8: Documentation ✓ Complete
- [x] sword-converter README
- [x] CLAUDE.md updates
- [x] JSON schemas

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | Go | Performance, CGo support for testing, single binary distribution |
| CLI framework | Cobra | Industry standard, good subcommand support |
| Config format | YAML | Human-readable, consistent with Hugo |
| Data format | JSON | Matches existing certifications/skills pattern |
| Page generation | _content.gotmpl | Proven pattern in AirFold theme |

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SWORD format undocumented | High | Medium | Use CGo bindings as reference, extensive testing |
| Large data volume (647 modules) | Medium | High | Selective module conversion, caching |
| e-Sword format changes | Low | Low | Focus on SWORD first, e-Sword is optional |

## Dependencies

- Go 1.22+
- libsword (for CGo testing only)
- SQLite3 (for e-Sword)
- Hugo 0.128.0+

## Team

- **Developer:** Claude Code (AI assistant)
- **Reviewer:** Justin (project owner)

## Documentation

| Document | Location |
|----------|----------|
| Project Charter | `docs/current-project-charter.md` |
| Implementation Plan | `~/.claude/plans/tingly-dancing-key.md` |
| TODO Tracking | `TODO.txt` |
| Tool README | `tools/sword-converter/README.md` |
| Theme Extension | `themes/airfold/extensions/religion/README.md` |

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-29 | Initial charter created | Claude |
| 2025-12-29 | Phase 1 foundation started | Claude |
| 2025-12-29 | Phase 1 complete - CLI, migration, conf parser, versification all implemented | Claude |
| 2025-12-29 | Phase 2 complete - zText parser, OSIS→Markdown converter, unit tests | Claude |
| 2025-12-29 | Phase 3 complete - Hugo extension, JSON generator, layouts, convert command | Claude |
| 2025-12-29 | Phase 4 complete - zCom, zLD parsers; ThML, GBF, TEI converters; unit tests | Claude |
| 2025-12-29 | Phase 5 complete - e-Sword Bible, Commentary, Dictionary parsers | Claude |
| 2025-12-29 | Phase 6 complete - CGo bindings, test framework, fixtures, integration tests, npm scripts | Claude |
| 2025-12-30 | Phase 7 complete - Strong's tooltips, parallel view, canonical comparison | Claude |
| 2025-12-30 | Added 14 traditions with 198 texts to canonical comparison table | Claude |
| 2025-12-30 | Phase 8 complete - Documentation updates | Claude |
| 2025-12-30 | Added Bible search functionality (Phase 2 STEPBible) | Claude |
| 2025-12-30 | Added social media share links (Twitter/X, Facebook) for verses | Claude |
| 2025-12-30 | Fixed parallel translation view JSON encoding and data access | Claude |
| 2025-12-30 | Split bibles_auxiliary.json into per-Bible files for better workflow | Claude |
| 2025-12-30 | Added comprehensive Python vs Go tool comparison suite (12 tests) | Claude |
| 2025-12-30 | Improved pkg/output test coverage from 36.2% to 55.2% | Claude |
| 2025-12-30 | Improved pkg/sword test coverage from 20.8% to 89.8% | Claude |
| 2025-12-30 | Added comprehensive binary parser tests (zText, zCom, zLD) with synthetic data | Claude |
| 2025-12-30 | Improved pkg/migrate test coverage from 80.3% to 92.4% | Claude |
| 2025-12-30 | Improved pkg/output test coverage from 55.2% to 86.2% | Claude |
| 2025-12-30 | Created attic/baseline/tools/ with original Python extraction scripts | Claude |
| 2025-12-30 | Consolidated extension layouts - removed 11 duplicate files, layouts now in main theme | Claude |
| 2025-12-30 | Added tiered test infrastructure plan (quick/comprehensive/extensive) | Claude |
| 2025-12-30 | Updated README with test coverage table and baseline tools documentation | Claude |
| 2025-12-30 | Implemented RawGenBook parser for general books (Quran, 1 Enoch, creeds) | Claude |
| 2025-12-30 | Added integration tests for Enoch (112 entries) and Jubilees (52 entries) | Claude |
| 2025-12-30 | Added Quran integration test (115 surahs, 1.3 MB content) | Claude |
| 2025-12-30 | Fixed zLD parser for binary .idx format (8-byte entries: offset+size) | Claude |
| 2025-12-30 | Fixed zCom parser for NT-only modules (uses CalculateNTVerseIndex) | Claude |
| 2025-12-30 | Added 22 integration tests with real SWORD modules | Claude |
| 2025-12-30 | Added justfile with tiered test commands (test-quick, test-comprehensive, test-extensive) | Claude |
| 2025-12-30 | Added bible_sets.yaml and pkg/testing/tiers.go for tiered test configuration | Claude |
| 2025-12-30 | Verified benchmarks working: KJV GetVerse ~614ns/op, GetAllBooks ~53ms | Claude |
| 2025-12-30 | Test Infrastructure Plan Phases 1-4 complete (justfile, bible_sets, tiers, benchmarks) | Claude |
| 2025-12-30 | Fixed test timeout in tool_comparison_test.go (RUN_EXTRACTOR_TESTS env var) | Claude |
| 2025-12-30 | Added homepage carousel with autoplay, swipe, and keyboard navigation | Claude |
