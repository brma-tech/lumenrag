from __future__ import annotations

from pydantic import BaseModel, Field

from rag_lumenvec.core.config import (
    DEFAULT_BASE_URL,
    DEFAULT_CHAT_MODEL,
    DEFAULT_COLLECTION,
    DEFAULT_CONTEXT_BUDGET,
    DEFAULT_DIMENSIONS,
    DEFAULT_EMBED_MODEL,
    DEFAULT_SESSION,
    DEFAULT_TOP_K,
    MAX_QUESTIONS_BYTES,
)


class RagConfig(BaseModel):
    base_url: str = DEFAULT_BASE_URL
    collection: str = DEFAULT_COLLECTION
    session_id: str = DEFAULT_SESSION
    chat_provider: str = "openai"
    embedding_provider: str = "openai"
    embed_model: str = DEFAULT_EMBED_MODEL
    chat_model: str = DEFAULT_CHAT_MODEL
    dimensions: int | None = DEFAULT_DIMENSIONS
    top_k: int = Field(default=DEFAULT_TOP_K, ge=1, le=20)
    context_budget_chars: int = Field(default=DEFAULT_CONTEXT_BUDGET, ge=500)


class ChatRequest(RagConfig):
    message: str = Field(..., max_length=20_000)
    document_names: list[str] = Field(default_factory=list)


class EvaluationRequest(RagConfig):
    questions: str = Field(..., max_length=MAX_QUESTIONS_BYTES)


class AIProviderConfig(BaseModel):
    base_url: str | None = None
    api_key: str | None = None


class AIConfigUpdate(BaseModel):
    chat_provider: str | None = None
    embedding_provider: str | None = None
    chat_model: str | None = None
    embed_model: str | None = None
    providers: dict[str, AIProviderConfig] = Field(default_factory=dict)
