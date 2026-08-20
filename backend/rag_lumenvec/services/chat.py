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
        return "I could not find enough indexed context to answer."

    context_text = "\n\n".join(
        (
            f"[Source {index + 1} | File: {chunk.record.document_name} | "
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
                    "Answer questions using only the retrieved context. "
                    "Reply in the same language as the user's question. "
                    "If context is missing, say so explicitly. "
                    "Cite factual claims using [Source N]."
                ),
            },
            {
                "role": "user",
                "content": f"Context:\n{context_text}\n\nQuestion:\n{question}",
            },
        ],
    )
    return response.choices[0].message.content or ""
