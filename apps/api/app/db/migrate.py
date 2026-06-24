import re
from pathlib import Path

import asyncpg

from app.config import settings

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"
MIGRATION_FILE_PATTERN = re.compile(r"^\d{3}_[a-z0-9_]+\.sql$", re.IGNORECASE)
# Unused central-auth experiment; INTEGER school_id incompatible with UUID schools.id
SKIP_MIGRATIONS = frozenset({"014_auth_service_integration.sql"})


async def run_migrations(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    rows = await conn.fetch("SELECT filename FROM schema_migrations")
    applied = {row["filename"] for row in rows}

    sql_files = sorted(
        f
        for f in MIGRATIONS_DIR.glob("*.sql")
        if f.name != "schema.sql" and MIGRATION_FILE_PATTERN.match(f.name)
    )

    for sql_file in sql_files:
        if sql_file.name in applied:
            continue
        if sql_file.name in SKIP_MIGRATIONS:
            print(f"Skipping migration: {sql_file.name} (incompatible / unused)")
            async with conn.transaction():
                await conn.execute(
                    "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
                    sql_file.name,
                )
            continue
        print(f"Applying migration: {sql_file.name}")
        sql = sql_file.read_text(encoding="utf-8")
        async with conn.transaction():
            await conn.execute(sql)
            await conn.execute(
                "INSERT INTO schema_migrations (filename) VALUES ($1)",
                sql_file.name,
            )
        print(f"  Applied: {sql_file.name}")


async def run_migrations_on_startup() -> None:
    if settings.is_production and not settings.RUN_MIGRATIONS:
        return

    conn = await asyncpg.connect(dsn=settings.DATABASE_URL)
    try:
        await run_migrations(conn)
    finally:
        await conn.close()


if __name__ == "__main__":
    import asyncio

    async def _main() -> None:
        await run_migrations_on_startup()
        print("Migrations complete")

    asyncio.run(_main())
