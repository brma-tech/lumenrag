from __future__ import annotations

import csv
import json
import re
import uuid
from dataclasses import asdict
from pathlib import Path
from typing import Any

from rag_lumenvec.core import config
from rag_lumenvec.models import ChunkRecord


def ensure_storage() -> None:
    config.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    config.CHAT_HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    config.EVAL_DIR.mkdir(parents=True, exist_ok=True)


def load_all_chunk_records() -> list[ChunkRecord]:
    if not config.METADATA_PATH.exists():
        return []
    records: list[ChunkRecord] = []
    with config.METADATA_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                payload = json.loads(line)
                payload.setdefault("chunk_count", 1)
                records.append(ChunkRecord(**payload))
    return records


def load_chunk_records(collection: str) -> dict[str, ChunkRecord]:
    return {
        record.vector_id: record
        for record in load_all_chunk_records()
        if record.collection == collection
    }


def append_chunk_records(records: list[ChunkRecord]) -> None:
    ensure_storage()
    with config.METADATA_PATH.open("a", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(asdict(record), ensure_ascii=False) + "\n")


def rewrite_chunk_records(records: list[ChunkRecord]) -> None:
    ensure_storage()
    with config.METADATA_PATH.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(asdict(record), ensure_ascii=False) + "\n")


def list_collections() -> list[str]:
    collections = sorted({record.collection for record in load_all_chunk_records()})
    return collections or [config.DEFAULT_COLLECTION]


def summarize_documents(collection: str) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for record in load_chunk_records(collection).values():
        item = grouped.setdefault(
            record.document_name,
            {
                "document_name": record.document_name,
                "source_path": record.source_path,
                "chunks_indexed": 0,
                "chunk_count": record.chunk_count,
                "document_hash": record.document_hash[:12],
            },
        )
        item["chunks_indexed"] += 1
    return sorted(grouped.values(), key=lambda item: item["document_name"].lower())


def safe_name(name: str) -> str:
    name = Path(name).name
    return re.sub(r"[^a-zA-Z0-9_. -]+", "-", name).strip() or "upload.txt"


def save_upload_bytes(filename: str, content: bytes) -> Path:
    ensure_storage()
    destination = config.UPLOADS_DIR / f"{uuid.uuid4().hex[:8]}-{safe_name(filename)}"
    destination.write_bytes(content)
    return destination


def session_history_path(collection: str, session_id: str) -> Path:
    safe_collection = (
        re.sub(r"[^a-zA-Z0-9_-]+", "-", collection).strip("-") or "default"
    )
    safe_session = re.sub(r"[^a-zA-Z0-9_-]+", "-", session_id).strip("-") or "session"
    return config.CHAT_HISTORY_DIR / f"{safe_collection}__{safe_session}.json"


def list_chat_sessions(collection: str) -> list[str]:
    ensure_storage()
    safe_collection = (
        re.sub(r"[^a-zA-Z0-9_-]+", "-", collection).strip("-") or "default"
    )
    prefix = f"{safe_collection}__"
    sessions = []
    for path in config.CHAT_HISTORY_DIR.glob(f"{prefix}*.json"):
        name = path.stem[len(prefix) :]
        if name:
            sessions.append(name)
    return sorted(sessions) or [config.DEFAULT_SESSION]


def load_chat_history(collection: str, session_id: str) -> list[dict[str, Any]]:
    path = session_history_path(collection, session_id)
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def save_chat_history(
    collection: str, session_id: str, messages: list[dict[str, Any]]
) -> None:
    ensure_storage()
    session_history_path(collection, session_id).write_text(
        json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def delete_chat_history(collection: str, session_id: str) -> None:
    path = session_history_path(collection, session_id)
    if path.exists():
        path.unlink()


def write_evaluation_results(
    collection: str, rows: list[dict[str, Any]]
) -> tuple[Path, Path]:
    ensure_storage()
    safe_collection = (
        re.sub(r"[^a-zA-Z0-9_-]+", "-", collection).strip("-") or "default"
    )
    stamp = uuid.uuid4().hex[:8]
    json_path = config.EVAL_DIR / f"{safe_collection}-{stamp}.json"
    csv_path = config.EVAL_DIR / f"{safe_collection}-{stamp}.csv"
    json_path.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    fieldnames = (
        list(rows[0].keys()) if rows else ["question", "sources", "score", "verdict"]
    )
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return json_path, csv_path


def list_evaluation_runs(collection: str | None = None) -> list[dict[str, Any]]:
    ensure_storage()
    runs: list[dict[str, Any]] = []
    for path in sorted(config.EVAL_DIR.glob("*.json"), reverse=True):
        run_collection = path.stem.rsplit("-", 1)[0]
        if collection and run_collection != collection:
            continue
        rows = json.loads(path.read_text(encoding="utf-8"))
        total = len(rows)
        avg_score = (
            sum(int(row.get("score", 0)) for row in rows) / total if total else 0.0
        )
        good_answers = sum(
            1 for row in rows if row.get("verdict") in {"excellent", "good"}
        )
        top_sources = sorted(
            {
                row.get("top_source", "")
                for row in rows
                if row.get("top_source")
            }
        )
        runs.append(
            {
                "id": path.stem,
                "collection": run_collection,
                "created_at": path.stat().st_mtime,
                "total": total,
                "avg_score": avg_score,
                "good_answers": good_answers,
                "top_sources": top_sources[:5],
                "json_path": str(path),
                "csv_path": str(path.with_suffix(".csv")),
            }
        )
    return runs


def load_evaluation_run(run_id: str) -> dict[str, Any]:
    safe_id = re.sub(r"[^a-zA-Z0-9_-]+", "-", run_id).strip("-")
    path = config.EVAL_DIR / f"{safe_id}.json"
    if not safe_id or not path.exists():
        raise FileNotFoundError(f"Evaluation not found: {run_id}")

    rows = json.loads(path.read_text(encoding="utf-8"))
    total = len(rows)
    avg_score = (
        sum(int(row.get("score", 0)) for row in rows) / total if total else 0.0
    )
    good_answers = sum(
        1 for row in rows if row.get("verdict") in {"excellent", "good"}
    )
    weak_rows = [
        row
        for row in rows
        if int(row.get("score", 0)) < 3
        or row.get("verdict") in {"weak", "unsupported", "error", "unparsed"}
    ]
    top_sources = sorted(
        {
            row.get("top_source", "")
            for row in rows
            if row.get("top_source")
        }
    )
    return {
        "id": path.stem,
        "collection": path.stem.rsplit("-", 1)[0],
        "created_at": path.stat().st_mtime,
        "total": total,
        "avg_score": avg_score,
        "good_answers": good_answers,
        "top_sources": top_sources[:5],
        "weak_answers": len(weak_rows),
        "json_path": str(path),
        "csv_path": str(path.with_suffix(".csv")),
        "rows": rows,
    }
