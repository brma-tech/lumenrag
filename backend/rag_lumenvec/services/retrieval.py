from __future__ import annotations

import re
from dataclasses import asdict
from typing import Any

from openai import OpenAI

from rag_lumenvec.models import ChunkRecord, RetrievedChunk
from rag_lumenvec.repositories.files import load_chunk_records
from rag_lumenvec.services.ai import embed_texts
from rag_lumenvec.services.lumenvec import LumenVecClient


def tokenize_text(text: str) -> set[str]:
    return {token for token in re.findall(r"[a-zA-Z0-9_]+", text.lower()) if token}


def jaccard_similarity(left: str, right: str) -> float:
    left_tokens = tokenize_text(left)
    right_tokens = tokenize_text(right)
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)


def rerank_chunks(
    question: str, chunks: list[tuple[ChunkRecord, float]], max_chunks: int
) -> list[RetrievedChunk]:
    question_tokens = tokenize_text(question)
    ranked: list[RetrievedChunk] = []
    for record, distance in chunks:
        chunk_tokens = tokenize_text(record.text)
        lexical_score = len(question_tokens & chunk_tokens) / max(
            1, len(question_tokens)
        )
        distance_score = 1 / (1 + max(distance, 0.0))
        ranked.append(
            RetrievedChunk(
                record, distance, (distance_score * 0.65) + (lexical_score * 0.35)
            )
        )

    ranked.sort(key=lambda item: item.rerank_score, reverse=True)
    deduped: list[RetrievedChunk] = []
    for candidate in ranked:
        if any(
            jaccard_similarity(candidate.record.text, current.record.text) >= 0.85
            for current in deduped
        ):
            continue
        deduped.append(candidate)
        if len(deduped) >= max_chunks:
            break
    return deduped


def fit_context_to_budget(
    chunks: list[RetrievedChunk], budget_chars: int
) -> list[RetrievedChunk]:
    if budget_chars <= 0:
        return chunks
    selected: list[RetrievedChunk] = []
    used_chars = 0
    for chunk in chunks:
        chunk_len = len(chunk.record.text)
        if selected and used_chars + chunk_len > budget_chars:
            continue
        if not selected and chunk_len > budget_chars:
            record = ChunkRecord(
                **{**asdict(chunk.record), "text": chunk.record.text[:budget_chars]}
            )
            selected.append(RetrievedChunk(record, chunk.distance, chunk.rerank_score))
            break
        selected.append(chunk)
        used_chars += chunk_len
    return selected


def search_context(
    lumen_client: LumenVecClient,
    openai_client: OpenAI,
    embed_model: str,
    dimensions: int | None,
    collection: str,
    question: str,
    top_k: int,
    context_budget_chars: int,
    document_names: list[str] | None = None,
) -> list[RetrievedChunk]:
    embedding = embed_texts(openai_client, embed_model, [question], dimensions)[0]
    results = lumen_client.search(collection, embedding, top_k * 3)
    records = load_chunk_records(collection)
    allowed_documents = set(document_names or [])
    chunks: list[tuple[ChunkRecord, float]] = []
    for result in results:
        record = records.get(str(result["id"]))
        if record and (
            not allowed_documents or record.document_name in allowed_documents
        ):
            chunks.append((record, float(result.get("distance", 0.0))))
    return fit_context_to_budget(
        rerank_chunks(question, chunks, top_k), context_budget_chars
    )


def source_payload(chunks: list[RetrievedChunk]) -> list[dict[str, Any]]:
    return [
        {
            "source": index + 1,
            "document_name": chunk.record.document_name,
            "chunk_index": chunk.record.chunk_index,
            "rerank_score": chunk.rerank_score,
            "distance": chunk.distance,
            "preview": chunk.record.text[:320],
        }
        for index, chunk in enumerate(chunks)
    ]
