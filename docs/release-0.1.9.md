# LumenRAG 0.1.9

- Update Vite to 8.3.4, React plugin to 6.1.2, and Lucide to 1.55.0.
- Coordinate React/React DOM and their types on major 19; update Framer Motion to 14.1.0.
- Load chat on demand to reduce initial JavaScript; retain an accessible loading status.
- Permit OpenAI SDK 3 while retaining supported SDK 1/2 requirements.
- Test embeddings, chat, evaluation, and custom base URLs using the actual SDK with mock transports. CI exercises all three SDK major versions without external API requests.
- Group React runtime and type updates in Dependabot to prevent partial major upgrades.

The engine pin, storage format, API contracts, and ingestion limits are unchanged.

Upgrade: `python -m pip install --upgrade lumenrag==0.1.9`.

Rollback: reinstall 0.1.8. No data migration is required.

SDK implementation reference: https://developers.openai.com/api/reference/python
