from types import SimpleNamespace

from rag_lumenvec.services import vector_graph


def test_build_vector_graph_starts_at_collection_and_uses_only_its_records(
    monkeypatch,
) -> None:
    records = {
        "docs-a-0": SimpleNamespace(
            document_name="guide.txt", chunk_index=0, text="first chunk"
        ),
        "docs-a-1": SimpleNamespace(
            document_name="guide.txt", chunk_index=1, text="second chunk"
        ),
    }
    monkeypatch.setattr(vector_graph, "load_chunk_records", lambda _collection: records)

    class PagedClient:
        def iter_vectors(self, limit, *, after, stop_after_prefix):
            assert limit == 200
            assert after == "docs-"
            assert stop_after_prefix == "docs-"
            yield {"id": "docs-a-0", "values": [1.0, 0.0]}
            yield {"id": "docs-a-1", "values": [0.9, 0.1]}
            yield {"id": "docs-other-0", "values": [0.0, 1.0]}

    graph = vector_graph.build_vector_graph(PagedClient(), "docs", limit=60)

    assert graph["sampled"] == 2
    assert graph["dimension"] == 2
    assert [node["id"] for node in graph["nodes"]] == ["docs-a-0", "docs-a-1"]
    assert len(graph["edges"]) == 1


def test_build_vector_graph_returns_empty_graph_when_collection_has_no_vectors(
    monkeypatch,
) -> None:
    monkeypatch.setattr(vector_graph, "load_chunk_records", lambda _collection: {})

    class EmptyClient:
        def iter_vectors(self, *_args, **_kwargs):
            return iter(())

    assert vector_graph.build_vector_graph(EmptyClient(), "docs") == {
        "nodes": [],
        "edges": [],
        "sampled": 0,
        "dimension": 0,
    }
