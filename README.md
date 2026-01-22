# Michael - Hugo Bible Extension

Plug-and-play Hugo module for Bible reading functionality.

## Features

- 5 base Bible translations included (KJV, Geneva, Tyndale, DRC, Vulgate)
- Side-by-side translation comparison (up to 11 translations)
- Full-text search with Strong's numbers (H####/G####)
- Verse sharing (URL, clipboard, Twitter/X, Facebook)
- Use Juniper to download, convert, and install more translations

## Installation

```toml
# hugo.toml
[module]
  [[module.imports]]
    path = "github.com/FocuswithJustin/michael"
```

Or as git submodule:

```bash
git submodule add git@github.com:FocuswithJustin/michael.git tools/michael
```

## Configuration

```toml
[params.michael]
  basePath = "/bibles"        # URL path for Bible section
  backLink = "/"              # Back navigation link
```

## Data Requirements

Consuming sites must provide:

1. `data/bibles.json` - Bible metadata
2. `data/bibles_auxiliary/{id}.json` - Per-translation verse data

See `static/schemas/` for JSON Schema validation.

## SWORD Module Selection

Michael supports 2021 SWORD modules from CrossWire. The recommended module selection below prioritizes:
1. **Jewish/Hebrew source** (OT): OSMHB, LXX
2. **Catholic versification** (73 books with deuterocanonicals)
3. **Protestant** (66 books) where Catholic not available
4. **Ethiopian sources** for unique books (1 Enoch, Jubilees)

### Canon Coverage

| Canon | Books | Coverage |
|-------|-------|----------|
| Protestant | 66 | Full coverage in most languages |
| Catholic | 73 | +7 deuterocanonical books |
| Orthodox | 76-78 | +Prayer of Manasseh, 1-4 Esdras, etc. |
| Ethiopian Orthodox | 81 | +1 Enoch, Jubilees, 1-3 Meqabyan, etc. |

**Maximum achievable with SWORD**: ~75 books (Ethiopian-unique texts largely unavailable)

### Core Source Texts (8 modules)

These provide the original language texts and critical apparatus:

| Module | Lang | Description | Versification | Books |
|--------|------|-------------|---------------|-------|
| `OSMHB` | he | Open Scriptures Hebrew Bible | Leningrad | 39 OT |
| `LXX` | grc | Septuagint (Rahlfs') | LXX | 53 OT |
| `SBLGNT` | grc | SBL Greek New Testament | Protestant | 27 NT |
| `Vulgate` | la | Latin Vulgate (Jerome) | Catholic | 73 |
| `Geez` | gez | Ge'ez Bible (OT) | - | OT |
| `Enoch` | en | 1 Enoch (R.H. Charles) | - | 1 book |
| `GezEnoch` | gez | 1 Enoch in Ge'ez | - | 1 book |
| `Jubilees` | en | Book of Jubilees | - | 1 book |

### Tier 1: Catholic Versification (73 books)

Languages with full deuterocanonical support:

| Module | Lang | Language | Description |
|--------|------|----------|-------------|
| `DRC` | en | English | Douay-Rheims Challoner |
| `KJVA` | en | English | King James Version with Apocrypha |
| `SpaPlatense` | es | Spanish | La Sagrada Biblia (Platense) |
| `FreCrampon` | fr | French | Bible Crampon |
| `PorCap` | pt | Portuguese | Bíblia Católica |
| `NLCanisius1939` | nl | Dutch | Petrus Canisius Bijbel |
| `VieElcCmn` | vi | Vietnamese | Bản Công Giáo |
| `HunKNB` | hu | Hungarian | Katolikus Bibliafordítás |

### Tier 2: Orthodox Versification (76-78 books)

| Module | Lang | Language | Description |
|--------|------|----------|-------------|
| `RusSynodal` | ru | Russian | Синодальный перевод |
| `UkrOgienko` | uk | Ukrainian | Переклад Огієнка |

### Tier 3: NRSVA/KJVA (73 books with Apocrypha)

| Module | Lang | Language | Description |
|--------|------|----------|-------------|
| `SpaBLM2022eb` | es | Spanish | Biblia Libre para las Masas |
| `FraSBL2022eb` | fr | French | SBL French |
| `DutSVVA` | nl | Dutch | Statenvertaling met Apocriefe |
| `Swe1917` | sv | Swedish | 1917 års Bibelöversättning |
| `FinPR` | fi | Finnish | Pyhä Raamattu |

### Tier 4: Protestant (66 books)

Languages with only Protestant versions available:

| Module | Lang | Language | Description |
|--------|------|----------|-------------|
| `Deu1912eb` | de | German | Luther 1912 |
| `ItaDio` | it | Italian | Diodati |
| `Jpn1965eb` | ja | Japanese | 口語訳聖書 |
| `CmnNCVs2010eb` | zh | Chinese | 新譯本 |
| `KorRV` | ko | Korean | 개역한글 |
| `PolSZ2016eb` | pl | Polish | Biblia Warszawska |
| `TurHadi` | tr | Turkish | Hadi Dereciler |
| `AraNAV` | ar | Arabic | الكتاب المقدس |
| `HinERV` | hi | Hindi | हिंदी संशोधित |
| `Ind2015eb` | id | Indonesian | Alkitab |
| `HebLB2009eb` | he | Hebrew | הברית החדשה |
| `GreVamvas` | el | Greek | Vamvas |
| `FarOPV` | fa | Persian | ترجمه قدیم |
| `CzeCEP` | cs | Czech | Český Ekumenický |
| `ThaNTV2020eb` | th | Thai | ฉบับมาตรฐาน |
| `BenIRV2019eb` | bn | Bengali | বাংলা |
| `UrdIRV2019eb` | ur | Urdu | اردو |
| `Pan2017eb` | pa | Punjabi | ਪੰਜਾਬੀ |
| `Swahili` | sw | Swahili | Biblia |
| `RomCor` | ro | Romanian | Cornilescu |
| `Dan1931eb` | da | Danish | Dansk 1931 |
| `TelIRV2019eb` | te | Telugu | తెలుగు |
| `Mar2017eb` | mr | Marathi | मराठी |
| `TamIRV2019eb` | ta | Tamil | தமிழ் |
| `TglULB2018eb` | tl | Filipino | Tagalog |
| `Hausa2020eb` | ha | Hausa | Littafi Mai Tsarki |
| `Amh2003eb` | am | Amharic | መጽሐፍ ቅዱስ |

### Languages Without SWORD Modules

| Lang | Language | Alternative |
|------|----------|-------------|
| `ms` | Malay | Use Indonesian (`Ind2015eb`) |
| `jv` | Javanese | Use Indonesian (`Ind2015eb`) |
| `la` | Latin | Already covered by `Vulgate` |

### Ethiopian-Unique Books (NOT in SWORD)

The following books from the Ethiopian Orthodox canon are **not available** in any SWORD repository:

- 1-3 Meqabyan (Ethiopian Maccabees)
- Josippon (Ethiopian version of Josephus)
- Sinodos (Ethiopian church order)
- Fekkare Iyesus (Explanation of Jesus)
- Didesqelya (Ethiopian Didascalia)
- Mashafa Berhan (Book of Light)
- Mashafa Milad (Book of Nativity)
- Qalementos (Clement)
- Book of the Covenant
- Fetha Nagast (Law of Kings)

## Ingesting Modules

Use Juniper (via capsule) to convert SWORD modules to Hugo JSON:

```bash
# List available modules
./bin/capsule juniper list

# Ingest specific modules
./bin/capsule juniper ingest --modules=DRC,KJV,Vulgate

# Export to Hugo data files
./bin/capsule juniper hugo --output=data/bibles_auxiliary/
```

### Module Types

| Type | ModDrv | Supported |
|------|--------|-----------|
| zText | Compressed Bible | Yes |
| RawText | Uncompressed Bible | Yes |
| zText4 | 64-bit compressed | Yes |
| RawGenBook | General books | Planned |
| RawLD | Dictionary/Lexicon | No |

**Note**: `Enoch`, `GezEnoch`, and `Jubilees` use `RawGenBook` format and require additional support.

## Companion Modules

| Module | Purpose |
|--------|---------|
| **AirFold** | Visual theme (CSS, base layouts) |
| **Gabriel** | Contact form functionality |
| **Juniper** | SWORD/e-Sword to JSON conversion |

## Reference

See `attic` branch for pre-modularization working implementation.

## Status

Fresh build in progress. See [TODO.txt](TODO.txt) for current tasks.

## License

Copyright (c) 2024 - Present Justin. All rights reserved.
