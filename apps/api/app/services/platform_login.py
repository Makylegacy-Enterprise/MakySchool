import uuid

import asyncpg

from app.config import settings
from app.lib.jwt_utils import (
    ACCESS_TOKEN_EXPIRES,
    REFRESH_TOKEN_EXPIRES,
    REFRESH_TOKEN_EXPIRES_MS,
    cookie_options,
    sign_superadmin_token,
)
from app.services.central_auth import CentralAuthError, central_auth_enabled
from app.services.central_auth import authenticate as central_authenticate
from app.services.login_lockout import (
    LoginLockoutResult,
    ensure_not_locked,
    record_login_attempt,
    verify_login_with_lockout,
)


def platform_app_url() -> str:
    return (getattr(settings, "PLATFORM_APP_URL", None) or "http://localhost:3001").rstrip("/")


async def is_superadmin_email(conn: asyncpg.Connection, email: str) -> bool:
    row = await conn.fetchrow(
        "SELECT id FROM super_admins WHERE LOWER(email) = LOWER($1) LIMIT 1",
        email.lower().strip(),
    )
    return row is not None


async def _backfill_auth_user_id(
    conn: asyncpg.Connection,
    admin_id: uuid.UUID,
    auth_user_id: str | None,
) -> None:
    if not auth_user_id:
        return
    try:
        parsed = uuid.UUID(str(auth_user_id))
    except ValueError:
        return
    await conn.execute(
        """
        UPDATE super_admins
        SET auth_user_id = $1
        WHERE id = $2 AND auth_user_id IS NULL
        """,
        parsed,
        admin_id,
    )


async def _verify_superadmin_credentials(
    conn: asyncpg.Connection,
    admin: asyncpg.Record,
    password: str,
) -> LoginLockoutResult:
    admin_id = admin["id"]

    if central_auth_enabled():
        locked = await ensure_not_locked(conn, table="super_admins", user_id=admin_id)
        if locked:
            return locked

        try:
            tokens = await central_authenticate(admin["email"], password)
            lockout = await record_login_attempt(
                conn, table="super_admins", user_id=admin_id, success=True
            )
            if not lockout.ok:
                return lockout
            await _backfill_auth_user_id(conn, admin_id, tokens.user_id)
            return LoginLockoutResult(ok=True, status=200, error="")
        except CentralAuthError:
            if admin["password_hash"]:
                return await verify_login_with_lockout(
                    conn,
                    table="super_admins",
                    user_id=admin_id,
                    password=password,
                )
            return await record_login_attempt(
                conn, table="super_admins", user_id=admin_id, success=False
            )

    return await verify_login_with_lockout(
        conn,
        table="super_admins",
        user_id=admin_id,
        password=password,
    )


async def authenticate_superadmin(
    conn: asyncpg.Connection,
    email: str,
    password: str,
    response,
) -> dict:
    normalized = email.lower().strip()
    admin = await conn.fetchrow(
        """
        SELECT id, email, password_hash, name, auth_user_id
        FROM super_admins
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        """,
        normalized,
    )
    if not admin:
        return {"ok": False, "status": 401, "error": "Invalid credentials"}

    lockout = await _verify_superadmin_credentials(conn, admin, password)
    if not lockout.ok:
        result: dict = {"ok": False, "status": lockout.status, "error": lockout.error}
        if lockout.code:
            result["code"] = lockout.code
        return result

    payload = {
        "sub": str(admin["id"]),
        "email": admin["email"],
        "name": admin["name"],
        "role": "super_admin",
    }
    response.set_cookie(
        settings.SUPERADMIN_ACCESS_COOKIE,
        sign_superadmin_token(payload, ACCESS_TOKEN_EXPIRES),
        **cookie_options(20 * 60 * 1000),
    )
    response.set_cookie(
        settings.SUPERADMIN_REFRESH_COOKIE,
        sign_superadmin_token(payload, REFRESH_TOKEN_EXPIRES),
        **cookie_options(REFRESH_TOKEN_EXPIRES_MS),
    )
    return {
        "ok": True,
        "data": {
            "accountType": "platform",
            "role": "super_admin",
            "redirectTo": "/dashboard",
            "user": {
                "id": str(admin["id"]),
                "email": admin["email"],
                "name": admin["name"],
            },
        },
    }
