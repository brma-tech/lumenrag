# LumenRAG

LumenRAG is a local-first RAG studio powered by LumenVec. It provides document
ingestion, vector retrieval, source-aware chat, and evaluation in a lightweight
web interface.

## Install

```bash
python -m pip install --upgrade lumenrag
lumenrag start
```

The platform wheels include the matching LumenVec engine for Windows, Linux,
and macOS. Configure `OPENAI_API_KEY` or choose another provider in the Studio.

## Common configuration

```env
OPENAI_API_KEY=your-api-key
RAG_CHAT_MODEL=gpt-4.1-mini
RAG_EMBED_MODEL=text-embedding-3-small
RAG_EMBED_DIMENSIONS=256
LUMENVEC_BASE_URL=http://localhost:19190
```

Keep embedding dimensions consistent with an existing collection. See the full
documentation at https://brma-tech.github.io/lumenrag/ and the source repository
at https://github.com/brma-tech/lumenrag.

## License

LumenRAG is released under the MIT License.
