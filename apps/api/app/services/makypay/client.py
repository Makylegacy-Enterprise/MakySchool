from __future__ import annotations

import base64
from typing import Any
from urllib.parse import urlencode

import httpx

from app.config import settings

DEFAULT_BASE_URL = "https://wire-api.makylegacy.com/api/v1"


def _base_url() -> str:
    return (settings.MAKYWIRE_API_BASE_URL or DEFAULT_BASE_URL).rstrip("/")


def makypay_configured() -> bool:
    if settings.MAKYWIRE_AUTH_BASIC.strip():
        return True
    return bool(settings.MAKYWIRE_API_KEY.strip() and settings.MAKYWIRE_API_SECRET.strip())


def _authorization_header() -> str:
    encoded = settings.MAKYWIRE_AUTH_BASIC.strip()
    if encoded:
        return f"Basic {encoded}"

    api_key = settings.MAKYWIRE_API_KEY.strip()
    api_secret = settings.MAKYWIRE_API_SECRET.strip()
    if not api_key or not api_secret:
        raise RuntimeError("MakyPay credentials are not configured")

    token = base64.b64encode(f"{api_key}:{api_secret}".encode()).decode()
    return f"Basic {token}"


async def _makypay_request(
    path: str,
    *,
    method: str = "GET",
    form_body: dict[str, str] | None = None,
) -> dict[str, Any]:
    headers = {
        "Authorization": _authorization_header(),
        "Accept": "application/json",
    }
    body: str | None = None
    if form_body is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        body = urlencode(form_body)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            method,
            f"{_base_url()}{path}",
            headers=headers,
            content=body,
        )

    raw = response.text
    try:
        payload: dict[str, Any] = response.json() if raw else {}
    except ValueError:
        raise RuntimeError(f"Unexpected MakyPay response ({response.status_code})") from None

    if not response.is_success or payload.get("status") == "error":
        message = payload.get("message") or payload.get("error")
        raise RuntimeError(message or f"MakyPay request failed ({response.status_code})")

    return payload


async def collect_mobile_money(
    *,
    phone_number: str,
    amount: int,
    reference: str,
    description: str,
    callback_url: str | None = None,
) -> dict[str, str | None]:
    form: dict[str, str] = {
        "phone_number": phone_number,
        "amount": str(amount),
        "country": "UG",
        "reference": reference,
        "description": description,
    }
    if callback_url:
        form["callback_url"] = callback_url

    result = await _makypay_request(
        "/collections/collect-money",
        method="POST",
        form_body=form,
    )
    transaction = (result.get("data") or {}).get("transaction") or {}
    return {
        "transactionId": transaction.get("uuid"),
        "reference": transaction.get("reference") or reference,
        "status": transaction.get("status") or "processing",
        "message": result.get("message") or "Collection initiated",
    }


async def get_transaction(transaction_id: str) -> dict[str, str | int | None]:
    from urllib.parse import quote

    result = await _makypay_request(f"/transactions/{quote(transaction_id, safe='')}", method="GET")
    transaction = (result.get("data") or {}).get("transaction") or {}
    amount_field = transaction.get("amount")
    raw_amount = None
    if isinstance(amount_field, dict):
        raw_amount = amount_field.get("raw")
    elif amount_field is not None:
        raw_amount = amount_field

    return {
        "transactionId": transaction.get("uuid") or transaction_id,
        "reference": transaction.get("reference"),
        "status": transaction.get("status") or "unknown",
        "amount": raw_amount,
    }
