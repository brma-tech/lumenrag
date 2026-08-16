from __future__ import annotations

import json

from rag_lumenvec.core import config
from rag_lumenvec.models import ChunkRecord, RetrievedChunk
from rag_lumenvec.repositories.files import (
    load_chat_history,
    safe_name,
    save_chat_history,
    session_history_path,
)
from rag_lumenvec.services.evaluation import parse_eval_questions
from rag_lumenvec.services.ingestion import (
    chunk_text,
    content_hash,
)
from rag_lumenvec.services.retrieval import fit_context_to_budget


def test_parse_eval_questions_trims_blank_lines_and_bullets() -> None:
    text = "\n- Primeira pergunta?\n\n  Segunda pergunta?  \n"

    assert parse_eval_questions(text) == ["Primeira pergunta?", "Segunda pergunta?"]


def test_chunk_text_uses_overlap() -> None:
    text = "abcdefghijklmnopqrstuvwxyz"

    assert chunk_text(text, chunk_size=10, overlap=3) == [
        "abcdefghij",
        "hijklmnopq",
        "opqrstuvwx",
        "vwxyz",
    ]


def test_safe_name_keeps_filename_and_removes_unsafe_chars() -> None:
    assert safe_name("../relatorio:final?.pdf") == "relatorio-final-.pdf"
    assert safe_name("///") == "upload.txt"


def test_fit_context_truncates_first_chunk_when_budget_is_small() -> None:
    record = ChunkRecord(
        vector_id="v1",
        collection="default",
        document_name="doc.txt",
        document_hash=content_hash("conteudo"),
        chunk_index=0,
        chunk_count=1,
        text="conteudo longo",
        source_path="doc.txt",
    )
    chunk = RetrievedChunk(record=record, distance=0.1, rerank_score=0.9)

    selected = fit_context_to_budget([chunk], budget_chars=8)

    assert len(selected) == 1
    assert selected[0].record.text == "conteudo"


def test_session_history_path_sanitizes_collection_and_session(
    tmp_path, monkeypatch
) -> None:
    monkeypatch.setattr(config, "CHAT_HISTORY_DIR", tmp_path)

    path = session_history_path("minha collection", "../sessao ativa")

    assert path.parent == tmp_path
    assert path.name == "minha-collection__sessao-ativa.json"


def test_save_and_load_chat_history(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(config, "APP_DIR", tmp_path)
    monkeypatch.setattr(config, "UPLOADS_DIR", tmp_path / "uploads")
    monkeypatch.setattr(config, "CHAT_HISTORY_DIR", tmp_path / "chat_history")
    monkeypatch.setattr(config, "EVAL_DIR", tmp_path / "evaluations")

    messages = [{"role": "user", "content": "Oi"}]
    save_chat_history("default", "session", messages)

    assert load_chat_history("default", "session") == messages
    stored = tmp_path / "chat_history" / "default__session.json"
    assert json.loads(stored.read_text(encoding="utf-8")) == messages
