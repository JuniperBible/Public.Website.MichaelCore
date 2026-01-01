# AirFold Theme

A handwritten paper aesthetic Hugo theme featuring wavy borders, paper shadows, and full dark mode support. Built with Tailwind CSS v4.

## Features

- **Paper Aesthetic**: Wavy borders, offset shadows, and handwritten fonts
- **Dark Mode**: Full support with system preference detection
- **Tailwind CSS v4**: Modern utility-first CSS with custom theme tokens
- **Responsive**: Mobile-first design
- **SEO Ready**: Meta tags, Open Graph, Twitter Cards, JSON-LD
- **Accessibility**: Skip-to-content links, semantic HTML
- **Social Icons**: 15+ social media integrations
- **Contact Form**: Optional PGP encryption and CAPTCHA support
- **Modular Extensions**: Optional add-ons for resume, portfolio, blog, certifications

## Installation

### As a Git Submodule

```bash
git submodule add https://github.com/cyanitol/airfold-theme.git themes/airfold
```

Add to your `hugo.toml`:

```toml
theme = 'airfold'
```

### Manual Installation

Download and extract to `themes/airfold/`.

## Quick Start

1. Install the theme
2. Copy `exampleSite/hugo.toml` to your site root
3. Copy `exampleSite/data/social.yaml` to `data/`
4. Run `npm install && npm run dev`

## Configuration

### Basic Configuration

```toml
baseURL = 'https://example.com/'
languageCode = 'en-us'
title = 'Your Site Title'
theme = 'airfold'

[params]
  description = 'Your site description'
  author = 'Your Name'
  heroImage = '/images/hero.png'
  favicon = '/favicon.ico'
  tagline = 'Your tagline here'
  footerText = 'Your footer text'

[taxonomies]
  tag = 'tags'

[menus]
  [[menus.main]]
    name = 'Home'
    pageRef = '/'
    weight = 10
  [[menus.main]]
    name = 'About'
    pageRef = '/about'
    weight = 20
  [[menus.main]]
    name = 'Contact'
    pageRef = '/contact'
    weight = 30
```

### Social Links

Create `data/social.yaml`:

```yaml
links:
  - name: Twitter
    url: https://twitter.com/username
    icon: twitter
  - name: GitHub
    url: https://github.com/username
    icon: github
  - name: LinkedIn
    url: https://linkedin.com/in/username
    icon: linkedin
```

**Available icons**: twitter, youtube, linkedin, instagram, facebook, tiktok, threads, pinterest, snapchat, reddit, discord, whatsapp, signal, github, mastodon, bluesky, fansly, onlyfans

## Included Layouts

The base theme includes:

| Layout | File | Description |
|--------|------|-------------|
| Base | `baseof.html` | Master template with header, footer, dark mode |
| Home | `index.html` | Homepage with hero and social links |
| Single | `single.html` | Generic single page |
| List | `list.html` | Generic list/section page |
| About | `about.html` | About page with social CTA |
| Contact | `contact.html` | Contact form with optional PGP |
| Term | `term.html` | Tag/taxonomy pages |

## Extensions

The theme includes optional extensions in `extensions/`. Install only what you need:

### Resume Extension
Professional CV with skills, experience, certifications.
```bash
cp -r themes/airfold/extensions/resume/layouts/* layouts/
```

### Portfolio Extension
Project gallery with tag filtering.
```bash
cp -r themes/airfold/extensions/portfolio/layouts/* layouts/
```

### Blog Extension
Article listing with tag cloud.
```bash
cp -r themes/airfold/extensions/blog/layouts/* layouts/
```

### Certifications Extension
Professional certifications with skills taxonomy.
```bash
cp -r themes/airfold/extensions/certifications/layouts/* layouts/
```

See `extensions/README.md` for detailed documentation.

## Building CSS

The theme requires Tailwind CSS compilation:

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:*",
    "dev:hugo": "hugo server --disableFastRender",
    "dev:css": "npx @tailwindcss/cli -i ./themes/airfold/assets/css/main.css -o ./static/css/main.css --watch",
    "build": "npm-run-all build:css build:hugo",
    "build:css": "npx @tailwindcss/cli -i ./themes/airfold/assets/css/main.css -o ./static/css/main.css --minify",
    "build:hugo": "hugo --minify"
  },
  "devDependencies": {
    "@tailwindcss/cli": "^4.1.17",
    "npm-run-all": "^4.1.5",
    "tailwindcss": "^4.1.17"
  }
}
```

## AirFold CSS Components

The theme provides these CSS components:

| Class | Description |
|-------|-------------|
| `.card-paper` | Paper-style card with shadow |
| `.card-paper-compact` | Smaller padding card |
| `.card-paper-sm` | Compact card for list items |
| `.btn-paper` | Light paper button |
| `.btn-paper-dark` | Dark paper button |
| `.social-link` | Social media icon button |
| `.social-link-sm` | Smaller social button |
| `.nav-link` | Navigation link with wavy hover |
| `.hero-image` | Hero image container |
| `.prose` | Article typography |
| `.cert-logo` | Certification logo with hover effect |

### CSS Variables

Customize colors via CSS variables:

```css
:root {
  --color-accent: #7a00b0;
  --color-paper-white: #f8f8f8;
  --color-paper-black: #1a1a1a;
}

html.dark {
  --color-accent: #b366e0;
  --color-paper-white: #1a1a1a;
  --color-paper-black: #f0f0f0;
}
```

## Customization

### Override Layouts

Create files in your site's `layouts/` directory to override theme templates.

### Custom Partials

Add partials to `layouts/partials/` to extend functionality.

### CSS Customization

Either:
1. Override CSS variables
2. Add custom CSS to `static/css/custom.css` and link in `baseof.html`
3. Modify `assets/css/main.css` and rebuild

## Contact Form Features

The contact page (`contact.html`) supports optional security features:

### PGP Encryption

Encrypt messages client-side before submission:

```toml
[params]
  pgpPublicKey = '''
-----BEGIN PGP PUBLIC KEY BLOCK-----
... your public key ...
-----END PGP PUBLIC KEY BLOCK-----
'''
```

### CAPTCHA Protection

Prevent spam with multiple CAPTCHA provider options:

```toml
[params.captcha]
  provider = "turnstile"  # turnstile, recaptcha-v2, recaptcha-v3, hcaptcha, friendly-captcha, disabled
  siteKey = "your-site-key"
  # secretKey = "your-secret-key"  # Optional - can use env variable instead (recommended)
```

**Supported providers:**

| Provider | Config Value | Env Variable | Notes |
|----------|--------------|--------------|-------|
| Cloudflare Turnstile | `turnstile` | `TURNSTILE_SECRET_KEY` | Free, privacy-focused |
| Google reCAPTCHA v2 | `recaptcha-v2` | `RECAPTCHA_SECRET_KEY` | Checkbox challenge |
| Google reCAPTCHA v3 | `recaptcha-v3` | `RECAPTCHA_SECRET_KEY` | Invisible, score-based |
| hCaptcha | `hcaptcha` | `HCAPTCHA_SECRET_KEY` | Privacy-focused alternative |
| Friendly Captcha | `friendly-captcha` | `FRIENDLY_CAPTCHA_SECRET_KEY` | GDPR compliant, no cookies |
| Disabled | `disabled` | - | No CAPTCHA (default) |

**Environment variable names:**

| Provider | Site Key (build time) | Secret Key (runtime) |
|----------|----------------------|---------------------|
| Turnstile | `HUGO_TURNSTILE_SITE_KEY` | `TURNSTILE_SECRET_KEY` |
| reCAPTCHA | `HUGO_RECAPTCHA_SITE_KEY` | `RECAPTCHA_SECRET_KEY` |
| hCaptcha | `HUGO_HCAPTCHA_SITE_KEY` | `HCAPTCHA_SECRET_KEY` |
| Friendly Captcha | `HUGO_FRIENDLY_CAPTCHA_SITE_KEY` | `FRIENDLY_CAPTCHA_SECRET_KEY` |

> Site keys need the `HUGO_` prefix (Hugo security policy). Secret keys don't (used at runtime).

**Alternative:** Add `siteKey`/`secretKey` in hugo.toml (note: `secretKey` exposed in HTML source)

**Theme partials:**
- `partials/captcha.html` - Renders CAPTCHA widget
- `partials/captcha-scripts.html` - Loads provider scripts

## Credits

- **Fonts**: [Neucha](https://fonts.google.com/specimen/Neucha), [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand)
- **CSS**: [Tailwind CSS](https://tailwindcss.com/)
- **Encryption**: [OpenPGP.js](https://openpgpjs.org/)

## License

MIT License - see [LICENSE](LICENSE)
