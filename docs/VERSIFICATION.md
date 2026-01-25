# Bible Versification Systems

This document explains the different Bible versification systems supported by Michael.

## Overview

Different Bible traditions include different books and sometimes number verses differently. Michael handles these variations through versification system identifiers.

## Canon Comparison

| Tradition | OT Books | NT Books | Apocrypha | Total |
|-----------|----------|----------|-----------|-------|
| Protestant | 39 | 27 | 0 | 66 |
| Catholic | 46 | 27 | 0 | 73 |
| Orthodox | 49-51 | 27 | 0 | 76-78 |
| Ethiopian | 54 | 27 | 0 | 81 |

## Versification Systems

### Protestant (`protestant`)

The standard 66-book Protestant Bible canon.

**Old Testament (39 books):**
Genesis through Malachi

**New Testament (27 books):**
Matthew through Revelation

**Used by:** NIV, ESV, NASB, most modern English Bibles

### KJV with Apocrypha (`kjva`)

Protestant canon plus the Apocrypha between the testaments.

**Additional books (7):**
- 1 Esdras
- 2 Esdras
- Tobit
- Judith
- Additions to Esther
- Wisdom of Solomon
- Sirach (Ecclesiasticus)
- Baruch (with Letter of Jeremiah)
- Prayer of Azariah
- Susanna
- Bel and the Dragon
- Prayer of Manasseh
- 1 Maccabees
- 2 Maccabees

**Used by:** KJVA, NRSVA, some Anglican traditions

### Catholic (`catholic`)

The Catholic canon includes deuterocanonical books integrated into the Old Testament.

**Deuterocanonical books (7):**
- Tobit
- Judith
- 1 Maccabees
- 2 Maccabees
- Wisdom
- Sirach
- Baruch

**Also includes:**
- Additions to Esther (within Esther)
- Additions to Daniel (within Daniel)

**Used by:** DRC, NAB, JB, NJB, Vulgate

### Orthodox (`orthodox`)

Eastern Orthodox canon varies by jurisdiction but typically includes:

**Additional to Catholic:**
- 3 Maccabees
- 4 Maccabees (appendix)
- 1 Esdras
- Prayer of Manasseh
- Psalm 151

**Used by:** RST (Russian Synodal), Greek Orthodox Bibles

### Septuagint (`lxx`)

The Greek Old Testament used by early Christians.

**Characteristics:**
- 53 books total
- Different book order than Hebrew Bible
- Includes deuterocanonical works
- Some books have different text (e.g., Jeremiah is shorter)

**Used by:** LXX, academic editions

### Leningrad (`leningrad`)

The Hebrew Masoretic text following the Leningrad Codex.

**Characteristics:**
- 39 books (Protestant OT only)
- Hebrew book order (Torah, Nevi'im, Ketuvim)
- Verse numbering may differ from English translations

**Used by:** OSMHB, BHS, academic Hebrew texts

## Psalm Numbering

Psalm numbering differs between Hebrew (Masoretic) and Greek (Septuagint) traditions:

| Hebrew | Greek/Latin | Notes |
|--------|-------------|-------|
| Ps 1-8 | Ps 1-8 | Same |
| Ps 9-10 | Ps 9 | Combined in Greek |
| Ps 11-113 | Ps 10-112 | Greek is one behind |
| Ps 114-115 | Ps 113 | Combined in Greek |
| Ps 116 | Ps 114-115 | Split in Greek |
| Ps 117-146 | Ps 116-145 | Greek is one behind |
| Ps 147 | Ps 146-147 | Split in Greek |
| Ps 148-150 | Ps 148-150 | Same |
| — | Ps 151 | Greek only |

**Michael handles this by:**
- Using the versification system to determine numbering
- Displaying the appropriate psalm number for each tradition
- Mapping between systems when comparing translations

## Book Name Variations

Some books have different names across traditions:

| Protestant | Catholic | Notes |
|------------|----------|-------|
| 1 Samuel | 1 Kings | Catholic follows LXX naming |
| 2 Samuel | 2 Kings | |
| 1 Kings | 3 Kings | |
| 2 Kings | 4 Kings | |
| Ezra | 1 Esdras | Different from Apocryphal 1 Esdras |
| Nehemiah | 2 Esdras | Different from Apocryphal 2 Esdras |
| Song of Solomon | Canticle of Canticles | |
| Revelation | Apocalypse | |

## Implementation in Michael

### Data Structure

```json
{
  "id": "drc",
  "versification": "catholic",
  "books": [
    {"id": "Gen", "name": "Genesis", "chapters": 50},
    {"id": "Tob", "name": "Tobias", "chapters": 14}
  ]
}
```

### Comparison Handling

When comparing translations with different versifications:

1. **Book availability** - Some books may only appear in certain translations
2. **Verse mapping** - Psalm numbers are adjusted when needed
3. **Chapter counts** - May vary (e.g., Daniel has 14 chapters in Catholic versions)

### User Interface

- Translations clearly labeled with their tradition
- Unavailable books/chapters grayed out in comparison
- Tooltips explain versification differences

## SWORD Module Mapping

| Versification | SWORD Modules |
|---------------|---------------|
| protestant | KJV, ASV, WEB, most modules |
| kjva | KJVA, NRSVA |
| catholic | DRC, Vulgate, NAB |
| orthodox | RusSynodal, UkrOgienko |
| lxx | LXX, Brenton |
| leningrad | OSMHB, BHS |

## See Also

- [DATA-FORMATS.md](DATA-FORMATS.md) - Data structure details
- [docs/README.md](README.md) - SWORD module recommendations
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
