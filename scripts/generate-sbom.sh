#!/usr/bin/env bash
# Generate Software Bill of Materials (SBOM) in multiple formats
# Uses Syft to scan project dependencies and merges manual software_deps.json
#
# Usage: ./scripts/generate-sbom.sh [OPTIONS]
#
# Options:
#   --all           Generate all formats (default)
#   --spdx-json     Generate SPDX 2.3 JSON
#   --cyclonedx     Generate CycloneDX JSON
#   --cyclonedx-xml Generate CycloneDX XML
#   --syft          Generate Syft JSON (native format)
#   --output-dir    Output directory (default: assets/downloads/sbom)
#   --help          Show this help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_ROOT}/assets/downloads/sbom"
MANUAL_DEPS="${PROJECT_ROOT}/data/example/software_deps.json"
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
            head -16 "$0" | tail -14
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

# Check for required tools
if ! command -v syft &> /dev/null; then
    echo "Error: syft not found. Install with: nix-shell -p syft"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq not found. Install with: nix-shell -p jq"
    exit 1
fi

# Project metadata
PROJECT_NAME="michael"
PROJECT_VERSION=$(git describe --tags --always 2>/dev/null || echo "0.0.0")

echo "Generating SBOM for $PROJECT_NAME v$PROJECT_VERSION"
echo "Output directory: $OUTPUT_DIR"
echo "Manual deps: $MANUAL_DEPS"
echo ""

# Function to merge manual deps into SPDX JSON
merge_spdx_json() {
    local syft_file="$1"
    local output_file="$2"

    # Convert software_deps.json to SPDX packages format and merge
    jq --slurpfile manual "$MANUAL_DEPS" '
        # Convert manual deps to SPDX package format
        def to_spdx_package:
            {
                SPDXID: ("SPDXRef-Package-\(.name | gsub(" "; "-") | ascii_downcase)"),
                name: .name,
                versionInfo: .version,
                supplier: .supplier,
                downloadLocation: .downloadLocation,
                licenseConcluded: .license,
                licenseDeclared: .license,
                copyrightText: "NOASSERTION",
                description: .description,
                primaryPackagePurpose: .purpose
            };

        # Merge manual packages into packages array
        .packages += (($manual[0].tools + $manual[0].data_sources + $manual[0].libraries) | map(to_spdx_package))
    ' "$syft_file" > "$output_file"
}

# Function to merge manual deps into CycloneDX JSON
merge_cdx_json() {
    local syft_file="$1"
    local output_file="$2"

    jq --slurpfile manual "$MANUAL_DEPS" '
        # Convert manual deps to CycloneDX component format
        def to_cdx_component:
            {
                type: (if .purpose == "APPLICATION" then "application" elif .purpose == "DATA" then "data" else "library" end),
                name: .name,
                version: .version,
                description: .description,
                licenses: [{ license: { id: .license } }],
                externalReferences: [
                    {
                        type: "website",
                        url: .downloadLocation
                    }
                ]
            };

        # Merge manual components into components array
        .components += (($manual[0].tools + $manual[0].data_sources + $manual[0].libraries) | map(to_cdx_component))
    ' "$syft_file" > "$output_file"
}

# Function to merge manual deps into Syft JSON
merge_syft_json() {
    local syft_file="$1"
    local output_file="$2"

    jq --slurpfile manual "$MANUAL_DEPS" '
        # Convert manual deps to Syft artifact format
        def to_syft_artifact:
            {
                name: .name,
                version: .version,
                type: "manual",
                foundBy: "software_deps.json",
                locations: [],
                licenses: [{ value: .license }],
                language: "",
                cpes: [],
                purl: "",
                metadataType: "ManualEntry",
                metadata: {
                    description: .description,
                    supplier: .supplier,
                    downloadLocation: .downloadLocation,
                    purpose: .purpose
                }
            };

        # Merge manual artifacts into artifacts array
        .artifacts += (($manual[0].tools + $manual[0].data_sources + $manual[0].libraries) | map(to_syft_artifact))
    ' "$syft_file" > "$output_file"
}

# Generate each format
for format in "${FORMATS[@]}"; do
    case $format in
        spdx-json)
            output_file="$OUTPUT_DIR/sbom.spdx.json"
            temp_file=$(mktemp)
            echo "Generating SPDX 2.3 JSON -> $output_file"
            syft scan "$PROJECT_ROOT" \
                --source-name "$PROJECT_NAME" \
                --source-version "$PROJECT_VERSION" \
                -o "spdx-json=$temp_file" \
                --quiet
            merge_spdx_json "$temp_file" "$output_file"
            rm "$temp_file"
            ;;
        cyclonedx-json)
            output_file="$OUTPUT_DIR/sbom.cdx.json"
            temp_file=$(mktemp)
            echo "Generating CycloneDX JSON -> $output_file"
            syft scan "$PROJECT_ROOT" \
                --source-name "$PROJECT_NAME" \
                --source-version "$PROJECT_VERSION" \
                -o "cyclonedx-json=$temp_file" \
                --quiet
            merge_cdx_json "$temp_file" "$output_file"
            rm "$temp_file"
            ;;
        cyclonedx-xml)
            output_file="$OUTPUT_DIR/sbom.cdx.xml"
            echo "Generating CycloneDX XML -> $output_file"
            # XML merging is complex, generate directly (manual deps won't be included)
            syft scan "$PROJECT_ROOT" \
                --source-name "$PROJECT_NAME" \
                --source-version "$PROJECT_VERSION" \
                -o "cyclonedx-xml=$output_file" \
                --quiet
            echo "  Note: Manual deps not merged into XML format"
            ;;
        syft-json)
            output_file="$OUTPUT_DIR/sbom.syft.json"
            temp_file=$(mktemp)
            echo "Generating Syft JSON -> $output_file"
            syft scan "$PROJECT_ROOT" \
                --source-name "$PROJECT_NAME" \
                --source-version "$PROJECT_VERSION" \
                -o "syft-json=$temp_file" \
                --quiet
            merge_syft_json "$temp_file" "$output_file"
            rm "$temp_file"
            ;;
    esac
done

echo ""
echo "SBOM generation complete!"
echo ""
echo "Manual dependencies merged from: $MANUAL_DEPS"
echo "  Tools: $(jq '.tools | length' "$MANUAL_DEPS")"
echo "  Libraries: $(jq '.libraries | length' "$MANUAL_DEPS")"
echo "  Data sources: $(jq '.data_sources | length' "$MANUAL_DEPS")"
echo ""
echo "Generated files:"
ls -la "$OUTPUT_DIR"/*.{json,xml} 2>/dev/null || true
