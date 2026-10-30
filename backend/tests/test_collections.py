import json
from dataclasses import asdict

import pytest
from fastapi.testclient import TestClient

from rag_lumenvec.api.app import create_app
from rag_lumenvec.core import config
from rag_lumenvec.models import ChunkRecord
from rag_lumenvec.repositories.files import list_collections, register_collection


@pytest.fixture
def storage(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "APP_DIR", tmp_path)
    monkeypatch.setattr(config, "METADATA_PATH", tmp_path / "documents.jsonl")
    return tmp_path


def test_empty_collection_persists_for_a_new_app(storage):
    client = TestClient(create_app())
    response = client.post("/api/collections", json={"name": "  support  "})
    assert response.status_code == 200
    assert response.json() == {
        "collection": "support", "collections": ["default", "support"]
    }
    assert not config.METADATA_PATH.exists()
    restarted_client = TestClient(create_app())
    assert restarted_client.get("/api/collections").json() == {
        "collections": ["default", "support"]
    }


def test_registration_preserves_legacy_collections_and_deduplicates(storage):
    record = ChunkRecord(
        "legacy-1", "legacy", "doc.txt", "hash", 0, 1, "text", "doc.txt"
    )
    config.METADATA_PATH.write_text(json.dumps(asdict(record)) + "\n")
    register_collection("support")
    register_collection("support")
    assert list_collections() == ["default", "legacy", "support"]
    config.METADATA_PATH.unlink()
    assert list_collections() == ["default", "legacy", "support"]


@pytest.mark.parametrize("name", ["", " ", "../other", "two words", "x" * 129])
def test_invalid_names_do_not_change_registry(storage, name):
    response = TestClient(create_app()).post("/api/collections", json={"name": name})
    assert response.status_code == 422
    assert not (storage / "collections.json").exists()
