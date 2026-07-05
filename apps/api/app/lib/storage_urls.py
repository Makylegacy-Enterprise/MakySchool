from __future__ import annotations

import logging
import uuid

from app.config import settings
from app.services.storage import get_tenant_storage
from app.services.storage.errors import StorageError
from app.services.storage.keys import (
    is_legacy_upload_path,
    is_storage_object_key,
    legacy_path_to_key,
)

logger = logging.getLogger("makyschool.storage")


def _stored_value_to_key(value: str, school_id: uuid.UUID | None) -> str | None:
    if is_storage_object_key(value):
        return value
    legacy_key = legacy_path_to_key(value)
    if legacy_key:
        return legacy_key
    if value.startswith("schools/"):
        return value
    return None


async def resolve_storage_url(
    stored_value: str | None,
    *,
    school_id: uuid.UUID | None = None,
    expires_in: int | None = None,
) -> str | None:
    """
    Turn a stored object key (or legacy /uploads path) into a client-accessible URL.
    Presigned for Wasabi; /uploads/... for local storage.
    """
    if not stored_value or not stored_value.strip():
        return None

    value = stored_value.strip()
    if value.startswith("http://") or value.startswith("https://"):
        return value

    key = _stored_value_to_key(value, school_id)
    if not key:
        if is_legacy_upload_path(value):
            return value
        return value

    if school_id is None:
        logger.warning("Cannot resolve storage key without school_id key=%s", key)
        return value

    storage = get_tenant_storage()
    try:
        return await storage.presigned_download_url(
            school_id,
            key,
            expires_in=expires_in,
        )
    except StorageError:
        logger.warning("Failed to resolve storage URL key=%s", key, exc_info=True)
        if settings.use_local_storage and is_storage_object_key(key):
            return f"/uploads/{key}"
        return None


async def enrich_school_media(record: dict, school_id: uuid.UUID) -> dict:
    enriched = dict(record)
    for field in ("logo_url", "stamp_url"):
        if enriched.get(field):
            enriched[field] = await resolve_storage_url(enriched[field], school_id=school_id)
    return enriched


async def enrich_student_media(record: dict, school_id: uuid.UUID) -> dict:
    enriched = dict(record)
    if enriched.get("photo_url"):
        enriched["photo_url"] = await resolve_storage_url(
            enriched["photo_url"],
            school_id=school_id,
        )
    return enriched
