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
| `LUMENRAG_MAX_UPLOAD_FILES` | Maximum files in one ingestion request (positive integer) | `2000` |
| `LUMENRAG_MAX_UPLOAD_BYTES` | Maximum bytes per uploaded file | `26214400` (25 MiB) |

For example, set `LUMENRAG_MAX_UPLOAD_FILES=25` in the server environment
or `.env` file and restart LumenRAG to accept up to 25 files per upload.
The Studio displays the server's effective limit and blocks oversized batches;
the API independently enforces it. Files within a batch are processed sequentially.
This setting controls batch size, not parallel ingestion workers. The multipart
parser uses the same configured file limit as the ingestion endpoint.

Keep `RAG_EMBED_DIMENSIONS` consistent with the existing collection. Changing
vector dimensions requires a new collection or a re-index.

For deliberate remote exposure, configure `LUMENRAG_API_KEY` and the outbound
URL allowlist. The default launcher is local-only.
