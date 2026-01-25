# Michael Documentation Index

Complete documentation for the Michael Hugo Bible Module.

## Getting Started

- **[Main README](../README.md)** - Project overview, features, and installation
- **[HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md)** - How to use as Hugo module or standalone site
- **[DATA-FORMATS.md](DATA-FORMATS.md)** - JSON schemas and data requirements

## Architecture & Design

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System overview, data flow, component relationships
- **[VERSIFICATION.md](VERSIFICATION.md)** - Bible versification systems and canon differences
- **[CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md)** - Code cleanup objectives and execution plan

## Testing

- **[TESTING.md](TESTING.md)** - Regression testing with Magellan E2E framework

## Technical Documentation

- **[SERVICE-WORKER.md](SERVICE-WORKER.md)** - Offline capabilities and caching strategy
- **[SECURITY.md](SECURITY.md)** - Comprehensive security model documentation
- **[CSP.md](CSP.md)** - Content Security Policy implementation and guidance
- **[ACCESSIBILITY.md](ACCESSIBILITY.md)** - WCAG 2.1 AA conformance and accessibility features
- **[ACCESSIBILITY-AUDIT-2026-01-25.md](ACCESSIBILITY-AUDIT-2026-01-25.md)** - WCAG 2.1 AA compliance audit
- **[PHASE-0-BASELINE-INVENTORY.md](PHASE-0-BASELINE-INVENTORY.md)** - Initial codebase inventory and CSP audit
- **[THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md)** - Third-party license tracking
- **[ZERO-DEPENDENCIES-VERIFICATION.md](ZERO-DEPENDENCIES-VERIFICATION.md)** - External dependency audit
- **[SBOM Documentation](SBOM/)** - Software Bill of Materials (components, dependencies, generation)
- **[SBOM Files](../assets/downloads/sbom/)** - Generated SBOM files (SPDX, CycloneDX, Syft)

## Project Management

- **[TODO.txt](TODO.txt)** - Task tracking with phases and completion status
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes

## Documentation Status

**Last updated:** 2026-01-25

### Available Documentation (21 files)

All core documentation is complete:
- ✅ Architecture and system design
- ✅ Data formats and schemas
- ✅ Hugo module usage guide
- ✅ Versification guide
- ✅ Service worker documentation
- ✅ Security model documentation
- ✅ Content Security Policy guide
- ✅ Accessibility documentation (WCAG 2.1 AA conformance)
- ✅ Accessibility audit (WCAG 2.1 AA)
- ✅ Code cleanup charter
- ✅ Task tracking (TODO.txt)
- ✅ Changelog
- ✅ Baseline inventory
- ✅ Third-party licenses
- ✅ Zero dependencies verification
- ✅ SBOM documentation (README, components, dependencies)
- ✅ SBOM generation (4 formats)
- ✅ Regression testing (Magellan E2E)
- ✅ This index (README.md)

### Recently Added Documentation

- ✅ `TESTING.md` - Regression testing with Magellan E2E framework (15 tests)
- ✅ `SECURITY.md` - Comprehensive security model documentation
- ✅ `ACCESSIBILITY.md` - WCAG 2.1 AA conformance and accessibility features
- ✅ `CSP.md` - Content Security Policy implementation guide (37 innerHTML usages audited)
- ✅ `ACCESSIBILITY-AUDIT-2026-01-25.md` - WCAG 2.1 AA compliance audit (0 violations)
- ✅ `SBOM/` - Software Bill of Materials documentation (README, components, dependencies)
- ✅ `assets/downloads/sbom/` - Generated SBOM files (SPDX, CycloneDX, Syft formats)

## Quick Reference

| Topic | File |
|-------|------|
| Installation | [HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md) |
| Data structure | [DATA-FORMATS.md](DATA-FORMATS.md) |
| System architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Bible canon differences | [VERSIFICATION.md](VERSIFICATION.md) |
| Offline features | [SERVICE-WORKER.md](SERVICE-WORKER.md) |
| Security model | [SECURITY.md](SECURITY.md) |
| Content Security Policy | [CSP.md](CSP.md) |
| Accessibility guide | [ACCESSIBILITY.md](ACCESSIBILITY.md) |
| Accessibility audit | [ACCESSIBILITY-AUDIT-2026-01-25.md](ACCESSIBILITY-AUDIT-2026-01-25.md) |
| Regression testing | [TESTING.md](TESTING.md) |
| Development tasks | [TODO.txt](TODO.txt) |
| Release history | [CHANGELOG.md](CHANGELOG.md) |
| Code cleanup plan | [CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md) |
| License tracking | [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) |
| SBOM documentation | [SBOM/](SBOM/) |
| SBOM files | [assets/downloads/sbom/](../assets/downloads/sbom/) |

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
