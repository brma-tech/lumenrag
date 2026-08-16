from __future__ import annotations

import csv
import hashlib
import re
import uuid
from pathlib import Path
from typing import Any

from docx import Document
from openai import OpenAI
from pypdf import PdfReader

from rag_lumenvec.models import ChunkRecord
from rag_lumenvec.repositories.files import (
    append_chunk_records,
    load_all_chunk_records,
    load_chunk_records,
    rewrite_chunk_records,
)
from rag_lumenvec.services.ai import embed_texts
from rag_lumenvec.services.lumenvec import LumenVecClient


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


def extract_text_from_file(file_path: Path) -> str:
    suffix = file_path.suffix.lower()
    if suffix in {
        ".txt",
        ".md",
        ".py",
        ".js",
        ".ts",
        ".tsx",
        ".go",
        ".java",
        ".json",
        ".yaml",
        ".yml",
        ".html",
        ".css",
    }:
        return file_path.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".csv":
        with file_path.open("r", encoding="utf-8", errors="ignore") as handle:
            reader = csv.reader(handle)
            return "\n".join(" | ".join(row) for row in reader)
    if suffix == ".pdf":
        reader = PdfReader(str(file_path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if suffix == ".docx":
        document = Document(str(file_path))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    raise ValueError(f"unsupported file type: {suffix}")


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(len(normalized), start + chunk_size)
        chunks.append(normalized[start:end])
        if end == len(normalized):
            break
        start = max(end - overlap, start + 1)
    return chunks


def ingest_document(
    lumen_client: LumenVecClient,
    openai_client: OpenAI,
    embed_model: str,
    dimensions: int | None,
    collection: str,
    file_path: Path,
) -> tuple[int, int]:
    text = extract_text_from_file(file_path)
    chunks = chunk_text(text)
    if not chunks:
        return 0, 0

    document_name = file_path.name
    document_hash = content_hash(text)
    existing = [
        record
        for record in load_chunk_records(collection).values()
        if record.document_name == document_name
    ]
    if existing and all(record.document_hash == document_hash for record in existing):
        return -1, 0
    if existing:
        delete_document_records(lumen_client, collection, document_name)

    embeddings = embed_texts(openai_client, embed_model, chunks, dimensions)
    records: list[ChunkRecord] = []
    vectors: list[dict[str, Any]] = []
    document_id = uuid.uuid4().hex[:10]
    for index, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
        vector_id = f"{collection}-{document_id}-{index}"
        vectors.append({"id": vector_id, "values": embedding})
        records.append(
            ChunkRecord(
                vector_id=vector_id,
                collection=collection,
                document_name=document_name,
                document_hash=document_hash,
                chunk_index=index,
                chunk_count=len(chunks),
                text=chunk,
                source_path=str(file_path),
            )
        )
    lumen_client.add_vectors(collection, vectors, dimensions)
    append_chunk_records(records)
    return len(chunks), len(vectors)


def delete_vectors(
    lumen_client: LumenVecClient, collection: str, vector_ids: list[str]
) -> tuple[int, int]:
    deleted = 0
    failed = 0
    for vector_id in vector_ids:
        try:
            lumen_client.delete_vector(collection, vector_id)
            deleted += 1
        except Exception:
            failed += 1
    return deleted, failed


def delete_document_records(
    lumen_client: LumenVecClient, collection: str, document_name: str
) -> tuple[int, int]:
    all_records = load_all_chunk_records()
    targets = [
        record
        for record in all_records
        if record.collection == collection and record.document_name == document_name
    ]
    deleted, failed = delete_vectors(
        lumen_client, collection, [record.vector_id for record in targets]
    )
    remaining = [
        record
        for record in all_records
        if not (
            record.collection == collection and record.document_name == document_name
        )
    ]
    rewrite_chunk_records(remaining)
    return deleted, failed


def clear_collection(lumen_client: LumenVecClient, collection: str) -> tuple[int, int]:
    all_records = load_all_chunk_records()
    targets = [record for record in all_records if record.collection == collection]
    deleted, failed = delete_vectors(
        lumen_client, collection, [record.vector_id for record in targets]
    )
    rewrite_chunk_records(
        [record for record in all_records if record.collection != collection]
    )
    return deleted, failed

