# Certifications Extension

Professional certifications and skills display for the AirFold theme with data-driven content generation.

## Features

- Certification grid with logos
- Individual certification pages with Credly verification links
- Skills taxonomy with related certifications
- Tag cloud for skill associations
- **Data-driven content generation** from JSON files (no markdown files needed)

## Installation

Copy layouts to your site:

```bash
cp -r themes/airfold/extensions/certifications/layouts/* layouts/
```

## Usage

### Option 1: Data-Driven (Recommended)

Generate pages entirely from JSON data files:

1. Create data files:
   - `data/certifications.json` - Certification metadata
   - `data/certifications_auxiliary.json` - Full certification content
   - `data/skills.json` - Skills metadata
   - `data/skills_auxiliary.json` - Full skills content

2. Copy content templates:
   ```bash
   cp -r themes/airfold/extensions/certifications/content/* content/
   ```

3. Create section index files (or use the ones in the extension):
   - `content/certifications/_index.md`
   - `content/skills/_index.md`

#### data/certifications.json
```json
{
  "certifications": [
    {
      "id": "cissp",
      "title": "CISSP",
      "description": "Certified Information Systems Security Professional",
      "issuer": "ISC2",
      "issued": "2024-01-15",
      "expires": "2027-01-15",
      "credly_url": "https://credly.com/badges/...",
      "logo": "/images/certs/cissp.png",
      "tags": ["Security", "Risk Management"],
      "weight": 10
    }
  ]
}
```

#### data/certifications_auxiliary.json
```json
{
  "certifications": {
    "cissp": {
      "content": "The CISSP is the most recognized certification...",
      "sections": [
        { "heading": "About", "content": "Detailed description..." },
        { "heading": "Domains", "list": ["Security and Risk Management", "Asset Security"] },
        { "heading": "More Information", "links": [{ "text": "ISC2 Website", "url": "https://isc2.org" }] }
      ]
    }
  }
}
```

### Option 2: Markdown Files

Create individual markdown files in `content/certifications/`:

```yaml
---
title: CISSP
issuer: (ISC)2
logo: /images/certs/cissp.png
issued: January 2024
expires: January 2027
credly_url: https://credly.com/badges/...
tags: [Security, Risk Management, Governance]
weight: 10
---

## About This Certification

The CISSP demonstrates expertise in...
```

## Configuration

Add to `hugo.toml`:

```toml
[params]
  credlyUrl = 'https://www.credly.com/users/your-profile'
  resumeUrlPrefix = '/resume'  # URL prefix for resume-related content (default: /resume)

[params.ui]
  skills = "Skills"
  allSkills = "All Skills"
  allCertifications = "All Certifications"
  relatedCertifications = "Related Certifications"
  verifyOnCredly = "Verify on Credly"
  viewAllBadgesOnCredly = "View All Badges on Credly"
  backToResume = "Back to Resume"
  viewResume = "View Resume"
```

## URL Structure

By default, content is placed under `/resume/`:
- Certifications: `/resume/certifications/`
- Skills: `/resume/skills/`

Mount content in `hugo.toml`:
```toml
[module]
  [[module.mounts]]
    source = 'themes/airfold/extensions/certifications/content/certifications'
    target = 'content/resume/certifications'
  [[module.mounts]]
    source = 'themes/airfold/extensions/certifications/content/skills'
    target = 'content/resume/skills'
```
