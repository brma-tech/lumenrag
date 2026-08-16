from __future__ import annotations

import os
from urllib.parse import urlsplit

from rag_lumenvec.models import APIError


def _origin(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise APIError("URL de servico deve usar HTTP(S) com hostname valido.")
    if parsed.username or parsed.password:
        raise APIError("URL de servico nao pode conter credenciais embutidas.")
    port = parsed.port
    default_port = 443 if parsed.scheme == "https" else 80
    suffix = "" if port in {None, default_port} else f":{port}"
    return f"{parsed.scheme.lower()}://{parsed.hostname.lower()}{suffix}"


def allowed_outbound_origins() -> set[str]:
    primary_endpoint = os.getenv("LUMENVEC_BASE_URL", "http://localhost:19190")
    configured = os.getenv("LUMENRAG_ALLOWED_OUTBOUND_URLS", "")
    origins = {
        _origin(primary_endpoint),
    }
    origins.update(
        _origin(item.strip())
        for item in configured.split(",")
        if item.strip()
    )
    return origins


def validate_outbound_url(
    value: str, *, additional_allowed: set[str] | None = None
) -> str:
    origin = _origin(value)
    allowed = allowed_outbound_origins() | (additional_allowed or set())
    if origin not in allowed:
        raise APIError(
            f"Destino externo nao autorizado: {origin}. "
            "Configure LUMENRAG_ALLOWED_OUTBOUND_URLS ou use o endpoint "
            "definido em LUMENVEC_BASE_URL."
        )
    return value.rstrip("/")
