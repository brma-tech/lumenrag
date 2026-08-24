from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, Query, UploadFile

from rag_lumenvec.core.config import (
    DEFAULT_BASE_URL,
    DEFAULT_COLLECTION,
    DEFAULT_DIMENSIONS,
    DEFAULT_EMBED_MODEL,
    MAX_UPLOAD_BYTES,
    MAX_UPLOAD_FILES,
)
from rag_lumenvec.repositories.files import (
    list_chat_sessions,
    list_collections,
    save_upload_bytes,
    summarize_documents,
)
from rag_lumenvec.schemas import RagConfig
from rag_lumenvec.services.ai import ai_client
from rag_lumenvec.services.ingestion import (
    clear_collection,
    delete_document_records,
    ingest_document,
)
from rag_lumenvec.services.lumenvec import LumenVecClient
from rag_lumenvec.services.vector_graph import build_vector_graph

from .errors import api_error

router = APIRouter()


@router.get("/collections")
def collections() -> dict[str, list[str]]:
    return {"collections": list_collections()}


@router.get("/sessions")
def sessions(collection: str = Query(DEFAULT_COLLECTION)) -> dict[str, list[str]]:
    return {"sessions": list_chat_sessions(collection)}


@router.get("/documents")
def documents(collection: str = Query(DEFAULT_COLLECTION)) -> dict[str, Any]:
    return {"documents": summarize_documents(collection)}


@router.get("/vector-map")
def vector_map(
    collection: str = Query(DEFAULT_COLLECTION),
    base_url: str = Query(DEFAULT_BASE_URL),
    limit: int = Query(60, ge=10, le=100),
) -> dict[str, Any]:
    try:
        return build_vector_graph(LumenVecClient(base_url), collection, limit)
    except Exception as exc:
        raise api_error(exc) from exc


@router.post("/ingest")
async def ingest(
    files: list[UploadFile] = File(...),
    base_url: str = Form(DEFAULT_BASE_URL),
    collection: str = Form(DEFAULT_COLLECTION),
    embedding_provider: str = Form("openai"),
    embed_model: str = Form(DEFAULT_EMBED_MODEL),
    dimensions: int = Form(DEFAULT_DIMENSIONS),
) -> dict[str, Any]:
    if len(files) > MAX_UPLOAD_FILES:
        raise api_error(
            ValueError(f"Limit of {MAX_UPLOAD_FILES} files per request.")
        )
    try:
        lumen = LumenVecClient(base_url)
        embedding_ai = ai_client(embedding_provider)
        results = []
        indexed_files = 0
        total_chunks = 0
        for uploaded_file in files:
            filename = uploaded_file.filename or "upload"
            try:
                content = await uploaded_file.read(MAX_UPLOAD_BYTES + 1)
                if len(content) > MAX_UPLOAD_BYTES:
                    raise ValueError(
                        f"Arquivo excede o limite de {MAX_UPLOAD_BYTES} bytes."
                    )
                file_path = save_upload_bytes(filename, content)
                chunks, vectors = ingest_document(
                    lumen_client=lumen,
                    openai_client=embedding_ai,
                    embed_model=embed_model,
                    dimensions=dimensions or None,
                    collection=collection,
                    file_path=file_path,
                )
                status = "indexed"
                message = "Arquivo indexado com sucesso."
                if chunks == -1:
                    status = "skipped"
                    message = "The file was already indexed with no changes."
                elif chunks == 0:
                    status = "empty"
                    message = "No usable text was found in the file."
                else:
                    indexed_files += 1
                    total_chunks += chunks
                results.append(
                    {
                        "filename": filename,
                        "stored_as": file_path.name,
                        "status": status,
                        "chunks": max(chunks, 0),
                        "vectors": vectors,
                        "message": message,
                    }
                )
            except Exception as exc:
                results.append(
                    {
                        "filename": filename,
                        "stored_as": "",
                        "status": "error",
                        "chunks": 0,
                        "vectors": 0,
                        "message": str(exc),
                    }
                )
        return {
            "indexed_files": indexed_files,
            "total_chunks": total_chunks,
            "results": results,
            "documents": summarize_documents(collection),
        }
    except Exception as exc:
        raise api_error(exc) from exc


@router.delete("/documents")
def delete_document(
    document_name: str = Query(...),
    collection: str = Query(DEFAULT_COLLECTION),
    base_url: str = Query(DEFAULT_BASE_URL),
) -> dict[str, Any]:
    try:
        deleted, failed = delete_document_records(
            LumenVecClient(base_url), collection, document_name
        )
        return {
            "deleted": deleted,
            "failed": failed,
            "documents": summarize_documents(collection),
        }
    except Exception as exc:
        raise api_error(exc) from exc


@router.post("/collections/clear")
def clear_collection_endpoint(config: RagConfig) -> dict[str, Any]:
    try:
        deleted, failed = clear_collection(
            LumenVecClient(config.base_url), config.collection
        )
        return {"deleted": deleted, "failed": failed, "documents": []}
    except Exception as exc:
        raise api_error(exc) from exc
