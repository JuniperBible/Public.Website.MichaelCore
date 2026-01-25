{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    hugo
    gnumake
    go
    xz
    curl
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
