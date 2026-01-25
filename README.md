# Michael — Hugo Bible Extension

Plug-and-play Hugo module that adds Bible reading functionality (reading, navigation, compare, search, Strong's) to any Hugo site — and can also run as a standalone, offline-capable site.

## Features

- **Bible Reading** — Single chapter view with verse navigation
- **Parallel Comparison** — Compare multiple translations side-by-side
- **SSS Mode** — Side-by-Side Scripture for detailed comparison
- **Strong's Concordance** — Inline Hebrew/Greek definitions with tooltips
- **Full-Text Search** — Search across all loaded translations
- **Offline Support** — Service worker caching for offline reading
- **Accessibility** — WCAG 2.1 AA compliant with keyboard navigation
- **Internationalization** — 43 language translations included
- **Zero Dependencies** — Pure JavaScript, no external runtime dependencies

## Quick Start

### As Hugo Module

```toml
# hugo.toml
[module]
  [[module.imports]]
    path = "github.com/FocuswithJustin/michael"
```

```bash
hugo mod init github.com/yourusername/yoursite
hugo mod get -u
```

### Standalone

```bash
git clone https://github.com/FocuswithJustin/michael.git
cd michael
make dev
```

## Documentation

**Full documentation:** [`docs/README.md`](docs/README.md)

### Getting Started

| Document | Description |
|----------|-------------|
| [HUGO-MODULE-USAGE.md](docs/HUGO-MODULE-USAGE.md) | Installation and configuration guide |
| [DATA-FORMATS.md](docs/DATA-FORMATS.md) | JSON schemas and data requirements |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System overview and component design |

### Technical Documentation

| Document | Description |
|----------|-------------|
| [TESTING.md](docs/TESTING.md) | Regression testing with Magellan E2E |
| [SERVICE-WORKER.md](docs/SERVICE-WORKER.md) | Offline caching strategy |
| [SECURITY.md](docs/SECURITY.md) | Security model documentation |
| [CSP.md](docs/CSP.md) | Content Security Policy guide |
| [ACCESSIBILITY.md](docs/ACCESSIBILITY.md) | WCAG 2.1 AA conformance |

### Reference

| Document | Description |
|----------|-------------|
| [VERSIFICATION.md](docs/VERSIFICATION.md) | Bible canon differences |
| [THIRD-PARTY-LICENSES.md](docs/THIRD-PARTY-LICENSES.md) | License tracking |
| [SBOM/](docs/SBOM/) | Software Bill of Materials |
| [CHANGELOG.md](docs/CHANGELOG.md) | Version history |

## Development

### Branch Structure

| Branch | Purpose | Submodules Track |
|--------|---------|------------------|
| `main` | Production releases | main |
| `development` | Active development | development |
| `attic` | Historical archives | — |

### Commands

```bash
make dev              # Start Hugo development server
make build            # Build static site
make check            # Run all quality checks
make push             # Push after checks (main requires 'RELEASE' confirmation)
make sync-submodules  # Sync submodules to match current branch
```

### Testing

```bash
make test             # Run all regression tests
make test-compare     # Compare page tests
make test-search      # Search page tests
make test-single      # Single chapter tests
make test-offline     # Offline/PWA tests
make test-mobile      # Mobile touch tests
make test-keyboard    # Keyboard navigation tests
```

## Project Status

| Metric | Status |
|--------|--------|
| Code Cleanup Charter | ✅ 100% Complete |
| WCAG 2.1 AA | ✅ 0 Violations |
| Regression Tests | ✅ 15 Tests |
| Documentation | ✅ 14 Files |
| External Dependencies | ✅ Zero |

## Build Checks

<!-- AUTO-GENERATED: Do not edit manually. Run `make check` to update. -->

| Check | Status | Description |
|-------|--------|-------------|
| Hugo Build | ✅ Pass | Site builds without errors |
| SBOM Generation | ✅ Pass | SBOM files generated successfully |
| JuniperBible Tests | ✅ Pass | 100+ tests passing |
| Regression Tests | ✅ Pass | 15 E2E tests passing |
| Clean Worktree | ✅ Pass | No uncommitted changes |

<!-- END AUTO-GENERATED -->

*Last verified: 2026-01-25*

## License

See: [`LICENSE`](LICENSE)
