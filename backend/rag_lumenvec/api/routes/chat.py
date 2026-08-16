from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from rag_lumenvec.core.config import DEFAULT_COLLECTION, DEFAULT_SESSION
from rag_lumenvec.repositories.files import (
    delete_chat_history,
    load_chat_history,
    save_chat_history,
)
from rag_lumenvec.schemas import ChatRequest
from rag_lumenvec.services.ai import ai_client
from rag_lumenvec.services.chat import answer_with_rag
from rag_lumenvec.services.lumenvec import LumenVecClient
from rag_lumenvec.services.retrieval import search_context, source_payload

from .errors import api_error

router = APIRouter()


@router.get("/chat/history")
def chat_history(
    collection: str = Query(DEFAULT_COLLECTION),
    session_id: str = Query(DEFAULT_SESSION),
) -> dict[str, Any]:
    return {"messages": load_chat_history(collection, session_id)}


@router.delete("/chat/history")
def clear_chat_history(
    collection: str = Query(DEFAULT_COLLECTION),
    session_id: str = Query(DEFAULT_SESSION),
) -> dict[str, Any]:
    delete_chat_history(collection, session_id)
    return {"messages": []}


@router.post("/chat")
def chat(request_data: ChatRequest) -> dict[str, Any]:
    try:
        messages = load_chat_history(request_data.collection, request_data.session_id)
        messages.append({"role": "user", "content": request_data.message})
        chunks = search_context(
            lumen_client=LumenVecClient(request_data.base_url),
            openai_client=ai_client(request_data.embedding_provider),
            embed_model=request_data.embed_model,
            dimensions=request_data.dimensions or None,
            collection=request_data.collection,
            question=request_data.message,
            top_k=request_data.top_k,
            context_budget_chars=request_data.context_budget_chars,
            document_names=request_data.document_names,
        )
        answer = answer_with_rag(
            openai_client=ai_client(request_data.chat_provider),
            chat_model=request_data.chat_model,
            question=request_data.message,
            context_chunks=chunks,
        )
        sources = source_payload(chunks)
        messages.append({"role": "assistant", "content": answer, "sources": sources})
        save_chat_history(request_data.collection, request_data.session_id, messages)
        return {"answer": answer, "sources": sources, "messages": messages}
    except Exception as exc:
        raise api_error(exc) from exc
