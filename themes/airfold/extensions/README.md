# AirFold Theme Extensions

This directory contains optional extension modules that can be copied to your site to add specific functionality. Each extension is self-contained and can be used independently.

## Available Extensions

### Resume (`resume/`)
Professional resume/CV page using JSON Resume schema with skills, certifications, experience, and education sections.

**Files:**
- `layouts/_default/resume.html` - Resume page layout (reads from `data/resume.json`)
- `archetypes/resume.md` - Content template

**Data:**
- Uses `data/resume.json` following [JSON Resume](https://jsonresume.org/schema) v1.0.0 specification

### Portfolio (`portfolio/`)
Project portfolio with filtering, images, and tag-based organization.

**Files:**
- `layouts/projects/list.html` - Project listing with tag filters
- `layouts/projects/single.html` - Individual project page
- `archetypes/project.md` - Content template

### Certifications (`certifications/`)
Professional certifications and skills display with data-driven content generation.

**Files:**
- `layouts/certifications/list.html` - Certification grid
- `layouts/certifications/single.html` - Individual certification page
- `layouts/skills/list.html` - Skills listing
- `layouts/skills/single.html` - Individual skill with related certs
- `content/certifications/_content.gotmpl` - Data-driven page generator
- `content/skills/_content.gotmpl` - Data-driven page generator
- `archetypes/certification.md` - Content template

**Data-Driven Mode:**
- `data/certifications.json` - Certification metadata
- `data/certifications_auxiliary.json` - Full certification content
- `data/skills.json` - Skills metadata
- `data/skills_auxiliary.json` - Full skills content

**URL Structure:** `/resume/certifications/`, `/resume/skills/`

### Tools (`tools/`)
Tools and technologies showcase with category grouping.

**Files:**
- `layouts/tools/list.html` - Tools listing grouped by category
- `layouts/tools/single.html` - Individual tool page
- `content/tools/_content.gotmpl` - Data-driven page generator
- `archetypes/tool.md` - Content template

**Data-Driven Mode:**
- `data/tools.json` - Tool metadata
- `data/tools_auxiliary.json` - Full tool content

**URL Structure:** `/resume/tools/`

### Blog (`blog/`)
Blog/article section with recent posts and tag cloud.

**Files:**
- `layouts/blog/list.html` - Blog listing with recent articles
- `layouts/blog/single.html` - Individual article with tag cloud
- `archetypes/post.md` - Content template

## Installation

1. Choose the extension(s) you need
2. Copy the extension's files to your site's root directory
3. For data-driven extensions, create the required JSON data files
4. Create content using the provided archetypes or content templates

Example:
```bash
# Install the certifications extension (data-driven)
cp -r themes/airfold/extensions/certifications/layouts/* layouts/
# Then create data/certifications.json and data/certifications_auxiliary.json
```

Mount content in `hugo.toml`:
```toml
[module]
  [[module.mounts]]
    source = 'themes/airfold/extensions/certifications/content/certifications'
    target = 'content/resume/certifications'
  [[module.mounts]]
    source = 'themes/airfold/extensions/certifications/content/skills'
    target = 'content/resume/skills'
  [[module.mounts]]
    source = 'themes/airfold/extensions/tools/content/tools'
    target = 'content/resume/tools'
```

## Data-Driven Content

Extensions support data-driven content generation using Hugo's `_content.gotmpl` feature:

1. **Metadata files** (`*.json`) - Structured data for templates
2. **Auxiliary files** (`*_auxiliary.json`) - Full page content with sections
3. **Content templates** (`_content.gotmpl`) - Generate Hugo pages from JSON

This approach eliminates the need for individual markdown files while maintaining full content flexibility.

## Customization

All extensions use the base AirFold theme components (`.card-paper`, `.btn-paper`, etc.) and can be customized by:

1. Editing the copied layout files directly
2. Overriding CSS variables in your site's stylesheet
3. Adding site-specific partials
4. Customizing UI strings in `hugo.toml` under `[params.ui]`

## Creating Custom Extensions

Follow this structure for custom extensions:
```
extensions/my-extension/
├── layouts/
│   └── my-section/
│       ├── list.html
│       └── single.html
├── content/
│   └── my-section/
│       ├── _content.gotmpl
│       └── _index.md
├── archetypes/
│   └── my-content.md
└── README.md
```
