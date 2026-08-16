# LumenRAG

LumenRAG is a local-first RAG studio powered by LumenVec. It combines document
ingestion, retrieval inspection, chat and evaluation in a dedicated web interface.

The product reuses the proven RAG implementation from the original project while
moving it behind a stable LumenRAG identity and architecture.

## Decisoes de produto

- O frontend e proprio: React, TypeScript, Vite e Tailwind. Streamlit nao faz
  parte da arquitetura.
- O LumenVec permanece um processo independente e e acessado por HTTP. Isso
  permite alternar entre uma instancia local, externa ou futura LumenVec Cloud.
- O FastAPI concentra ingestao, providers, retrieval, chat e avaliacao.
- O namespace Python legado `rag_lumenvec` sera mantido durante a primeira fase
  para evitar uma migracao cosmetica de alto risco. A API e a marca publica ja
  usam LumenRAG.
- A interface segue os tokens e a linguagem visual do LumenVec Admin Studio,
  preservando uma identidade propria para o fluxo RAG.

A decisao arquitetural completa esta em
[`docs/ADR-001-frontend-and-product-foundation.md`](docs/ADR-001-frontend-and-product-foundation.md).

## Estrutura

- `backend/`: API LumenRAG, ingestao, chat, historico, avaliacao e cliente LumenVec.
- `frontend/`: painel React leve, compilado como assets estaticos.
- `docs/architecture.md`: arquitetura do backend, fluxos e comandos de qualidade.
- `frontend/src/components/ui/ai-prompt-box.tsx`: componente de prompt no caminho shadcn-style.

Neste projeto Vite, o caminho padrao escolhido para componentes shadcn e `src/components/ui`, com alias `@/* -> src/*`. Em projetos shadcn criados com outro layout, manter `/components/ui` ou `src/components/ui` importa porque os imports do tipo `@/components/ui/...` dependem desse caminho.

## Dependencias do componente

O frontend instala:

- `lucide-react`
- `framer-motion`
- `@radix-ui/react-dialog`
- `@radix-ui/react-tooltip`

Nao ha assets obrigatorios para esse componente; uploads de imagem no prompt sao apenas preview local. A ingestao RAG completa fica na aba `Ingestao`.

## Backend

### Launcher local

O pacote expoe o comando publico `lumenrag`. Em desenvolvimento, instale-o no
ambiente virtual do backend:

```powershell
cd .\backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -e .
.\.venv\Scripts\lumenrag start
```

O comando:

1. reutiliza um LumenVec saudavel no endpoint configurado; ou
2. localiza e inicia um binario LumenVec;
3. aguarda o health check;
4. inicia o FastAPI com o Studio compilado;
5. abre o navegador;
6. encerra somente o LumenVec iniciado por ele ao receber `Ctrl+C`.

Para informar o binario explicitamente:

```powershell
lumenrag start --lumenvec-binary C:\caminho\lumenvec.exe
```

Para exigir uma instancia externa sem permitir startup local:

```powershell
lumenrag start --external-lumenvec --lumenvec-url https://vector.example.com
```

Opcoes uteis:

```text
--workspace <diretorio>  dados e logs locais
--host 127.0.0.1         interface do Studio
--port 8000              porta do Studio
--no-browser             nao abrir o navegador
--startup-timeout 20     espera pelo LumenVec
```

Variaveis equivalentes:

- `LUMENRAG_HOME`: workspace padrao;
- `LUMENVEC_BINARY`: caminho do executavel;
- `LUMENVEC_BASE_URL`: endpoint usado pela API.

Os logs do banco iniciado pelo launcher ficam em
`<workspace>/logs/lumenvec.stdout.log` e `lumenvec.stderr.log`.

### Wheels autocontidas

O builder local compila o Studio, compila o LumenVec atual com `CGO_ENABLED=0`
e gera uma wheel por plataforma:

```powershell
backend\.venv\Scripts\python.exe build_wheels.py
backend\.venv\Scripts\python.exe build_wheels.py --all
```

Targets suportados:

- `windows-amd64`;
- `linux-amd64`;
- `linux-arm64`;
- `macos-amd64`;
- `macos-arm64`.

Os artefatos ficam em `dist/wheels`, acompanhados de `build-receipt.json` com
tamanho e SHA-256. Cada wheel tambem carrega um manifesto interno e o launcher
verifica todos os assets antes de executar o binario.

Para testar uma wheel em um ambiente virtual limpo:

```powershell
backend\.venv\Scripts\python.exe smoke_wheel.py `
  dist\wheels\lumenrag-0.1.0-py3-none-win_amd64.whl
```

Esse comando instala dependencias, inicia o engine empacotado, valida o Studio e
confirma o shutdown. A compilacao cruzada valida estrutura e checksum, mas cada
wheel ainda precisa passar pelo smoke em um runner nativo da plataforma.

> Os comandos acima produzem somente artefatos locais. Eles nao publicam no PyPI,
> GitHub ou qualquer registry. Publicacao continua sujeita aos gates de licenca,
> marca, assinatura, seguranca e autorizacao externa.

Crie o ambiente Python:

```powershell
cd .\rag_lumenvec_novo\backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edite `.env` e configure:

```env
OPENAI_API_KEY=sua-chave
LUMENVEC_BASE_URL=http://localhost:19190
```

## Configuracao de IA

O backend expoe APIs para configurar provedores e listar modelos:

- `GET /api/ai/providers`
- `GET /api/ai/config`
- `PUT /api/ai/config`
- `GET /api/ai/models?provider=openai&purpose=chat`

O frontend usa essas rotas para escolher separadamente:

- provider/modelo de chat
- provider/modelo de embeddings
- base URL e API key por provider

Providers preconfigurados:

- OpenAI
- OpenRouter
- Groq
- Together AI
- Local OpenAI-compatible, como Ollama em `/v1`

As chaves salvas pela UI ficam em `rag_data/ai_config.json` via volume Docker. Para evitar gravar chaves em arquivo, configure via variaveis de ambiente como `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY` e `TOGETHER_API_KEY`.

### Endurecimento de rede

O Compose publica os servicos apenas em `127.0.0.1` por padrao. Para uma
instalacao deliberadamente exposta, configure `LUMENRAG_API_KEY` e passe essa
chave como `Authorization: Bearer ...` ou `X-LumenRAG-API-Key`. URLs de
LumenVec e provedores de IA tambem precisam estar na lista explicita
`LUMENRAG_ALLOWED_OUTBOUND_URLS`, separada por virgulas. Isso evita que uma
requisicao escolha um destino interno ou encaminhe uma chave para um host
arbitrario.

Suba a API:

```powershell
.\.venv\Scripts\python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

O backend usa por padrao a pasta `..\rag_data` do projeto original, preservando metadados, historicos e avaliacoes do `rag_app.py`. Para isolar os dados, defina `RAG_DATA_DIR` no `.env`.

### Qualidade do backend

```powershell
cd .\rag_lumenvec_novo\backend
python -m pip install -r requirements-dev.txt
python -m ruff check .
python -m pytest
```

A API foi modularizada no pacote `backend/rag_lumenvec`. O arquivo `backend/app.py` continua como entrypoint `uvicorn app:app`.

## Frontend

```powershell
cd .\rag_lumenvec_novo\frontend
npm install
npm run dev
```

Abra:

```text
http://127.0.0.1:5173
```

## Docker Compose

Na raiz do projeto novo:

```powershell
cd .\rag_lumenvec_novo
Copy-Item .env.example .env
$env:OPENAI_API_KEY="sua-chave"
docker compose up --build
```

Servicos:

- frontend: `http://127.0.0.1:5173`
- backend: `http://127.0.0.1:8000`
- lumenvec: `http://127.0.0.1:19190`

Por padrao, o Compose sobe tambem o LumenVec usando a imagem local:

```env
LUMENVEC_IMAGE=lumenvec-lumenvec:latest
```

O backend no container usa:

```env
LUMENVEC_BASE_URL=http://lumenvec:19190
RAG_DATA_DIR=/data/rag_data
```

Isso usa a rede interna do Compose e reaproveita a pasta `../rag_data` do projeto original via volume Docker. Os dados internos do LumenVec ficam no volume Docker `lumenvec_data`.

O servico `lumenvec-data-init` ajusta as permissoes desse volume para o usuario `nonroot` usado pela imagem do LumenVec. Se aparecer erro como `open /data/wal.log: permission denied`, recrie a stack:

```powershell
docker compose up -d --force-recreate lumenvec-data-init
docker compose up -d --force-recreate lumenvec backend frontend
```

O Compose inclui healthchecks para frontend, backend e LumenVec. O healthcheck do
LumenVec usa `wget` ou `curl` quando a imagem tiver uma dessas ferramentas; se a
imagem for minima, a stack nao fica bloqueada por falta do binario de healthcheck.

Se quiser usar um LumenVec externo rodando na maquina host, sobrescreva:

```powershell
$env:LUMENVEC_BASE_URL="http://host.docker.internal:19190"
$env:RAG_COLLECTION="default"
docker compose up --build
```

## LumenVec

Suba o servidor LumenVec antes de usar ingestao ou chat. O cliente tenta primeiro endpoints com collection e cai para os endpoints antigos:

- `POST /collections/{collection}/vectors/batch`
- `POST /collections/{collection}/search`
- fallback `POST /vectors/batch`
- fallback `POST /vectors/search`

Assim o novo app funciona com a versao antiga usada pelo `rag_app.py` e fica preparado para APIs collection-aware.
