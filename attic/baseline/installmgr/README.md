# InstallMgr Baseline Reference

This directory contains reference documentation and test scripts for the SWORD `installmgr` tool,
used for 1:1 comparison testing with the Go replacement in `pkg/repository/`.

## Original Tool Location

The `installmgr` binary is part of the SWORD library and is installed via:
- Nix: `nix-shell -p sword`
- Debian/Ubuntu: `apt install libsword-utils`
- macOS: `brew install sword`

## Command Reference

| Command | Description | Go Equivalent |
|---------|-------------|---------------|
| `installmgr -s` | List remote sources | `repo list-sources` |
| `installmgr -r <source>` | Refresh source | `repo refresh <source>` |
| `installmgr -rl <source>` | List remote modules | `repo list <source>` |
| `installmgr -ri <source> <module>` | Install module | `repo install <source> <module>` |
| `installmgr -l` | List installed modules | `repo installed` |
| `installmgr -u <module>` | Uninstall module | `repo uninstall <module>` |
| `installmgr -rdesc <source> <module>` | Describe module | `repo describe <source> <module>` |
| `installmgr -rd <source>` | List updated modules | `repo updates <source>` |
| `installmgr -init` | Init config | `repo init` |
| `installmgr -sc` | Sync config | `repo sync` |
| `installmgr -li <path> <module>` | Install from local | `repo install-local <path> <module>` |

## Test Scripts

### compare_sources.sh

Compares source listing output between installmgr and Go implementation:

```bash
#!/bin/bash
# Compare remote sources listing
echo "=== installmgr sources ==="
installmgr -s 2>/dev/null

echo ""
echo "=== Go implementation sources ==="
cd ../../tools/sword-converter
go run ./cmd/sword-converter repo list-sources
```

### compare_modules.sh

Compares module listing output:

```bash
#!/bin/bash
SOURCE=${1:-CrossWire}

echo "=== installmgr modules ($SOURCE) ==="
installmgr -rl "$SOURCE" 2>/dev/null | head -50

echo ""
echo "=== Go implementation modules ($SOURCE) ==="
cd ../../tools/sword-converter
go run ./cmd/sword-converter repo list "$SOURCE" | head -50
```

### test_install.sh

Tests module installation parity:

```bash
#!/bin/bash
MODULE=${1:-KJV}
SOURCE=${2:-CrossWire}

# Create temporary directories
ORIG_DIR=$(mktemp -d)
GO_DIR=$(mktemp -d)

# Install with original tool
export SWORD_PATH="$ORIG_DIR"
installmgr -ri "$SOURCE" "$MODULE"

# Install with Go tool
cd ../../tools/sword-converter
go run ./cmd/sword-converter repo install "$SOURCE" "$MODULE" --sword-path "$GO_DIR"

# Compare results
echo "=== Comparing conf files ==="
diff "$ORIG_DIR/.sword/mods.d/${MODULE,,}.conf" "$GO_DIR/.sword/mods.d/${MODULE,,}.conf"

echo "=== Comparing data files ==="
diff -r "$ORIG_DIR/.sword/modules/" "$GO_DIR/.sword/modules/"

# Cleanup
rm -rf "$ORIG_DIR" "$GO_DIR"
```

## Configuration Files

### Sample install.conf

Located at `~/.sword/mods.d/install.conf`:

```ini
[General]

[CrossWire]
FTPSource=ftp.crosswire.org|/pub/sword/raw|CrossWire

[CrossWire Beta]
FTPSource=ftp.crosswire.org|/pub/sword/betaraw|CrossWire Beta

[eBible.org]
FTPSource=ftp.ebible.org|/sword|eBible.org

[IBT]
FTPSource=ftp.ibt.org.ru|/pub/modsword/raw|IBT

[STEP Bible]
FTPSource=ftp.stepbible.org|/pub/sword|STEP Bible
```

## Module Index Format

The `mods.d.tar.gz` archive contains `.conf` files for each available module:

```
mods.d.tar.gz
├── mods.d/
│   ├── kjv.conf
│   ├── drc.conf
│   ├── vulgate.conf
│   └── ...
```

Each `.conf` file follows INI format:

```ini
[KJV]
DataPath=./modules/texts/ztext/kjv/
ModDrv=zText
BlockType=BOOK
CompressType=ZIP
SourceType=OSIS
Encoding=UTF-8
Lang=en
Description=King James Version (1769) with Strongs Numbers
About=The King James Version of the Holy Bible...
Version=3.1
Feature=StrongsNumbers
```

## Success Criteria for Go Replacement

1. **Source Operations**
   - [x] List sources matches installmgr -s output
   - [ ] Refresh downloads same mods.d.tar.gz
   - [ ] Module listing matches installmgr -rl output

2. **Install Operations**
   - [ ] Downloads same data files
   - [ ] Creates identical conf file
   - [ ] Files placed in correct locations

3. **Uninstall Operations**
   - [ ] Removes same files as installmgr -u
   - [ ] Handles modules with data in multiple locations

4. **Error Handling**
   - [ ] Network timeouts handled gracefully
   - [ ] Invalid source names rejected
   - [ ] Missing modules reported clearly

## Related Files

- `../../docs/installmgr-replacement-charter.md` - Implementation plan
- `../../tools/sword-converter/pkg/repository/` - Go implementation
- `../../tools/sword-converter/pkg/repository/*_test.go` - Unit tests
