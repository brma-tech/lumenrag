# Configuration

Common environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API key | unset |
| `RAG_CHAT_MODEL` | Chat model | `gpt-4.1-mini` |
| `RAG_EMBED_MODEL` | Embedding model | `text-embedding-3-small` |
| `RAG_EMBED_DIMENSIONS` | Vector dimension | `256` |
| `LUMENVEC_BASE_URL` | LumenVec HTTP endpoint | `http://localhost:19190` |
| `LUMENRAG_HOME` | Local workspace | platform-specific |
| `LUMENRAG_API_KEY` | Optional API authentication | unset |

Keep `RAG_EMBED_DIMENSIONS` consistent with the existing collection. Changing
vector dimensions requires a new collection or a re-index.

For deliberate remote exposure, configure `LUMENRAG_API_KEY` and the outbound
URL allowlist. The default launcher is local-only.
