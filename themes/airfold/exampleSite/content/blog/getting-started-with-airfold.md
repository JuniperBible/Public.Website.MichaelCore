---
title: Getting Started with AirFold
description: A quick guide to setting up the AirFold theme
date: 2024-01-15
tags: [hugo, themes, tutorial]
---

Welcome to AirFold! This guide will help you get started with the theme.

## Installation

The easiest way to install AirFold is as a Git submodule:

```bash
git submodule add https://github.com/cyanitol/airfold-theme.git themes/airfold
```

## Configuration

Copy the example configuration from the theme:

```bash
cp themes/airfold/exampleSite/hugo.toml hugo.toml
```

Edit the file to customize your site settings.

## Building CSS

AirFold uses Tailwind CSS v4. Install dependencies and build:

```bash
npm install
npm run build:css
```

## Running the Dev Server

Start the development server:

```bash
npm run dev
```

Your site will be available at `http://localhost:1313`.

## Next Steps

- Configure your social links in `data/social.yaml`
- Add your hero image to `static/images/hero.png`
- Create your first blog post!
