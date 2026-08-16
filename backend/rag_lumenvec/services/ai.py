from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI

from rag_lumenvec.core import config
from rag_lumenvec.models import AIProviderDefinition, APIError
from rag_lumenvec.repositories.files import ensure_storage
from rag_lumenvec.services.network import validate_outbound_url

AI_PROVIDERS: dict[str, AIProviderDefinition] = {
    "openai": AIProviderDefinition(
        id="openai",
        name="OpenAI",
        base_url="https://api.openai.com/v1",
        api_key_env="OPENAI_API_KEY",
        supports_chat=True,
        supports_embeddings=True,
        default_chat_model=config.DEFAULT_CHAT_MODEL,
        default_embedding_model=config.DEFAULT_EMBED_MODEL,
    ),
    "openrouter": AIProviderDefinition(
        id="openrouter",
        name="OpenRouter",
        base_url="https://openrouter.ai/api/v1",
        api_key_env="OPENROUTER_API_KEY",
        supports_chat=True,
        supports_embeddings=False,
        default_chat_model="openai/gpt-4.1-mini",
        default_embedding_model="",
    ),
    "groq": AIProviderDefinition(
        id="groq",
        name="Groq",
        base_url="https://api.groq.com/openai/v1",
        api_key_env="GROQ_API_KEY",
        supports_chat=True,
        supports_embeddings=False,
        default_chat_model="llama-3.3-70b-versatile",
        default_embedding_model="",
    ),
    "together": AIProviderDefinition(
        id="together",
        name="Together AI",
        base_url="https://api.together.xyz/v1",
        api_key_env="TOGETHER_API_KEY",
        supports_chat=True,
        supports_embeddings=True,
        default_chat_model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
        default_embedding_model="BAAI/bge-base-en-v1.5",
    ),
    "local-openai": AIProviderDefinition(
        id="local-openai",
        name="Local OpenAI-compatible",
        base_url=os.getenv(
            "LOCAL_OPENAI_BASE_URL", "http://host.docker.internal:11434/v1"
        ),
        api_key_env="LOCAL_OPENAI_API_KEY",
        supports_chat=True,
        supports_embeddings=True,
        default_chat_model="llama3.1",
        default_embedding_model="nomic-embed-text",
    ),
}


def default_ai_config() -> dict[str, Any]:
    return {
        "chat_provider": os.getenv("AI_CHAT_PROVIDER", "openai"),
        "embedding_provider": os.getenv("AI_EMBEDDING_PROVIDER", "openai"),
        "chat_model": config.DEFAULT_CHAT_MODEL,
        "embed_model": config.DEFAULT_EMBED_MODEL,
        "providers": {
            provider_id: {
                "base_url": provider.base_url,
                "api_key": os.getenv(provider.api_key_env, ""),
            }
            for provider_id, provider in AI_PROVIDERS.items()
        },
    }


def load_ai_config(include_secrets: bool = False) -> dict[str, Any]:
    ai_config = default_ai_config()
    if config.AI_CONFIG_PATH.exists():
        saved = json.loads(config.AI_CONFIG_PATH.read_text(encoding="utf-8"))
        ai_config.update(
            {key: value for key, value in saved.items() if key != "providers"}
        )
        for provider_id, provider_config in saved.get("providers", {}).items():
            current = ai_config["providers"].setdefault(provider_id, {})
            current.update(provider_config)

    for provider_id, provider in AI_PROVIDERS.items():
        current = ai_config["providers"].setdefault(provider_id, {})
        current.setdefault("base_url", provider.base_url)
        env_key = os.getenv(provider.api_key_env, "")
        if env_key and not current.get("api_key"):
            current["api_key"] = env_key

    if include_secrets:
        return ai_config

    sanitized = json.loads(json.dumps(ai_config))
    for provider_config in sanitized.get("providers", {}).values():
        api_key = provider_config.get("api_key", "")
        provider_config["has_api_key"] = bool(api_key)
        provider_config["api_key_masked"] = mask_secret(api_key)
        provider_config.pop("api_key", None)
    return sanitized


def save_ai_config(payload: dict[str, Any]) -> dict[str, Any]:
    ensure_storage()
    current = load_ai_config(include_secrets=True)
    for key in ("chat_provider", "embedding_provider", "chat_model", "embed_model"):
        if payload.get(key) is not None:
            current[key] = payload[key]

    for provider_id, provider_payload in payload.get("providers", {}).items():
        if provider_id not in AI_PROVIDERS:
            continue
        current_provider = current["providers"].setdefault(provider_id, {})
        if provider_payload.get("base_url"):
            current_provider["base_url"] = provider_payload["base_url"].rstrip("/")
        if "api_key" in provider_payload and provider_payload["api_key"] is not None:
            current_provider["api_key"] = provider_payload["api_key"]

    config.AI_CONFIG_PATH.write_text(
        json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return load_ai_config(include_secrets=False)


def mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}...{value[-4:]}"


def provider_catalog() -> list[dict[str, Any]]:
    return [
        {
            "id": provider.id,
            "name": provider.name,
            "base_url": provider.base_url,
            "api_key_env": provider.api_key_env,
            "supports_chat": provider.supports_chat,
            "supports_embeddings": provider.supports_embeddings,
            "default_chat_model": provider.default_chat_model,
            "default_embedding_model": provider.default_embedding_model,
        }
        for provider in AI_PROVIDERS.values()
    ]


def ai_client(provider_id: str) -> OpenAI:
    ai_config = load_ai_config(include_secrets=True)
    provider = AI_PROVIDERS.get(provider_id)
    if not provider:
        raise APIError(f"Provedor de IA desconhecido: {provider_id}")

    provider_config = ai_config.get("providers", {}).get(provider_id, {})
    base_url = provider_config.get("base_url") or provider.base_url
    base_url = validate_outbound_url(
        base_url, additional_allowed={provider.base_url.rstrip("/")}
    )
    api_key = provider_config.get("api_key") or os.getenv(provider.api_key_env, "")
    if not api_key and provider_id != "local-openai":
        raise APIError(f"API key nao configurada para {provider.name}.")
    return OpenAI(api_key=api_key or "local", base_url=base_url)


def list_ai_models(
    provider_id: str, purpose: str | None = None
) -> list[dict[str, Any]]:
    provider = AI_PROVIDERS.get(provider_id)
    if not provider:
        raise APIError(f"Provedor de IA desconhecido: {provider_id}")
    if purpose == "chat" and not provider.supports_chat:
        return []
    if purpose == "embeddings" and not provider.supports_embeddings:
        return []

    client = ai_client(provider_id)
    models = client.models.list()
    items = [
        {"id": item.id, "owned_by": getattr(item, "owned_by", "") or ""}
        for item in models.data
    ]
    if purpose == "embeddings":
        items = [item for item in items if looks_like_embedding_model(item["id"])]
    elif purpose == "chat":
        items = [item for item in items if looks_like_chat_model(item["id"])]
    return sorted(items, key=lambda item: item["id"].lower())


def looks_like_embedding_model(model_id: str) -> bool:
    value = model_id.lower()
    markers = ("embed", "embedding", "bge", "e5", "gte", "jina-embeddings")
    return any(marker in value for marker in markers)


def looks_like_chat_model(model_id: str) -> bool:
    value = model_id.lower()
    blocked = (
        "embed",
        "embedding",
        "dall-e",
        "image",
        "tts",
        "whisper",
        "moderation",
        "babbage",
        "davinci",
    )
    return not any(marker in value for marker in blocked)


def embed_texts(
    client: OpenAI, model: str, texts: list[str], dimensions: int | None
) -> list[list[float]]:
    payload: dict[str, Any] = {"model": model, "input": texts}
    if dimensions:
        payload["dimensions"] = dimensions
    response = client.embeddings.create(**payload)
    return [
        item.embedding for item in sorted(response.data, key=lambda item: item.index)
    ]


def openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise APIError("OPENAI_API_KEY nao configurada.")
    return OpenAI(api_key=api_key)
