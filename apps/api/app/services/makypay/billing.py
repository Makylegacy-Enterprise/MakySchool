from __future__ import annotations

import uuid
from datetime import datetime

import asyncpg

from app.services.subscription import UGANDA_TERMS

BillingPeriod = dict[str, str | int]


def resolve_billing_period(
    subscription_term: str | None,
    subscription_year: int | None,
) -> BillingPeriod:
    year = subscription_year or datetime.now().year
    if subscription_term:
        return {"term": subscription_term, "year": year}

    month = datetime.now().month
    if month >= 5 and month <= 8:
        term = UGANDA_TERMS[1]
    elif month >= 9:
        term = UGANDA_TERMS[2]
    else:
        term = UGANDA_TERMS[0]
    return {"term": term, "year": year}


async def fulfill_subscription_payment(
    conn: asyncpg.Connection,
    *,
    school_id: uuid.UUID,
    reference: str,
    external_ref: str,
    amount: int,
    term: str,
    year: int,
    expected_fee_ugx: int,
) -> str:
    row = await conn.fetchrow(
        """
        SELECT id, status, school_id
        FROM subscription_payments
        WHERE payment_reference = $1
        LIMIT 1
        """,
        reference,
    )

    if row and row["status"] == "completed":
        return "already_completed"

    duplicate = await conn.fetchrow(
        """
        SELECT 1 FROM subscription_payments
        WHERE schoolpay_ref = $1 AND status = 'completed'
        LIMIT 1
        """,
        external_ref,
    )
    if duplicate:
        return "already_completed"

    if amount > 0 and amount != expected_fee_ugx:
        raise ValueError("Unexpected payment amount")

    paid_amount = amount or expected_fee_ugx

    async with conn.transaction():
        if row:
            await conn.execute(
                """
                UPDATE subscription_payments
                SET status = 'completed',
                    schoolpay_ref = $1,
                    paid_at = NOW(),
                    amount = $2
                WHERE id = $3
                """,
                external_ref,
                paid_amount,
                row["id"],
            )
        else:
            await conn.execute(
                """
                INSERT INTO subscription_payments (
                  id, school_id, amount, term, year, schoolpay_ref,
                  status, payment_reference, provider, paid_at
                ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'completed', $6, 'makypay', NOW())
                """,
                school_id,
                paid_amount,
                term,
                year,
                external_ref,
                reference,
            )

        await conn.execute(
            """
            UPDATE schools
            SET subscription_status = 'active', subscription_term = $1, subscription_year = $2
            WHERE id = $3
            """,
            term,
            year,
            school_id,
        )

    return "completed"


async def mark_payment_failed(conn: asyncpg.Connection, reference: str) -> None:
    await conn.execute(
        """
        UPDATE subscription_payments
        SET status = 'failed'
        WHERE payment_reference = $1 AND status = 'pending'
        """,
        reference,
    )
