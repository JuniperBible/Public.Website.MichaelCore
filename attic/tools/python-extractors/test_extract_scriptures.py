#!/usr/bin/env python3
"""
Tests for extract_scriptures.py versification system.

Run with: python3 -m pytest test_extract_scriptures.py -v
Or: python3 test_extract_scriptures.py
"""

import unittest
import tempfile
import os
from pathlib import Path

# Import the module under test
from extract_scriptures import (
    load_versification,
    get_all_books,
    parse_diatheke_output,
    VERSIFICATION_DIR,
)


class TestLoadVersification(unittest.TestCase):
    """Tests for load_versification function."""

    def test_load_protestant_versification(self):
        """Protestant versification should load with 66 books."""
        v = load_versification("protestant")
        self.assertEqual(v["name"], "Protestant")
        self.assertEqual(v["tradition"], "christian")
        self.assertEqual(v["book_count"], 66)
        self.assertEqual(len(v["books"]), 66)

    def test_load_catholic_versification_extends_protestant(self):
        """Catholic versification should extend Protestant with deuterocanonical books."""
        v = load_versification("catholic")
        self.assertEqual(v["name"], "Catholic")
        self.assertEqual(v["extends"], "protestant")
        # Should have more than 66 books (includes additional_books)
        self.assertGreater(len(v["books"]), 66)

    def test_load_ethiopian_versification_extends_catholic(self):
        """Ethiopian versification should extend Catholic with more books."""
        v = load_versification("ethiopian")
        self.assertEqual(v["name"], "Ethiopian Orthodox")
        self.assertEqual(v["extends"], "catholic")
        # Should have even more books
        self.assertGreater(len(v["books"]), 73)

    def test_load_tanakh_versification(self):
        """Tanakh versification should have Jewish book structure."""
        v = load_versification("tanakh")
        self.assertEqual(v["name"], "Tanakh")
        self.assertEqual(v["tradition"], "jewish")
        # Tanakh has 24 books but with sub-books (The Twelve prophets)
        self.assertIn("books", v)

    def test_nonexistent_versification_raises_error(self):
        """Loading nonexistent versification should raise FileNotFoundError."""
        with self.assertRaises(FileNotFoundError):
            load_versification("nonexistent")

    def test_inheritance_inserts_books_correctly(self):
        """Books should be inserted at correct positions via insert_after."""
        v = load_versification("catholic")
        books = v["books"]
        book_ids = [b["id"] for b in books]

        # Tobit should come after Nehemiah
        neh_idx = book_ids.index("Neh")
        tob_idx = book_ids.index("Tob")
        self.assertEqual(tob_idx, neh_idx + 1)

        # Judith should come after Tobit
        jdt_idx = book_ids.index("Jdt")
        self.assertEqual(jdt_idx, tob_idx + 1)


class TestGetAllBooks(unittest.TestCase):
    """Tests for get_all_books function."""

    def test_protestant_returns_66_books(self):
        """Protestant versification should return exactly 66 books."""
        v = load_versification("protestant")
        books = get_all_books(v)
        self.assertEqual(len(books), 66)

    def test_books_have_required_fields(self):
        """Each book should have id, name, chapters, testament fields."""
        v = load_versification("protestant")
        books = get_all_books(v)
        for book in books:
            self.assertIn("id", book)
            self.assertIn("name", book)
            self.assertIn("chapters", book)
            self.assertIn("testament", book)

    def test_genesis_is_first_book(self):
        """Genesis should be the first book."""
        v = load_versification("protestant")
        books = get_all_books(v)
        self.assertEqual(books[0]["id"], "Gen")
        self.assertEqual(books[0]["name"], "Genesis")
        self.assertEqual(books[0]["chapters"], 50)
        self.assertEqual(books[0]["testament"], "OT")

    def test_revelation_is_last_book(self):
        """Revelation should be the last book in Protestant canon."""
        v = load_versification("protestant")
        books = get_all_books(v)
        self.assertEqual(books[-1]["id"], "Rev")
        self.assertEqual(books[-1]["name"], "Revelation")
        self.assertEqual(books[-1]["chapters"], 22)
        self.assertEqual(books[-1]["testament"], "NT")

    def test_skips_merged_books(self):
        """Books with merge_with should be skipped."""
        v = load_versification("catholic")
        books = get_all_books(v)
        book_ids = [b["id"] for b in books]
        # Additions to Esther (EsthGr) has merge_with: Esth, should be skipped
        self.assertNotIn("EsthGr", book_ids)
        # Additions to Daniel (DanGr) has merge_with: Dan, should be skipped
        self.assertNotIn("DanGr", book_ids)

    def test_catholic_includes_deuterocanonical(self):
        """Catholic versification should include deuterocanonical books."""
        v = load_versification("catholic")
        books = get_all_books(v)
        book_ids = [b["id"] for b in books]

        # Should include the 7 deuterocanonical books
        self.assertIn("Tob", book_ids)
        self.assertIn("Jdt", book_ids)
        self.assertIn("Wis", book_ids)
        self.assertIn("Sir", book_ids)
        self.assertIn("Bar", book_ids)
        self.assertIn("1Macc", book_ids)
        self.assertIn("2Macc", book_ids)


class TestParseDiathekaOutput(unittest.TestCase):
    """Tests for parse_diatheke_output function."""

    def test_parse_single_verse(self):
        """Should parse a single verse correctly."""
        output = """Genesis 1:1: In the beginning God created the heaven and the earth.

(KJV)"""
        verses = parse_diatheke_output(output, "Gen", 1)
        self.assertEqual(len(verses), 1)
        self.assertEqual(verses[0]["number"], 1)
        self.assertIn("In the beginning", verses[0]["text"])

    def test_parse_multiple_verses(self):
        """Should parse multiple verses correctly."""
        output = """Genesis 1:1: In the beginning God created the heaven and the earth.
Genesis 1:2: And the earth was without form, and void; and darkness was upon the face of the deep.
Genesis 1:3: And God said, Let there be light: and there was light.

(KJV)"""
        verses = parse_diatheke_output(output, "Gen", 1)
        self.assertEqual(len(verses), 3)
        self.assertEqual(verses[0]["number"], 1)
        self.assertEqual(verses[1]["number"], 2)
        self.assertEqual(verses[2]["number"], 3)

    def test_removes_module_attribution(self):
        """Should remove the module attribution line."""
        output = """John 3:16: For God so loved the world.

(KJV)"""
        verses = parse_diatheke_output(output, "John", 3)
        self.assertEqual(len(verses), 1)
        self.assertNotIn("(KJV)", verses[0]["text"])

    def test_handles_multiline_verses(self):
        """Should handle verses that span multiple lines."""
        output = """Psalm 23:1: The LORD is my shepherd; I shall not want.
He maketh me to lie down in green pastures.

(KJV)"""
        verses = parse_diatheke_output(output, "Ps", 23)
        self.assertEqual(len(verses), 1)
        # Text should be combined into single line
        self.assertIn("shepherd", verses[0]["text"])

    def test_handles_empty_output(self):
        """Should handle empty output gracefully."""
        output = ""
        verses = parse_diatheke_output(output, "Gen", 1)
        self.assertEqual(len(verses), 0)

    def test_handles_only_attribution(self):
        """Should handle output with only attribution line."""
        output = "(KJV)"
        verses = parse_diatheke_output(output, "Gen", 1)
        self.assertEqual(len(verses), 0)


class TestVersificationFiles(unittest.TestCase):
    """Tests for versification YAML file integrity."""

    def test_all_versification_files_loadable(self):
        """All versification files should be loadable."""
        versification_files = ["protestant", "catholic", "ethiopian", "tanakh", "quran"]
        for name in versification_files:
            try:
                v = load_versification(name)
                self.assertIn("name", v)
            except FileNotFoundError:
                self.fail(f"Versification file {name}.yaml not found")

    def test_protestant_book_counts_are_valid(self):
        """All Protestant books should have valid chapter counts."""
        v = load_versification("protestant")
        books = get_all_books(v)

        # Known chapter counts for some books
        expected = {
            "Gen": 50,
            "Exod": 40,
            "Ps": 150,
            "Matt": 28,
            "Rev": 22,
        }

        for book in books:
            self.assertGreater(book["chapters"], 0, f"{book['name']} has invalid chapter count")
            if book["id"] in expected:
                self.assertEqual(
                    book["chapters"],
                    expected[book["id"]],
                    f"{book['name']} has wrong chapter count",
                )

    def test_testaments_are_valid(self):
        """All books should have valid testament values."""
        v = load_versification("catholic")
        books = get_all_books(v)

        valid_testaments = {"OT", "NT", "DC"}  # OT, NT, Deuterocanonical
        for book in books:
            self.assertIn(
                book["testament"],
                valid_testaments,
                f"{book['name']} has invalid testament: {book['testament']}",
            )


class TestQuranVersification(unittest.TestCase):
    """Tests for Quran versification (different structure)."""

    def test_quran_has_surahs_structure(self):
        """Quran should use surahs instead of books."""
        v = load_versification("quran")
        self.assertEqual(v["name"], "Quran")
        self.assertEqual(v["tradition"], "islamic")
        self.assertEqual(v["structure"], "surah")
        self.assertIn("surahs", v)

    def test_quran_has_114_surahs(self):
        """Quran should have 114 surahs defined."""
        v = load_versification("quran")
        self.assertEqual(v["total_surahs"], 114)
        # Note: surahs list may be incomplete in YAML (showing pattern)

    def test_first_surah_is_al_fatihah(self):
        """First surah should be Al-Fatihah with 7 ayat."""
        v = load_versification("quran")
        first = v["surahs"][0]
        self.assertEqual(first["number"], 1)
        self.assertEqual(first["name"], "Al-Fatihah")
        self.assertEqual(first["ayat"], 7)


if __name__ == "__main__":
    unittest.main()
