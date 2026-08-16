from __future__ import annotations

import pytest

from rag_lumenvec.models import APIError
from rag_lumenvec.services.network import validate_outbound_url


def test_validate_outbound_url_accepts_configured_origin(monkeypatch) -> None:
    monkeypatch.setenv("LUMENRAG_ALLOWED_OUTBOUND_URLS", "http://localhost:19190")

    assert validate_outbound_url("http://localhost:19190/collections") == (
        "http://localhost:19190/collections"
    )


def test_validate_outbound_url_rejects_unconfigured_internal_target(
    monkeypatch,
) -> None:
    monkeypatch.setenv("LUMENRAG_ALLOWED_OUTBOUND_URLS", "http://localhost:19190")

    with pytest.raises(APIError, match="Destino externo nao autorizado"):
        validate_outbound_url("http://127.0.0.1:2375")


def test_validate_outbound_url_rejects_embedded_credentials(monkeypatch) -> None:
    monkeypatch.setenv("LUMENRAG_ALLOWED_OUTBOUND_URLS", "https://example.test")

    with pytest.raises(APIError, match="credenciais"):
        validate_outbound_url("https://user:secret@example.test")
