# Contributing to LumenRAG

Thank you for helping improve LumenRAG. Contributions are accepted through pull requests; direct pushes to `main` are reserved for maintainers.

## Before opening a pull request

1. Create a focused branch from `main`.
2. Run the backend checks from `backend`:

   ```powershell
   python -m ruff check .
   python -m pytest
   ```

3. Build and audit the frontend:

   ```powershell
   npm ci
   npm run build
   npm audit --audit-level=high
   ```

4. Complete the pull request checklist and describe security impact.

Every pull request is scanned for dependency vulnerabilities, unsafe Python patterns, leaked secrets, and test/build regressions. A maintainer approval and passing required checks are needed before merge.

Do not include API keys, credentials, customer data, local `.env` files, or generated build output. Report suspected vulnerabilities privately using [SECURITY.md](SECURITY.md), not a public issue.
