from __future__ import annotations

import hmac
import os
import time
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request

from rag_lumenvec.core import config
from rag_lumenvec.core.logging import configure_logging, get_logger

from .routes import ai, chat, documents, evaluation, health, status

logger = get_logger(__name__)


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(
        title="LumenRAG API",
        description="Local-first RAG application powered by LumenVec.",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
    app.include_router(documents.router, prefix="/api", tags=["documents"])
    app.include_router(chat.router, prefix="/api", tags=["chat"])
    app.include_router(evaluation.router, prefix="/api", tags=["evaluation"])
    app.include_router(status.router, prefix="/api", tags=["status"])

    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next):
        configured_key = os.getenv("LUMENRAG_API_KEY", "")
        if configured_key and request.url.path.startswith("/api/"):
            supplied = request.headers.get("X-LumenRAG-API-Key", "")
            authorization = request.headers.get("Authorization", "")
            if authorization.lower().startswith("bearer "):
                supplied = authorization[7:].strip()
            if not hmac.compare_digest(supplied, configured_key):
                return JSONResponse(
                    {"detail": "Autenticacao necessaria."}, status_code=401
                )
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "elapsed_ms": elapsed_ms,
            },
        )
        return response

    if config.FRONTEND_DIST_DIR.is_dir():
        app.mount(
            "/",
            StaticFiles(directory=config.FRONTEND_DIST_DIR, html=True),
            name="lumenrag-studio",
        )
    else:

        @app.get("/", include_in_schema=False)
        def product_metadata() -> JSONResponse:
            return JSONResponse(
                {
                    "name": "LumenRAG",
                    "version": app.version,
                    "studio": "not_built",
                    "docs": "/docs",
                }
            )

    return app


app = create_app()
