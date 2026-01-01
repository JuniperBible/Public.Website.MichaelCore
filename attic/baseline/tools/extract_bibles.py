#!/usr/bin/env python3
"""
Extract Bible text using diatheke and generate Hugo-compatible JSON.

Usage: python3 extract_bibles.py [output_dir]

Requires: diatheke from SWORD project
"""

import subprocess
import json
import re
import sys
import os
from datetime import datetime, timezone

# KJV versification - books with chapter counts
BOOKS = [
    # Old Testament
    ("Gen", "Genesis", "OT", 50),
    ("Exod", "Exodus", "OT", 40),
    ("Lev", "Leviticus", "OT", 27),
    ("Num", "Numbers", "OT", 36),
    ("Deut", "Deuteronomy", "OT", 34),
    ("Josh", "Joshua", "OT", 24),
    ("Judg", "Judges", "OT", 21),
    ("Ruth", "Ruth", "OT", 4),
    ("1Sam", "1 Samuel", "OT", 31),
    ("2Sam", "2 Samuel", "OT", 24),
    ("1Kgs", "1 Kings", "OT", 22),
    ("2Kgs", "2 Kings", "OT", 25),
    ("1Chr", "1 Chronicles", "OT", 29),
    ("2Chr", "2 Chronicles", "OT", 36),
    ("Ezra", "Ezra", "OT", 10),
    ("Neh", "Nehemiah", "OT", 13),
    ("Esth", "Esther", "OT", 10),
    ("Job", "Job", "OT", 42),
    ("Ps", "Psalms", "OT", 150),
    ("Prov", "Proverbs", "OT", 31),
    ("Eccl", "Ecclesiastes", "OT", 12),
    ("Song", "Song of Solomon", "OT", 8),
    ("Isa", "Isaiah", "OT", 66),
    ("Jer", "Jeremiah", "OT", 52),
    ("Lam", "Lamentations", "OT", 5),
    ("Ezek", "Ezekiel", "OT", 48),
    ("Dan", "Daniel", "OT", 12),
    ("Hos", "Hosea", "OT", 14),
    ("Joel", "Joel", "OT", 3),
    ("Amos", "Amos", "OT", 9),
    ("Obad", "Obadiah", "OT", 1),
    ("Jonah", "Jonah", "OT", 4),
    ("Mic", "Micah", "OT", 7),
    ("Nah", "Nahum", "OT", 3),
    ("Hab", "Habakkuk", "OT", 3),
    ("Zeph", "Zephaniah", "OT", 3),
    ("Hag", "Haggai", "OT", 2),
    ("Zech", "Zechariah", "OT", 14),
    ("Mal", "Malachi", "OT", 4),
    # New Testament
    ("Matt", "Matthew", "NT", 28),
    ("Mark", "Mark", "NT", 16),
    ("Luke", "Luke", "NT", 24),
    ("John", "John", "NT", 21),
    ("Acts", "Acts", "NT", 28),
    ("Rom", "Romans", "NT", 16),
    ("1Cor", "1 Corinthians", "NT", 16),
    ("2Cor", "2 Corinthians", "NT", 13),
    ("Gal", "Galatians", "NT", 6),
    ("Eph", "Ephesians", "NT", 6),
    ("Phil", "Philippians", "NT", 4),
    ("Col", "Colossians", "NT", 4),
    ("1Thess", "1 Thessalonians", "NT", 5),
    ("2Thess", "2 Thessalonians", "NT", 3),
    ("1Tim", "1 Timothy", "NT", 6),
    ("2Tim", "2 Timothy", "NT", 4),
    ("Titus", "Titus", "NT", 3),
    ("Phlm", "Philemon", "NT", 1),
    ("Heb", "Hebrews", "NT", 13),
    ("Jas", "James", "NT", 5),
    ("1Pet", "1 Peter", "NT", 5),
    ("2Pet", "2 Peter", "NT", 3),
    ("1John", "1 John", "NT", 5),
    ("2John", "2 John", "NT", 1),
    ("3John", "3 John", "NT", 1),
    ("Jude", "Jude", "NT", 1),
    ("Rev", "Revelation", "NT", 22),
]

# Modules to extract with their metadata
MODULES = {
    "KJV": {
        "id": "kjv",
        "title": "King James Version (1769)",
        "description": "The Authorized Version of the Bible, the most influential English translation in history. This edition includes Strong's numbers for Greek and Hebrew word study.",
        "abbrev": "KJV",
        "language": "en",
        "tags": ["English", "Protestant", "Historic", "Strong's Numbers"],
    },
    "DRC": {
        "id": "drc",
        "title": "Douay-Rheims Bible",
        "description": "English translation of the Latin Vulgate by Catholic scholars (1582-1610). The Challoner revision of 1749-1752.",
        "abbrev": "DRB",
        "language": "en",
        "tags": ["English", "Catholic", "Historic"],
    },
    "Geneva1599": {
        "id": "geneva1599",
        "title": "Geneva Bible (1599)",
        "description": "The Geneva Bible was the primary English Protestant Bible of the 16th century, used by Shakespeare, John Bunyan, and the Pilgrims.",
        "abbrev": "GNV",
        "language": "en",
        "tags": ["English", "Protestant", "Historic"],
    },
    "Vulgate": {
        "id": "vulgate",
        "title": "Latin Vulgate",
        "description": "Jerome's 4th century Latin translation, the authoritative Bible of the Catholic Church for over a millennium.",
        "abbrev": "VUL",
        "language": "la",
        "tags": ["Latin", "Catholic", "Historic"],
    },
    "Tyndale": {
        "id": "tyndale",
        "title": "Tyndale Bible (1525/1530)",
        "description": "William Tyndale's translation was the first English Bible translated directly from Greek and Hebrew. Foundation for all subsequent English translations.",
        "abbrev": "TYN",
        "language": "en",
        "tags": ["English", "Protestant", "Historic"],
    },
}


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


def parse_diatheke_output(output: str, book_id: str, chapter: int) -> list:
    """Parse diatheke output into verse list."""
    verses = []

    # Remove the module attribution line at the end
    output = re.sub(r'\n\([^)]+\)\s*$', '', output.strip())

    # Split by verse references - handle multi-line verses
    # Pattern matches: "BookName chapter:verse: " at start or after newline
    parts = re.split(r'(?:^|\n)([A-Za-z0-9 ]+\s+\d+:\d+):\s*', output)

    # parts[0] is before first match (usually empty)
    # parts[1], parts[3], parts[5]... are the references
    # parts[2], parts[4], parts[6]... are the verse texts

    for i in range(1, len(parts), 2):
        if i + 1 < len(parts):
            ref = parts[i].strip()
            text = parts[i + 1].strip()

            # Extract verse number from reference
            match = re.search(r':(\d+)$', ref)
            if match and text:
                verse_num = int(match.group(1))
                # Clean up text - join lines and normalize whitespace
                text = ' '.join(text.split())
                verses.append({
                    "number": verse_num,
                    "text": text,
                })

    return verses


def get_chapter(module: str, book_id: str, book_name: str, chapter: int) -> dict:
    """Extract a single chapter from a module."""
    # Try to get the whole chapter at once
    reference = f"{book_name} {chapter}"
    output = run_diatheke(module, reference)
    verses = parse_diatheke_output(output, book_id, chapter)

    return {
        "number": chapter,
        "verses": verses,
    }


def get_book(module: str, book_id: str, book_name: str, testament: str, num_chapters: int) -> dict:
    """Extract an entire book from a module."""
    chapters = []

    for ch in range(1, num_chapters + 1):
        chapter = get_chapter(module, book_id, book_name, ch)
        if chapter["verses"]:  # Only include chapters with verses
            chapters.append(chapter)

    return {
        "id": book_id,
        "name": book_name,
        "testament": testament,
        "chapters": chapters,
    }


def extract_bible(module: str, meta: dict) -> dict:
    """Extract an entire Bible module."""
    print(f"Extracting {module}...", file=sys.stderr)
    books = []

    for book_id, book_name, testament, num_chapters in BOOKS:
        print(f"  {book_name}...", file=sys.stderr, end="", flush=True)
        book = get_book(module, book_id, book_name, testament, num_chapters)
        if book["chapters"]:  # Only include books with content
            books.append(book)
            print(f" {len(book['chapters'])} chapters", file=sys.stderr)
        else:
            print(f" (no content)", file=sys.stderr)

    return {
        "content": meta["description"],
        "books": books,
        "sections": [],
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
            "version": "1.0.0",
        },
    }

    auxiliary = {
        "bibles": {},
    }

    # Extract each module
    for i, (module, meta) in enumerate(MODULES.items(), 1):
        # Check if module is available
        test = run_diatheke(module, "Gen 1:1")
        if not test.strip():
            print(f"Warning: Module {module} not available, skipping", file=sys.stderr)
            continue

        # Add to metadata
        metadata["bibles"].append({
            "id": meta["id"],
            "title": meta["title"],
            "description": meta["description"],
            "abbrev": meta["abbrev"],
            "language": meta["language"],
            "features": [],
            "tags": meta["tags"],
            "weight": i,
        })

        # Extract content
        content = extract_bible(module, meta)
        auxiliary["bibles"][meta["id"]] = content

    # Write output files
    os.makedirs(output_dir, exist_ok=True)

    meta_path = os.path.join(output_dir, "bibles.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Wrote {meta_path}", file=sys.stderr)

    aux_path = os.path.join(output_dir, "bibles_auxiliary.json")
    with open(aux_path, "w", encoding="utf-8") as f:
        json.dump(auxiliary, f, indent=2, ensure_ascii=False)
    print(f"Wrote {aux_path}", file=sys.stderr)

    # Summary
    total_verses = sum(
        sum(len(ch["verses"]) for ch in book["chapters"])
        for bible in auxiliary["bibles"].values()
        for book in bible["books"]
    )
    print(f"\nExtracted {len(auxiliary['bibles'])} Bibles with {total_verses:,} total verses", file=sys.stderr)


if __name__ == "__main__":
    main()
