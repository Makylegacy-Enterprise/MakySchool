from fastapi import APIRouter, Depends
import asyncpg

from app.config import settings
from app.db.pool import get_db

router = APIRouter()


@router.get("/health")
async def health_check(conn: asyncpg.Connection = Depends(get_db)):
    try:
        await conn.fetchval("SELECT 1")
        db_status = "ok"
    except Exception as exc:
        db_status = f"error: {exc}"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "service": "makyschool-api",
        "database": db_status,
        "api_version": "v1",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
    }
