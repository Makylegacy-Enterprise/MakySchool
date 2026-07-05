from __future__ import annotations


class StorageError(Exception):
    """Base storage error — map to HTTP responses at route or middleware layer."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "STORAGE_ERROR",
        status: int = 500,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


class StorageConfigError(StorageError):
    def __init__(self, message: str):
        super().__init__(message, code="STORAGE_CONFIG_ERROR", status=500)


class StorageNotFoundError(StorageError):
    def __init__(self, message: str = "Object not found"):
        super().__init__(message, code="STORAGE_NOT_FOUND", status=404)


class StoragePermissionError(StorageError):
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, code="STORAGE_FORBIDDEN", status=403)


class StorageValidationError(StorageError):
    def __init__(self, message: str):
        super().__init__(message, code="STORAGE_VALIDATION_ERROR", status=400)
