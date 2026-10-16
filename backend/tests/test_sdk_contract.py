"""Exercise the installed SDK without network access or real credentials."""

import importlib
import json

import openai
import pytest
from openai import OpenAI

from rag_lumenvec.models import ChunkRecord, RetrievedChunk
from rag_lumenvec.services.ai import embed_texts
from rag_lumenvec.services.chat import answer_with_rag
from rag_lumenvec.services.evaluation import score_rag_answer

# SDK 3 uses httpx2; supported SDK 1/2 releases use httpx.
httpx = importlib.import_module(
    "httpx2" if int(openai.__version__.split(".")[0]) >= 3 else "httpx"
)


@pytest.mark.parametrize(
    "base_url", ["https://api.openai.com/v1", "http://localhost:11434/v1"]
)
def test_sdk_rag_contracts_without_network(base_url):
    requests = []

    def handle(request):
        body = json.loads(request.content)
        requests.append((request.url.path, body))
        if request.url.path.endswith("/embeddings"):
            return httpx.Response(
                200,
                json={
                    "object": "list",
                    "model": "test-embedding",
                    "data": [
                        {"object": "embedding", "index": 1, "embedding": [0.0, 1.0]},
                        {"object": "embedding", "index": 0, "embedding": [1.0, 0.0]},
                    ],
                    "usage": {"prompt_tokens": 2, "total_tokens": 2},
                },
            )
        evaluating = "Avalie" in body["messages"][0]["content"]
        content = (
            json.dumps(
                {"score": 5, "verdict": "excellent", "justification": "Grounded"}
            )
            if evaluating
            else "Answer [Source 1]"
        )
        return httpx.Response(
            200,
            json={
                "id": "test",
                "object": "chat.completion",
                "created": 0,
                "model": "test-chat",
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": "stop",
                        "message": {"role": "assistant", "content": content},
                    }
                ],
            },
        )

    with OpenAI(
        api_key="test-not-a-real-key",
        base_url=base_url,
        http_client=httpx.Client(transport=httpx.MockTransport(handle)),
    ) as client:
        assert embed_texts(client, "test-embedding", ["a", "b"], 2) == [
            [1.0, 0.0],
            [0.0, 1.0],
        ]
        chunk = RetrievedChunk(
            ChunkRecord("v1", "test", "doc.txt", "hash", 0, 1, "Context", "doc.txt"),
            0.1,
            0.9,
        )
        assert (
            answer_with_rag(client, "test-chat", "Question", [chunk])
            == "Answer [Source 1]"
        )
        assert (
            score_rag_answer(client, "test-chat", "Question", "Answer", [chunk])[
                "score"
            ]
            == 5
        )
        assert [item[0] for item in requests] == [
            "/v1/embeddings",
            "/v1/chat/completions",
            "/v1/chat/completions",
        ]
        assert requests[0][1]["dimensions"] == 2
        assert "[Source 1" in requests[1][1]["messages"][1]["content"]
