# Michael Dependencies

This document provides a comprehensive overview of all dependencies used by the Michael Hugo Bible module, categorized by their role in the software lifecycle.

## Table of Contents

- [Dependency Philosophy](#dependency-philosophy)
- [Build-Time Dependencies](#build-time-dependencies)
- [Runtime Dependencies](#runtime-dependencies)
- [Development Dependencies](#development-dependencies)
- [Optional Dependencies](#optional-dependencies)
- [Dependency Management](#dependency-management)
- [Security and Updates](#security-and-updates)

---

## Dependency Philosophy

Michael follows a **minimal dependency** approach:

### Core Principles

1. **Zero runtime dependencies** - The generated static site has no external JavaScript libraries or frameworks
2. **Minimal build dependencies** - Only essential tools for site generation
3. **Reproducible builds** - Pin versions when necessary for consistency
4. **Transparent supply chain** - All dependencies documented and scanned via SBOM

### Why Minimal Dependencies?

- **Security** - Smaller attack surface (fewer dependencies = fewer vulnerabilities)
- **Performance** - No framework overhead (faster page loads)
- **Longevity** - Less maintenance burden (no dependency updates/breakage)
- **Privacy** - No CDN dependencies (all assets served locally)
- **Offline capability** - Works in air-gapped environments

---

## Build-Time Dependencies

These tools are required **only during the build process**. They are not included in the final static site.

### Hugo (Static Site Generator)

**Required:** Yes
**Category:** Core build tool
**License:** Apache-2.0

#### Version Requirements

- **Minimum version:** Hugo 0.100.0 (for Hugo Modules support)
- **Recommended:** Hugo 0.120.0+ (latest stable)
- **Extended version:** Not required (no SCSS processing)

#### Purpose

Hugo generates static HTML from:
- Go templates (`layouts/*.html`)
- Markdown content (`content/`)
- JSON data files (`data/`)
- Configuration (`hugo.toml`)

#### Installation

```bash
# Nix (recommended for reproducibility)
nix-shell  # Provides Hugo automatically

# macOS (Homebrew)
brew install hugo

# Linux (Debian/Ubuntu)
apt install hugo

# Linux (Snap)
snap install hugo

# Windows (Chocolatey)
choco install hugo

# Binary download
# https://github.com/gohugoio/hugo/releases
```

#### Usage in Michael

```bash
# Development server
hugo server --buildDrafts --buildFuture

# Production build
hugo --minify

# Via Makefile
make dev    # Runs hugo server
make build  # Runs hugo --minify
```

#### Configuration

Hugo is configured via `hugo.toml`:
- `baseURL` - Site base URL
- `languageCode` - Site language (en)
- `params.michael.basePath` - Bible content path (`/bible`)
- `module.mounts` - Data and asset mounting

See: [hugo.toml](../../hugo.toml) for full configuration

---

### Go (For Hugo Modules and Juniper)

**Required:** Yes (for building Juniper and using Hugo modules)
**Category:** Programming language runtime
**License:** BSD-3-Clause

#### Version Requirements

- **Minimum version:** Go 1.21
- **Recommended:** Go 1.25.4 (latest stable)

#### Purpose

Go is used for:
1. **Juniper tool** - Compiling the SWORD/e-Sword converter (`tools/juniper/`)
2. **Hugo modules** - If Michael is used as a Go module (not required for standalone mode)

#### Installation

```bash
# Nix
nix-shell  # Provides Go automatically

# macOS (Homebrew)
brew install go

# Linux (Official binary)
wget https://go.dev/dl/go1.25.4.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.25.4.linux-amd64.tar.gz

# Windows (Official installer)
# Download from https://go.dev/dl/
```

#### Usage in Michael

```bash
# Build Juniper tool
cd tools/juniper
go build -o bin/juniper ./cmd/juniper

# Via Makefile
make juniper
```

---

### Syft (SBOM Generator)

**Required:** Yes (for SBOM generation)
**Category:** Security tool
**License:** Apache-2.0

#### Version Requirements

- **Minimum version:** Syft 1.0.0
- **Recommended:** Syft 1.38.0+

#### Purpose

Syft scans the project and generates Software Bill of Materials (SBOM) in multiple formats:
- SPDX 2.3 JSON
- CycloneDX JSON/XML
- Syft native JSON

See: [README.md](README.md) for SBOM details

#### Installation

```bash
# Nix
nix-shell -p syft

# macOS (Homebrew)
brew install syft

# Linux (install script)
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Binary download
# https://github.com/anchore/syft/releases
```

#### Usage in Michael

```bash
# Generate all SBOM formats
./scripts/generate-sbom.sh

# Via Makefile
make sbom

# Automatically during build
make build  # Runs make sbom first
```

#### Configuration

Syft scans:
- Go modules (`tools/juniper/go.mod`)
- NPM packages (`tools/juniper/vendor_external/choosealicense/assets/vendor/hint.css/package-lock.json`)
- GitHub Actions workflows (`.github/workflows/*.yml`)
- Binary executables (`tools/juniper/bin/juniper`)

Output: `assets/downloads/sbom/*.{json,xml}`

---

### GNU Make (Build Automation)

**Required:** Yes (for convenience, not strictly required)
**Category:** Build tool
**License:** GPL-3.0-or-later

#### Version Requirements

- **Minimum version:** GNU Make 3.81
- **Any modern version works** - No advanced Make features used

#### Purpose

Make orchestrates build tasks:
- `make dev` - Start Hugo development server
- `make build` - Build static site with SBOM generation
- `make sbom` - Generate SBOM only
- `make juniper` - Build Juniper tool
- `make vendor` - Fetch and convert Bible modules

#### Installation

Make is pre-installed on most Unix-like systems.

```bash
# macOS (pre-installed, or via Homebrew)
brew install make

# Linux (pre-installed, or via package manager)
apt install make     # Debian/Ubuntu
yum install make     # RHEL/CentOS
pacman -S make       # Arch

# Nix
nix-shell  # Provides Make automatically
```

#### Alternatives

You can run commands directly without Make:

```bash
# Instead of: make dev
hugo server --buildDrafts --buildFuture

# Instead of: make build
./scripts/generate-sbom.sh && hugo --minify

# Instead of: make juniper
cd tools/juniper && go build -o bin/juniper ./cmd/juniper
```

---

### xz (Compression Utility)

**Required:** Yes (for packaging Bible data)
**Category:** Compression tool
**License:** Public Domain

#### Purpose

Creates `.tar.xz` compressed archives of Bible JSON files for distribution:
- `assets/downloads/*.tar.xz`

#### Installation

```bash
# Nix
nix-shell  # Provides xz automatically

# macOS (pre-installed, or via Homebrew)
brew install xz

# Linux (usually pre-installed)
apt install xz-utils    # Debian/Ubuntu
yum install xz          # RHEL/CentOS
```

#### Usage in Michael

```bash
# Package all Bibles
make vendor-package

# Manually package a single Bible
tar -cJf assets/downloads/kjva.tar.xz -C data/example/bible_auxiliary kjva.json
```

---

### curl (HTTP Client)

**Required:** Optional (for fetching SWORD modules)
**Category:** Network tool
**License:** MIT/X-style license

#### Purpose

Used by Juniper to download SWORD modules from CrossWire FTP servers.

#### Installation

```bash
# Nix
nix-shell  # Provides curl automatically

# macOS (pre-installed)
# Already included in macOS

# Linux (usually pre-installed)
apt install curl    # Debian/Ubuntu
yum install curl    # RHEL/CentOS
```

---

## Runtime Dependencies

**NONE.**

Michael generates a static site with **zero runtime dependencies**.

### What "Zero Runtime Dependencies" Means

The final HTML, CSS, and JavaScript:
- ✅ Run in the browser without external libraries
- ✅ No CDN dependencies (no jQuery, React, Bootstrap, etc.)
- ✅ No external API calls (fully offline-capable)
- ✅ No server-side processing (static files only)

### Browser APIs Used (Native, No Dependencies)

The JavaScript code uses only native browser APIs:

| API | Purpose | Browser Support |
|-----|---------|-----------------|
| `fetch()` | Load Bible JSON files | Chrome 42+, Firefox 39+, Safari 10.1+ |
| `localStorage` | Store user preferences | All modern browsers |
| `IndexedDB` | Offline Bible storage | Chrome 24+, Firefox 16+, Safari 10+ |
| `Cache API` | Service worker caching | Chrome 40+, Firefox 41+, Safari 11.1+ |
| `Service Worker` | Offline functionality | Chrome 40+, Firefox 44+, Safari 11.1+ |
| `Web Share API` | Native sharing | Chrome 61+, Safari 12.1+ (mobile) |
| `IntersectionObserver` | Lazy loading | Chrome 51+, Firefox 55+, Safari 12.1+ |
| `History API` | Navigation without reloads | All modern browsers |

**Browser support target:** Modern browsers (2020+)
**No polyfills** - Older browsers are not supported

### CSS Dependencies

**NONE.**

Michael uses a single custom CSS file:
- No Bootstrap
- No Tailwind CSS
- No CSS frameworks

See: [components.md](components.md#css-components)

---

## Development Dependencies

These tools are useful for development but not required for building or running Michael.

### Git (Version Control)

**Required:** No (but highly recommended)
**License:** GPL-2.0-only

#### Purpose

- Version control for code and data
- Fetch version tags for SBOM (`git describe --tags`)

#### Installation

```bash
# Usually pre-installed on development systems
# Or via package manager (apt, brew, yum, etc.)
```

---

### Text Editor / IDE

**Required:** No (any editor works)
**Recommended:** VS Code, Neovim, Emacs, or any editor with:
- Go syntax support (for editing Juniper)
- HTML/CSS/JavaScript syntax support
- Hugo template syntax support (optional)

---

### Nix (Reproducible Development Environment)

**Required:** No (but highly recommended for reproducibility)
**License:** LGPL-2.1-or-later

#### Purpose

Nix provides a reproducible development environment via `shell.nix`:
- Pins exact versions of Hugo, Go, Make, xz, curl, Syft
- Ensures consistent builds across machines
- No need to install dependencies manually

#### Installation

```bash
# Install Nix (multi-user installation, recommended)
sh <(curl -L https://nixos.org/nix/install) --daemon

# Enter Nix shell (loads dependencies automatically)
nix-shell
```

#### Benefits

- **Reproducibility** - Same environment on all machines
- **Isolation** - Doesn't pollute system with dependencies
- **Convenience** - Single command (`nix-shell`) sets up everything

See: [shell.nix](../../shell.nix)

---

## Optional Dependencies

These tools are not required but can enhance the development experience.

### Grype (Vulnerability Scanner)

**Purpose:** Scan SBOM for vulnerabilities
**License:** Apache-2.0

```bash
# Install Grype
brew install grype  # macOS
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh

# Scan Michael's SBOM
grype sbom:assets/downloads/sbom/sbom.spdx.json
```

### jq (JSON Processor)

**Purpose:** Parse and query SBOM JSON files
**License:** MIT

```bash
# Install jq
nix-shell -p jq  # Nix
brew install jq  # macOS
apt install jq   # Linux

# Example: List all SBOM components
cat assets/downloads/sbom/sbom.syft.json | jq '.artifacts[] | .name'
```

### Browser Developer Tools

**Purpose:** Debug JavaScript and CSS
**Recommended:** Chrome DevTools, Firefox Developer Tools

No installation required (built into browsers).

---

## Dependency Management

### Hugo Modules

Michael can be used as a Hugo module, but **does not use Hugo modules for dependencies**.

The `hugo.toml` defines module mounts for:
- Layouts (`layouts/`)
- Assets (`assets/`)
- Data (`data/`)
- i18n strings (`i18n/`)

**No external Hugo modules are imported.**

### Go Modules (Juniper)

Juniper uses Go modules for dependency management.

**File:** `tools/juniper/go.mod`

```go
module github.com/FocuswithJustin/juniper

go 1.25

require (
    github.com/spf13/cobra v1.8.1
    github.com/spf13/pflag v1.0.5
    github.com/hashicorp/go-multierror v1.1.1
    github.com/hashicorp/errwrap v1.0.0
    github.com/jlaffaye/ftp v0.2.0
    github.com/mattn/go-sqlite3 v1.14.24
    gopkg.in/yaml.v3 v3.0.1
)
```

**Lockfile:** `tools/juniper/go.sum` (pins exact versions)

#### Updating Go Dependencies

```bash
cd tools/juniper

# Update all dependencies
go get -u ./...
go mod tidy

# Update a specific dependency
go get -u github.com/spf13/cobra@latest

# Verify no vulnerabilities
go list -json -m all | docker run --rm -i sonatype/nancy:latest sleuth
```

### NPM Packages (Vendored Only)

Michael **does not use npm** for runtime dependencies.

The only NPM package is **vendored** (copied into the repository):
- `tools/juniper/vendor_external/choosealicense/assets/vendor/hint.css/`

This package is **not installed via npm** - it's committed to the repository.

---

## Security and Updates

### Vulnerability Scanning

Michael's SBOM can be scanned for vulnerabilities:

```bash
# Using Grype (scans SBOM for CVEs)
grype sbom:assets/downloads/sbom/sbom.spdx.json

# Using Syft + Grype (scan live project)
syft scan . -o json | grype
```

### Dependency Update Policy

**Build dependencies:**

- Hugo: Use latest stable version (no pinning)
- Go: Use latest stable version
- Syft: Use latest stable version

**Juniper Go dependencies:**

- Pin minor versions in `go.mod`
- Update quarterly or when vulnerabilities are reported
- Test after updates to ensure no breakage

**Vendored packages:**

- Update when security issues are discovered
- Review license changes before updating

### Security Advisories

Monitor security advisories for:
- Hugo: https://github.com/gohugoio/hugo/security
- Go: https://go.dev/security
- Syft: https://github.com/anchore/syft/security

Juniper dependencies are scanned automatically via Dependabot (if enabled on GitHub).

---

## Dependency Tree Visualization

### Build Dependencies (Required)

```
Michael (Hugo Bible Module)
├── Hugo 0.120.0+ (build-time)
│   ├── Go 1.21+ (Hugo's dependency)
│   └── Git (for Hugo modules, optional)
├── Go 1.25.4 (for Juniper)
│   └── Standard library (BSD-3-Clause)
├── Syft 1.38.0+ (for SBOM)
│   └── (Syft's dependencies not listed - see Syft SBOM)
├── GNU Make 3.81+ (build automation)
├── xz (compression)
└── curl (network, optional)
```

### Runtime Dependencies (Deployed Static Site)

```
Michael Static Site
├── (NONE - No runtime JavaScript frameworks)
├── (NONE - No CDN dependencies)
└── Browser APIs only (native)
```

### Juniper Dependencies (Build Tool Only)

```
Juniper (tools/juniper/)
├── Go 1.25.4
├── github.com/spf13/cobra v1.8.1 (Apache-2.0)
├── github.com/spf13/pflag v1.0.5 (BSD-3-Clause)
├── github.com/hashicorp/go-multierror v1.1.1 (MPL-2.0)
├── github.com/hashicorp/errwrap v1.0.0 (MPL-2.0)
├── github.com/jlaffaye/ftp v0.2.0 (ISC)
├── github.com/mattn/go-sqlite3 v1.14.24 (MIT)
└── gopkg.in/yaml.v3 v3.0.1 (Apache-2.0 / MIT)
```

Full dependency graph: See `tools/juniper/go.mod` and generated SBOM

---

## Reproducible Builds

### Nix Shell Environment

Michael provides a `shell.nix` for reproducible builds:

```nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    hugo
    gnumake
    go
    xz
    curl
    syft
  ];
}
```

**Usage:**

```bash
# Enter Nix shell (loads all dependencies)
nix-shell

# Build project (all dependencies available)
make build
```

### Version Pinning

**Currently:** Michael uses latest stable versions of all tools (no pinning)

**Future:** Consider pinning with Nix flakes for even more reproducibility:
- Pin exact Hugo version
- Pin exact Go version
- Pin exact Syft version

This ensures builds are **bit-for-bit identical** across machines.

---

## Dependency Removal Strategy

If a dependency becomes unmaintained or insecure, Michael can:

1. **Hugo** - Switch to a different static site generator (Jekyll, Eleventy, etc.)
   - Templates would need rewriting
   - Data format (JSON) can stay the same

2. **Go** - Switch Juniper to a different language (Python, Rust, etc.)
   - Clean-room rewrite of SWORD parser
   - JSON output format stays the same

3. **Syft** - Switch to a different SBOM generator (Trivy, Tern, etc.)
   - SBOM format (SPDX, CycloneDX) is standardized
   - No lock-in to Syft

**Key principle:** Avoid lock-in by using standard formats (JSON, SPDX, CycloneDX).

---

## Frequently Asked Questions

### Why no package.json?

Michael **does not use npm** or Node.js. All JavaScript is vanilla (no build step required).

The only NPM package (`hint.css`) is **vendored** (copied into the repo), not installed via npm.

### Why no Gemfile / Bundler?

Michael uses **Hugo, not Jekyll**. No Ruby dependencies.

### Why no requirements.txt / pip?

Michael does not use Python for the main build (only Juniper uses Go).

Python may be used for optional scripts, but is not required.

### Can I use Michael without Nix?

**Yes!** Nix is optional. Just install:
- Hugo (via Homebrew, apt, or binary)
- Go (via Homebrew, apt, or binary)
- Make (usually pre-installed)

Then run `make build` as usual.

### Can I use Michael without Juniper?

**Yes!** If you only want to use the Hugo templates and don't need to convert new Bible modules, you can:
- Download pre-converted Bible JSON files
- Skip building Juniper
- Run Hugo directly

---

## Summary

### Build-Time Dependencies (Required)

| Tool | Minimum Version | License | Purpose |
|------|----------------|---------|---------|
| Hugo | 0.100.0+ | Apache-2.0 | Static site generation |
| Go | 1.21+ | BSD-3-Clause | Juniper compilation |
| Syft | 1.0.0+ | Apache-2.0 | SBOM generation |
| GNU Make | 3.81+ | GPL-3.0+ | Build automation |
| xz | Any | Public Domain | Compression |

### Runtime Dependencies (Deployed Site)

**NONE.**

### Development Dependencies (Optional)

| Tool | Purpose |
|------|---------|
| Git | Version control |
| Nix | Reproducible environment |
| Text editor | Code editing |

### Juniper Dependencies (Build Tool)

See: `tools/juniper/go.mod` and [components.md](components.md#build-tools)

---

**Last Updated:** 2026-01-25
