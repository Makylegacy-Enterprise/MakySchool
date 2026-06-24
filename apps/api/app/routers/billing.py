from __future__ import annotations

import os
import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.db.pool import get_db
from app.middleware.tenant import get_tenant_and_user
from app.services.makypay.billing import fulfill_subscription_payment, mark_payment_failed
from app.services.makypay.client import collect_mobile_money, get_transaction, makypay_configured
from app.services.makypay.phone import normalize_uganda_phone
from app.services.platform_settings import get_subscription_fee_ugx
from app.services.subscription import audit_school_subscription, resolve_required_billing_period

router = APIRouter()


async def _require_school_admin(
    ctx: tuple[uuid.UUID, dict] = Depends(get_tenant_and_user),
) -> tuple[uuid.UUID, dict]:
    _school_id, user = ctx
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Only school administrators can manage billing", "code": "FORBIDDEN"},
        )
    return ctx


def _callback_url() -> str:
    configured = settings.MAKYWIRE_CALLBACK_URL.strip()
    if configured:
        return configured
    api_url = os.environ.get("API_URL", f"http://localhost:{settings.PORT}").rstrip("/")
    return f"{api_url}/api/webhooks/makypay"


class CollectBody(BaseModel):
    phone_number: str | None = None


@router.get("/quote")
async def billing_quote(
    ctx: tuple[uuid.UUID, dict] = Depends(_require_school_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    school_id, _user = ctx
    await audit_school_subscription(conn, school_id)

    school = await conn.fetchrow(
        """
        SELECT subscription_status, subscription_term, subscription_year, phone
        FROM schools WHERE id = $1 LIMIT 1
        """,
        school_id,
    )
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "School not found"})

    period = await resolve_required_billing_period(conn, school_id)
    subscription_fee = await get_subscription_fee_ugx(conn)

    return {
        "data": {
            "amount": subscription_fee,
            "currency": "UGX",
            "term": period["term"],
            "year": period["year"],
            "subscription_status": school["subscription_status"],
            "phone_hint": school["phone"],
            "configured": makypay_configured(),
        }
    }


@router.post("/collect", status_code=status.HTTP_201_CREATED)
async def billing_collect(
    body: CollectBody,
    ctx: tuple[uuid.UUID, dict] = Depends(_require_school_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    school_id, _user = ctx

    if not makypay_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Mobile money payments are not configured yet. Contact platform support.",
                "code": "PAYMENTS_NOT_CONFIGURED",
            },
        )

    phone_number = normalize_uganda_phone(body.phone_number) if body.phone_number else None
    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Enter a valid MTN or Airtel number (e.g. 0700 000 000)",
                "code": "INVALID_PHONE",
            },
        )

    school = await conn.fetchrow(
        """
        SELECT name, subscription_status, subscription_term, subscription_year
        FROM schools WHERE id = $1 LIMIT 1
        """,
        school_id,
    )
    if not school:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "School not found"})

    await audit_school_subscription(conn, school_id)
    refreshed = await conn.fetchrow(
        """
        SELECT name, subscription_status, subscription_term, subscription_year
        FROM schools WHERE id = $1 LIMIT 1
        """,
        school_id,
    )
    current_school = refreshed or school
    period = await resolve_required_billing_period(conn, school_id)

    if (
        current_school["subscription_status"] == "active"
        and current_school["subscription_term"] == period["term"]
        and current_school["subscription_year"] == period["year"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Your subscription is already active for this term",
                "code": "ALREADY_ACTIVE",
            },
        )

    pending = await conn.fetchrow(
        """
        SELECT 1 FROM subscription_payments
        WHERE school_id = $1 AND status = 'pending' AND created_at > NOW() - INTERVAL '15 minutes'
        LIMIT 1
        """,
        school_id,
    )
    if pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "A payment is already in progress. Check your phone or wait a few minutes.",
                "code": "PAYMENT_IN_PROGRESS",
            },
        )

    subscription_fee = await get_subscription_fee_ugx(conn)
    reference = str(uuid.uuid4())
    description = f"MakySchool subscription — {current_school['name']} ({period['term']} {period['year']})"

    await conn.execute(
        """
        INSERT INTO subscription_payments (
          id, school_id, amount, term, year, status, payment_reference, provider
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', $5, 'makypay')
        """,
        school_id,
        subscription_fee,
        period["term"],
        period["year"],
        reference,
    )

    try:
        collection = await collect_mobile_money(
            phone_number=phone_number,
            amount=subscription_fee,
            reference=reference,
            description=description,
            callback_url=_callback_url(),
        )
        if collection.get("transactionId"):
            await conn.execute(
                """
                UPDATE subscription_payments
                SET provider_transaction_id = $1
                WHERE payment_reference = $2
                """,
                collection["transactionId"],
                reference,
            )
    except Exception as exc:
        await mark_payment_failed(conn, reference)
        message = str(exc) if str(exc) else "Failed to start mobile money payment"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": message, "code": "PAYMENT_INIT_FAILED"},
        ) from exc

    return {
        "data": {
            "reference": reference,
            "status": "processing",
            "message": "Approve the payment on your phone to continue.",
            "phone_number": phone_number,
        }
    }


@router.get("/payments/{reference}")
async def billing_payment_status(
    reference: str,
    ctx: tuple[uuid.UUID, dict] = Depends(_require_school_admin),
    conn: asyncpg.Connection = Depends(get_db),
):
    school_id, _user = ctx

    if not reference:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Payment reference is required"},
        )

    payment = await conn.fetchrow(
        """
        SELECT status, provider_transaction_id, term, year, school_id, amount
        FROM subscription_payments
        WHERE payment_reference = $1 AND school_id = $2
        LIMIT 1
        """,
        reference,
        school_id,
    )
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": "Payment not found"})

    school = await conn.fetchrow(
        "SELECT subscription_status FROM schools WHERE id = $1 LIMIT 1",
        school_id,
    )
    subscription_status = school["subscription_status"] if school else "unpaid"

    if payment["status"] == "completed" or subscription_status == "active":
        return {
            "data": {
                "reference": reference,
                "status": "completed",
                "subscription_status": subscription_status,
            }
        }

    if payment["status"] == "failed":
        return {
            "data": {
                "reference": reference,
                "status": "failed",
                "subscription_status": subscription_status,
            }
        }

    if payment["provider_transaction_id"] and makypay_configured():
        try:
            remote = await get_transaction(payment["provider_transaction_id"])
            normalized = str(remote.get("status", "")).lower()

            if normalized in ("completed", "success"):
                await fulfill_subscription_payment(
                    conn,
                    school_id=payment["school_id"],
                    reference=reference,
                    external_ref=str(remote.get("transactionId") or reference),
                    amount=int(remote.get("amount") or payment["amount"]),
                    term=payment["term"],
                    year=int(payment["year"]),
                    expected_fee_ugx=int(payment["amount"]),
                )
                return {
                    "data": {
                        "reference": reference,
                        "status": "completed",
                        "subscription_status": "active",
                    }
                }

            if normalized in ("failed", "cancelled"):
                await mark_payment_failed(conn, reference)
                return {
                    "data": {
                        "reference": reference,
                        "status": "failed",
                        "subscription_status": subscription_status,
                    }
                }
        except Exception:
            pass

    return {
        "data": {
            "reference": reference,
            "status": "processing",
            "subscription_status": subscription_status,
        }
    }
