from __future__ import annotations

import pytest

from rag_lumenvec.models import APIError
from rag_lumenvec.services.lumenvec import LumenVecClient
from rag_lumenvec.services.network import validate_outbound_url


@pytest.mark.parametrize(
    "url",
    [
        "https://api.openai.com/v1/models",
        "https://openrouter.ai/api/v1/models",
        "https://api.groq.com/openai/v1/models",
        "https://api.together.xyz/v1/models",
        "https://api.anthropic.com/v1/models",
        "http://host.docker.internal:11434/v1/models",
    ],
)
def test_validate_outbound_url_accepts_builtin_ai_provider_origins(url: str) -> None:
    assert validate_outbound_url(url) == url


def test_validate_outbound_url_accepts_configured_origin(monkeypatch) -> None:
    monkeypatch.setenv("LUMENRAG_ALLOWED_OUTBOUND_URLS", "http://localhost:19190")

    assert validate_outbound_url("http://localhost:19190/collections") == (
        "http://localhost:19190/collections"
    )


def test_validate_outbound_url_keeps_primary_lumenvec_endpoint_allowed(
    monkeypatch,
) -> None:
    monkeypatch.setenv("LUMENVEC_BASE_URL", "http://lumenvec.internal:19190")
    monkeypatch.setenv("LUMENRAG_ALLOWED_OUTBOUND_URLS", "https://api.example.test")

    assert validate_outbound_url("http://lumenvec.internal:19190/health").startswith(
        "http://lumenvec.internal:19190"
    )


def test_lumenvec_connection_reset_includes_endpoint(monkeypatch) -> None:
    monkeypatch.setenv("LUMENVEC_BASE_URL", "http://127.0.0.1:19190")

    def reset(*_args, **_kwargs):
        raise ConnectionResetError(10054, "connection reset by peer")

    monkeypatch.setattr("rag_lumenvec.services.lumenvec.request.urlopen", reset)
    with pytest.raises(APIError, match="LumenVec connection failed.*127.0.0.1:19190"):
        LumenVecClient("http://127.0.0.1:19190").health()


def test_validate_outbound_url_rejects_unconfigured_internal_target(
    monkeypatch,
) -> None:
    monkeypatch.setenv("LUMENRAG_ALLOWED_OUTBOUND_URLS", "http://localhost:19190")

    with pytest.raises(APIError, match="Unauthorized external destination"):
        validate_outbound_url("http://127.0.0.1:2375")


def test_validate_outbound_url_rejects_embedded_credentials(monkeypatch) -> None:
    monkeypatch.setenv("LUMENRAG_ALLOWED_OUTBOUND_URLS", "https://example.test")

    with pytest.raises(APIError, match="embedded credentials"):
        validate_outbound_url("https://user:secret@example.test")
