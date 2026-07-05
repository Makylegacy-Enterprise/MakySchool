import uuid
from datetime import datetime

import asyncpg

from app.services.students.learner_ids import (
    derive_learner_id_prefix,
    generate_learner_id as _generate_learner_id,
)

__all__ = ["derive_learner_id_prefix", "generate_learner_id", "generate_receipt_number"]


async def generate_learner_id(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
) -> str:
    return await _generate_learner_id(conn, school_id)


async def generate_receipt_number(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
) -> str:
    year = datetime.now().year

    seq_row = await conn.fetchrow(
        """
        INSERT INTO receipt_number_sequences (school_id, year, next_seq)
        VALUES ($1, $2, 2)
        ON CONFLICT (school_id, year) DO UPDATE
        SET next_seq = receipt_number_sequences.next_seq + 1
        RETURNING next_seq - 1 AS issued_seq
        """,
        school_id,
        year,
    )

    seq = int(seq_row["issued_seq"]) if seq_row else 1
    return f"RCP-{year}-{seq:04d}"


async def _next_sequence(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
    *,
    table: str,
    prefix: str,
) -> str:
    year = datetime.now().year
    seq_row = await conn.fetchrow(
        f"""
        INSERT INTO {table} (school_id, year, next_seq)
        VALUES ($1, $2, 2)
        ON CONFLICT (school_id, year) DO UPDATE
        SET next_seq = {table}.next_seq + 1
        RETURNING next_seq - 1 AS issued_seq
        """,
        school_id,
        year,
    )
    seq = int(seq_row["issued_seq"]) if seq_row else 1
    return f"{prefix}-{year}-{seq:04d}"


async def generate_invoice_number(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
) -> str:
    return await _next_sequence(conn, school_id, table="invoice_number_sequences", prefix="INV")


async def generate_income_reference(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
) -> str:
    return await _next_sequence(conn, school_id, table="income_reference_sequences", prefix="INC")
