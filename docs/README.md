# Michael Documentation Index

Complete documentation for the Michael Hugo Bible Module.

**Last updated:** 2026-01-25

---

## Quick Links

| I want to... | Read this |
|--------------|-----------|
| Install Michael | [HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md) |
| Understand the architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Run the tests | [TESTING.md](TESTING.md) |
| Learn about offline support | [SERVICE-WORKER.md](SERVICE-WORKER.md) |
| Check security practices | [SECURITY.md](SECURITY.md) |
| Verify accessibility | [ACCESSIBILITY.md](ACCESSIBILITY.md) |

---

## Getting Started

- **[Main README](../README.md)** - Project overview, features, and quick start
- **[HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md)** - Installation as Hugo module or standalone
- **[DATA-FORMATS.md](DATA-FORMATS.md)** - JSON schemas and data requirements

## Architecture & Design

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System overview, data flow, component relationships
- **[VERSIFICATION.md](VERSIFICATION.md)** - Bible versification systems and canon differences

## Testing

- **[TESTING.md](TESTING.md)** - Regression testing with Magellan E2E framework (15 tests)

## Security & Accessibility

- **[SECURITY.md](SECURITY.md)** - Comprehensive security model documentation
- **[CSP.md](CSP.md)** - Content Security Policy implementation guide
- **[ACCESSIBILITY.md](ACCESSIBILITY.md)** - WCAG 2.1 AA conformance and features

## Technical Documentation

- **[SERVICE-WORKER.md](SERVICE-WORKER.md)** - Offline capabilities and caching strategy
- **[THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md)** - Third-party license tracking
- **[ZERO-DEPENDENCIES-VERIFICATION.md](ZERO-DEPENDENCIES-VERIFICATION.md)** - External dependency audit
- **[SBOM Documentation](SBOM/)** - Software Bill of Materials
- **[SBOM Files](../assets/downloads/sbom/)** - Generated SBOM files (SPDX, CycloneDX, Syft)

## Project Management

- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes

---

## Documentation Status

### Project Metrics

| Metric | Value |
|--------|-------|
| Documentation Files | 14 |
| Regression Tests | 15 |
| JuniperBible Tests | 100+ passing |
| WCAG Violations | 0 |
| External Dependencies | 0 |
| Code Cleanup | 100% Complete |
| Phases Complete | 9/9 |

### All Documentation Complete

| Category | Documents | Status |
|----------|-----------|--------|
| Getting Started | 3 | ✅ Complete |
| Architecture | 2 | ✅ Complete |
| Testing | 1 | ✅ Complete |
| Security | 2 | ✅ Complete |
| Accessibility | 1 | ✅ Complete |
| Technical | 4 | ✅ Complete |
| Project Management | 1 | ✅ Complete |
| SBOM | 4 formats | ✅ Complete |

---

## Full Document List

| Document | Lines | Description |
|----------|-------|-------------|
| [README.md](README.md) | ~100 | This documentation index |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 300+ | System design and component structure |
| [HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md) | 280+ | Installation and configuration |
| [DATA-FORMATS.md](DATA-FORMATS.md) | 180+ | JSON schemas and data requirements |
| [VERSIFICATION.md](VERSIFICATION.md) | 130+ | Bible canon and versification |
| [TESTING.md](TESTING.md) | 300+ | Regression testing with Magellan |
| [SERVICE-WORKER.md](SERVICE-WORKER.md) | 240+ | Offline caching strategy |
| [SECURITY.md](SECURITY.md) | 500+ | Security model documentation |
| [CSP.md](CSP.md) | 800+ | Content Security Policy guide |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | 600+ | WCAG 2.1 AA conformance |
| [CHANGELOG.md](CHANGELOG.md) | 250+ | Version history |
| [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) | 280+ | License tracking |
| [ZERO-DEPENDENCIES-VERIFICATION.md](ZERO-DEPENDENCIES-VERIFICATION.md) | 280+ | Dependency audit |
| [SBOM/README.md](SBOM/README.md) | 100+ | SBOM documentation |

---

## Archive

Historical documentation from the code cleanup project (completed 2026-01-25):

| Document | Description |
|----------|-------------|
| [archive/CODE_CLEANUP_CHARTER.md](archive/CODE_CLEANUP_CHARTER.md) | Original cleanup plan and objectives |
| [archive/TODO.txt](archive/TODO.txt) | Task tracking for all 9 phases |
| [archive/PHASE-0-BASELINE-INVENTORY.md](archive/PHASE-0-BASELINE-INVENTORY.md) | Initial codebase inventory |

---

## Contributing

When adding new documentation:
1. Add entry to this index (README.md)
2. Update relevant cross-references in other docs
3. Add entry to CHANGELOG.md under [Unreleased]
4. Verify all internal links work

## Documentation Standards

- Use Markdown format (.md)
- Include table of contents for documents > 100 lines
- Use relative links for internal references
- Add "Last updated" date at top of each document
- Follow Keep a Changelog format for CHANGELOG.md
- Use GitHub-flavored Markdown tables
