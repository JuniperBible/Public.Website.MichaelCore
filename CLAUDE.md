# Focus with Justin - AI Context

Personal website built with Hugo and the AirFold theme.

## Development Process

**All features must be documented and tested.** Follow this process for every change:

```
1. Document Behavior  →  Describe what the feature should do in docs/
2. Write Tests        →  Create tests that verify the documented behavior
3. Write Code         →  Implement the feature to pass the tests
4. Test               →  Run all tests to confirm nothing broke
```

This ensures:
- Clear requirements before implementation
- Testable, maintainable code
- Regression prevention
- Living documentation

## Quick Commands

```bash
nix-shell                              # Enter dev environment
npm run dev                            # Start dev server (localhost:1313)
npm run build                          # Build for production
npm run test:sword                     # Run SWORD converter tests
npm run test:security                  # Run security tests
```

## Key Files

| File | Purpose | Documentation |
|------|---------|---------------|
| `hugo.toml` | Central configuration | [docs/configuration.md](docs/configuration.md) |
| `data/*.json` | Content data | [docs/architecture.md](docs/architecture.md#data-driven-content) |
| `i18n/en.toml` | UI text strings | [docs/configuration.md](docs/configuration.md#internationalization) |
| `functions/api/contact.js` | Contact form handler | [docs/contact-form.md](docs/contact-form.md) |
| `workers/email-sender/` | Email worker | [docs/deployment.md](docs/deployment.md#workers) |
| `tools/juniper/` | Bible extraction | [docs/religion-section.md](docs/religion-section.md) |

## Documentation

All comprehensive documentation is in `docs/`:

| Document | Contents |
|----------|----------|
| [docs/README.md](docs/README.md) | Documentation index and quick reference |
| [docs/architecture.md](docs/architecture.md) | System architecture, data-driven patterns, theme structure |
| [docs/development.md](docs/development.md) | Setup, commands, workflows, troubleshooting |
| [docs/configuration.md](docs/configuration.md) | Complete hugo.toml reference, environment variables |
| [docs/deployment.md](docs/deployment.md) | Cloudflare Pages, workers, service bindings |
| [docs/religion-section.md](docs/religion-section.md) | Bible features, SWORD converter, versification |
| [docs/contact-form.md](docs/contact-form.md) | CAPTCHA providers, email security, PGP encryption |
| [docs/testing.md](docs/testing.md) | Test strategy, coverage goals, running tests |
| [docs/data_structures.md](docs/data_structures.md) | SWORD binary format documentation |

## Project Tracking

| Resource | Purpose |
|----------|---------|
| `TODO.txt` | Current tasks and backlog |
| [docs/stepbible-interface-charter.md](docs/stepbible-interface-charter.md) | Bible UI roadmap (10 phases, 3 complete) |
| `attic/docs/` | Archived completed charters |

## Content Types

| Content | Location | Docs |
|---------|----------|------|
| Blog posts | `content/esoterica/` | [docs/development.md](docs/development.md#content-management) |
| Projects | `content/projects/` | [docs/development.md](docs/development.md#content-management) |
| Certifications | `data/certifications*.json` | [docs/architecture.md](docs/architecture.md#data-driven-content) |
| Skills | `data/skills*.json` | [docs/architecture.md](docs/architecture.md#data-driven-content) |
| Tools | `data/tools*.json` | [docs/architecture.md](docs/architecture.md#data-driven-content) |
| Bibles | `data/bibles*.json` | [docs/religion-section.md](docs/religion-section.md) |

## Testing Requirements

Before committing any feature:

```bash
# Build must succeed
npm run build

# SWORD tests must pass (if touching Bible/religion code)
npm run test:sword

# Security tests must pass (if touching contact form)
npm run test:security:local
```

See [docs/testing.md](docs/testing.md) for comprehensive test documentation.
