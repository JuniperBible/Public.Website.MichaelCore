{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    hugo
    nodejs_22
    cloc
  ];

  shellHook = ''
    echo "Michael - Bible UI Hugo Module"
    echo "==============================="
    echo ""
    echo "This is a Hugo module, not standalone."
    echo "Use from parent project with module mounts."
    echo ""
    echo "Contents:"
    echo "  layouts/religion/bibles/  - Bible page layouts"
    echo "  assets/js/               - Bible JavaScript"
    echo "  i18n/                    - Translations"
    echo "  content/bibles/          - Bible content pages"
    echo ""
  '';
}
