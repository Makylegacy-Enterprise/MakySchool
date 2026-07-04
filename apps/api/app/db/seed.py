import asyncio
import uuid

import asyncpg

from app.config import settings
from app.lib.password import hash_password
from app.services.central_auth import CentralAuthError, central_auth_enabled, sync_user_password


def _require_production_secrets() -> None:
    if not settings.is_production:
        return
    if (
        not settings.SUPERADMIN_JWT_SECRET
        or settings.SUPERADMIN_JWT_SECRET == "change-me-superadmin"
    ):
        raise RuntimeError("Set SUPERADMIN_JWT_SECRET before seeding in production")
    if not settings.SUPERADMIN_PASSWORD or settings.SUPERADMIN_PASSWORD == "ChangeMe123!":
        raise RuntimeError("Set SUPERADMIN_PASSWORD before seeding in production")


async def _provision_central_auth(email: str, password: str) -> uuid.UUID | None:
    if not central_auth_enabled():
        print("Central Auth not configured — platform admin stored locally only.")
        return None

    try:
        linked = await sync_user_password(email, password)
    except CentralAuthError as exc:
        raise RuntimeError(f"Failed to provision platform admin in Central Auth: {exc}") from exc

    if not linked:
        return None
    return uuid.UUID(linked)


async def seed_super_admin() -> None:
    _require_production_secrets()

    conn = await asyncpg.connect(dsn=settings.DATABASE_URL)
    try:
        table = await conn.fetchval(
            """
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'super_admins'
            LIMIT 1
            """
        )
        if not table:
            raise RuntimeError("super_admins table not found. Run migrations first.")

        email = settings.SUPERADMIN_EMAIL.lower().strip()
        existing = await conn.fetchrow(
            "SELECT id, auth_user_id FROM super_admins WHERE LOWER(email) = LOWER($1) LIMIT 1",
            email,
        )
        password_hash = hash_password(settings.SUPERADMIN_PASSWORD)

        if existing and not settings.SUPERADMIN_FORCE_RESET:
            if existing["auth_user_id"] is None and central_auth_enabled():
                auth_user_id = await _provision_central_auth(email, settings.SUPERADMIN_PASSWORD)
                if auth_user_id:
                    await conn.execute(
                        "UPDATE super_admins SET auth_user_id = $1 WHERE id = $2 AND auth_user_id IS NULL",
                        auth_user_id,
                        existing["id"],
                    )
                    print(f"Super admin linked to Central Auth: {email}")
                    return
            print(f"Super admin already exists: {email}")
            print("Set SUPERADMIN_FORCE_RESET=true to rotate the password.")
            return

        auth_user_id = await _provision_central_auth(email, settings.SUPERADMIN_PASSWORD)

        if existing and settings.SUPERADMIN_FORCE_RESET:
            await conn.execute(
                """
                UPDATE super_admins
                SET password_hash = $1,
                    name = $2,
                    auth_user_id = COALESCE($3, auth_user_id)
                WHERE id = $4
                """,
                password_hash,
                settings.SUPERADMIN_NAME,
                auth_user_id,
                existing["id"],
            )
            print(f"Super admin password rotated: {email}")
            if auth_user_id:
                print(f"  Central Auth user: {auth_user_id}")
            return

        await conn.execute(
            """
            INSERT INTO super_admins (id, email, password_hash, name, auth_user_id)
            VALUES ($1, $2, $3, $4, $5)
            """,
            uuid.uuid4(),
            email,
            password_hash,
            settings.SUPERADMIN_NAME,
            auth_user_id,
        )
        print("Super admin created successfully")
        print(f"  Email:    {email}")
        if auth_user_id:
            print(f"  Central Auth user: {auth_user_id}")
        if not settings.is_production:
            print(f"  Password: {settings.SUPERADMIN_PASSWORD}")
        else:
            print("  Password: (hidden — check SUPERADMIN_PASSWORD env var)")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_super_admin())
