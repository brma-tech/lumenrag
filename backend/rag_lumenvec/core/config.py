from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DEFAULT_BASE_URL = os.getenv("LUMENVEC_BASE_URL", "http://localhost:19190")
DEFAULT_COLLECTION = os.getenv("RAG_COLLECTION", "default")
DEFAULT_SESSION = os.getenv("RAG_SESSION", "default")
DEFAULT_EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "text-embedding-3-small")
DEFAULT_CHAT_MODEL = os.getenv("RAG_CHAT_MODEL", "gpt-4.1-mini")
DEFAULT_DIMENSIONS = int(os.getenv("RAG_EMBED_DIMENSIONS", "256"))
DEFAULT_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
DEFAULT_CONTEXT_BUDGET = int(os.getenv("RAG_CONTEXT_BUDGET", "6000"))
MAX_UPLOAD_FILES = int(os.getenv("LUMENRAG_MAX_UPLOAD_FILES", "10"))
MAX_UPLOAD_BYTES = int(os.getenv("LUMENRAG_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
MAX_QUESTIONS_BYTES = int(os.getenv("LUMENRAG_MAX_QUESTIONS_BYTES", str(256 * 1024)))

SERVICE_PATH = Path(__file__).resolve()
REPO_ROOT = (
    SERVICE_PATH.parents[3] if len(SERVICE_PATH.parents) > 3 else SERVICE_PATH.parent
)
APP_DIR = Path(os.getenv("RAG_DATA_DIR", str(REPO_ROOT / "rag_data")))
UPLOADS_DIR = APP_DIR / "uploads"
METADATA_PATH = APP_DIR / "documents.jsonl"
CHAT_HISTORY_DIR = APP_DIR / "chat_history"
EVAL_DIR = APP_DIR / "evaluations"
AI_CONFIG_PATH = APP_DIR / "ai_config.json"
FRONTEND_DIST_DIR = Path(
    os.getenv("LUMENRAG_FRONTEND_DIST", str(REPO_ROOT / "frontend" / "dist"))
)
