from __future__ import annotations

import csv
import io
import re
import secrets
import uuid
from datetime import datetime
from typing import Any

import asyncpg

LEARNER_ID_PREFIX_RE = re.compile(r"^[A-Z0-9]{2,8}$")
LEARNER_ID_MODES = frozenset({"sequential", "random"})


def derive_learner_id_prefix(slug: str) -> str:
    parts = [
        re.sub(r"[^a-z0-9]", "", part)
        for part in re.split(r"[-_\s]+", slug.lower())
        if re.sub(r"[^a-z0-9]", "", part)
    ]

    if not parts:
        return "SCH"

    if len(parts) == 1:
        return parts[0][:3].upper().ljust(3, "X")

    if len(parts) == 2 and len(parts[0]) <= 3:
        first = parts[0].upper()
        second_initial = parts[1][0].upper()
        return f"{first}{second_initial}"[:4]

    if len(parts) == 2:
        return parts[0][:3].upper()

    return "".join(part[0].upper() for part in parts)[:4]


async def fetch_learner_id_settings(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
) -> dict[str, Any]:
    row = await conn.fetchrow(
        """
        SELECT slug, learner_id_prefix, learner_id_suffix_length, learner_id_mode
        FROM schools WHERE id = $1 LIMIT 1
        """,
        school_id,
    )
    if not row:
        raise ValueError("School not found")

    default_prefix = derive_learner_id_prefix(row["slug"] or "school")
    prefix = (row["learner_id_prefix"] or "").strip().upper() or default_prefix
    mode = row["learner_id_mode"] or "sequential"
    suffix_length = int(row["learner_id_suffix_length"] or 6)

    return {
        "prefix": prefix,
        "suffix_length": suffix_length,
        "mode": mode,
        "default_prefix": default_prefix,
    }


def validate_learner_id_settings(
    *,
    prefix: str | None,
    suffix_length: int | None,
    mode: str | None,
) -> dict[str, str]:
    fields: dict[str, str] = {}

    if prefix is not None:
        normalized = prefix.strip().upper()
        if not normalized:
            fields["prefix"] = "Prefix is required."
        elif not LEARNER_ID_PREFIX_RE.match(normalized):
            fields["prefix"] = "Prefix must be 2–8 letters or digits."

    if suffix_length is not None:
        if suffix_length < 4 or suffix_length > 10:
            fields["suffix_length"] = "Suffix length must be between 4 and 10."

    if mode is not None and mode not in LEARNER_ID_MODES:
        fields["mode"] = "Mode must be sequential or random."

    return fields


async def generate_learner_id(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
    *,
    reserved: set[str] | None = None,
) -> str:
    settings = await fetch_learner_id_settings(conn, school_id)
    if settings["mode"] == "random":
        return await _generate_random_learner_id(
            conn,
            school_id,
            prefix=settings["prefix"],
            suffix_length=settings["suffix_length"],
            reserved=reserved,
        )
    return await _generate_sequential_learner_id(
        conn,
        school_id,
        prefix=settings["prefix"],
    )


async def allocate_learner_ids(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
    count: int,
) -> list[str]:
    if count <= 0:
        return []

    settings = await fetch_learner_id_settings(conn, school_id)
    existing_rows = await conn.fetch(
        "SELECT learner_id FROM students WHERE school_id = $1",
        school_id,
    )
    reserved = {row["learner_id"] for row in existing_rows}

    if settings["mode"] == "random":
        ids: list[str] = []
        while len(ids) < count:
            candidate = _random_learner_id(settings["prefix"], settings["suffix_length"])
            if candidate not in reserved and candidate not in ids:
                ids.append(candidate)
        return ids

    ids = []
    for _ in range(count):
        learner_id = await _generate_sequential_learner_id(
            conn,
            school_id,
            prefix=settings["prefix"],
        )
        ids.append(learner_id)
    return ids


def _random_learner_id(prefix: str, suffix_length: int) -> str:
    upper = 10**suffix_length
    suffix = str(secrets.randbelow(upper)).zfill(suffix_length)
    return f"{prefix}{suffix}"


async def _generate_random_learner_id(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
    *,
    prefix: str,
    suffix_length: int,
    reserved: set[str] | None = None,
    max_attempts: int = 50,
) -> str:
    taken = reserved or set()
    if not taken:
        rows = await conn.fetch(
            "SELECT learner_id FROM students WHERE school_id = $1",
            school_id,
        )
        taken = {row["learner_id"] for row in rows}

    for _ in range(max_attempts):
        candidate = _random_learner_id(prefix, suffix_length)
        if candidate not in taken:
            return candidate

    raise RuntimeError("Could not allocate a unique learner ID")


async def _generate_sequential_learner_id(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
    *,
    prefix: str,
) -> str:
    year = datetime.now().year
    seq_row = await conn.fetchrow(
        """
        INSERT INTO learner_id_sequences (school_id, prefix, year, next_seq)
        VALUES ($1, $2, $3, 2)
        ON CONFLICT (school_id, year) DO UPDATE
        SET next_seq = learner_id_sequences.next_seq + 1,
            prefix = EXCLUDED.prefix
        RETURNING next_seq - 1 AS issued_seq, prefix
        """,
        school_id,
        prefix,
        year,
    )
    issued_seq = int(seq_row["issued_seq"]) if seq_row else 1
    resolved_prefix = seq_row["prefix"] if seq_row else prefix
    return f"{resolved_prefix}-{year}-{issued_seq:03d}"
