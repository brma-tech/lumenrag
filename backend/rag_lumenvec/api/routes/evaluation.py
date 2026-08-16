from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from rag_lumenvec.models import APIError
from rag_lumenvec.repositories.files import (
    list_evaluation_runs,
    load_evaluation_run,
    write_evaluation_results,
)
from rag_lumenvec.schemas import EvaluationRequest
from rag_lumenvec.services.ai import ai_client
from rag_lumenvec.services.chat import answer_with_rag
from rag_lumenvec.services.evaluation import parse_eval_questions, score_rag_answer
from rag_lumenvec.services.lumenvec import LumenVecClient
from rag_lumenvec.services.retrieval import search_context

from .errors import api_error

router = APIRouter()


@router.get("/evaluations")
def evaluations(collection: str | None = Query(None)) -> dict[str, Any]:
    return {"runs": list_evaluation_runs(collection)}


@router.get("/evaluations/{run_id}")
def evaluation_detail(run_id: str) -> dict[str, Any]:
    try:
        return {"run": load_evaluation_run(run_id)}
    except Exception as exc:
        raise api_error(exc) from exc


@router.post("/evaluate")
def evaluate(request_data: EvaluationRequest) -> dict[str, Any]:
    try:
        questions = parse_eval_questions(request_data.questions)
        if not questions:
            raise APIError("Informe pelo menos uma pergunta.")

        embedding_ai = ai_client(request_data.embedding_provider)
        chat_ai = ai_client(request_data.chat_provider)
        lumen = LumenVecClient(request_data.base_url)
        rows = []
        for question in questions:
            try:
                chunks = search_context(
                    lumen_client=lumen,
                    openai_client=embedding_ai,
                    embed_model=request_data.embed_model,
                    dimensions=request_data.dimensions or None,
                    collection=request_data.collection,
                    question=question,
                    top_k=request_data.top_k,
                    context_budget_chars=request_data.context_budget_chars,
                )
                answer = answer_with_rag(
                    chat_ai, request_data.chat_model, question, chunks
                )
                score = score_rag_answer(
                    chat_ai, request_data.chat_model, question, answer, chunks
                )
                rows.append(
                    {
                        "question": question,
                        "sources": len(chunks),
                        "top_source": chunks[0].record.document_name if chunks else "",
                        "score": score["score"],
                        "verdict": score["verdict"],
                        "justification": score["justification"][:220],
                        "answer_preview": answer[:220],
                    }
                )
            except Exception as exc:
                rows.append(
                    {
                        "question": question,
                        "sources": 0,
                        "top_source": "",
                        "score": 0,
                        "verdict": "error",
                        "justification": str(exc)[:220],
                        "answer_preview": f"Erro: {exc}",
                    }
                )

        avg_score = sum(int(row["score"]) for row in rows) / max(1, len(rows))
        good_answers = sum(1 for row in rows if row["verdict"] in {"excellent", "good"})
        json_path, csv_path = write_evaluation_results(request_data.collection, rows)
        return {
            "rows": rows,
            "avg_score": avg_score,
            "good_answers": good_answers,
            "total": len(rows),
            "json_path": str(json_path),
            "csv_path": str(csv_path),
        }
    except Exception as exc:
        raise api_error(exc) from exc
