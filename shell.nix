{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    hugo
    nodejs_22
    # Image processing tools
    libwebp      # cwebp for WebP conversion
    imagemagick  # convert for image resizing
    # Go toolchain for juniper
    go
    # SQLite for e-Sword support
    sqlite
    # Python only needed for legacy comparison tests
    python3
    # SWORD tools for Bible extraction
    sword
  ];

  shellHook = ''
    echo "Focus with Justin - Development Environment"
    echo "============================================"
    echo ""
    echo "Commands:"
    echo "  npm run dev    - Start development server"
    echo "  npm run build  - Build for production"
    echo ""
    echo "Image tools:"
    echo "  cwebp          - Convert images to WebP"
    echo "  convert        - Resize/process images (ImageMagick)"
    echo ""
    echo "SWORD converter (tools/juniper/):"
    echo "  go build ./cmd/juniper  - Build converter"
    echo "  go test ./...                   - Run tests"
    echo ""
    echo "Bible extraction:"
    echo "  go run ./tools/juniper/cmd/extract -o data/ -v"
    echo "  diatheke -b KJV -k Gen 1:1      - Test SWORD access"
    echo ""
  '';
}
