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
- **[CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md)** - Code cleanup objectives (100% complete)

## Testing

- **[TESTING.md](TESTING.md)** - Regression testing with Magellan E2E framework (15 tests)

## Security & Accessibility

- **[SECURITY.md](SECURITY.md)** - Comprehensive security model documentation
- **[CSP.md](CSP.md)** - Content Security Policy implementation guide
- **[ACCESSIBILITY.md](ACCESSIBILITY.md)** - WCAG 2.1 AA conformance and features
- **[ACCESSIBILITY-AUDIT-2026-01-25.md](ACCESSIBILITY-AUDIT-2026-01-25.md)** - Full WCAG 2.1 AA audit (0 violations)

## Technical Documentation

- **[SERVICE-WORKER.md](SERVICE-WORKER.md)** - Offline capabilities and caching strategy
- **[PHASE-0-BASELINE-INVENTORY.md](PHASE-0-BASELINE-INVENTORY.md)** - Initial codebase inventory
- **[THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md)** - Third-party license tracking
- **[ZERO-DEPENDENCIES-VERIFICATION.md](ZERO-DEPENDENCIES-VERIFICATION.md)** - External dependency audit
- **[SBOM Documentation](SBOM/)** - Software Bill of Materials
- **[SBOM Files](../assets/downloads/sbom/)** - Generated SBOM files (SPDX, CycloneDX, Syft)

## Project Management

- **[TODO.txt](TODO.txt)** - Task tracking with phases and completion status
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes

---

## Documentation Status

### Project Metrics

| Metric | Value |
|--------|-------|
| Documentation Files | 21 |
| Regression Tests | 15 |
| JuniperBible Tests | 100+ passing |
| WCAG Violations | 0 |
| External Dependencies | 0 |
| Code Cleanup Charter | 100% Complete |
| Phases Complete | 8/8 |

### All Documentation Complete

| Category | Documents | Status |
|----------|-----------|--------|
| Getting Started | 3 | ✅ Complete |
| Architecture | 3 | ✅ Complete |
| Testing | 1 | ✅ Complete |
| Security | 2 | ✅ Complete |
| Accessibility | 2 | ✅ Complete |
| Technical | 6 | ✅ Complete |
| Project Management | 2 | ✅ Complete |
| SBOM | 4 formats | ✅ Complete |

---

## Full Document List

| Document | Lines | Description |
|----------|-------|-------------|
| [README.md](README.md) | ~120 | This documentation index |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 300+ | System design and component structure |
| [HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md) | 280+ | Installation and configuration |
| [DATA-FORMATS.md](DATA-FORMATS.md) | 180+ | JSON schemas and data requirements |
| [VERSIFICATION.md](VERSIFICATION.md) | 130+ | Bible canon and versification |
| [TESTING.md](TESTING.md) | 300+ | Regression testing with Magellan |
| [SERVICE-WORKER.md](SERVICE-WORKER.md) | 240+ | Offline caching strategy |
| [SECURITY.md](SECURITY.md) | 500+ | Security model documentation |
| [CSP.md](CSP.md) | 800+ | Content Security Policy guide |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | 600+ | WCAG 2.1 AA conformance |
| [ACCESSIBILITY-AUDIT-2026-01-25.md](ACCESSIBILITY-AUDIT-2026-01-25.md) | 170+ | Full WCAG audit report |
| [CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md) | 400+ | Cleanup plan (complete) |
| [TODO.txt](TODO.txt) | 590+ | Task tracking (all phases complete) |
| [CHANGELOG.md](CHANGELOG.md) | 220+ | Version history |
| [PHASE-0-BASELINE-INVENTORY.md](PHASE-0-BASELINE-INVENTORY.md) | 700+ | Codebase inventory |
| [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) | 280+ | License tracking |
| [ZERO-DEPENDENCIES-VERIFICATION.md](ZERO-DEPENDENCIES-VERIFICATION.md) | 280+ | Dependency audit |
| [SBOM/README.md](SBOM/README.md) | 100+ | SBOM documentation |

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
