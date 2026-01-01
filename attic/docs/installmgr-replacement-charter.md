# InstallMgr Replacement Charter

**Status: COMPLETE** ✓

A native Go implementation of the SWORD `installmgr` tool, integrated into sword-converter.

## Summary

The native Go repository manager (`sword-converter repo`) fully replaces CrossWire's `installmgr` tool with the following features:

- List 11 remote sources (CrossWire, eBible.org, IBT, STEP Bible, etc.)
- Browse and install modules from any source
- Verify module integrity via size checking
- Bulk download with skip-installed support
- Graceful handling of unavailable packages

## Implemented Features

| Feature | Command | Status |
|---------|---------|--------|
| List remote sources | `repo list-sources` | ✓ Complete |
| Refresh source | `repo refresh <source>` | ✓ Complete |
| List remote modules | `repo list <source>` | ✓ Complete |
| Install module | `repo install <source> <module>` | ✓ Complete |
| List installed modules | `repo installed` | ✓ Complete |
| Uninstall module | `repo uninstall <module>` | ✓ Complete |
| Verify integrity | `repo verify [module]` | ✓ Complete |

## Architecture

### Package Structure

```
tools/sword-converter/pkg/repository/
├── source.go         # Remote source definitions (11 FTP sources)
├── source_test.go
├── client.go         # HTTP/FTP client with retry/timeout
├── client_test.go
├── ftp.go            # FTP protocol implementation
├── index.go          # Module index parsing (mods.d.tar.gz)
├── index_test.go
├── localconfig.go    # Local configuration (~/.sword)
├── config_test.go
├── installer.go      # Install/uninstall/verify operations
└── installer_test.go
```

### Supported Sources

| Name | Type | Host | Directory |
|------|------|------|-----------|
| Bible.org | FTP | ftp.crosswire.org | /pub/bible.org/sword |
| CrossWire | FTP | ftp.crosswire.org | /pub/sword/raw |
| CrossWire Attic | FTP | ftp.crosswire.org | /pub/sword/atticraw |
| CrossWire Beta | FTP | ftp.crosswire.org | /pub/sword/betaraw |
| CrossWire Wycliffe | FTP | ftp.crosswire.org | /pub/sword/wyclifferaw |
| Deutsche Bibelgesellschaft | FTP | ftp.crosswire.org | /pub/sword/dbgraw |
| IBT | FTP | ftp.ibt.org.ru | /pub/modsword/raw |
| Lockman Foundation | FTP | ftp.crosswire.org | /pub/sword/lockmanraw |
| STEP Bible | FTP | ftp.stepbible.org | /pub/sword |
| Xiphos | FTP | ftp.xiphos.org | /pub/xiphos |
| eBible.org | FTP | ftp.ebible.org | /sword |

### Package URL Patterns

Different sources use different directory structures for zip packages:

| Pattern | Sources |
|---------|---------|
| `/packages/rawzip/` | CrossWire main |
| `/{name}packages/` | CrossWire variants (Lockman, etc.) |
| `/rawzip/` | IBT |
| `/zip/` | eBible.org |

### Module Verification

Verify installed modules without redownloading:

```bash
./sword-converter repo verify        # All modules
./sword-converter repo verify KJV    # Single module
```

Checks performed:
1. Conf file exists
2. Data directory has files
3. Size matches `InstallSize` metadata (if available)

### Error Handling

- **done** - Successfully installed
- **unavailable** - Module in index but no package on server
- **failed** - Download or installation error

## CLI Commands

```bash
# List sources
./sword-converter repo list-sources

# List available modules
./sword-converter repo list CrossWire
./sword-converter repo list "eBible.org"

# Install module
./sword-converter repo install CrossWire KJV

# List installed
./sword-converter repo installed

# Verify integrity
./sword-converter repo verify
./sword-converter repo verify KJV

# Uninstall
./sword-converter repo uninstall KJV
```

## Justfile Integration

```bash
# Single module operations
just bible-sources              # List remote sources
just bible-list                 # List installed modules
just bible-available [source]   # List available from source
just bible-download <mod>       # Download single module
just bible-remove <mod>         # Uninstall module
just bible-verify [mod]         # Verify integrity
just bible-convert              # Convert to Hugo JSON
just bible-add <mod>            # Full workflow

# Bulk operations
just bible-download-all [source]      # All from source
just bible-download-mega              # All from ALL sources
just bible-download-all-verify        # Verify source complete
just bible-download-mega-verify       # Verify all complete
```

## Test Coverage

- Source parsing and validation
- FTP connection and download
- Module index (tar.gz) parsing
- Conf file parsing with InstallSize
- Module installation and extraction
- Module uninstallation
- Integrity verification (size matching)
- Error handling (404/550 detection)

## Dependencies

- `github.com/jlaffaye/ftp` - FTP client
- Go standard library (`archive/tar`, `archive/zip`, `compress/gzip`)
- No CGO dependencies

## Related Documentation

- [Religion Section Guide](religion-section.md) - Usage instructions
- [Development Guide](development.md) - Just commands
- [SWORD Binary Format](data_structures.md) - Module format
