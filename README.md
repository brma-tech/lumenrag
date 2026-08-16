# LumenRAG

LumenRAG is a local-first RAG studio powered by LumenVec. It combines document
ingestion, retrieval inspection, chat, and evaluation in a dedicated web interface.

## Product decisions

- The frontend uses React, TypeScript, Vite, and Tailwind. Streamlit is not part
  of the architecture.
- LumenVec runs as an independent HTTP service, supporting local, external, and
  future cloud deployments.
- FastAPI handles ingestion, provider configuration, retrieval, chat, and evaluation.
- The legacy `rag_lumenvec` namespace remains for compatibility; the public product
  identity is LumenRAG.
- The UI follows the visual language of LumenVec Admin Studio while keeping a
  distinct identity for the RAG workflow.

See [the architecture decision record](docs/ADR-001-frontend-and-product-foundation.md).

## Repository structure

- `backend/`: LumenRAG API, ingestion, chat, history, evaluation, and LumenVec client.
- `frontend/`: lightweight React dashboard compiled as static assets.
- `docs/architecture.md`: backend architecture and quality commands.
- `frontend/src/components/ui/`: shadcn-style UI components.

## Local launcher

Install the public `lumenrag` command in a backend virtual environment:

~~~powershell
cd .\backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -e .
.\.venv\Scripts\lumenrag start
~~~

The launcher reuses a healthy LumenVec when available, otherwise starts a local
binary, waits for health, starts FastAPI with the compiled Studio, opens the
browser, and stops only the process it started.

~~~powershell
lumenrag start --lumenvec-binary C:\path\to\lumenvec.exe
lumenrag start --external-lumenvec --lumenvec-url https://vector.example.com
~~~

Useful options:

~~~text
--workspace <directory>   local data and logs
--host 127.0.0.1          Studio interface
--port 8000               Studio port
--no-browser              do not open a browser
--startup-timeout 20      LumenVec startup wait
~~~

Environment variables include `LUMENRAG_HOME`, `LUMENVEC_BINARY`, and
`LUMENVEC_BASE_URL`. Launcher logs are stored under
`<workspace>/logs/`.

## Self-contained wheels

The builder compiles the Studio and the current LumenVec source with
`CGO_ENABLED=0`, then creates platform wheels:

~~~powershell
backend\.venv\Scripts\python.exe build_wheels.py
backend\.venv\Scripts\python.exe build_wheels.py --all
~~~

Supported targets are `windows-amd64`, `linux-amd64`, `linux-arm64`,
`macos-amd64`, and `macos-arm64`. Artifacts are written to `dist/wheels` with
`build-receipt.json`, SHA-256 hashes, and an internal asset manifest.

Test a wheel in a clean environment:

~~~powershell
backend\.venv\Scripts\python.exe smoke_wheel.py `
  dist\wheels\lumenrag-0.1.0-py3-none-win_amd64.whl
~~~

The smoke test installs dependencies, starts the packaged engine, validates the
Studio, and confirms shutdown. Cross-compilation validates structure and hashes;
each wheel still requires a native-platform smoke test.

> These commands create local artifacts only. They do not publish to PyPI,
> GitHub, or another registry.

Create the development environment:

~~~powershell
cd .\backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
~~~

Configure `.env`:

~~~env
OPENAI_API_KEY=your-key
LUMENVEC_BASE_URL=http://localhost:19190
~~~

## AI configuration

API endpoints:

- `GET /api/ai/providers`
- `GET /api/ai/config`
- `PUT /api/ai/config`
- `GET /api/ai/models?provider=openai&purpose=chat`

Preconfigured providers include OpenAI, OpenRouter, Groq, Together AI, and
local OpenAI-compatible endpoints such as Ollama at `/v1`. Keys saved through
the UI are stored in `rag_data/ai_config.json`. Environment variables such as
`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, and
`TOGETHER_API_KEY` can be used instead.

### Network hardening

Compose services bind to `127.0.0.1` by default. For deliberate remote exposure,
set `LUMENRAG_API_KEY` and send it as `Authorization: Bearer ...` or
`X-LumenRAG-API-Key`. LumenVec and AI provider URLs must be listed in the
comma-separated `LUMENRAG_ALLOWED_OUTBOUND_URLS` allowlist. This prevents
internal SSRF and accidental credential forwarding.

Start the API:

~~~powershell
.\.venv\Scripts\python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
~~~

Set `RAG_DATA_DIR` to isolate data from the original project.

### Backend quality checks

~~~powershell
cd .\backend
python -m pip install -r requirements-dev.txt
python -m ruff check .
python -m pytest
~~~

## Frontend

~~~powershell
cd .\frontend
npm install
npm run dev
~~~

Open `http://127.0.0.1:5173`.

## Docker Compose

From the project root:

~~~powershell
Copy-Item .env.example .env
$env:OPENAI_API_KEY="your-key"
docker compose up --build
~~~

Services:

- frontend: `http://127.0.0.1:5174`
- backend: `http://127.0.0.1:8000`
- LumenVec: `http://127.0.0.1:19190`

The backend container uses:

~~~env
LUMENVEC_BASE_URL=http://lumenvec:19190
RAG_DATA_DIR=/data/rag_data
~~~

LumenVec data is stored in the `lumenvec_data` Docker volume, while RAG data
uses the mounted `../rag_data` directory. If the data-init service reports a
permission error, recreate it:

~~~powershell
docker compose up -d --force-recreate lumenvec-data-init
docker compose up -d --force-recreate lumenvec backend frontend
~~~

To use an external LumenVec on the host:

~~~powershell
$env:LUMENVEC_BASE_URL="http://host.docker.internal:19190"
$env:RAG_COLLECTION="default"
docker compose up --build
~~~

## LumenVec compatibility

The client first tries collection-aware endpoints and falls back to legacy ones:

- `POST /collections/{collection}/vectors/batch`
- `POST /collections/{collection}/search`
- fallback `POST /vectors/batch`
- fallback `POST /vectors/search`

This supports the older API used by `rag_app.py` while remaining ready for
collection-aware APIs.

## CI and release

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs Python 3.11--3.13
tests, frontend build, and npm audit on every push and pull request. When
`LUMENVEC_REPOSITORY` is configured as a repository variable, it also builds and
smoke-tests platform wheels. `LUMENVEC_REF` can pin an engine tag or commit.

The project is licensed under the [MIT License](LICENSE). See
[`docs/distribution.md`](docs/distribution.md) for release gates and packaging.
