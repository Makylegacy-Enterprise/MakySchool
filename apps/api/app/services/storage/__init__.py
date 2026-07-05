from __future__ import annotations

from functools import lru_cache

from app.config import settings
from app.services.storage.local import LocalStorageBackend
from app.services.storage.service import TenantStorageService
from app.services.storage.wasabi import WasabiStorageBackend


@lru_cache(maxsize=1)
def get_storage_backend():
    if settings.use_wasabi_storage:
        return WasabiStorageBackend()
    return LocalStorageBackend()


def get_tenant_storage() -> TenantStorageService:
    return TenantStorageService(get_storage_backend())


def storage_configured() -> bool:
    return settings.use_wasabi_storage or bool(settings.UPLOAD_DIR)


def reset_storage_singletons_for_tests() -> None:
    get_storage_backend.cache_clear()
    from app.services.storage.wasabi import reset_wasabi_client_for_tests

    reset_wasabi_client_for_tests()
