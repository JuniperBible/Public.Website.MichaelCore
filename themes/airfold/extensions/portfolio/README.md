# Portfolio Extension

Project portfolio layout with tag filtering for the AirFold theme.

## Features

- Grid layout for projects
- Client-side tag filtering
- Featured images with hover effects
- Tag-based organization
- Social CTA integration

## Installation

```bash
cp -r themes/airfold/extensions/portfolio/layouts/* layouts/
cp -r themes/airfold/extensions/portfolio/archetypes/* archetypes/
```

## Usage

Create `content/projects/_index.md`:

```yaml
---
title: Projects
description: My portfolio of work
---

Optional introductory content here.
```

Create projects with `hugo new projects/my-project.md`:

```yaml
---
title: Project Name
description: Brief project description
image: /images/projects/project.jpg
client: Client Name
tags: [web, design, development]
---

## Overview
Project details...

## Results
Outcomes and metrics...
```

## Customization

The portfolio uses:
- `.card-paper` for project cards
- `.btn-paper` for buttons
- Tag cloud partial for related projects
- Client-side JavaScript for filtering
