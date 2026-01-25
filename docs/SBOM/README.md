# Software Bill of Materials (SBOM)

This directory contains documentation about Michael's Software Bill of Materials (SBOM) generation and component inventory.

## Table of Contents

- [What is SBOM?](#what-is-sbom)
- [Why SBOM Matters](#why-sbom-matters)
- [How Michael Generates SBOM](#how-michael-generates-sbom)
- [Available SBOM Formats](#available-sbom-formats)
- [How to Regenerate SBOM](#how-to-regenerate-sbom)
- [Understanding the SBOM Output](#understanding-the-sbom-output)
- [Related Documentation](#related-documentation)

---

## What is SBOM?

A **Software Bill of Materials (SBOM)** is a comprehensive inventory of all components, libraries, and dependencies that make up a software application. Think of it as an "ingredient list" for software.

An SBOM typically includes:
- **Component names** - What libraries and modules are used
- **Version information** - Specific versions of each component
- **License data** - How each component is licensed
- **Relationships** - Dependencies between components
- **Provenance** - Where components come from (package repositories, vendors)

SBOMs are becoming a standard requirement in software development, especially for:
- **Supply chain security** - Understanding what's in your software
- **Vulnerability management** - Identifying components with known security issues
- **License compliance** - Ensuring all dependencies meet legal requirements
- **Transparency** - Providing visibility into software composition

---

## Why SBOM Matters

For the Michael project, SBOM generation provides several critical benefits:

### 1. Security Transparency

Michael processes and serves Bible texts that may be used in sensitive contexts (research, worship, education). An SBOM allows users to:
- Verify exactly what software components are running
- Audit for security vulnerabilities in dependencies
- Track third-party code included in the project

### 2. License Compliance

The project includes multiple Bible translations with different licenses:
- Public domain texts (ASV, DRC, Geneva1599, etc.)
- GPL-licensed texts (KJVA with Strong's numbers)
- Copyrighted-free texts (LXX, SBLGNT)

The SBOM documents all software dependencies and their licenses, ensuring users can verify compliance with:
- Open source licenses (GPL, MIT, BSD)
- Bible text licenses (from SWORD Project modules)
- Data licenses (Strong's concordance, versification schemas)

### 3. Supply Chain Security

Michael aims to be a **zero-runtime-dependency** static site generator. The SBOM verifies this claim by showing:
- **Build-time dependencies only** (Hugo, Go, Syft)
- **No runtime JavaScript frameworks** (vanilla JavaScript only)
- **No external API dependencies** (fully offline-capable)

This makes Michael suitable for air-gapped environments and high-security contexts.

### 4. Reproducibility

The SBOM enables users to:
- Reproduce exact builds with the same dependency versions
- Verify that distributed packages match source code
- Audit changes in dependencies over time

---

## How Michael Generates SBOM

Michael uses **Syft** to automatically scan the project and generate SBOMs.

### Syft Overview

**Syft** is a CLI tool and library for generating Software Bills of Materials (SBOM) from container images and filesystems. It's maintained by Anchore and is one of the most widely-used SBOM generators.

**Project:** https://github.com/anchore/syft
**License:** Apache-2.0

### Generation Process

1. **Automated scanning** - Syft scans the entire Michael project directory
2. **Component discovery** - Finds dependencies in:
   - Go modules (`go.mod`, `go.sum`, binaries)
   - NPM packages (`package-lock.json`)
   - GitHub Actions workflows (`.github/workflows/`)
3. **License detection** - Attempts to identify licenses from package metadata
4. **Format conversion** - Exports to multiple SBOM formats
5. **Storage** - SBOMs are stored in `assets/downloads/sbom/` and served as static files

### What Syft Scans

Syft analyzes the following in Michael:

- **Go modules** - Dependencies in `tools/juniper/` (the SWORD converter tool)
- **NPM packages** - Minimal vendored packages (hint.css from choosealicense.com)
- **GitHub Actions** - CI/CD workflow dependencies
- **Binary executables** - The compiled `juniper` binary
- **Hugo templates** - Not scanned (Syft focuses on code dependencies)
- **Bible data** - Not scanned (data files, not software dependencies)

### Build Integration

SBOM generation is integrated into the build process:

```bash
make build    # Automatically runs: make sbom
make sbom     # Manually regenerate SBOM
```

This ensures the SBOM is always up-to-date with the latest dependencies.

---

## Available SBOM Formats

Michael generates SBOMs in **four formats** to support different tools and use cases:

### 1. SPDX 2.3 JSON

**File:** `assets/downloads/sbom/sbom.spdx.json`
**Format:** SPDX (Software Package Data Exchange) 2.3
**Specification:** https://spdx.dev/

**Use cases:**
- Standard format for license compliance
- Widely adopted in enterprise and government
- Supported by major scanning tools (Black Duck, Snyk, etc.)

**Key features:**
- Comprehensive license information
- Package relationships and dependencies
- Copyright and attribution data
- SPDX license identifiers (e.g., `MIT`, `GPL-3.0-or-later`)

### 2. CycloneDX JSON

**File:** `assets/downloads/sbom/sbom.cdx.json`
**Format:** CycloneDX 1.x
**Specification:** https://cyclonedx.org/

**Use cases:**
- Security-focused SBOM format
- Integration with vulnerability databases (NVD, OSV)
- Supply chain risk management
- DevSecOps toolchains

**Key features:**
- Component vulnerability tracking
- Dependency graph representation
- CVE (Common Vulnerabilities and Exposures) mapping
- Supports pURL (Package URL) identifiers

### 3. CycloneDX XML

**File:** `assets/downloads/sbom/sbom.cdx.xml`
**Format:** CycloneDX 1.x (XML variant)
**Specification:** https://cyclonedx.org/

**Use cases:**
- Enterprise tools that require XML (instead of JSON)
- Legacy systems integration
- XSLT transformations and XML tooling

**Key features:**
- Same data as CycloneDX JSON
- XML schema validation
- Human-readable (with proper XML viewer)

### 4. Syft JSON (Native Format)

**File:** `assets/downloads/sbom/sbom.syft.json`
**Format:** Syft's native JSON format
**Specification:** https://github.com/anchore/syft

**Use cases:**
- Maximum detail and fidelity
- Syft-specific tooling and analysis
- Debugging and development

**Key features:**
- Most comprehensive format (includes all Syft metadata)
- File digests (SHA-1, SHA-256)
- ELF binary analysis (for compiled Go binaries)
- Relationships between artifacts

---

## How to Regenerate SBOM

### Prerequisites

You need **Syft** installed. Michael's `shell.nix` includes it:

```bash
nix-shell  # Provides Hugo, Go, Make, and Syft
```

Or install Syft manually:

```bash
# macOS (Homebrew)
brew install syft

# Linux (binary download)
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Nix
nix-shell -p syft
```

### Regenerate All Formats

```bash
make sbom
```

Or run the script directly:

```bash
./scripts/generate-sbom.sh
```

This generates all four SBOM formats in `assets/downloads/sbom/`.

### Regenerate Specific Formats

Use the script with format flags:

```bash
# Only SPDX JSON
./scripts/generate-sbom.sh --spdx-json

# Only CycloneDX (JSON + XML)
./scripts/generate-sbom.sh --cyclonedx --cyclonedx-xml

# Only Syft native format
./scripts/generate-sbom.sh --syft

# Custom output directory
./scripts/generate-sbom.sh --output-dir /tmp/sbom
```

### Automatic Regeneration

The SBOM is automatically regenerated when you run:

```bash
make build
```

This ensures the SBOM is always in sync with the codebase.

---

## Understanding the SBOM Output

### File Locations

All generated SBOMs are stored in:

```
assets/downloads/sbom/
├── sbom.spdx.json      # SPDX 2.3 JSON
├── sbom.cdx.json       # CycloneDX JSON
├── sbom.cdx.xml        # CycloneDX XML
└── sbom.syft.json      # Syft native JSON
```

These files are:
- Tracked in Git (to document the project state)
- Served as static files (accessible at `/downloads/sbom/`)
- Updated on each build (via `make build` or `make sbom`)

### Reading an SBOM

**SPDX JSON** example structure:

```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "michael",
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-go-module-github.com-spf13-cobra-...",
      "name": "github.com/spf13/cobra",
      "versionInfo": "v1.8.1",
      "licenseConcluded": "Apache-2.0",
      "licenseDeclared": "Apache-2.0"
    }
  ]
}
```

**CycloneDX JSON** example structure:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "components": [
    {
      "type": "library",
      "name": "github.com/spf13/cobra",
      "version": "v1.8.1",
      "purl": "pkg:golang/github.com/spf13/cobra@v1.8.1",
      "licenses": [
        {
          "license": {
            "id": "Apache-2.0"
          }
        }
      ]
    }
  ]
}
```

### Key Sections

All SBOM formats include:

1. **Document metadata** - Version, timestamp, tool used
2. **Components/Packages** - List of all dependencies
3. **Relationships** - How components depend on each other
4. **Licenses** - License identifiers for each component
5. **Checksums** - File hashes for verification

---

## Related Documentation

- **Component inventory:** [components.md](components.md) - Detailed list of all components in Michael
- **Dependencies:** [dependencies.md](dependencies.md) - Build-time, runtime, and development dependencies
- **Third-party licenses:** [../THIRD-PARTY-LICENSES.md](../THIRD-PARTY-LICENSES.md) - Full license texts and attributions
- **Zero dependencies verification:** [../ZERO-DEPENDENCIES-VERIFICATION.md](../ZERO-DEPENDENCIES-VERIFICATION.md) - Proof of zero runtime dependencies

---

## Best Practices

When using Michael's SBOM:

1. **Verify signatures** - Check that SBOM files match the Git commit hash
2. **Scan for vulnerabilities** - Use tools like Grype or Trivy to scan the SBOM for CVEs
3. **Track updates** - Monitor changes in `git log` for SBOM updates
4. **License compliance** - Review licenses in SPDX format before redistribution
5. **Supply chain audit** - Use CycloneDX format for supply chain security analysis

---

## Compliance Notes

### Executive Order 14028 (U.S. Federal)

The U.S. Executive Order on Improving the Nation's Cybersecurity (May 2021) requires SBOMs for software sold to federal agencies.

Michael's SBOM generation meets these requirements:
- Machine-readable formats (SPDX, CycloneDX)
- Comprehensive component inventory
- License transparency
- Automated generation and verification

### NTIA Minimum Elements

The National Telecommunications and Information Administration (NTIA) defines minimum elements for SBOMs:

Michael's SBOM includes all required elements:
- ✅ Supplier names
- ✅ Component names
- ✅ Version strings
- ✅ Dependency relationships
- ✅ Timestamps
- ✅ Unique identifiers (SPDX IDs, pURLs)

---

## Support and Feedback

For questions about SBOM generation:

1. Check the [Syft documentation](https://github.com/anchore/syft)
2. Review the generation script: `scripts/generate-sbom.sh`
3. Open an issue in the Michael repository

For SBOM format specifications:

- SPDX: https://spdx.dev/
- CycloneDX: https://cyclonedx.org/

---

**Last Updated:** 2026-01-25
