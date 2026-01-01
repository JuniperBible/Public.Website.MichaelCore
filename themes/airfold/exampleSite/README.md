# AirFold Example Site

This is a complete example site demonstrating all AirFold theme features and extensions.

## Running the Example

1. Navigate to this directory:
   ```bash
   cd themes/airfold/exampleSite
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:1313 in your browser.

## What's Included

This example demonstrates:

### Core Features
- Homepage with hero image and social links
- About page with social CTA
- Contact page with form
- Dark mode toggle
- Responsive navigation

### Extensions

All extensions are pre-installed in the `layouts/` directory:

- **Blog Extension**: Sample blog posts with tag cloud
- **Portfolio Extension**: Project showcase with filtering
- **Certifications Extension**: Professional credentials display
- **Resume Extension**: CV/resume page layout

### Content Structure

```
content/
├── _index.md           # Homepage
├── about.md            # About page
├── contact.md          # Contact page
├── resume.md           # Resume page
├── blog/               # Blog posts
│   ├── _index.md
│   └── *.md
├── projects/           # Portfolio projects
│   ├── _index.md
│   └── *.md
├── certifications/     # Professional certs
│   ├── _index.md
│   └── *.md
├── skills/             # Skills taxonomy
│   └── _index.md
└── tools/              # Tools showcase
    ├── _index.md
    └── *.md
```

## Customization

1. Edit `hugo.toml` for site settings
2. Edit `data/social.yaml` for social links
3. Modify content in `content/` directory
4. Override layouts by editing files in `layouts/`

## Building for Production

```bash
npm run build
```

Output will be in the `public/` directory.
