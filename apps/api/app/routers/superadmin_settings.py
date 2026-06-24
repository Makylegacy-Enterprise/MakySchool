from __future__ import annotations

import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.pool import get_db
from app.middleware.auth import get_current_superadmin
from app.services.platform_settings import (
    get_subscription_fee_setting_meta,
    set_subscription_fee_ugx,
)

router = APIRouter(dependencies=[Depends(get_current_superadmin)])


class BillingSettingsPatch(BaseModel):
    subscription_fee_ugx: int | None = None


@router.get("/billing")
async def get_billing_settings(conn: asyncpg.Connection = Depends(get_db)):
    settings_data = await get_subscription_fee_setting_meta(conn)
    return {"data": settings_data}


@router.patch("/billing")
async def patch_billing_settings(
    body: BillingSettingsPatch,
    admin: dict = Depends(get_current_superadmin),
    conn: asyncpg.Connection = Depends(get_db),
):
    superadmin_id = admin.get("sub")
    if not superadmin_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Not authenticated"},
        )

    if body.subscription_fee_ugx is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "subscription_fee_ugx is required"},
        )

    try:
        fee = await set_subscription_fee_ugx(
            conn, int(body.subscription_fee_ugx), uuid.UUID(str(superadmin_id))
        )
        settings_data = await get_subscription_fee_setting_meta(conn)
        return {"data": {**settings_data, "subscription_fee_ugx": fee}}
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(exc)},
        ) from exc
