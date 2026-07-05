from __future__ import annotations

import csv
import io
import re
import uuid
from datetime import date
from typing import Any

import asyncpg

from app.lib.teacher_assignments import format_class_name

PHONE_RE = re.compile(r"^\+?[0-9\s\-]{7,15}$")
GENDERS = frozenset({"male", "female", "other"})
RELATIONSHIPS = frozenset({"parent", "guardian", "sibling", "other"})

CSV_REQUIRED_HEADERS = ("name", "class", "parent_name")

COLUMN_ALIASES: dict[str, frozenset[str]] = {
    "name": frozenset({"name", "full_name", "student_name", "student", "learner_name"}),
    "dob": frozenset({"dob", "date_of_birth", "birth_date", "birthdate"}),
    "gender": frozenset({"gender", "sex"}),
    "class": frozenset({"class", "class_name", "grade", "form"}),
    "parent_name": frozenset({"parent_name", "guardian_name", "parent", "guardian"}),
    "parent_phone": frozenset({"parent_phone", "guardian_phone", "phone", "contact_phone"}),
    "parent_email": frozenset({"parent_email", "guardian_email", "email", "contact_email"}),
    "guardian_relationship": frozenset({
        "guardian_relationship",
        "relationship",
        "parent_relationship",
    }),
}


def _normalize_header(header: str) -> str:
    cleaned = header.strip().lstrip("\ufeff").strip("\"'")
    cleaned = re.sub(r"[\s\-]+", "_", cleaned)
    return cleaned.lower()


def _resolve_canonical(header: str) -> str | None:
    normalized = _normalize_header(header)
    for canonical, aliases in COLUMN_ALIASES.items():
        if normalized in aliases:
            return canonical
    return None


def _decode_csv_bytes(raw: bytes) -> str:
    if not raw.strip():
        raise ValueError("The CSV file is empty.")

    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        return raw.decode("utf-16")
    if b"\x00" in raw[: min(len(raw), 200)]:
        for encoding in ("utf-16", "utf-16-le", "utf-16-be"):
            try:
                return raw.decode(encoding)
            except UnicodeDecodeError:
                continue
    return raw.decode("utf-8-sig")


def parse_csv_bytes(raw: bytes) -> tuple[set[str], list[dict[str, str]]]:
    text = _decode_csv_bytes(raw)
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV has no header row")

    header_map: dict[str, str | None] = {}
    for header in reader.fieldnames:
        header_map[header] = _resolve_canonical(header)

    canonical_present = {value for value in header_map.values() if value}
    missing = [header for header in CSV_REQUIRED_HEADERS if header not in canonical_present]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    records: list[dict[str, str]] = []
    for row in reader:
        mapped: dict[str, str] = {}
        for original_key, value in row.items():
            canonical = header_map.get(original_key)
            if canonical:
                mapped[canonical] = (value or "").strip()
        if any(mapped.get(key) for key in CSV_REQUIRED_HEADERS):
            records.append(mapped)

    return canonical_present, records


def normalize_gender(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    raw = value.strip().lower()
    if raw in ("m", "male"):
        return "male"
    if raw in ("f", "female"):
        return "female"
    if raw == "other":
        return "other"
    return None


def normalize_relationship(value: str | None) -> str:
    raw = (value or "parent").strip().lower()
    return raw if raw in RELATIONSHIPS else "parent"


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def make_fingerprint(
    *,
    full_name: str,
    date_of_birth: date | None,
    class_id: uuid.UUID,
) -> str:
    dob = date_of_birth.isoformat() if date_of_birth else ""
    return f"{normalize_name(full_name)}|{dob}|{class_id}"


async def load_class_map(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
) -> dict[str, str]:
    rows = await conn.fetch(
        "SELECT id, level, stream FROM school_classes WHERE school_id = $1",
        school_id,
    )
    by_name: dict[str, str] = {}
    for row in rows:
        name = format_class_name(row["level"], row["stream"])
        class_id = str(row["id"])
        by_name[name.lower()] = class_id
        by_name[row["level"].lower()] = class_id
    return by_name


async def load_existing_fingerprints(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
) -> set[str]:
    rows = await conn.fetch(
        """
        SELECT full_name, date_of_birth, current_class_id
        FROM students
        WHERE school_id = $1 AND status = 'active' AND current_class_id IS NOT NULL
        """,
        school_id,
    )
    fingerprints: set[str] = set()
    for row in rows:
        if not row["current_class_id"]:
            continue
        fingerprints.add(
            make_fingerprint(
                full_name=row["full_name"],
                date_of_birth=row["date_of_birth"],
                class_id=row["current_class_id"],
            )
        )
    return fingerprints


def validate_row(
    *,
    row_number: int,
    record: dict[str, str],
    class_by_name: dict[str, str],
) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    issues: list[dict[str, Any]] = []

    name = (record.get("name") or "").strip()
    class_label = (record.get("class") or "").strip()
    parent_name = (record.get("parent_name") or "").strip()
    dob_raw = (record.get("dob") or "").strip()
    gender_raw = (record.get("gender") or "").strip()
    parent_phone = (record.get("parent_phone") or "").strip()
    parent_email = (record.get("parent_email") or "").strip()
    relationship_raw = (record.get("guardian_relationship") or "").strip()

    if not name:
        issues.append(_issue(row_number, "name", "MISSING_NAME", "Student name is required."))
    elif len(name) < 2 or len(name) > 100:
        issues.append(_issue(row_number, "name", "INVALID_NAME", "Name must be 2–100 characters."))

    class_id: str | None = None
    if not class_label:
        issues.append(_issue(row_number, "class", "MISSING_CLASS", "Class is required."))
    else:
        class_id = class_by_name.get(class_label.lower())
        if not class_id:
            issues.append(
                _issue(
                    row_number,
                    "class",
                    "CLASS_NOT_FOUND",
                    f'Class "{class_label}" was not found in your school.',
                )
            )

    if not parent_name:
        issues.append(
            _issue(row_number, "parent_name", "MISSING_GUARDIAN", "Parent/guardian name is required.")
        )
    elif len(parent_name) < 2 or len(parent_name) > 100:
        issues.append(
            _issue(row_number, "parent_name", "INVALID_GUARDIAN", "Guardian name must be 2–100 characters.")
        )

    date_of_birth: date | None = None
    if dob_raw:
        try:
            date_of_birth = date.fromisoformat(dob_raw[:10])
        except ValueError:
            issues.append(
                _issue(row_number, "dob", "INVALID_DOB", "Date of birth must be YYYY-MM-DD.")
            )

    gender = normalize_gender(gender_raw)
    if gender_raw and not gender:
        issues.append(_issue(row_number, "gender", "INVALID_GENDER", "Gender must be male, female, or other."))

    if parent_phone and not PHONE_RE.match(parent_phone):
        issues.append(
            _issue(row_number, "parent_phone", "INVALID_PHONE", "Enter a valid phone number.")
        )

    if issues:
        return None, issues

    payload = {
        "full_name": name,
        "date_of_birth": date_of_birth.isoformat() if date_of_birth else None,
        "gender": gender,
        "class_id": class_id,
        "class_label": class_label,
        "guardian_name": parent_name,
        "guardian_phone": parent_phone or None,
        "guardian_email": parent_email or None,
        "guardian_relationship": normalize_relationship(relationship_raw),
    }
    fingerprint = make_fingerprint(
        full_name=name,
        date_of_birth=date_of_birth,
        class_id=uuid.UUID(class_id),
    )
    return {"payload": payload, "fingerprint": fingerprint}, issues


def _issue(row: int, field: str, code: str, message: str) -> dict[str, Any]:
    return {"row": row, "field": field, "code": code, "message": message}
