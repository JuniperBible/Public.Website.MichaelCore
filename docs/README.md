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

## Technical Documentation

- **[SERVICE-WORKER.md](SERVICE-WORKER.md)** - Offline capabilities and caching strategy
- **[PHASE-0-BASELINE-INVENTORY.md](PHASE-0-BASELINE-INVENTORY.md)** - Initial codebase inventory and CSP audit
- **[THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md)** - Third-party license tracking
- **[ZERO-DEPENDENCIES-VERIFICATION.md](ZERO-DEPENDENCIES-VERIFICATION.md)** - External dependency audit

## Project Management

- **[TODO.txt](TODO.txt)** - Task tracking with phases and completion status
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes

## Documentation Status

**Last updated:** 2026-01-25

### Available Documentation (12 files)

All core documentation is complete:
- ✅ Architecture and system design
- ✅ Data formats and schemas
- ✅ Hugo module usage guide
- ✅ Versification guide
- ✅ Service worker documentation
- ✅ Code cleanup charter
- ✅ Task tracking (TODO.txt)
- ✅ Changelog
- ✅ Baseline inventory
- ✅ Third-party licenses
- ✅ Zero dependencies verification
- ✅ This index (README.md)

### Planned Documentation

The following specialized documents are referenced in the main README but not yet created:
- ⏳ `SECURITY.md` - Security model and hardening notes
- ⏳ `CSP.md` - Content Security Policy guidance
- ⏳ `ACCESSIBILITY.md` - WCAG conformance notes
- ⏳ `SBOM/` - Software Bill of Materials directory

These documents will be created as needed based on user requirements and project maturity.

## Quick Reference

| Topic | File |
|-------|------|
| Installation | [HUGO-MODULE-USAGE.md](HUGO-MODULE-USAGE.md) |
| Data structure | [DATA-FORMATS.md](DATA-FORMATS.md) |
| System architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Bible canon differences | [VERSIFICATION.md](VERSIFICATION.md) |
| Offline features | [SERVICE-WORKER.md](SERVICE-WORKER.md) |
| Development tasks | [TODO.txt](TODO.txt) |
| Release history | [CHANGELOG.md](CHANGELOG.md) |
| Code cleanup plan | [CODE_CLEANUP_CHARTER.md](CODE_CLEANUP_CHARTER.md) |
| License tracking | [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) |

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
