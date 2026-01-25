#!/usr/bin/env bash
# Generate Software Bill of Materials (SBOM) in multiple formats
# Uses Syft to scan project dependencies and merges Bible module data
#
# Usage: ./scripts/generate-sbom.sh [OPTIONS]
#
# Options:
#   --all           Generate all formats (default)
#   --spdx-json     Generate SPDX 2.3 JSON
#   --spdx-tv       Generate SPDX Tag-Value
#   --cyclonedx     Generate CycloneDX JSON
#   --cyclonedx-xml Generate CycloneDX XML
#   --syft          Generate Syft JSON (native format)
#   --output-dir    Output directory (default: assets/downloads/sbom)
#   --help          Show this help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_ROOT}/assets/downloads/sbom"
GENERATE_ALL=true
FORMATS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            GENERATE_ALL=true
            shift
            ;;
        --spdx-json)
            GENERATE_ALL=false
            FORMATS+=("spdx-json")
            shift
            ;;
        --spdx-tv)
            GENERATE_ALL=false
            FORMATS+=("spdx-tag-value")
            shift
            ;;
        --cyclonedx)
            GENERATE_ALL=false
            FORMATS+=("cyclonedx-json")
            shift
            ;;
        --cyclonedx-xml)
            GENERATE_ALL=false
            FORMATS+=("cyclonedx-xml")
            shift
            ;;
        --syft)
            GENERATE_ALL=false
            FORMATS+=("syft-json")
            shift
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help)
            head -20 "$0" | tail -18
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# If generating all formats
if $GENERATE_ALL; then
    FORMATS=("spdx-json" "cyclonedx-json" "cyclonedx-xml" "syft-json")
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check for syft
if ! command -v syft &> /dev/null; then
    echo "Error: syft not found. Install with: nix-shell -p syft"
    echo "Or run: nix-shell -p syft --run './scripts/generate-sbom.sh'"
    exit 1
fi

# Project metadata
PROJECT_NAME="michael"
PROJECT_VERSION=$(git describe --tags --always 2>/dev/null || echo "0.0.0")

echo "Generating SBOM for $PROJECT_NAME v$PROJECT_VERSION"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Generate each format
for format in "${FORMATS[@]}"; do
    case $format in
        spdx-json)
            output_file="$OUTPUT_DIR/sbom.spdx.json"
            echo "Generating SPDX 2.3 JSON -> $output_file"
            ;;
        spdx-tag-value)
            output_file="$OUTPUT_DIR/sbom.spdx"
            echo "Generating SPDX Tag-Value -> $output_file"
            ;;
        cyclonedx-json)
            output_file="$OUTPUT_DIR/sbom.cdx.json"
            echo "Generating CycloneDX JSON -> $output_file"
            ;;
        cyclonedx-xml)
            output_file="$OUTPUT_DIR/sbom.cdx.xml"
            echo "Generating CycloneDX XML -> $output_file"
            ;;
        syft-json)
            output_file="$OUTPUT_DIR/sbom.syft.json"
            echo "Generating Syft JSON -> $output_file"
            ;;
    esac

    syft scan "$PROJECT_ROOT" \
        --source-name "$PROJECT_NAME" \
        --source-version "$PROJECT_VERSION" \
        -o "$format=$output_file" \
        --quiet
done

echo ""
echo "SBOM generation complete!"
echo ""
echo "Generated files:"
ls -la "$OUTPUT_DIR"/*.{json,xml,spdx} 2>/dev/null || true
