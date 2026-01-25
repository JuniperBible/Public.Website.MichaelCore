{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    hugo
    gnumake
    go
    xz
    curl
    syft  # SBOM generator
  ];

  shellHook = ''
    echo "Michael - Hugo Bible Module"
    echo "==========================="
    echo ""
    echo "Commands:"
    echo "  make dev     Start development server"
    echo "  make build   Build static site"
    echo "  make clean   Remove generated files"
    echo ""
  '';
}
