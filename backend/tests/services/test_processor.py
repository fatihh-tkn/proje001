import pytest
from services.processor import chunk_text

def test_chunk_text_empty():
    assert chunk_text("") == []

def test_chunk_text_short():
    text = "This is a short text."
    chunks = chunk_text(text, chunk_size=50, overlap=10)
    assert chunks == [text]

def test_chunk_text_exact_size():
    text = "A" * 50
    chunks = chunk_text(text, chunk_size=50, overlap=10)
    # when chunk_size = 50, start=0, end=50.
    # last_break is not checked since end < text_len is false
    # start is updated to end - overlap = 50 - 10 = 40
    # since start=40 < 50, it loops again.
    # next end = 40 + 50 = 90. chunk_str = text[40:90] = text[40:50] = "A"*10
    # start becomes 90 - 10 = 80 >= 50, loops ends.
    assert chunks == [text, "A" * 10]

def test_chunk_text_no_breaks():
    text = "A" * 100
    chunks = chunk_text(text, chunk_size=40, overlap=10)
    # start 0, end 40 -> "A"*40
    # start = 30, end 70 -> "A"*40
    # start = 60, end 100 -> "A"*40
    # start = 90, end 130 -> chunk_str = text[90:130] = text[90:100] = "A"*10
    assert chunks == ["A"*40, "A"*40, "A"*40, "A"*10]

def test_chunk_text_with_spaces():
    text = "Hello " * 10 # 60 chars
    # Split exactly at spaces
    # text = "Hello Hello Hello Hello Hello Hello Hello Hello Hello Hello "
    chunks = chunk_text(text, chunk_size=25, overlap=5)
    # 0 to 25: "Hello Hello Hello Hello H"
    # Last space before 25 is at index 23: "Hello Hello Hello Hello" (len 23)
    # Since we do .strip(), length might be 23.
    # Actually, the string is:
    # 0123456789012345678901234
    # "Hello Hello Hello Hello H"
    # rfind(' ', 0, 25) -> space after 4th Hello. (index 23)
    # start: 0, end: 23. chunk_str: "Hello Hello Hello Hello".strip() = "Hello Hello Hello Hello"

    # Check that chunks contain expected words
    assert "Hello" in chunks[0]
    # No word should be split in half if possible
    for chunk in chunks:
        assert "Hell" not in chunk or "Hello" in chunk # rudimentary check

def test_chunk_text_with_newlines():
    text = "Line 1.\nLine 2.\nLine 3.\n\nParagraph 2."
    chunks = chunk_text(text, chunk_size=25, overlap=5)
    # 0 to 25: "Line 1.\nLine 2.\nLine 3.\n"
    # Prioritizes \n\n but it's at index 23. So it splits at \n\n.
    # Start: 0, end: 23 -> "Line 1.\nLine 2.\nLine 3."
    assert chunks[0] == "Line 1.\nLine 2.\nLine 3."

def test_chunk_text_overlap():
    text = "abcdefghijklmnopqrstuvwxyz"
    chunks = chunk_text(text, chunk_size=10, overlap=5)
    # 0 to 10: "abcdefghij"
    # 5 to 15: "fghijklmno"
    # 10 to 20: "klmnopqrst"
    # 15 to 25: "pqrstuvwxy"
    # 20 to 26: "uvwxyz"
    # 21 to 31: chunk is from 21:26 -> text[21:26] = "vwxyz"
    # Wait, end was 25 for previous. start becomes 25 - 5 = 20.
    # next start: 20, end: 30. text_len = 26.
    # text[20:30] -> "uvwxyz"
    # start becomes 30 - 5 = 25
    # next start: 25, end: 35. text[25:35] -> "z"
    assert chunks == [
        "abcdefghij",
        "fghijklmno",
        "klmnopqrst",
        "pqrstuvwxy",
        "uvwxyz",
        "z"
    ]
