import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.services.storage.errors import StorageError

logger = logging.getLogger("makyschool")


def add_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StorageError)
    async def storage_error_handler(_request: Request, exc: StorageError):
        logger.warning("Storage error: %s", exc.message)
        return JSONResponse(
            status_code=exc.status,
            content={"error": exc.message, "code": exc.code},
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException):
        detail = exc.detail
        if isinstance(detail, str):
            detail = {"error": detail, "code": "ERROR"}
        return JSONResponse(status_code=exc.status_code, content=detail)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError):
        fields: dict[str, str] = {}
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"][1:])
            fields[field or "body"] = error["msg"]
        return JSONResponse(
            status_code=422,
            content={
                "error": "Validation failed.",
                "code": "VALIDATION_ERROR",
                "fields": fields,
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(_request: Request, exc: Exception):
        logger.error("Unhandled error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Something went wrong. Please try again.",
                "code": "SERVER_ERROR",
            },
        )
