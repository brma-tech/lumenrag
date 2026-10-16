from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from rag_lumenvec.api.app import create_app


def test_api_exposes_lumenrag_identity(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        "rag_lumenvec.api.app.config.FRONTEND_DIST_DIR", tmp_path / "missing"
    )
    client = TestClient(create_app())

    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "name": "LumenRAG",
        "version": "0.1.9",
        "studio": "not_built",
        "docs": "/docs",
    }


def test_api_serves_built_studio(monkeypatch, tmp_path) -> None:
    studio_dir = tmp_path / "studio"
    studio_dir.mkdir()
    (studio_dir / "index.html").write_text(
        "<title>LumenRAG test studio</title>", encoding="utf-8"
    )
    monkeypatch.setattr("rag_lumenvec.api.app.config.FRONTEND_DIST_DIR", studio_dir)
    client = TestClient(create_app())

    response = client.get("/")

    assert response.status_code == 200
    assert "LumenRAG test studio" in response.text


def test_config_endpoint_returns_defaults() -> None:
    client = TestClient(create_app())

    response = client.get("/api/config")

    assert response.status_code == 200
    payload = response.json()
    assert payload["collection"] == "default"
    assert payload["top_k"] == 5
    assert "chat_provider" in payload


def test_api_key_protects_api_routes(monkeypatch) -> None:
    monkeypatch.setenv("LUMENRAG_API_KEY", "test-secret")
    client = TestClient(create_app())

    assert client.get("/api/config").status_code == 401
    assert (
        client.get(
            "/api/config", headers={"Authorization": "Bearer test-secret"}
        ).status_code
        == 200
    )


def test_collections_endpoint_has_default_collection() -> None:
    client = TestClient(create_app())

    response = client.get("/api/collections")

    assert response.status_code == 200
    assert "default" in response.json()["collections"]


def test_empty_evaluation_request_returns_validation_error() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/api/evaluate",
        json={
            "questions": "",
            "base_url": "http://localhost:19190",
            "collection": "default",
            "session_id": "default",
            "chat_provider": "openai",
            "embedding_provider": "openai",
            "embed_model": "text-embedding-3-small",
            "chat_model": "gpt-4.1-mini",
            "dimensions": 256,
            "top_k": 5,
            "context_budget_chars": 6000,
        },
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["error_code"] == "request_failed"
    assert "question" in detail["message"].lower()


def test_evaluations_endpoint_returns_runs_list() -> None:
    client = TestClient(create_app())

    response = client.get("/api/evaluations?collection=default")

    assert response.status_code == 200
    assert "runs" in response.json()


def test_missing_evaluation_detail_returns_error() -> None:
    client = TestClient(create_app())

    response = client.get("/api/evaluations/missing-run")

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["error_code"] == "request_failed"
    assert "evaluation" in detail["message"].lower()


def test_status_endpoint_returns_operational_snapshot(
    monkeypatch,
) -> None:
    monkeypatch.setenv("LUMENRAG_ALLOWED_OUTBOUND_URLS", "http://localhost:9")
    monkeypatch.setattr(
        "rag_lumenvec.api.routes.status.summarize_documents",
        lambda _collection: [{"chunks_indexed": 3}],
    )
    client = TestClient(create_app())

    response = client.get("/api/status?collection=default&base_url=http://localhost:9")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"]["collection"] == "default"
    assert "ready" in payload
    assert "checks" in payload
    assert "metrics" in payload
    assert payload["metrics"]["chunks"] == 3
    assert "storage" in payload
    from rag_lumenvec.core import config

    assert payload["limits"]["max_upload_files"] == config.MAX_UPLOAD_FILES


def test_ingest_rejects_batch_over_configured_limit(monkeypatch) -> None:
    monkeypatch.setattr("rag_lumenvec.api.routes.documents.MAX_UPLOAD_FILES", 1)
    client = TestClient(create_app())
    response = client.post(
        "/api/ingest",
        files=[
            ("files", ("first.txt", b"one", "text/plain")),
            ("files", ("second.txt", b"two", "text/plain")),
        ],
    )
    assert response.status_code == 400
    assert "Limit of 1 files" in response.json()["detail"]["message"]


@pytest.mark.parametrize("limit,count", [(3, 1), (3, 3), (2000, 2000)])
def test_ingest_accepts_batches_up_to_configured_limit(
    monkeypatch, limit, count
) -> None:
    from rag_lumenvec.api.routes import documents

    indexed = []
    monkeypatch.setattr(documents, "MAX_UPLOAD_FILES", limit)
    monkeypatch.setattr("rag_lumenvec.core.config.MAX_UPLOAD_FILES", limit)
    monkeypatch.setattr(documents, "LumenVecClient", lambda _url: object())
    monkeypatch.setattr(documents, "ai_client", lambda _provider: object())
    monkeypatch.setattr(documents, "summarize_documents", lambda _collection: [])
    monkeypatch.setattr(documents, "save_upload_bytes", lambda name, _data: Path(name))

    def fake_ingest(**kwargs):
        indexed.append(kwargs["file_path"].name)
        return 2, 2

    monkeypatch.setattr(documents, "ingest_document", fake_ingest)
    response = TestClient(create_app()).post(
        "/api/ingest",
        files=[
            ("files", (f"document-{i}.txt", b"test text", "text/plain"))
            for i in range(count)
        ],
    )
    assert response.status_code == 200
    assert response.json()["indexed_files"] == count
    assert response.json()["total_chunks"] == count * 2
    assert len(indexed) == count


def test_multipart_parser_rejects_batch_above_configured_limit(monkeypatch) -> None:
    monkeypatch.setattr("rag_lumenvec.core.config.MAX_UPLOAD_FILES", 3)
    response = TestClient(create_app()).post(
        "/api/ingest",
        files=[("files", (f"{i}.txt", b"text", "text/plain")) for i in range(4)],
    )
    assert response.status_code == 400
    assert "Maximum number of files is 3" in response.json()["detail"]
