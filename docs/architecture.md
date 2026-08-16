# Arquitetura

O projeto usa uma API FastAPI, um frontend React/Vite e o LumenVec como banco
vetorial. A API usa o entrypoint `uvicorn app:app`, e a implementação principal
fica no pacote `backend/rag_lumenvec`.

Em desenvolvimento, o Vite executa com hot reload e encaminha `/api` para o
FastAPI. Na distribuicao, `npm run build` gera `frontend/dist` e o FastAPI serve
esses assets na raiz. Assim, o usuario final nao precisa instalar ou executar
Node.js.

## Backend

- `rag_lumenvec/api`: criação da aplicação e rotas HTTP.
- `rag_lumenvec/core`: configuração, paths, defaults e logging.
- `rag_lumenvec/models.py`: modelos internos compartilhados.
- `rag_lumenvec/repositories`: persistência local em arquivos JSON/JSONL.
- `rag_lumenvec/services/ai.py`: catálogo de providers, API keys, modelos e embeddings.
- `rag_lumenvec/services/lumenvec.py`: cliente REST do LumenVec.
- `rag_lumenvec/services/ingestion.py`: extração, chunking e indexação.
- `rag_lumenvec/services/retrieval.py`: busca, rerank, budget e fontes.
- `rag_lumenvec/services/chat.py`: resposta RAG.
- `rag_lumenvec/services/evaluation.py`: parsing e scoring de avaliações.

## Fluxos

### Startup local

1. `lumenrag start` cria ou abre o workspace.
2. O launcher consulta `<lumenvec-url>/health`.
3. Se o endpoint estiver indisponivel e nao for externo, o launcher descobre o
   binario pelo argumento, `LUMENVEC_BINARY`, `PATH` ou layout de desenvolvimento.
4. O processo recebe paths isolados para snapshot, WAL e vetores.
5. Depois do health check, o FastAPI inicia e serve o build do Studio.
6. O browser abre somente depois que a raiz do Studio responde.
7. `SIGINT`, `SIGTERM` e `SIGBREAK` solicitam shutdown do Studio; o bloco de
   cleanup encerra o processo LumenVec gerenciado e preserva instancias externas.

### Ingestão

1. O usuário envia arquivos pelo frontend.
2. A API salva o upload em `RAG_DATA_DIR/uploads`.
3. O texto é extraído por tipo de arquivo.
4. O conteúdo é dividido em chunks.
5. O provider de embeddings gera vetores.
6. O LumenVec recebe os vetores.
7. Metadados dos chunks são salvos em `documents.jsonl`.

### Chat

1. A pergunta é salva no histórico da sessão.
2. A API gera embedding da pergunta.
3. O LumenVec retorna candidatos por similaridade.
4. A API aplica rerank lexical + distância vetorial.
5. O contexto é ajustado ao budget configurado.
6. O modelo de chat responde citando `[Fonte N]`.
7. A resposta e as fontes são salvas no histórico.

### Avaliação

1. O usuário informa uma pergunta por linha.
2. Cada pergunta executa o mesmo fluxo de retrieval + resposta.
3. Um modelo avalia a resposta usando apenas o contexto recuperado.
4. A rodada é persistida em JSON e CSV em `RAG_DATA_DIR/evaluations`.

## Qualidade

Comandos principais:

```powershell
cd backend
python -m pip install -r requirements-dev.txt
python -m ruff check .
python -m pytest
```

```powershell
cd frontend
npm run build
```

Erros da API seguem o formato:

```json
{
  "detail": {
    "error_code": "missing_api_key",
    "message": "API key nao configurada para OpenAI.",
    "details": null
  }
}
```
