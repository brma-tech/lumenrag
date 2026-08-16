from __future__ import annotations

from openai import OpenAI

from rag_lumenvec.models import RetrievedChunk


def answer_with_rag(
    openai_client: OpenAI,
    chat_model: str,
    question: str,
    context_chunks: list[RetrievedChunk],
) -> str:
    if not context_chunks:
        return "Nao encontrei contexto indexado suficiente para responder."

    context_text = "\n\n".join(
        (
            f"[Fonte {index + 1} | Arquivo: {chunk.record.document_name} | "
            f"Chunk: {chunk.record.chunk_index} | Score: {chunk.rerank_score:.4f}]\n"
            f"{chunk.record.text}"
        )
        for index, chunk in enumerate(context_chunks)
    )
    response = openai_client.chat.completions.create(
        model=chat_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Voce responde perguntas usando exclusivamente o contexto "
                    "recuperado. Se faltar contexto, diga isso explicitamente. "
                    "Ao fazer afirmacoes factuais, cite as fontes usando [Fonte N]."
                ),
            },
            {
                "role": "user",
                "content": f"Contexto:\n{context_text}\n\nPergunta:\n{question}",
            },
        ],
    )
    return response.choices[0].message.content or ""

