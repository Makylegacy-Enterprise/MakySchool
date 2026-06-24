from __future__ import annotations

import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.pool import get_db
from app.middleware.auth import get_current_superadmin
from app.services.subscription import (
    audit_all_school_subscriptions,
    audit_school_subscription,
    get_school_audit_history,
    get_subscription_audit_overview,
)

router = APIRouter(dependencies=[Depends(get_current_superadmin)])


@router.get("/overview")
async def subscription_overview(conn: asyncpg.Connection = Depends(get_db)):
    overview = await get_subscription_audit_overview(conn)
    return {"data": overview}


@router.post("/audit-run")
async def subscription_audit_run(
    admin: dict = Depends(get_current_superadmin),
    conn: asyncpg.Connection = Depends(get_db),
):
    triggered_by = uuid.UUID(str(admin["sub"])) if admin.get("sub") else None
    result = await audit_all_school_subscriptions(conn, triggered_by=triggered_by)
    return {"data": result}


@router.post("/schools/{school_id}/require-payment")
async def require_school_payment(
    school_id: uuid.UUID,
    admin: dict = Depends(get_current_superadmin),
    conn: asyncpg.Connection = Depends(get_db),
):
    triggered_by = uuid.UUID(str(admin["sub"])) if admin.get("sub") else None
    result = await audit_school_subscription(
        conn, school_id, manual=True, triggered_by=triggered_by
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "School not found or still in setup"},
        )
    return {"data": result}


@router.get("/schools/{school_id}/history")
async def school_subscription_history(
    school_id: uuid.UUID,
    conn: asyncpg.Connection = Depends(get_db),
):
    history = await get_school_audit_history(conn, school_id)
    return {"data": history}
