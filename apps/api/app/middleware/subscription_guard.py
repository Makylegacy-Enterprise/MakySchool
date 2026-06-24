import uuid

import asyncpg
from fastapi import Depends, HTTPException, status

from app.db.pool import get_db
from app.middleware.tenant import get_tenant_and_user, resolve_tenant
from app.services.subscription import audit_school_subscription, subscriptions_enabled


async def require_active_subscription(
    school_id: uuid.UUID = Depends(resolve_tenant),
    conn: asyncpg.Connection = Depends(get_db),
) -> uuid.UUID:
    if not subscriptions_enabled():
        return school_id

    await audit_school_subscription(conn, school_id)

    school = await conn.fetchrow(
        "SELECT status, subscription_status FROM schools WHERE id = $1 LIMIT 1",
        school_id,
    )
    if not school:
        raise HTTPException(status_code=404, detail={"error": "School not found"})
    if school["status"] == "suspended":
        raise HTTPException(
            status_code=403,
            detail={"error": "School account is suspended", "code": "SCHOOL_SUSPENDED"},
        )
    if school["status"] == "setup":
        return school_id
    if school["subscription_status"] != "active":
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Subscription payment required for this term",
                "code": "SUBSCRIPTION_REQUIRED",
            },
        )
    return school_id


async def require_tenant_with_subscription(
    ctx: tuple[uuid.UUID, dict] = Depends(get_tenant_and_user),
    conn: asyncpg.Connection = Depends(get_db),
) -> tuple[uuid.UUID, dict]:
    school_id, user = ctx
    if subscriptions_enabled():
        await audit_school_subscription(conn, school_id)
        school = await conn.fetchrow(
            "SELECT status, subscription_status FROM schools WHERE id = $1 LIMIT 1",
            school_id,
        )
        if school and school["status"] == "suspended":
            raise HTTPException(
                status_code=403,
                detail={"error": "School account is suspended", "code": "SCHOOL_SUSPENDED"},
            )
        if school and school["status"] != "setup" and school["subscription_status"] != "active":
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "Subscription payment required for this term",
                    "code": "SUBSCRIPTION_REQUIRED",
                },
            )
    return ctx
