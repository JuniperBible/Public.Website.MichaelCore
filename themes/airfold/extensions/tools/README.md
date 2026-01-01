# Tools Extension

Display tools and technologies with category grouping and data-driven content.

## Setup

1. Copy layouts to your site:
   ```bash
   cp -r themes/airfold/extensions/tools/layouts/* layouts/
   ```

2. Mount content under `/resume/tools/` in `hugo.toml`:
   ```toml
   [module]
     [[module.mounts]]
       source = 'themes/airfold/extensions/tools/content/tools'
       target = 'content/resume/tools'
   ```

3. Add data files:
   - `data/tools.json` - Tool metadata
   - `data/tools_auxiliary.json` - Tool content (optional, for data-driven generation)

## Configuration

Add tool categories to `hugo.toml`:

```toml
[params]
  toolCategories = [
    "SIEM & Observability",
    "Container & Automation",
    "Development",
    "RMM",
    "Threat Informed Defense",
    "Virtualization"
  ]
```

## Data-Driven Content

For fully data-driven tools (no markdown files), create:

### data/tools.json
```json
{
  "tools": [
    {
      "id": "splunk",
      "title": "Splunk",
      "description": "Enterprise SIEM platform",
      "category": "SIEM & Observability",
      "website": "https://www.splunk.com/",
      "weight": 1
    }
  ]
}
```

### data/tools_auxiliary.json
```json
{
  "tools": {
    "splunk": {
      "content": "Intro paragraph...",
      "sections": [
        { "heading": "Key Features", "list": ["Feature 1", "Feature 2"] }
      ]
    }
  }
}
```

### content/tools/_content.gotmpl
```go
{{- $toolData := .Site.Data.tools -}}
{{- $auxData := .Site.Data.tools_auxiliary -}}

{{- range $toolData.tools -}}
  {{- $id := .id -}}
  {{- $aux := index $auxData.tools $id -}}

  {{- $content := "" -}}
  {{- with $aux -}}
    {{- $content = .content -}}
    {{- range .sections -}}
      {{- $content = printf "%s\n\n## %s\n\n" $content .heading -}}
      {{- with .content -}}
        {{- $content = printf "%s%s\n" $content . -}}
      {{- end -}}
      {{- with .list -}}
        {{- range . -}}
          {{- $content = printf "%s- %s\n" $content . -}}
        {{- end -}}
      {{- end -}}
    {{- end -}}
  {{- end -}}

  {{- $params := dict
    "title" .title
    "description" .description
    "category" .category
    "website" .website
    "weight" .weight
  -}}
  {{- $page := dict
    "path" (printf "%s.md" $id)
    "title" .title
    "kind" "page"
    "params" $params
    "content" (dict "mediaType" "text/markdown" "value" $content)
  -}}
  {{- $.AddPage $page -}}
{{- end -}}
```

## Configuration

Add to `hugo.toml`:

```toml
[params]
  resumeUrlPrefix = '/resume'  # URL prefix for resume-related content (default: /resume)

[params.ui]
  allTools = "All Tools"
  officialWebsite = "Official Website"
  viewResume = "View Resume"
  backToResume = "Back to Resume"
```

## URL Structure

By default, tools are placed at `/resume/tools/`.
