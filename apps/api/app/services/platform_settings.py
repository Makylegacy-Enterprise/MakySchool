from __future__ import annotations

import time
import uuid

import asyncpg

SUBSCRIPTION_FEE_UGX = 300_000
SUBSCRIPTION_FEE_SETTING_KEY = "subscription_fee_ugx"
MIN_SUBSCRIPTION_FEE_UGX = 500
MAX_SUBSCRIPTION_FEE_UGX = 10_000_000
_CACHE_TTL_SECONDS = 30

_subscription_fee_cache: dict[str, float | int] | None = None


def clear_platform_settings_cache() -> None:
    global _subscription_fee_cache
    _subscription_fee_cache = None


def parse_subscription_fee(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        parsed = int(float(value))
    except (TypeError, ValueError):
        return None
    if parsed < MIN_SUBSCRIPTION_FEE_UGX or parsed > MAX_SUBSCRIPTION_FEE_UGX:
        return None
    return parsed


async def get_subscription_fee_ugx(conn: asyncpg.Connection) -> int:
    global _subscription_fee_cache
    now = time.time()
    if _subscription_fee_cache and _subscription_fee_cache["expires_at"] > now:
        return int(_subscription_fee_cache["value"])

    row = await conn.fetchrow(
        "SELECT setting_value FROM platform_settings WHERE setting_key = $1 LIMIT 1",
        SUBSCRIPTION_FEE_SETTING_KEY,
    )
    fee = parse_subscription_fee(row["setting_value"] if row else None) or SUBSCRIPTION_FEE_UGX
    _subscription_fee_cache = {"value": fee, "expires_at": now + _CACHE_TTL_SECONDS}
    return fee


async def set_subscription_fee_ugx(
    conn: asyncpg.Connection, amount: int, updated_by: uuid.UUID
) -> int:
    fee = parse_subscription_fee(str(amount))
    if fee is None:
        raise ValueError(
            f"Subscription fee must be between {MIN_SUBSCRIPTION_FEE_UGX:,} "
            f"and {MAX_SUBSCRIPTION_FEE_UGX:,} UGX"
        )

    await conn.execute(
        """
        INSERT INTO platform_settings (setting_key, setting_value, description, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (setting_key) DO UPDATE
        SET setting_value = EXCLUDED.setting_value,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        """,
        SUBSCRIPTION_FEE_SETTING_KEY,
        str(fee),
        "Termly subscription fee in UGX charged to schools",
        updated_by,
    )
    clear_platform_settings_cache()
    return fee


async def get_subscription_fee_setting_meta(conn: asyncpg.Connection) -> dict:
    row = await conn.fetchrow(
        """
        SELECT
          ps.setting_value,
          ps.updated_at,
          ps.updated_by,
          sa.name AS updater_name,
          sa.email AS updater_email
        FROM platform_settings ps
        LEFT JOIN super_admins sa ON sa.id = ps.updated_by
        WHERE ps.setting_key = $1
        LIMIT 1
        """,
        SUBSCRIPTION_FEE_SETTING_KEY,
    )
    amount = await get_subscription_fee_ugx(conn)
    updated_by = None
    if row and row["updated_by"]:
        updated_by = {
            "id": str(row["updated_by"]),
            "name": row["updater_name"],
            "email": row["updater_email"],
        }
    return {
        "subscription_fee_ugx": amount,
        "currency": "UGX",
        "min_ugx": MIN_SUBSCRIPTION_FEE_UGX,
        "max_ugx": MAX_SUBSCRIPTION_FEE_UGX,
        "updated_at": row["updated_at"] if row else None,
        "updated_by": updated_by,
    }
