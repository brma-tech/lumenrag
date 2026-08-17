from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from rag_lumenvec.core import config
from rag_lumenvec.core.config import DEFAULT_BASE_URL, DEFAULT_COLLECTION
from rag_lumenvec.repositories.files import (
    list_chat_sessions,
    list_collections,
    list_evaluation_runs,
    summarize_documents,
)
from rag_lumenvec.services.ai import load_ai_config, provider_catalog
from rag_lumenvec.services.lumenvec import LumenVecClient

router = APIRouter()


@router.get("/status")
def operational_status(
    collection: str = Query(DEFAULT_COLLECTION),
    base_url: str = Query(DEFAULT_BASE_URL),
) -> dict[str, Any]:
    documents = summarize_documents(collection)
    evaluations = list_evaluation_runs(collection)
    ai_config = load_ai_config()
    providers = {provider["id"]: provider for provider in provider_catalog()}
    chat_provider = providers.get(ai_config["chat_provider"])
    embedding_provider = providers.get(ai_config["embedding_provider"])
    runtime_providers = ai_config.get("providers", {})

    lumenvec_status = "erro"
    lumenvec_message = ""
    try:
        lumenvec_status = LumenVecClient(base_url, timeout=5).health()
    except Exception as exc:  # pragma: no cover - depends on local service availability
        lumenvec_message = str(exc)

    missing_keys = []
    for provider in [chat_provider, embedding_provider]:
        if not provider or provider["id"] == "local-openai":
            continue
        if not runtime_providers.get(provider["id"], {}).get("has_api_key"):
            missing_keys.append(provider["name"])

    checks = [
        {
            "id": "lumenvec",
            "label": "LumenVec acessivel",
            "ok": lumenvec_status != "erro",
            "detail": lumenvec_status if not lumenvec_message else lumenvec_message,
        },
        {
            "id": "documents",
            "label": "Base com documentos",
            "ok": len(documents) > 0,
            "detail": f"{len(documents)} documento(s)",
        },
        {
            "id": "ai_keys",
            "label": "Chaves de IA configuradas",
            "ok": len(missing_keys) == 0,
            "detail": "ok" if not missing_keys else ", ".join(missing_keys),
        },
        {
            "id": "models",
            "label": "Modelos selecionados",
            "ok": bool(ai_config["chat_model"] and ai_config["embed_model"]),
            "detail": f"{ai_config['chat_model']} / {ai_config['embed_model']}",
        },
    ]

    return {
        "service": {
            "name": "LumenRAG",
            "version": "0.1.1",
            "base_url": base_url,
            "collection": collection,
        },
        "ready": all(check["ok"] for check in checks),
        "checks": checks,
        "metrics": {
            "collections": len(list_collections()),
            "sessions": len(list_chat_sessions(collection)),
            "documents": len(documents),
            "chunks": sum(
                int(document.get("chunks_indexed", 0)) for document in documents
            ),
            "evaluations": len(evaluations),
        },
        "storage": {
            "data_dir": str(config.APP_DIR),
            "uploads_dir": str(config.UPLOADS_DIR),
            "metadata_path": str(config.METADATA_PATH),
            "evaluations_dir": str(config.EVAL_DIR),
        },
    }
