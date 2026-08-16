from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from rag_lumenvec.schemas import AIConfigUpdate
from rag_lumenvec.services.ai import (
    list_ai_models,
    load_ai_config,
    provider_catalog,
    save_ai_config,
)

from .errors import api_error

router = APIRouter()


@router.get("/providers")
def ai_providers() -> dict[str, Any]:
    return {"providers": provider_catalog(), "config": load_ai_config()}


@router.get("/config")
def get_ai_config() -> dict[str, Any]:
    return {"config": load_ai_config()}


@router.put("/config")
def update_ai_config(config: AIConfigUpdate) -> dict[str, Any]:
    return {"config": save_ai_config(config.model_dump(exclude_unset=True))}


@router.get("/models")
def ai_models(
    provider: str = Query(...), purpose: str | None = Query(None)
) -> dict[str, Any]:
    try:
        return {"models": list_ai_models(provider, purpose)}
    except Exception as exc:
        raise api_error(exc) from exc
