from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from rag_lumenvec.models import RetrievedChunk


def parse_eval_questions(text: str) -> list[str]:
    return [line.strip("- ").strip() for line in text.splitlines() if line.strip()]


def score_rag_answer(
    openai_client: OpenAI,
    chat_model: str,
    question: str,
    answer: str,
    context_chunks: list[RetrievedChunk],
) -> dict[str, Any]:
    context_text = (
        "\n\n".join(
            f"[Fonte {index + 1}] {chunk.record.text}"
            for index, chunk in enumerate(context_chunks)
        )
        or "Sem contexto"
    )
    response = openai_client.chat.completions.create(
        model=chat_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Avalie a resposta de um sistema RAG usando apenas o contexto "
                    "fornecido. Retorne JSON com as chaves: score, verdict, "
                    "justification. score deve ser inteiro de 1 a 5. verdict deve "
                    "ser one of: excellent, good, weak, unsupported."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Pergunta:\n{question}\n\nResposta:\n{answer}\n\n"
                    f"Contexto:\n{context_text}"
                ),
            },
        ],
    )
    raw = (response.choices[0].message.content or "").strip()
    try:
        parsed = json.loads(raw)
        return {
            "score": int(parsed.get("score", 0)),
            "verdict": str(parsed.get("verdict", "unknown")),
            "justification": str(parsed.get("justification", "")),
        }
    except Exception:
        return {"score": 0, "verdict": "unparsed", "justification": raw[:300]}

