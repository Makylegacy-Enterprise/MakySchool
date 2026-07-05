"""Tests for student CSV import parsing."""

from __future__ import annotations

import uuid

import pytest

from app.services.students.import_csv import make_fingerprint, parse_csv_bytes, validate_row


def test_parse_csv_utf16_excel_export():
    content = "Student Name,dob,gender,class,Guardian Name\nJane Doe,2015-01-15,female,S1A,Mary Doe\n"
    _, records = parse_csv_bytes(content.encode("utf-16"))
    assert len(records) == 1
    assert records[0]["name"] == "Jane Doe"
    assert records[0]["parent_name"] == "Mary Doe"


def test_parse_csv_with_excel_style_headers():
    raw = b"Student Name,dob,gender,class,Guardian Name\nJane Doe,2015-01-15,female,P3A,Mary Doe\n"
    _, records = parse_csv_bytes(raw)
    assert len(records) == 1
    assert records[0]["name"] == "Jane Doe"
    assert records[0]["class"] == "P3A"
    assert records[0]["parent_name"] == "Mary Doe"


def test_parse_csv_with_aliases():
    raw = b"name,grade,guardian_name\nJane Doe,P3A,Mary Doe\n"
    _, records = parse_csv_bytes(raw)
    assert len(records) == 1
    assert records[0]["name"] == "Jane Doe"
    assert records[0]["class"] == "P3A"
    assert records[0]["parent_name"] == "Mary Doe"


def test_parse_csv_missing_required():
    raw = b"name,class\nJane,P3A\n"
    with pytest.raises(ValueError, match="Missing required columns"):
        parse_csv_bytes(raw)


def test_validate_row_success():
    class_map = {"p3a": str(uuid.uuid4())}
    validated, issues = validate_row(
        row_number=2,
        record={
            "name": "Jane Doe",
            "class": "P3A",
            "parent_name": "Mary Doe",
            "dob": "2015-01-15",
            "gender": "female",
        },
        class_by_name=class_map,
    )
    assert not issues
    assert validated is not None
    assert validated["payload"]["full_name"] == "Jane Doe"


def test_fingerprint_stable():
    class_id = uuid.uuid4()
    first = make_fingerprint(full_name="Jane Doe", date_of_birth=None, class_id=class_id)
    second = make_fingerprint(full_name="  jane   doe ", date_of_birth=None, class_id=class_id)
    assert first == second
