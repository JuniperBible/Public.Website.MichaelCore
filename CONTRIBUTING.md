# Contributing to Focus with Justin

Thank you for your interest in contributing! This document provides guidelines for contributing to this Hugo-based website.

## Development Setup

```bash
# Enter development environment (requires Nix)
nix-shell

# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

See [CLAUDE.md](./CLAUDE.md) for complete documentation of the project architecture.

**Key directories:**
- `content/` - Markdown content (blog posts, projects)
- `data/` - JSON data files (certifications, skills, tools, bibles)
- `themes/airfold/` - Theme with layouts, partials, CSS
- `i18n/` - UI strings for internationalization
- `tools/` - Development tools (juniper)

## Making Changes

### Content Changes

**Blog posts:** Create in `content/esoterica/`
```bash
hugo new esoterica/my-post.md
```

**Projects:** Create in `content/projects/`
```bash
hugo new projects/my-project.md
```

**Data-driven content:** Edit JSON files in `data/`:
- Certifications: `data/certifications.json` + `data/certifications_auxiliary.json`
- Skills: `data/skills.json` + `data/skills_auxiliary.json`
- Tools: `data/tools.json` + `data/tools_auxiliary.json`

### UI String Changes

Edit `i18n/en.toml` for all user-facing text. Use the `{{ i18n "key" }}` function in templates.

### Theme Changes

1. Prefer editing existing files over creating new ones
2. Test changes with `npm run dev`
3. Verify build with `npm run build`

## Pull Request Guidelines

### Before Submitting

1. Run `npm run build` to verify the site builds without errors
2. Test on mobile viewports (the site uses responsive design)
3. Check accessibility (keyboard navigation, screen reader compatibility)

### PR Title Format

Use conventional commit format:
- `ADD: New feature description`
- `FIX: Bug description`
- `UPDATE: Changed feature description`
- `DOCS: Documentation changes`
- `REFACTOR: Code improvement without behavior change`

### PR Description

Include:
- **Summary:** What changes and why
- **Test plan:** How you verified the changes work

Example:
```markdown
## Summary
- Add dark mode toggle to settings page
- Store preference in localStorage

## Test plan
- [x] Toggle switches between light/dark
- [x] Preference persists across page loads
- [x] Works on mobile
```

## Code Style

### HTML/Hugo Templates

- Use Hugo's i18n for all user-facing text: `{{ i18n "key" | default "Fallback" }}`
- Prefer partials for reusable components
- Use semantic HTML elements

### CSS

- Use Tailwind utility classes
- Follow existing patterns in `themes/airfold/assets/css/main.css`
- Test dark mode if applicable

### JavaScript

- Vanilla JS preferred (no frameworks)
- Self-host all dependencies (no CDN)
- Progressive enhancement (site works without JS)

## Testing

### Local Testing

```bash
npm run dev        # Start dev server at localhost:1313
npm run build      # Build production site
```

### SWORD Converter (if modifying Bible tools)

```bash
cd tools/juniper
go test ./...       # Run all tests
go build ./...      # Build converter
```

## Questions?

Open an issue for questions about contributing.
