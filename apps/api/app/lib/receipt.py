from __future__ import annotations

import uuid

import asyncpg

FeeAccountStatus = str


async def generate_receipt_number(
    school_id: uuid.UUID, conn: asyncpg.Connection
) -> str:
    from datetime import datetime

    year = datetime.now().year
    row = await conn.fetchrow(
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
    seq = int(row["issued_seq"]) if row else 1
    return f"RCP-{year}-{seq:04d}"


def format_class_name(level: str, stream: str | None) -> str:
    return f"{level}{stream}" if stream else level


def compute_fee_account_status(
    amount_owed: int,
    amount_paid: int,
    waived: bool,
) -> FeeAccountStatus:
    if waived:
        return "waived"
    if amount_paid <= 0:
        return "unpaid"
    if amount_paid > amount_owed:
        return "overpaid"
    if amount_paid >= amount_owed:
        return "paid"
    return "partial"


def format_ugx(amount: int | str) -> str:
    value = int(amount)
    return f"UGX {value:,}"
