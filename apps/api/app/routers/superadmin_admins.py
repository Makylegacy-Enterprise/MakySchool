from __future__ import annotations

import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.db.pool import get_db
from app.lib.password import hash_password, validate_password
from app.middleware.auth import get_current_superadmin
from app.services.central_auth import CentralAuthError, central_auth_enabled, sync_user_password

router = APIRouter(dependencies=[Depends(get_current_superadmin)])


class CreateAdminBody(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None


@router.get("")
async def list_admins(conn: asyncpg.Connection = Depends(get_db)):
    rows = await conn.fetch(
        """
        SELECT id, email, name, auth_user_id, created_at
        FROM super_admins
        ORDER BY created_at ASC
        """
    )
    return {
        "data": [
            {
                "id": str(row["id"]),
                "email": row["email"],
                "name": row["name"],
                "auth_user_id": str(row["auth_user_id"]) if row["auth_user_id"] else None,
                "created_at": row["created_at"],
            }
            for row in rows
        ]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_admin(
    body: CreateAdminBody,
    conn: asyncpg.Connection = Depends(get_db),
):
    if not body.name or not body.name.strip() or not body.email or not body.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Name, email, and password are required"},
        )

    password_error = validate_password(body.password)
    if password_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": password_error},
        )

    normalized_email = str(body.email).lower().strip()
    existing = await conn.fetchrow(
        "SELECT 1 FROM super_admins WHERE LOWER(email) = LOWER($1) LIMIT 1",
        normalized_email,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "A platform admin with this email already exists"},
        )

    admin_id = uuid.uuid4()
    password_hash = hash_password(body.password)
    auth_user_id: uuid.UUID | None = None

    if central_auth_enabled():
        try:
            linked = await sync_user_password(normalized_email, body.password)
            if linked:
                auth_user_id = uuid.UUID(linked)
        except CentralAuthError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"error": str(exc), "code": exc.code or "AUTH_SERVICE_ERROR"},
            ) from exc

    await conn.execute(
        """
        INSERT INTO super_admins (id, email, password_hash, name, auth_user_id)
        VALUES ($1, $2, $3, $4, $5)
        """,
        admin_id,
        normalized_email,
        password_hash,
        body.name.strip(),
        auth_user_id,
    )

    return {
        "data": {
            "id": str(admin_id),
            "email": normalized_email,
            "name": body.name.strip(),
            "auth_user_id": str(auth_user_id) if auth_user_id else None,
        }
    }
