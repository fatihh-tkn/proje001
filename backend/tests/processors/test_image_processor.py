import pytest
from unittest.mock import patch
import uuid
import os

from services.processors.image_processor import parse_image

@patch("services.processors.image_processor._read_with_vision")
def test_parse_image_with_vision(mock_read_with_vision):
    # Setup
    mock_read_with_vision.return_value = "Mocked AI Text from Image"
    dummy_path = "/fake/path/test_image.png"

    # Execute
    result = parse_image(dummy_path)

    # Assert
    assert len(result) == 1
    chunk = result[0]

    assert "id" in chunk
    # UUID check
    uuid.UUID(chunk["id"])

    assert "text" in chunk
    expected_text = (
        "[test_image.png | Görsel Analizi]\n"
        "DOSYA TÜRÜ: PNG görseli\n\n"
        "Mocked AI Text from Image"
    )
    assert chunk["text"] == expected_text

    assert "metadata" in chunk
    metadata = chunk["metadata"]
    assert metadata["page"] == 1
    assert metadata["chunk_index"] == 1
    assert metadata["source"] == "test_image.png"
    assert metadata["type"] == "image_vision"
    assert metadata["image_path"] == dummy_path
    assert metadata["total_pages"] == 1

    mock_read_with_vision.assert_called_once_with(dummy_path)

@patch("services.processors.image_processor._read_with_vision")
@patch("os.path.getsize")
def test_parse_image_without_vision(mock_getsize, mock_read_with_vision):
    # Setup
    mock_read_with_vision.return_value = None
    mock_getsize.return_value = 2048 # 2 KB
    dummy_path = "/fake/path/test_image.jpeg"
    original_name = "original.jpeg"

    # Execute
    result = parse_image(dummy_path, original_name=original_name)

    # Assert
    assert len(result) == 1
    chunk = result[0]

    expected_text = (
        "[original.jpeg | Görsel]\n"
        "DOSYA TÜRÜ: JPEG\n"
        "BOYUT: 2.0 KB\n"
        "[Not: Gemini Vision API anahtarı olmadığından içerik okunamadı. "
        "Dosya kaydedildi, görsel önizleme mevcut.]"
    )
    assert chunk["text"] == expected_text

    metadata = chunk["metadata"]
    assert metadata["source"] == "original.jpeg"
    assert metadata["type"] == "image_metadata_only"
    assert metadata["image_path"] == dummy_path

    mock_read_with_vision.assert_called_once_with(dummy_path)
    mock_getsize.assert_called_once_with(dummy_path)
