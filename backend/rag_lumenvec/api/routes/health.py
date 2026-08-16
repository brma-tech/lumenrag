from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from rag_lumenvec.core.config import (
    DEFAULT_BASE_URL,
    DEFAULT_COLLECTION,
    DEFAULT_CONTEXT_BUDGET,
    DEFAULT_DIMENSIONS,
    DEFAULT_SESSION,
    DEFAULT_TOP_K,
)
from rag_lumenvec.models import APIError
from rag_lumenvec.services.ai import load_ai_config
from rag_lumenvec.services.lumenvec import LumenVecClient

from .errors import api_error

router = APIRouter()


@router.get("/config")
def get_default_config() -> dict[str, Any]:
    ai_config = load_ai_config()
    return {
        "base_url": DEFAULT_BASE_URL,
        "collection": DEFAULT_COLLECTION,
        "session_id": DEFAULT_SESSION,
        "chat_provider": ai_config["chat_provider"],
        "embedding_provider": ai_config["embedding_provider"],
        "embed_model": ai_config["embed_model"],
        "chat_model": ai_config["chat_model"],
        "dimensions": DEFAULT_DIMENSIONS,
        "top_k": DEFAULT_TOP_K,
        "context_budget_chars": DEFAULT_CONTEXT_BUDGET,
    }


@router.get("/health")
def health(base_url: str = Query(DEFAULT_BASE_URL)) -> dict[str, str]:
    try:
        return {"status": LumenVecClient(base_url).health()}
    except APIError as exc:
        raise api_error(exc) from exc
