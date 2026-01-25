# Third-Party Licenses and Data Sources

This document lists third-party content and data sources included in or used by the Michael Hugo Bible module.

---

## Bible Text Data

All Bible texts included in this project are obtained from public domain sources or licensed modules distributed via the SWORD Project.

### Bible Translations (via SWORD Project)

The following Bible translations are extracted from SWORD Project modules using the Juniper conversion tool:

#### Public Domain Translations

| Translation | Source | License | Files |
|-------------|--------|---------|-------|
| American Standard Version (1901) | SWORD: ASV | Public Domain (CC-PDDC) | `data/example/bible_auxiliary/asv.json`, `assets/downloads/asv.tar.xz` |
| Douay-Rheims Bible, Challoner Revision | SWORD: DRC | Public Domain (CC-PDDC) | `data/example/bible_auxiliary/drc.json`, `assets/downloads/drc.tar.xz` |
| Geneva Bible (1599) | SWORD: Geneva1599 | Public Domain (CC-PDDC) | `data/example/bible_auxiliary/geneva1599.json`, `assets/downloads/geneva1599.tar.xz` |
| William Tyndale Bible (1525/1530) | SWORD: Tyndale | Public Domain (CC-PDDC) | `data/example/bible_auxiliary/tyndale.json`, `assets/downloads/tyndale.tar.xz` |
| Latin Vulgate | SWORD: Vulgate | Public Domain (CC-PDDC) | `data/example/bible_auxiliary/vulgate.json`, `assets/downloads/vulgate.tar.xz` |
| World English Bible | SWORD: WEB | Public Domain (CC-PDDC) | `data/example/bible_auxiliary/web.json`, `assets/downloads/web.tar.xz` |
| Open Scriptures Morphological Hebrew Bible | SWORD: OSMHB | Public Domain (CC-PDDC) | `data/example/bible_auxiliary/osmhb.json`, `assets/downloads/osmhb.tar.xz` |

**Notes:**
- CC-PDDC = Creative Commons Public Domain Dedication and Certification
- These texts are based on historical works published before 1928, placing them in the public domain in the United States

#### Copyrighted-Free Translations

| Translation | Source | License | Files |
|-------------|--------|---------|-------|
| King James Version (1769) with Strong's Numbers and Apocrypha | SWORD: KJVA (CrossWire) | GPL-3.0-or-later | `data/example/bible_auxiliary/kjva.json`, `assets/downloads/kjva.tar.xz` |
| Septuagint, Morphologically Tagged Rahlfs' | SWORD: LXX (CCAT, University of Pennsylvania) | Copyrighted-Free | `data/example/bible_auxiliary/lxx.json`, `assets/downloads/lxx.tar.xz` |
| The Greek New Testament: SBL Edition | SWORD: SBLGNT | Copyrighted-Free | `data/example/bible_auxiliary/sblgnt.json`, `assets/downloads/sblgnt.tar.xz` |

**Notes:**
- KJVA Strong's numbers derived from The Bible Foundation (Hebrew) and KJV2003 Project at CrossWire (Greek)
- KJVA base text rights held by Crown of England; CrossWire data licensed under GPL-3.0-or-later
- LXX sourced from Center for Computer Analysis of Texts (CCAT) at University of Pennsylvania
- SBLGNT edited by Michael W. Holmes, copyright 2010 Logos Bible Software and Society of Biblical Literature

### Data Sources and Attribution

**The SWORD Project**
- Website: https://www.crosswire.org/sword/
- Purpose: Bible module distribution and format specification
- License: GPL-2.0-or-later (for SWORD software)
- Note: Individual Bible texts have their own licenses as listed above

**CrossWire Bible Society**
- Website: http://www.crosswire.org
- Modules: KJVA with Strong's numbers
- License: GPL-3.0-or-later for compiled modules
- Contact: modules@crosswire.org

**Open Scriptures**
- Website: http://beta.openscriptures.org
- Project: Morphological Hebrew Bible (OSMHB)
- Source: Westminster Leningrad Codex with Strong's numbers
- License: Public Domain

**Center for Computer Analysis of Texts (CCAT)**
- Institution: University of Pennsylvania
- Source: http://ccat.sas.upenn.edu/gopher/text/religion/biblical/lxxmorph/
- Data: Septuagint with morphological tagging (Rahlfs' edition)
- License: Copyrighted-Free (academic use permitted)

**Society of Biblical Literature (SBL)**
- Website: https://www.sblgnt.com
- Editor: Michael W. Holmes
- Data: SBL Greek New Testament
- License: Copyrighted-Free with attribution requirement
- Copyright: 2010 Logos Bible Software and Society of Biblical Literature

---

## Strong's Concordance Definitions

**Source:** Strong's Exhaustive Concordance of the Bible (1890)
**Author:** James Strong
**License:** Public Domain (work published before 1928)
**Files:**
- `data/strongs/hebrew.json` - Hebrew/Aramaic definitions (H0001-H8674)
- `data/strongs/greek.json` - Greek definitions (G0001-G5624)

**Notes:**
- Definitions extracted from public domain Strong's concordance data
- Original work by James Strong (1822-1894) is in the public domain
- Data format follows SWORD module lexicon structure
- Current coverage: 150 representative entries per language (most common words)
- Full concordance data available from CrossWire SWORD modules and Open Scriptures projects

**Data Format:**
Each entry includes:
- `lemma` - Original Hebrew or Greek word
- `xlit` - Transliteration (romanized form)
- `pron` - Pronunciation guide
- `def` - English definition
- `derivation` - Etymology and derivation information

---

## Internationalization (i18n) Translations

**Source:** AI-assisted translations from English base strings
**Tool:** i18n-gen (custom internal tool)
**License:** Not separately licensed (part of Michael project)
**Files:** `i18n/*.toml` (43 languages)

**Coverage:** User interface strings only (Bible content remains in original languages)

**Languages:**
Amharic, Arabic, Bengali, Chinese, Czech, Danish, Dutch, English, Farsi, Finnish, French, Ge'ez, German, Greek, Hausa, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Javanese, Korean, Latin, Marathi, Malay, Norwegian, Punjabi, Polish, Portuguese, Romanian, Russian, Spanish, Swedish, Swahili, Tamil, Telugu, Thai, Tagalog, Turkish, Ukrainian, Urdu, Vietnamese

**Note:** These are navigation and UI strings only. All Bible texts remain in their original published languages.

---

## Conversion Tools

### Juniper (Scripture Conversion Toolkit)

**Location:** `tools/juniper/`
**Purpose:** Pure Go toolkit for converting SWORD and e-Sword modules to Hugo-compatible JSON
**License:** See `tools/juniper/THIRD-PARTY-LICENSES.md`
**Key Dependencies:**
- SWORD Project file format specifications (GPL-2.0-or-later)
- e-Sword database format (.bblx, .cmtx, .dctx)
- OSIS (Open Scripture Information Standard) specifications
- Various versification schemas (KJV, KJVA, Vulgate, LXX, Leningrad)

**Note:** Juniper is a clean-room implementation that reads SWORD file formats but does not link against libsword.

### Book Mappings Data

**Source:** focuswithjustin-data
**Location:** `tools/focuswithjustin-data/data/book_mappings.json`
**License:** Proprietary with special exception for JuniperBible.org
**Copyright:** 2024-Present Justin
**File:** `tools/focuswithjustin-data/LICENSE.txt`

**Special Exception:**
Royalty-free, world-wide, non-exclusive license granted to JuniperBible.org (and subdomains) to use, reproduce, display, and distribute the book mappings data solely for website operation.

---

## External Services (Referenced, Not Bundled)

### Blue Letter Bible

**Service:** Blue Letter Bible
**Website:** https://www.blueletterbible.org/
**Usage:** Strong's number lookup links (external reference)
**License:** Not bundled; external service links only

**Note:** Strong's tooltips in the UI link to Blue Letter Bible for full Hebrew and Greek lexicon definitions. This is a reference link only; no BLB data is included in this project.

### STEPBible Interface Patterns

**Project:** STEPBible
**Website:** https://github.com/STEPBible/step
**License:** BSD 3-Clause License
**Usage:** Interface patterns for parallel translation views (inspiration only)

**Note:** See root `THIRD-PARTY-LICENSES.md` for full BSD 3-Clause license text and attribution details for UI pattern inspiration.

---

## Versification Schemas

**Sources:**
- CrossWire SWORD versification schemas (KJV, KJVA, Vulgate, LXX)
- OpenScriptures reference data
- Academic biblical scholarship resources

**License:** Factual data, not subject to copyright

**Files:**
- `tools/juniper/versifications/*.yaml`
- Versification mappings in Go code (`tools/juniper/pkg/sword/versification_*.go`)

**Supported Systems:**
- Protestant (66 books) - KJV versification
- Catholic (73 books) - Vulgate versification
- Orthodox (76-81 books) - LXX/Septuagint versification
- Apocryphal variants - KJVA versification
- Hebrew Bible - Leningrad Codex structure

---

## Metadata Files

### License Information

**File:** `data/example/license_rights.json`
**Purpose:** Machine-readable license metadata for Bible translations
**Content:** Derived from SWORD module metadata and license texts
**License:** Factual data compilation, not separately copyrighted

### Software Dependencies

**File:** `data/example/software_deps.json`
**Purpose:** Software bill of materials (SBOM) data
**Generated by:** Syft (automated SBOM generation)
**License:** Factual data output, not separately copyrighted

---

## Summary of License Types

| License | Description | Translations |
|---------|-------------|--------------|
| Public Domain (CC-PDDC) | No restrictions, freely usable | ASV, DRC, Geneva1599, Tyndale, Vulgate, WEB, OSMHB |
| GPL-3.0-or-later | Copyleft license, requires source disclosure | KJVA (Strong's data) |
| Copyrighted-Free | Copyrighted but free to use with attribution | LXX, SBLGNT |

---

## Attribution Requirements

When redistributing Bible texts from this project:

1. **Public Domain texts** - No attribution required, but recommended for academic integrity
2. **GPL-3.0-or-later (KJVA)** - Must include license notice and make source available
3. **Copyrighted-Free (LXX, SBLGNT)** - Must retain original copyright notices and attribute sources
4. **Strong's data** - Public domain, no attribution required
5. **i18n strings** - Part of Michael project, follow project license

---

## Verification

All Bible text licenses can be verified by:
1. Checking `data/example/bible.json` for license fields
2. Reading full license texts in `data/example/license_rights.json`
3. Consulting original SWORD module .conf files
4. Visiting source websites listed in attributions above

For module-specific questions, contact the SWORD Project or CrossWire Bible Society.

---

## Updates and Corrections

This document reflects the data sources as of the generation date in the repository.

To report license information errors or request clarifications:
- Open an issue in the project repository
- Contact the maintainers via project communication channels

**Last Updated:** 2026-01-25
