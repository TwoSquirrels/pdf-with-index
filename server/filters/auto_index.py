#!/usr/bin/env python3
"""
Pandoc filter for automatic index generation.
Uses MeCab with Neologd dictionary to extract nouns and inject Typst index tags.
"""

import os
import re

import MeCab
import panflute as pf


def make_typst_raw(text: str) -> pf.RawInline:
    """Create a RawInline for typst without invoking panflute validation."""

    raw = pf.RawInline.__new__(pf.RawInline)
    raw.text = text
    raw.format = "typst"
    return raw

# Initialize MeCab Tagger with Neologd dictionary (global instance for performance)
MECAB_NEOLOGD_PATH = os.environ.get(
    "MECAB_NEOLOGD_PATH",
    "/usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd",
)

try:
    TAGGER = MeCab.Tagger(f"-d {MECAB_NEOLOGD_PATH}")
except RuntimeError:
    # Fallback to default dictionary if Neologd is not available
    TAGGER = MeCab.Tagger()


# Stopwords - common formal nouns to exclude
STOPWORDS = {
    "こと",
    "もの",
    "とき",
    "ところ",
    "ため",
    "よう",
    "うち",
    "はず",
    "わけ",
    "まま",
    "ほう",
    "あと",
    "うえ",
    "したがい",
    "おり",
    "ほか",
    "たび",
    "さい",
    "つもり",
    "かわり",
    "あいだ",
    "まえ",
    "かた",
    "くせ",
    "みたい",
    "せい",
    "かぎり",
    "それ",
    "これ",
    "あれ",
    "どれ",
    "ここ",
    "そこ",
    "あそこ",
    "どこ",
    "なに",
    "何",
    "私",
    "僕",
    "俺",
    "彼",
    "彼女",
    "我々",
    "あなた",
    "君",
    "誰",
}


def is_valid_noun(surface: str, pos: str, reading: str | None) -> bool:
    """
    Check if a word is a valid noun for indexing.

    Args:
        surface: The word surface form
        pos: Part of speech information
        reading: Reading in katakana (may be None)

    Returns:
        True if the word should be indexed
    """
    # Must be a noun (名詞)
    if not pos.startswith("名詞"):
        return False

    # Check noun subtypes: 一般, サ変接続, 固有名詞
    valid_subtypes = ("一般", "サ変接続", "固有名詞")
    pos_parts = pos.split(",")
    if len(pos_parts) < 2 or pos_parts[1] not in valid_subtypes:
        return False

    # Exclude numbers only
    if re.match(r"^[\d０-９]+$", surface):
        return False

    # Exclude symbols only
    if re.match(r"^[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]+$", surface):
        return False

    # Exclude single character hiragana/katakana (likely particles)
    if (
        len(surface) == 1
        and re.match(r"[\u3040-\u309f\u30a0-\u30ff]", surface) is not None
    ):
        return False

    # Exclude stopwords
    if surface in STOPWORDS:
        return False

    return True


def escape_typst_string(s: str) -> str:
    """
    Escape special characters for Typst string literals.

    Args:
        s: Input string

    Returns:
        Escaped string safe for Typst
    """
    # Escape backslashes first, then quotes
    s = s.replace("\\", "\\\\")
    s = s.replace('"', '\\"')
    return s


def extract_nouns_with_reading(text: str) -> list[tuple[str, str, int, int]]:
    """
    Extract nouns from text using MeCab.

    Args:
        text: Input text to analyze

    Returns:
        List of tuples (surface, reading, start_pos, end_pos)
    """
    results = []
    current_pos = 0

    node = TAGGER.parseToNode(text)
    while node:
        surface = node.surface
        if surface:
            # Find position in original text
            start = text.find(surface, current_pos)
            if start != -1:
                end = start + len(surface)
                current_pos = end

                # Parse feature string
                features = node.feature.split(",")
                pos = ",".join(features[:4]) if len(features) >= 4 else features[0]

                # Get reading (7th field in MeCab output)
                # Handle case where reading is missing or is a wildcard
                reading = (
                    features[7]
                    if len(features) > 7 and features[7] != "*"
                    else surface
                )

                if is_valid_noun(surface, pos, reading):
                    # Ensure reading is valid
                    if not reading:
                        reading = surface
                    results.append((surface, reading, start, end))

        node = node.next

    return results


def action(elem: pf.Element, doc: pf.Doc) -> pf.Element | list | None:
    """
    Panflute action function to process Str elements.

    Args:
        elem: Current element
        doc: Document

    Returns:
        Modified element or None
    """
    if isinstance(elem, pf.Str):
        text = elem.text
        nouns = extract_nouns_with_reading(text)

        if not nouns:
            return None

        # Build new content with index tags
        result = []
        last_end = 0

        for surface, reading, start, end in nouns:
            # Add text before this noun
            if start > last_end:
                result.append(pf.Str(text[last_end:start]))

                # Add Typst metadata entry before the noun
                escaped_word = escape_typst_string(surface)
                escaped_reading = escape_typst_string(reading)
                tag = f'#term("{escaped_word}", "{escaped_reading}")'
                result.append(make_typst_raw(tag))

                # Add the noun itself
                result.append(pf.Str(surface))

            last_end = end

        # Add remaining text
        if last_end < len(text):
            result.append(pf.Str(text[last_end:]))

        return result

    return None


def main(doc: pf.Doc | None = None) -> pf.Doc:
    """Main function for panflute filter."""
    return pf.run_filter(action, doc=doc)


if __name__ == "__main__":
    main()
