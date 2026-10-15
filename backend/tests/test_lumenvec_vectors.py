from __future__ import annotations

import json

import pytest

from rag_lumenvec.models import APIError
from rag_lumenvec.services.lumenvec import LumenVecClient


def test_iter_vectors_follows_cursor_and_stops_after_collection_prefix(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        "rag_lumenvec.services.lumenvec.validate_outbound_url", lambda url: url
    )
    client = LumenVecClient("http://127.0.0.1:19190")
    responses = [
        {
            "vectors": [{"id": "docs-a-0", "values": [1, 0]}],
            "next_cursor": "next-page",
        },
        {
            "vectors": [
                {"id": "docs-a-1", "values": [0, 1]},
                {"id": "other-b-0", "values": [1, 1]},
            ]
        },
    ]
    requests: list[str] = []

    def fake_request(method, path, *_args, **_kwargs):
        assert method == "GET"
        requests.append(path)
        return json.dumps(responses.pop(0)).encode()

    monkeypatch.setattr(client, "_request", fake_request)

    vectors = list(client.iter_vectors(1, after="docs-", stop_after_prefix="docs-"))

    assert [item["id"] for item in vectors] == ["docs-a-0", "docs-a-1"]
    assert requests == [
        "/vectors?limit=1&after=docs-",
        "/vectors?limit=1&cursor=next-page",
    ]


def test_iter_vectors_rejects_a_repeated_cursor(monkeypatch) -> None:
    monkeypatch.setattr(
        "rag_lumenvec.services.lumenvec.validate_outbound_url", lambda url: url
    )
    client = LumenVecClient("http://127.0.0.1:19190")
    response = json.dumps(
        {"vectors": [{"id": "docs-a", "values": [1]}], "next_cursor": "loop"}
    ).encode()
    monkeypatch.setattr(client, "_request", lambda *_args, **_kwargs: response)

    with pytest.raises(APIError, match="repeated vector-list cursor"):
        list(client.iter_vectors(1))


def test_iter_vectors_falls_back_for_legacy_list_response(monkeypatch) -> None:
    monkeypatch.setattr(
        "rag_lumenvec.services.lumenvec.validate_outbound_url", lambda url: url
    )
    client = LumenVecClient("http://127.0.0.1:19190")
    response = json.dumps(
        [
            {"id": "another-collection-0", "values": [0]},
            {"id": "docs-a", "values": [1]},
        ]
    ).encode()
    requests: list[str] = []

    def fake_request(method, path, *_args, **_kwargs):
        requests.append(path)
        return response

    monkeypatch.setattr(client, "_request", fake_request)

    vectors = list(client.iter_vectors(5, after="docs-"))

    assert vectors == [
        {"id": "another-collection-0", "values": [0.0]},
        {"id": "docs-a", "values": [1.0]},
    ]
    assert requests == ["/vectors?limit=5&after=docs-", "/vectors?limit=5"]
