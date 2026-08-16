from __future__ import annotations

from dataclasses import dataclass


class APIError(RuntimeError):
    pass


@dataclass
class ChunkRecord:
    vector_id: str
    collection: str
    document_name: str
    document_hash: str
    chunk_index: int
    chunk_count: int
    text: str
    source_path: str


@dataclass
class RetrievedChunk:
    record: ChunkRecord
    distance: float
    rerank_score: float


@dataclass
class AIProviderDefinition:
    id: str
    name: str
    base_url: str
    api_key_env: str
    supports_chat: bool
    supports_embeddings: bool
    default_chat_model: str
    default_embedding_model: str

