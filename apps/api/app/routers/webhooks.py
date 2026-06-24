from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime
from typing import Any

import asyncpg
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.config import settings
from app.db.pool import get_db, get_pool
from app.services.makypay.billing import (
    fulfill_subscription_payment,
    mark_payment_failed,
    resolve_billing_period,
)

router = APIRouter()
logger = logging.getLogger("makyschool.webhooks")


def _verify_schoolpay_secret(request: Request, payload: dict[str, Any]) -> bool:
    secret = settings.SCHOOLPAY_WEBHOOK_SECRET
    if not secret:
        return not settings.is_production

    signature = (
        request.headers.get("x-schoolpay-signature")
        or request.headers.get("x-webhook-signature")
    )
    if not signature:
        return False

    body = json.dumps(payload, separators=(",", ":"))
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(signature, expected)
    except Exception:
        return signature == expected


def _verify_makypay_secret(request: Request, payload: dict[str, Any]) -> bool:
    secret = settings.MAKYWIRE_WEBHOOK_SECRET
    if not secret:
        return not settings.is_production

    signature = (
        request.headers.get("x-makywire-signature")
        or request.headers.get("x-webhook-signature")
        or request.headers.get("x-makypay-signature")
    )
    if not signature:
        return False

    body = json.dumps(payload, separators=(",", ":"))
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(signature, expected)
    except Exception:
        return signature == expected


def _extract_amount(raw_payload: dict[str, Any]) -> int:
    transaction = raw_payload.get("transaction") or {}
    amount_field = transaction.get("amount")
    if isinstance(amount_field, dict):
        raw = amount_field.get("raw")
    else:
        raw = amount_field
    if raw is None:
        raw = raw_payload.get("amount") or raw_payload.get("amount_paid") or 0
    return int(raw)


async def _process_schoolpay_webhook(log_id: uuid.UUID, raw_payload: dict[str, Any]) -> None:
    ref = str(raw_payload.get("reference") or raw_payload.get("transaction_id") or "")
    schoolpay_code = str(
        raw_payload.get("schoolpay_code")
        or raw_payload.get("code")
        or raw_payload.get("merchant_code")
        or ""
    )
    amount = int(raw_payload.get("amount") or raw_payload.get("amount_paid") or 0)
    term = str(raw_payload.get("term") or "Term 1")
    year = int(raw_payload.get("year") or datetime.now().year)
    payment_ref = ref or str(uuid.uuid4())

    if not schoolpay_code:
        return

    pool = await get_pool()
    async with pool.acquire() as conn:
        if ref:
            duplicate = await conn.fetchrow(
                "SELECT 1 FROM subscription_payments WHERE schoolpay_ref = $1 LIMIT 1",
                ref,
            )
            if duplicate:
                await conn.execute(
                    "UPDATE webhook_logs SET processed_at = NOW() WHERE id = $1",
                    log_id,
                )
                return

        school = await conn.fetchrow(
            "SELECT id FROM schools WHERE schoolpay_code = $1 LIMIT 1",
            schoolpay_code,
        )
        if not school:
            return

        try:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO subscription_payments (id, school_id, amount, term, year, schoolpay_ref)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
                    """,
                    school["id"],
                    amount,
                    term,
                    year,
                    payment_ref,
                )
                await conn.execute(
                    """
                    UPDATE schools
                    SET subscription_status = 'active', subscription_term = $1, subscription_year = $2
                    WHERE id = $3
                    """,
                    term,
                    year,
                    school["id"],
                )
                await conn.execute(
                    "UPDATE webhook_logs SET processed_at = NOW() WHERE id = $1",
                    log_id,
                )
        except Exception:
            logger.exception("SchoolPay webhook processing failed")


async def _process_makypay_webhook(log_id: uuid.UUID, raw_payload: dict[str, Any]) -> None:
    event_type = str(raw_payload.get("event_type") or "")
    transaction = raw_payload.get("transaction") or {}
    reference = str(transaction.get("reference") or raw_payload.get("reference") or "")
    transaction_id = str(
        transaction.get("uuid")
        or transaction.get("id")
        or raw_payload.get("transaction_id")
        or ""
    )

    if not reference:
        return

    pool = await get_pool()
    async with pool.acquire() as conn:
        payment = await conn.fetchrow(
            """
            SELECT school_id, term, year, status, amount
            FROM subscription_payments
            WHERE payment_reference = $1
            LIMIT 1
            """,
            reference,
        )
        if not payment:
            return

        normalized_event = event_type.lower()
        normalized_status = str(transaction.get("status") or "").lower()
        is_completed = normalized_event == "collection.completed" or normalized_status == "completed"
        is_failed = normalized_event in (
            "collection.failed",
            "collection.cancelled",
        ) or normalized_status in ("failed", "cancelled")

        if is_failed:
            await mark_payment_failed(conn, reference)
            await conn.execute(
                "UPDATE webhook_logs SET processed_at = NOW() WHERE id = $1",
                log_id,
            )
            return

        if not is_completed:
            return

        amount = _extract_amount(raw_payload)
        external_ref = transaction_id or reference

        school = await conn.fetchrow(
            "SELECT subscription_term, subscription_year FROM schools WHERE id = $1 LIMIT 1",
            payment["school_id"],
        )
        period = resolve_billing_period(
            payment["term"] or (school["subscription_term"] if school else None),
            payment["year"] or (school["subscription_year"] if school else None),
        )

        try:
            await fulfill_subscription_payment(
                conn,
                school_id=payment["school_id"],
                reference=reference,
                external_ref=external_ref,
                amount=amount or int(payment["amount"]),
                term=str(period["term"]),
                year=int(period["year"]),
                expected_fee_ugx=int(payment["amount"]),
            )
            await conn.execute(
                "UPDATE webhook_logs SET processed_at = NOW() WHERE id = $1",
                log_id,
            )
        except Exception:
            logger.exception("MakyPay webhook fulfillment failed")


@router.post("/schoolpay")
async def schoolpay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    conn: asyncpg.Connection = Depends(get_db),
):
    raw_payload = await request.json()
    if not isinstance(raw_payload, dict):
        raw_payload = {}

    if not _verify_schoolpay_secret(request, raw_payload):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid webhook signature"},
        )

    log_row = await conn.fetchrow(
        """
        INSERT INTO webhook_logs (id, source, payload, headers)
        VALUES (gen_random_uuid(), $1, $2::jsonb, $3::jsonb)
        RETURNING id
        """,
        "schoolpay",
        json.dumps(raw_payload),
        json.dumps(dict(request.headers)),
    )

    background_tasks.add_task(_process_schoolpay_webhook, log_row["id"], raw_payload)
    return {"data": {"ok": True}}


@router.post("/makypay")
async def makypay_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    conn: asyncpg.Connection = Depends(get_db),
):
    raw_payload = await request.json()
    if not isinstance(raw_payload, dict):
        raw_payload = {}

    if not _verify_makypay_secret(request, raw_payload):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid webhook signature"},
        )

    log_row = await conn.fetchrow(
        """
        INSERT INTO webhook_logs (id, source, payload, headers)
        VALUES (gen_random_uuid(), $1, $2::jsonb, $3::jsonb)
        RETURNING id
        """,
        "makypay",
        json.dumps(raw_payload),
        json.dumps(dict(request.headers)),
    )

    background_tasks.add_task(_process_makypay_webhook, log_row["id"], raw_payload)
    return {"data": {"ok": True}}
