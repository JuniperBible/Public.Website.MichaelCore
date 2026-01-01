# Resume Extension

Professional resume/CV page layout for the AirFold theme using JSON Resume schema.

## Features

- Skills overview with categorized tags (first 3 skill categories)
- Tools & technologies section (remaining skill categories + certification tags)
- Certifications grid with logos
- Experience timeline with highlights
- Education section
- **JSON Resume** standard for portable resume data

## Installation

```bash
# From your site root
cp -r themes/airfold/extensions/resume/layouts/* layouts/
```

## Usage

### 1. Create Resume Data File

Create `data/resume.json` following the [JSON Resume](https://jsonresume.org/schema) v1.0.0 specification:

```json
{
  "$schema": "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
  "basics": {
    "name": "Your Name",
    "label": "Professional Title",
    "summary": "Brief professional summary"
  },
  "work": [
    {
      "name": "Company Name | 2020 - Present",
      "position": "Senior Engineer",
      "summary": "Role description",
      "highlights": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "studyType": "B.S.",
      "area": "Computer Science",
      "endDate": "2015"
    }
  ],
  "certificates": [
    {
      "name": "CISSP",
      "issuer": "ISC2",
      "url": "/resume/certifications/cissp/",
      "image": "/images/certs/cissp.png"
    }
  ],
  "skills": [
    {
      "name": "Security Programs",
      "keywords": ["Enterprise Security", "Risk Management"]
    },
    {
      "name": "Compliance",
      "keywords": ["NIST", "ISO 27001"]
    },
    {
      "name": "Technology",
      "keywords": ["Cloud Security", "Network Security"]
    },
    {
      "name": "Tools",
      "keywords": ["Splunk", "Docker", "Kubernetes"]
    }
  ]
}
```

### 2. Create Resume Page

Create `content/resume.md`:

```yaml
---
title: "Résumé"
description: "Your professional resume"
layout: "resume"
---
```

## Configuration

Add section labels to `hugo.toml`:

```toml
[params.resume]
  skillsOverview = "Skills Overview"
  toolsSkills = "Tools, Technologies & Skills"
  certifications = "Certifications"
  experience = "Experience"
  education = "Education"

[params.ui]
  viewAll = "View All"
  viewDetails = "View Details"
  certificationBadge = "certification badge"
```

## URL Configuration

By default, resume-related content is expected at `/resume/` (certifications at `/resume/certifications/`, skills at `/resume/skills/`, tools at `/resume/tools/`).

To customize the URL prefix, add to `hugo.toml`:

```toml
[params]
  resumeUrlPrefix = "/resume"  # Default value
```

## Skill Categories

The resume layout automatically organizes skills:
- **First 3 categories** appear in the Skills Overview section with links to `/resume/skills/`
- **Remaining categories** appear in Tools & Technologies section with links to `/resume/tools/`
- **Certification tags** are automatically collected and displayed as skill links

## Customization

The resume layout uses these theme components:
- `.card-paper` for sections
- Semantic `<section>` elements with ARIA labels for accessibility
- Responsive grid layouts

Override the layout or edit CSS variables to customize appearance.
