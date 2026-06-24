import re
from urllib.parse import urlparse

from app.config import settings


def _origin_matches_pattern(origin: str, pattern: str) -> bool:
    if "*" not in pattern:
        return origin == pattern
    escaped = re.escape(pattern).replace(r"\*", ".*")
    return re.match(f"^{escaped}$", origin) is not None


def is_origin_allowed(origin: str) -> bool:
    allowed = settings.cors_origins
    if not allowed:
        return True
    if origin in allowed:
        return True
    if any(_origin_matches_pattern(origin, p) for p in allowed):
        return True
    if settings.CORS_ALLOW_VERCEL_PREVIEWS:
        try:
            hostname = urlparse(origin).hostname or ""
            if hostname.endswith(".vercel.app"):
                return True
        except Exception:
            return False
    return False
