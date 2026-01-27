{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Build tools
    gnumake
    go

    # Dev servers (optional - built from submodules if not present)
    # hugo
    # caddy

    # SBOM generation
    syft
    jq

    # Utilities
    xz
    curl
    lsof  # for kill-dev target
    git
    cloc
  ];

  shellHook = ''
    echo "Michael - Hugo Bible Module"
    echo "==========================="
    echo ""
    echo "Commands:"
    echo "  make dev       Start Caddy dev server (production-like)"
    echo "  make dev-hugo  Start Hugo dev server (live reload)"
    echo "  make build     Build static site"
    echo "  make clean     Remove generated files"
    echo "  make help      Show all commands"
    echo ""
  '';
}
