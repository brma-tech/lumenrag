from __future__ import annotations

from fastapi import HTTPException


def error_code_for(exc: Exception) -> str:
    message = str(exc).lower()
    if "failed to reach" in message or "lumenvec" in message:
        return "lumenvec_unavailable"
    if "api key" in message:
        return "missing_api_key"
    if "unsupported file type" in message:
        return "unsupported_file_type"
    if "provedor" in message:
        return "invalid_ai_provider"
    return "request_failed"


def api_error(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=400,
        detail={
            "error_code": error_code_for(exc),
            "message": str(exc),
            "details": None,
        },
    )
