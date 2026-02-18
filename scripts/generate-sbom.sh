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
TEMP_FILES=()

# Cleanup function to remove temporary files
cleanup() {
    if [[ ${#TEMP_FILES[@]} -gt 0 ]]; then
        for temp_file in "${TEMP_FILES[@]}"; do
            if [[ -f "$temp_file" ]]; then
                rm -f "$temp_file"
            fi
        done
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

# Lookup table: CLI flag -> syft format name
declare -A FLAG_FORMAT=(
    [--spdx-json]="spdx-json"
    [--cyclonedx]="cyclonedx-json"
    [--cyclonedx-xml]="cyclonedx-xml"
    [--syft]="syft-json"
)

# parse_args: process all command-line flags
# CC = 1(base) + 1(while) + 4(case arms) = 6
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)        GENERATE_ALL=true; shift ;;
            --output-dir) OUTPUT_DIR="$2";   shift 2 ;;
            --help)       head -16 "$0" | tail -14; exit 0 ;;
            *)
                if [[ -v FLAG_FORMAT[$1] ]]; then
                    GENERATE_ALL=false
                    FORMATS+=("${FLAG_FORMAT[$1]}")
                    shift
                else
                    echo "Unknown option: $1"; exit 1
                fi
                ;;
        esac
    done
}

parse_args "$@"

# If generating all formats
if $GENERATE_ALL; then
    FORMATS=("spdx-json" "cyclonedx-json" "cyclonedx-xml" "syft-json")
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# ---------------------------------------------------------------------------
# Tool resolution order: local binary -> nix-shell -> build from source
# ---------------------------------------------------------------------------

# try_nix_tool: resolve a tool binary via nix-shell; prints path or returns 1
# CC = 1(base) + 1(if nix-shell) + 1(if nix_bin) = 3
try_nix_tool() {
    local name="$1" nix_pkg="$2"
    if command -v nix-shell &> /dev/null; then
        local nix_bin
        nix_bin="$(nix-shell -p "$nix_pkg" --run "command -v $name" 2>/dev/null)"
        if [[ -n "$nix_bin" ]]; then
            printf '%s' "$nix_bin"; return 0
        fi
    fi
    return 1
}

# try_build_tool: build a tool from source and print its binary path on success
# CC = 1(base) + 1(if build_dir) + 1(|| short-circuit) + 1(if local_bin exists) = 4
try_build_tool() {
    local name="$1" local_bin="$2" nix_pkg="$3" build_dir="$4" build_cmd="$5"
    if [[ -n "$build_dir" && -d "$build_dir" ]]; then
        echo "Building $name from source..." >&2
        (cd "$build_dir" && $build_cmd) || { echo "Error: failed to build $name" >&2; exit 1; }
        if [[ -n "$local_bin" && -f "$local_bin" && -x "$local_bin" ]]; then
            printf '%s' "$local_bin"; return 0
        fi
    fi
    return 1
}

# resolve_tool: find a tool binary in order of preference
# Usage: resolve_tool NAME LOCAL_BIN NIX_PKG [BUILD_DIR BUILD_CMD]
# CC = 1(base) + 1(if local) + 1(if nix) + 1(if PATH) + 1(if build) = 5
resolve_tool() {
    local name="$1" local_bin="$2" nix_pkg="$3" build_dir="${4:-}" build_cmd="${5:-}"

    # 1. Local binary (pre-built in tools/)
    if [[ -n "$local_bin" && -f "$local_bin" && -x "$local_bin" ]]; then
        printf '%s' "$local_bin"; return 0
    fi
    # 2. nix-shell
    if try_nix_tool "$name" "$nix_pkg"; then return 0; fi
    # 3. System PATH
    if command -v "$name" &> /dev/null; then
        printf '%s' "$(command -v "$name")"; return 0
    fi
    # 4. Build from source
    if try_build_tool "$name" "$local_bin" "$nix_pkg" "$build_dir" "$build_cmd"; then return 0; fi

    echo "Error: $name not found. Install with: nix-shell -p $nix_pkg" >&2
    exit 1
}

SYFT_BIN="$(resolve_tool syft \
    "$PROJECT_ROOT/tools/syft/syft-bin" \
    syft \
    "$PROJECT_ROOT/tools/syft" \
    "go build -o syft-bin ./cmd/syft/")"

JQ_BIN="$(resolve_tool jq "" jq)"

# Validate manual deps JSON file
if [[ -f "$MANUAL_DEPS" ]]; then
    if ! "$JQ_BIN" empty "$MANUAL_DEPS" 2>/dev/null; then
        echo "Error: $MANUAL_DEPS is not valid JSON"
        exit 1
    fi
else
    echo "Warning: Manual deps file not found: $MANUAL_DEPS"
    echo "Continuing without manual dependencies..."
fi

# ---------------------------------------------------------------------------
# Project version resolution
# ---------------------------------------------------------------------------

# resolve_version: determine the project version from git or fallback
resolve_version() {
    if git describe --tags --always 2>/dev/null; then
        return 0
    fi
    if [[ -d "$PROJECT_ROOT/.git" ]]; then
        echo "Warning: Unable to get version from git tags, using commit: $PROJECT_VERSION" >&2
        git rev-parse --short HEAD 2>/dev/null || echo "unknown"
        return 0
    fi
    echo "Warning: Not a git repository, using version: 0.0.0" >&2
    echo "0.0.0"
}

PROJECT_NAME="michael"
PROJECT_VERSION="$(resolve_version)"

echo "Generating SBOM for $PROJECT_NAME v$PROJECT_VERSION"
echo "Output directory: $OUTPUT_DIR"
echo "Manual deps: $MANUAL_DEPS"
echo ""

# ---------------------------------------------------------------------------
# Manual-dependency merge helpers (one per format)
# ---------------------------------------------------------------------------

# merge_spdx_json: merge manual deps into SPDX JSON
merge_spdx_json() {
    local syft_file="$1"
    local output_file="$2"

    # Convert software_deps.json to SPDX packages format and merge
    "$JQ_BIN" --slurpfile manual "$MANUAL_DEPS" '
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

# merge_cdx_json: merge manual deps into CycloneDX JSON
merge_cdx_json() {
    local syft_file="$1"
    local output_file="$2"

    "$JQ_BIN" --slurpfile manual "$MANUAL_DEPS" '
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

# merge_syft_json: merge manual deps into Syft JSON
merge_syft_json() {
    local syft_file="$1"
    local output_file="$2"

    "$JQ_BIN" --slurpfile manual "$MANUAL_DEPS" '
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

# ---------------------------------------------------------------------------
# Format dispatch
# ---------------------------------------------------------------------------

# format_output_file: map a syft format name to its output filename
format_output_file() {
    local format="$1"
    case $format in
        spdx-json)     echo "$OUTPUT_DIR/sbom.spdx.json" ;;
        cyclonedx-json) echo "$OUTPUT_DIR/sbom.cdx.json" ;;
        cyclonedx-xml)  echo "$OUTPUT_DIR/sbom.cdx.xml"  ;;
        syft-json)      echo "$OUTPUT_DIR/sbom.syft.json" ;;
    esac
}

# merge_into_output: run the appropriate merge helper for formats that need it;
# for formats that generate directly (XML), do nothing.
merge_into_output() {
    local format="$1" temp_file="$2" output_file="$3"
    case $format in
        spdx-json)      merge_spdx_json  "$temp_file" "$output_file" ;;
        cyclonedx-json) merge_cdx_json   "$temp_file" "$output_file" ;;
        syft-json)      merge_syft_json  "$temp_file" "$output_file" ;;
    esac
}

# generate_format: run Syft and merge manual deps for one format
generate_format() {
    local format="$1"
    local output_file
    output_file="$(format_output_file "$format")"

    if [[ "$format" == "cyclonedx-xml" ]]; then
        # XML merging is complex; generate directly (manual deps won't be included)
        echo "Generating CycloneDX XML -> $output_file"
        "$SYFT_BIN" scan "$PROJECT_ROOT" \
            --source-name "$PROJECT_NAME" \
            --source-version "$PROJECT_VERSION" \
            -o "cyclonedx-xml=$output_file" \
            --quiet
        echo "  Note: Manual deps not merged into XML format"
        return 0
    fi

    local temp_file
    temp_file="$(mktemp)"
    TEMP_FILES+=("$temp_file")

    echo "Generating $format -> $output_file"
    "$SYFT_BIN" scan "$PROJECT_ROOT" \
        --source-name "$PROJECT_NAME" \
        --source-version "$PROJECT_VERSION" \
        -o "$format=$temp_file" \
        --quiet

    merge_into_output "$format" "$temp_file" "$output_file"
}

# Generate each requested format
for format in "${FORMATS[@]}"; do
    generate_format "$format"
done

echo ""
echo "SBOM generation complete!"
echo ""
echo "Manual dependencies merged from: $MANUAL_DEPS"
echo "  Tools: $("$JQ_BIN" '.tools | length' "$MANUAL_DEPS")"
echo "  Libraries: $("$JQ_BIN" '.libraries | length' "$MANUAL_DEPS")"
echo "  Data sources: $("$JQ_BIN" '.data_sources | length' "$MANUAL_DEPS")"
echo ""
echo "Generated files:"
ls -la "$OUTPUT_DIR"/*.{json,xml} 2>/dev/null || true
