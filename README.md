# Focus with Justin

Personal website built with Hugo and Tailwind CSS, deployed on Cloudflare Pages.

## Features

- **Dark Mode** - Light/dark theme with preference saved to localStorage
- **Homepage Carousel** - Configurable navigation (arrows, dots, peek mode, theatre mode, auto-advance)
- **Resume Page** - Dynamic resume with linked skills, tools, and certifications
- **Contact Form** - Serverless email via Cloudflare Workers with PGP encryption and CAPTCHA
- **Religion Section** - Multi-tradition Bible comparison with 8 translations and 14 canonical traditions
- **Compare Translations** - Side-by-side verse comparison (up to 4 translations)
- **Bible Search** - Full-text search with Strong's number (H####/G####) and phrase search support
- **Verse Sharing** - Share verses via URL, clipboard, Twitter/X, and Facebook
- **Trademark System** - Auto-detected and styled trademarks site-wide
- **SEO Optimized** - Open Graph, Twitter Cards, JSON-LD structured data

## Quick Start

```bash
nix-shell                              # Enter dev environment
npm install                            # Install dependencies (first time only)
npm run dev                            # Start dev server at localhost:1313
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Hugo + Tailwind in watch mode |
| `npm run build` | Build for production |
| `npm run test:sword` | Run SWORD converter tests |
| `npm run test:security` | Run contact form security tests |

### Bible Management (via just)

| Command | Description |
|---------|-------------|
| `just bible-list` | List installed SWORD modules |
| `just bible-download <mod>` | Download a module |
| `just bible-verify` | Verify module integrity |
| `just bible-add <mod>` | Download + convert to Hugo JSON |

## Project Structure

```
.
├── content/              # Markdown content (blog, projects)
├── data/                 # JSON data files (resume, bibles)
├── docs/                 # Full documentation
├── functions/            # Cloudflare Pages Functions
├── themes/airfold/       # AirFold theme
├── tools/juniper/# Go tool for Bible extraction
└── workers/              # Cloudflare Workers
```

## Documentation

See [docs/README.md](docs/README.md) for comprehensive documentation:

- [Development Guide](docs/development.md) - Setup, workflows, troubleshooting
- [Architecture Guide](docs/architecture.md) - System overview, data patterns
- [Configuration Reference](docs/configuration.md) - hugo.toml, environment variables
- [Deployment Guide](docs/deployment.md) - Cloudflare Pages, workers
- [Contact Form Guide](docs/contact-form.md) - CAPTCHA, email, security
- [Religion Section Guide](docs/religion-section.md) - Bible features, SWORD converter
- [Testing Guide](docs/testing.md) - Test strategy, coverage

## Adding Content

```bash
hugo new esoterica/my-post.md     # New blog post
hugo new projects/my-project.md   # New project
```

For certifications, skills, and tools, edit the JSON files in `data/`.

## Deployment

The site deploys automatically via Cloudflare Pages on push to main.

See [Deployment Guide](docs/deployment.md) for setup instructions.

## License

All rights reserved.
