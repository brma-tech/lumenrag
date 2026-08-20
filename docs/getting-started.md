# Getting started

## 1. Install and launch

```bash
python -m pip install --upgrade lumenrag
lumenrag start
```

Open the URL printed by the launcher, usually `http://127.0.0.1:8000`.

## 2. Configure OpenAI

Set the key before starting the application:

```powershell
$env:OPENAI_API_KEY = "your-api-key"
lumenrag start
```

Or select another provider from the AI configuration panel.

## 3. Ingest and ask

Upload PDF, DOCX, CSV, Markdown, or text files, wait for indexing to finish,
then ask questions in the Chat panel. Each answer includes the retrieved source
chunks when context is available.
