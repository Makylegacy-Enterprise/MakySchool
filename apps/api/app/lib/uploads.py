import re
import time
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_IMAGE_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
ALLOWED_STUDENT_PHOTO_TYPES = ALLOWED_IMAGE_TYPES
_MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

_EXT_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _safe_filename(original: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9._-]", "-", original)
    return f"{int(time.time() * 1000)}-{safe}"


def _validate_image(file: UploadFile) -> None:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Only JPEG, PNG, and WebP images are allowed"},
        )


async def save_school_image(school_id: uuid.UUID, file: UploadFile) -> str:
    _validate_image(file)
    content = await file.read()
    if len(content) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit"},
        )

    destination = Path(settings.UPLOAD_DIR) / "schools" / str(school_id)
    destination.mkdir(parents=True, exist_ok=True)

    filename = _safe_filename(file.filename or "upload")
    file_path = destination / filename
    file_path.write_bytes(content)

    return f"/uploads/schools/{school_id}/{filename}"


async def save_student_photo(
    school_id: uuid.UUID,
    student_id: uuid.UUID,
    file: UploadFile,
) -> str:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_STUDENT_PHOTO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Only JPEG, PNG, and WebP images are allowed"},
        )
    content = await file.read()
    if len(content) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit"},
        )
    ext = _EXT_BY_MIME.get(content_type, ".jpg")
    destination = Path(settings.UPLOAD_DIR) / "schools" / str(school_id) / "students" / str(student_id)
    destination.mkdir(parents=True, exist_ok=True)
    filename = f"photo{ext}"
    (destination / filename).write_bytes(content)
    return f"/uploads/schools/{school_id}/students/{student_id}/{filename}"
