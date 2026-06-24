from fastapi import HTTPException, Request, status
from jose import JWTError

from app.config import settings
from app.lib.jwt_utils import verify_superadmin_token, verify_tenant_token


def _extract_bearer(auth_header: str | None) -> str | None:
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def extract_tenant_token(request: Request) -> str | None:
    token = request.cookies.get(settings.TENANT_ACCESS_COOKIE) or request.cookies.get(
        settings.TENANT_REFRESH_COOKIE
    )
    if token:
        return token
    return _extract_bearer(request.headers.get("Authorization"))


def extract_superadmin_token(request: Request) -> str | None:
    token = request.cookies.get(settings.SUPERADMIN_ACCESS_COOKIE) or request.cookies.get(
        settings.SUPERADMIN_REFRESH_COOKIE
    )
    if token:
        return token
    return _extract_bearer(request.headers.get("Authorization"))


async def get_current_user(request: Request) -> dict:
    token = extract_tenant_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Not authenticated", "code": "UNAUTHORIZED"},
        )
    try:
        return verify_tenant_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Not authenticated", "code": "UNAUTHORIZED"},
        )


async def get_current_superadmin(request: Request) -> dict:
    token = extract_superadmin_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Not authenticated", "code": "UNAUTHORIZED"},
        )
    try:
        return verify_superadmin_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Not authenticated", "code": "UNAUTHORIZED"},
        )


def clear_auth_cookies(response) -> None:
    for name in (
        settings.SUPERADMIN_ACCESS_COOKIE,
        settings.SUPERADMIN_REFRESH_COOKIE,
        settings.TENANT_ACCESS_COOKIE,
        settings.TENANT_REFRESH_COOKIE,
    ):
        response.delete_cookie(name, path="/")
