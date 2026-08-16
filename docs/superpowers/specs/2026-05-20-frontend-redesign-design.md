# Frontend Redesign Design

## Goal

Improve the RAG LumenVec frontend into a professional, welcoming, chat-first interface while preserving the current backend contracts and core workflows.

The product direction is **Warm AI Studio**: approachable for day-to-day document chat, with technical depth available through contextual and advanced panels.

## Target audience

The interface should support hybrid use:

- Non-technical or demo users who want to upload documents and ask questions quickly.
- Developers, ML engineers, or advanced users who need access to LumenVec, model, retrieval, ingestion, and evaluation settings.

The default experience should be simple and conversational. Advanced controls should remain available but not dominate the first screen.

## Chosen approach

Use a **redesign plus light component reorganization**.

This keeps existing API calls and behavior, but reorganizes the large `App.tsx` into focused UI components. It avoids a full product rewrite while making the frontend easier to refine and maintain.

Rejected alternatives:

- Pure visual-only redesign: lower risk, but keeps the current large component structure and limits future improvements.
- Full experience reimagining: potentially stronger product feel, but too broad for this phase and more likely to require backend or workflow changes.

## Information architecture

The app becomes a command-center style studio with chat as the primary surface.

### App shell

- Dark premium background with subtle gradients.
- Compact header with product identity, LumenVec health, current collection/session, and access to advanced controls.
- Main area focused on the chat experience.
- Contextual panels for supporting workflows instead of dominant top-level tabs.

### Chat center

- Default landing area when the app opens.
- Empty state with welcoming copy, suggested questions, and clear next action if no documents are indexed.
- Prompt input remains central to the experience.
- Messages use readable assistant/user cards.
- Retrieved sources are visible but collapsed by default.

### Context panels

Panels support the chat instead of replacing it:

- **Knowledge panel:** upload files, show indexed documents, chunks, hashes, remove document, clear collection.
- **Evaluation panel:** run evaluation questions, show score, verdict, top source, justification, and answer preview.
- **Advanced settings panel:** LumenVec URL, collection, session, dimensions, top K, context budget, health check, and technical retrieval settings.
- **AI settings modal:** providers, models, base URLs, and API keys, visually aligned with the new design.

## Main user flow

1. User opens the app and sees a welcoming chat-first home:
   - “Converse com sua base de conhecimento”.
   - Current status for LumenVec, collection, and session.
   - Suggested questions such as “Quais documentos estão indexados?” and “Resuma os arquivos enviados”.

2. User asks a question in the chat.
   - User message appears immediately.
   - Assistant response appears in a legible card.
   - Source count is clear.
   - Opening sources shows document name, chunk index, rerank score, distance, and preview.

3. If no documents are indexed:
   - Show a friendly callout prompting the user to upload files.
   - The upload action opens the Knowledge panel.

4. User manages documents in the Knowledge panel.
   - Upload supported file types.
   - See indexed documents and chunk counts.
   - Remove individual documents or clear the collection.

5. User checks answer quality in the Evaluation panel.
   - Enter one test question per line.
   - Run evaluation.
   - Review score, verdict, source, justification, and answer preview.

6. Advanced users open technical panels only when needed.
   - Basic chat remains uncluttered.
   - Technical controls remain discoverable.

## Visual style

The selected style is **Warm AI Studio**.

### Palette

- Deep graphite and midnight-blue background.
- Soft translucent cards.
- Subtle borders and shadows.
- Cyan, blue, and violet accents for AI/RAG identity.
- Soft red for errors.
- Cyan or green for success and healthy states.

### Layout and hierarchy

- First screen should feel more like a polished assistant than a technical form.
- Prompt, title, suggestions, and answers get priority.
- Technical values appear as chips, compact cards, or advanced controls.
- Panels should have clear headings, short descriptions, and obvious primary actions.

### Interaction design

- Use `framer-motion` sparingly for card and panel entrance transitions.
- Keep hover, focus, and disabled states visible and accessible.
- Loading states should be local where possible: buttons, panels, or pending chat response.
- Avoid excessive animation or decorative effects that reduce readability.

## Component structure

Refactor the frontend into focused components while preserving current behavior.

Proposed components:

- `StudioShell`: high-level layout, header, background, and panel slots.
- `ChatExperience`: chat empty state, messages, prompt input, clear chat action.
- `MessageBubble`: user/assistant message rendering and source details.
- `KnowledgePanel`: file selection, ingestion action, document list, document removal, collection clearing.
- `EvaluationPanel`: test question textarea, run action, evaluation result list.
- `AdvancedSettingsPanel`: LumenVec and retrieval configuration.
- `AiSettingsModal`: provider/model/API key configuration, restyled to match the studio.
- Shared primitives for cards, chips, buttons, callouts, and fields when at least two components use the same pattern.

Do not introduce a one-off abstraction unless it is used by multiple components.

## Data and backend contracts

Keep the existing backend endpoints and request/response shapes:

- `GET /api/config`
- `GET /api/collections`
- `GET /api/sessions`
- `GET /api/documents`
- `GET /api/chat/history`
- `POST /api/chat`
- `POST /api/ingest`
- `DELETE /api/documents`
- `POST /api/collections/clear`
- `DELETE /api/chat/history`
- `POST /api/evaluate`
- `GET /api/health`
- `GET /api/ai/providers`
- `PUT /api/ai/config`
- `GET /api/ai/models`

State can remain in local React state. Do not add Redux, Zustand, new persistence, or backend changes in this phase.

## Error and empty states

Use contextual UI instead of generic alerts where possible.

- Global notices/errors can remain available but should appear as polished callouts.
- Empty chat: show welcoming message and suggested questions.
- Empty document list: explain that uploaded files become searchable context.
- Empty evaluation: show example test questions and the purpose of evaluation.
- Failed API calls: show concise, readable messages and keep the user in context.

## Testing and verification

Minimum verification:

- Run `npm run build` in `frontend` to validate TypeScript and Vite build.
- If the app is running, manually verify:
  - empty chat state;
  - chat message flow;
  - source details display;
  - Knowledge panel upload/document list actions;
  - Evaluation panel input/results;
  - Advanced settings panel;
  - AI settings modal;
  - responsive behavior on narrower widths.

## Out of scope

This phase does not include:

- Backend endpoint changes.
- Authentication or authorization.
- New frontend persistence.
- New state management libraries.
- Replacing Tailwind or the existing Vite/React setup.
- Large onboarding wizard.
- Changes to LumenVec server behavior.
