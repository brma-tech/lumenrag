from __future__ import annotations

import math
from typing import Any

from rag_lumenvec.repositories.files import load_chunk_records
from rag_lumenvec.services.lumenvec import LumenVecClient


def build_vector_graph(
    client: LumenVecClient, collection: str, limit: int = 60
) -> dict[str, Any]:
    records = load_chunk_records(collection)
    vectors = [
        item for item in client.list_vectors(limit * 3) if item["id"] in records
    ][:limit]
    if not vectors:
        return {"nodes": [], "edges": [], "sampled": 0, "dimension": 0}

    raw_positions = [_project(item["values"]) for item in vectors]
    positions = _normalize_positions(raw_positions)
    nodes = []
    for index, (item, (x, y)) in enumerate(zip(vectors, positions, strict=True)):
        record = records[item["id"]]
        nodes.append(
            {
                "id": item["id"],
                "x": x,
                "y": y,
                "document_name": record.document_name,
                "chunk_index": record.chunk_index,
                "preview": record.text[:180],
                "index": index,
            }
        )

    edges: list[dict[str, Any]] = []
    seen: set[tuple[int, int]] = set()
    for source, item in enumerate(vectors):
        neighbours = sorted(
            (
                (_cosine_distance(item["values"], other["values"]), target)
                for target, other in enumerate(vectors)
                if target != source
            ),
            key=lambda pair: pair[0],
        )[:2]
        for distance, target in neighbours:
            key = tuple(sorted((source, target)))
            if key in seen:
                continue
            seen.add(key)
            edges.append(
                {
                    "source": source,
                    "target": target,
                    "distance": round(distance, 4),
                    "similarity": round(1.0 - distance, 4),
                }
            )

    return {
        "nodes": nodes,
        "edges": edges,
        "sampled": len(nodes),
        "dimension": len(vectors[0]["values"]),
    }


def _project(values: list[float]) -> tuple[float, float]:
    x = sum(value * math.sin((index + 1) * 1.618) for index, value in enumerate(values))
    y = sum(value * math.cos((index + 1) * 2.414) for index, value in enumerate(values))
    return x, y


def _normalize_positions(
    points: list[tuple[float, float]],
) -> list[tuple[float, float]]:
    xs, ys = [point[0] for point in points], [point[1] for point in points]
    min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
    return [
        (
            0.5 if max_x == min_x else (x - min_x) / (max_x - min_x),
            0.5 if max_y == min_y else (y - min_y) / (max_y - min_y),
        )
        for x, y in points
    ]


def _cosine_distance(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right, strict=False))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 1.0
    similarity = max(-1.0, min(1.0, dot / (left_norm * right_norm)))
    return 1.0 - similarity
