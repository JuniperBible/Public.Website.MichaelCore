#!/usr/bin/env python3
"""
Extract scripture text using diatheke and generate Hugo-compatible JSON.

This script uses versification YAML files to determine which books to extract
for each scripture module, supporting different canons (Protestant, Catholic,
Orthodox, Ethiopian, etc.).

Usage: python3 extract_scriptures.py [output_dir]

Requires: diatheke from SWORD project, PyYAML
"""

import subprocess
import json
import re
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Error: PyYAML required. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(1)


# Base directory for versification files
SCRIPT_DIR = Path(__file__).parent
VERSIFICATION_DIR = SCRIPT_DIR / "versifications"


def load_versification(name: str) -> dict:
    """Load a versification YAML file, resolving inheritance."""
    path = VERSIFICATION_DIR / f"{name}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Versification file not found: {path}")

    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    # Handle inheritance
    if "extends" in data:
        parent = load_versification(data["extends"])
        # Merge books
        books = list(parent.get("books", []))
        for add_book in data.get("additional_books", []):
            # Find insert position
            insert_after = add_book.get("insert_after")
            if insert_after:
                for i, book in enumerate(books):
                    if book["id"] == insert_after:
                        books.insert(i + 1, add_book)
                        break
                else:
                    books.append(add_book)
            else:
                books.append(add_book)
        data["books"] = books

    return data


def get_all_books(versification: dict) -> list:
    """Get flat list of all books from a versification."""
    books = []
    for book in versification.get("books", []):
        # Skip books that are merged into others (like Additions to Esther)
        if book.get("merge_with"):
            continue

        # Handle composite books (like The Twelve in Tanakh)
        if "sub_books" in book:
            for sub in book["sub_books"]:
                books.append({
                    "id": sub["id"],
                    "name": sub.get("name", sub["id"]),
                    "chapters": sub.get("chapters", 1),
                    "testament": book.get("testament", "OT"),
                })
        else:
            # Skip books without chapter counts (structural entries)
            if "chapters" not in book:
                continue
            books.append({
                "id": book["id"],
                "name": book["name"],
                "chapters": book["chapters"],
                "testament": book.get("testament", "OT"),
            })
    return books


def run_diatheke(module: str, reference: str) -> str:
    """Run diatheke and return the output."""
    try:
        result = subprocess.run(
            ["diatheke", "-b", module, "-f", "plain", "-k", reference],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.stdout
    except subprocess.TimeoutExpired:
        print(f"  Warning: Timeout for {module} {reference}", file=sys.stderr)
        return ""
    except Exception as e:
        print(f"  Error: {e} for {module} {reference}", file=sys.stderr)
        return ""


def is_placeholder_text(text: str) -> bool:
    """Check if text is a placeholder (verse reference only, no actual content).

    When a verse doesn't exist in a SWORD module, diatheke may return:
    - Just another verse reference (e.g., 'II Chronicles 19:2:')
    - Empty or whitespace-only text
    - Very short content that's just a reference

    A general pattern is: optional book prefix (I-IV, 1-4) + book name + chapter:verse
    """
    text = text.strip()

    # Empty or very short text (less than 5 chars is likely just punctuation or reference)
    if len(text) < 5:
        return True

    # Pattern for verse references that appear as placeholder content
    # Handles: "Genesis 1:1:", "II Chronicles 19:2:", "1 John 3:16:", "4 Maccabees 1:1:", "Song of Songs 1:1:"
    # Book prefixes: Roman numerals (I-IV), Arabic numerals (1-4), or none
    placeholder_pattern = r'^(?:[1-4]\s+|I{1,3}V?\s+)?[A-Za-z]+(?:\s+(?:of\s+)?[A-Za-z]+)*\s+\d+:\d+:?$'
    return bool(re.match(placeholder_pattern, text))


def parse_diatheke_output(output: str, book_id: str, chapter: int) -> list:
    """Parse diatheke output into verse list."""
    verses = []

    # Remove the module attribution line at the end
    output = re.sub(r'\n\([^)]+\)\s*$', '', output.strip())

    # Split by verse references - handle multi-line verses
    parts = re.split(r'(?:^|\n)([A-Za-z0-9 ]+\s+\d+:\d+):\s*', output)

    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            ref = parts[i].strip()
            text = parts[i + 1].strip()

            match = re.search(r':(\d+)$', ref)
            if match and text:
                # Skip placeholder text (just another verse reference, no actual content)
                if is_placeholder_text(text):
                    continue

                verse_num = int(match.group(1))
                text = ' '.join(text.split())
                verses.append({
                    "number": verse_num,
                    "text": text,
                })

    return verses


def check_book_exists(module: str, book_name: str) -> bool:
    """Check if a book exists in the module by testing first verse."""
    output = run_diatheke(module, f"{book_name} 1:1")
    # If the output is just the module attribution or empty, book doesn't exist
    return bool(output.strip()) and not output.strip().startswith(f"({module})")


def discover_chapters(module: str, book_name: str, expected_chapters: int) -> int:
    """Discover actual number of chapters in a book."""
    # Start with expected and verify, then check beyond if needed
    for ch in range(expected_chapters, expected_chapters + 5):
        output = run_diatheke(module, f"{book_name} {ch}:1")
        if not output.strip() or output.strip().startswith(f"({module})"):
            return ch - 1
    return expected_chapters


def get_chapter(module: str, book_id: str, book_name: str, chapter: int) -> dict:
    """Extract a single chapter from a module."""
    reference = f"{book_name} {chapter}"
    output = run_diatheke(module, reference)
    verses = parse_diatheke_output(output, book_id, chapter)

    return {
        "number": chapter,
        "verses": verses,
    }


def get_book(module: str, book: dict) -> dict:
    """Extract an entire book from a module."""
    book_id = book["id"]
    book_name = book["name"]
    num_chapters = book["chapters"]
    testament = book["testament"]

    chapters = []
    for ch in range(1, num_chapters + 1):
        chapter = get_chapter(module, book_id, book_name, ch)
        if chapter["verses"]:
            chapters.append(chapter)

    return {
        "id": book_id,
        "name": book_name,
        "testament": testament,
        "chapters": chapters,
    }


def extract_scripture(module: str, meta: dict, versification: dict) -> dict:
    """Extract a scripture module using the specified versification."""
    print(f"Extracting {module} using {versification['name']} versification...", file=sys.stderr)

    books = get_all_books(versification)
    extracted_books = []

    for book in books:
        book_name = book["name"]
        print(f"  {book_name}...", file=sys.stderr, end="", flush=True)

        # Check if this book exists in the module
        if not check_book_exists(module, book_name):
            print(f" (not in module)", file=sys.stderr)
            continue

        extracted = get_book(module, book)
        if extracted["chapters"]:
            extracted_books.append(extracted)
            print(f" {len(extracted['chapters'])} chapters", file=sys.stderr)
        else:
            print(f" (no content)", file=sys.stderr)

    return {
        "content": meta["description"],
        "books": extracted_books,
        "sections": [],
    }


# Scripture module registry
# Maps SWORD module names to metadata and versification
SCRIPTURES = {
    # Historic English Translations
    "KJV": {
        "id": "kjv",
        "title": "King James Version (1769)",
        "description": "The Authorized Version of the Bible, the most influential English translation in history.",
        "abbrev": "KJV",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Historic"],
    },
    "Tyndale": {
        "id": "tyndale",
        "title": "Tyndale Bible (1525/1530)",
        "description": "First English Bible translated directly from Greek and Hebrew.",
        "abbrev": "TYN",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Historic"],
    },
    "Geneva1599": {
        "id": "geneva1599",
        "title": "Geneva Bible (1599)",
        "description": "The primary English Protestant Bible of the 16th century.",
        "abbrev": "GNV",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Historic"],
    },
    "Wycliffe": {
        "id": "wycliffe",
        "title": "Wycliffe Bible (c.1395)",
        "description": "First complete English translation of the Bible, translated from the Latin Vulgate.",
        "abbrev": "WYC",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Historic", "Medieval"],
    },
    # Catholic Translations
    "DRC": {
        "id": "drc",
        "title": "Douay-Rheims Bible",
        "description": "English translation of the Latin Vulgate by Catholic scholars (1582-1610).",
        "abbrev": "DRB",
        "language": "en",
        "versification": "catholic",
        "tags": ["English", "Catholic", "Historic"],
    },
    "CPDV": {
        "id": "cpdv",
        "title": "Catholic Public Domain Version",
        "description": "Modern Catholic translation based on the Latin Vulgate with Deuterocanonical books.",
        "abbrev": "CPDV",
        "language": "en",
        "versification": "catholic",
        "tags": ["English", "Catholic", "Modern"],
    },
    # Latin
    "Vulgate": {
        "id": "vulgate",
        "title": "Latin Vulgate",
        "description": "Jerome's 4th century Latin translation, the authoritative Bible of the Catholic Church.",
        "abbrev": "VUL",
        "language": "la",
        "versification": "catholic",
        "tags": ["Latin", "Catholic", "Historic"],
    },
    # American Translations
    "ASV": {
        "id": "asv",
        "title": "American Standard Version (1901)",
        "description": "An American revision of the KJV, known for its literal accuracy and use of 'Jehovah'.",
        "abbrev": "ASV",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "American"],
    },
    "Darby": {
        "id": "darby",
        "title": "Darby Bible (1890)",
        "description": "John Nelson Darby's literal translation emphasizing consistency in rendering Greek/Hebrew words.",
        "abbrev": "DBY",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Literal"],
    },
    "YLT": {
        "id": "ylt",
        "title": "Young's Literal Translation (1898)",
        "description": "Robert Young's extremely literal translation preserving Hebrew/Greek verb tenses.",
        "abbrev": "YLT",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Literal"],
    },
    # Modern Translations
    "WEB": {
        "id": "web",
        "title": "World English Bible",
        "description": "A public domain modern English translation based on the ASV with updated language.",
        "abbrev": "WEB",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Modern", "Public Domain"],
    },
    "BBE": {
        "id": "bbe",
        "title": "Bible in Basic English (1965)",
        "description": "Translation using a vocabulary of only 1000 common English words.",
        "abbrev": "BBE",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Simple"],
    },
    # Greek Text
    "LXX": {
        "id": "lxx",
        "title": "Septuagint (Rahlfs)",
        "description": "The ancient Greek translation of the Hebrew Bible, the Old Testament of the early Church.",
        "abbrev": "LXX",
        "language": "grc",
        "versification": "catholic",
        "tags": ["Greek", "Historic", "Septuagint"],
    },
    "SBLGNT": {
        "id": "sblgnt",
        "title": "SBL Greek New Testament",
        "description": "The Society of Biblical Literature's critical edition of the Greek New Testament.",
        "abbrev": "SBLGNT",
        "language": "grc",
        "versification": "protestant",
        "tags": ["Greek", "Critical Text", "Academic"],
    },
    # Hebrew Text
    "OSMHB": {
        "id": "osmhb",
        "title": "Open Scriptures Hebrew Bible",
        "description": "Open source morphological Hebrew Bible based on the Westminster Leningrad Codex.",
        "abbrev": "OSHB",
        "language": "he",
        "versification": "protestant",
        "tags": ["Hebrew", "Masoretic", "Open Source"],
    },
    # Additional Historic Translations
    "Webster": {
        "id": "webster",
        "title": "Webster Bible (1833)",
        "description": "Noah Webster's revision of the KJV with updated language and Americanized spelling.",
        "abbrev": "WBS",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "American", "Historic"],
    },
    "Rotherham": {
        "id": "rotherham",
        "title": "Rotherham Emphasized Bible (1902)",
        "description": "Joseph Rotherham's translation with emphasis marks showing Greek/Hebrew emphasis.",
        "abbrev": "EBR",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Literal"],
    },
    "AKJV": {
        "id": "akjv",
        "title": "American King James Version",
        "description": "The KJV with archaic words replaced with modern equivalents.",
        "abbrev": "AKJV",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Updated KJV"],
    },
    # Jewish Translations
    "JPS": {
        "id": "jps",
        "title": "JPS Tanakh (1917)",
        "description": "Jewish Publication Society translation of the Hebrew Bible.",
        "abbrev": "JPS",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Jewish", "Historic"],
    },
    # Additional Modern
    "GodsWord": {
        "id": "godsword",
        "title": "GOD'S WORD Translation",
        "description": "A thought-for-thought translation emphasizing natural English.",
        "abbrev": "GW",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Modern"],
    },
    "LEB": {
        "id": "leb",
        "title": "Lexham English Bible",
        "description": "A transparent English translation designed for study.",
        "abbrev": "LEB",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Modern", "Study"],
    },
    # Greek NT Editions
    "TR": {
        "id": "tr",
        "title": "Textus Receptus (1550/1894)",
        "description": "The 'Received Text' Greek New Testament underlying the KJV translation.",
        "abbrev": "TR",
        "language": "grc",
        "versification": "protestant",
        "tags": ["Greek", "Textus Receptus", "Historic"],
    },
    "Byz": {
        "id": "byz",
        "title": "Byzantine Textform (2013)",
        "description": "Robinson-Pierpont Byzantine Greek New Testament.",
        "abbrev": "BYZ",
        "language": "grc",
        "versification": "protestant",
        "tags": ["Greek", "Byzantine", "Academic"],
    },
    # Additional Literal Translations
    "RLT": {
        "id": "rlt",
        "title": "Revised Literal Translation (2018)",
        "description": "A thoroughly revised literal translation of the KJV.",
        "abbrev": "RLT",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Literal"],
    },
    # Messianic
    "HNV": {
        "id": "hnv",
        "title": "Hebrew Names Version",
        "description": "World English Bible with Hebrew names for God and biblical figures.",
        "abbrev": "HNV",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Messianic", "Modern"],
    },
    # Early English
    "Weymouth": {
        "id": "weymouth",
        "title": "Weymouth New Testament (1912)",
        "description": "Richard Weymouth's modern speech translation of the New Testament.",
        "abbrev": "WNT",
        "language": "en",
        "versification": "protestant",
        "tags": ["English", "Protestant", "Historic"],
    },
    # Apocryphal
    "KJVA": {
        "id": "kjva",
        "title": "King James with Apocrypha",
        "description": "The King James Version including the Deuterocanonical/Apocryphal books.",
        "abbrev": "KJVA",
        "language": "en",
        "versification": "catholic",
        "tags": ["English", "Protestant", "Apocrypha"],
    },
}


def main():
    output_dir = sys.argv[1] if len(sys.argv) > 1 else "data"

    # Check if diatheke is available
    try:
        subprocess.run(["diatheke", "-b", "KJV", "-k", "Gen 1:1"],
                      capture_output=True, timeout=5)
    except FileNotFoundError:
        print("Error: diatheke not found. Install SWORD project tools.", file=sys.stderr)
        sys.exit(1)

    # Build metadata
    metadata = {
        "bibles": [],
        "meta": {
            "granularity": "chapter",
            "generated": datetime.now(timezone.utc).isoformat(),
            "version": "2.0.0",
        },
    }

    auxiliary = {
        "bibles": {},
    }

    # Extract each module
    for i, (module, meta) in enumerate(SCRIPTURES.items(), 1):
        # Check if module is available
        test = run_diatheke(module, "Gen 1:1")
        if not test.strip():
            print(f"Warning: Module {module} not available, skipping", file=sys.stderr)
            continue

        # Load versification
        versification = load_versification(meta["versification"])

        # Add to metadata
        metadata["bibles"].append({
            "id": meta["id"],
            "title": meta["title"],
            "description": meta["description"],
            "abbrev": meta["abbrev"],
            "language": meta["language"],
            "versification": meta["versification"],
            "features": [],
            "tags": meta["tags"],
            "weight": i,
        })

        # Extract content
        content = extract_scripture(module, meta, versification)
        auxiliary["bibles"][meta["id"]] = content

    # Write output files
    os.makedirs(output_dir, exist_ok=True)

    meta_path = os.path.join(output_dir, "bibles.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Wrote {meta_path}", file=sys.stderr)

    # Write individual Bible files to bibles_auxiliary/ directory
    aux_dir = os.path.join(output_dir, "bibles_auxiliary")
    os.makedirs(aux_dir, exist_ok=True)

    for bible_id, bible_content in auxiliary["bibles"].items():
        aux_path = os.path.join(aux_dir, f"{bible_id}.json")
        with open(aux_path, "w", encoding="utf-8") as f:
            json.dump(bible_content, f, indent=2, ensure_ascii=False)
        print(f"Wrote {aux_path}", file=sys.stderr)

    # Summary
    total_books = sum(len(bible["books"]) for bible in auxiliary["bibles"].values())
    total_verses = sum(
        sum(len(ch["verses"]) for ch in book["chapters"])
        for bible in auxiliary["bibles"].values()
        for book in bible["books"]
    )
    print(f"\nExtracted {len(auxiliary['bibles'])} Bibles with {total_books} books and {total_verses:,} total verses", file=sys.stderr)


if __name__ == "__main__":
    main()
