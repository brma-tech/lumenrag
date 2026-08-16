# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing RAG LumenVec frontend into a polished Warm AI Studio experience with chat-first layout, contextual panels, and advanced controls that do not dominate the main screen.

**Architecture:** Keep the current backend API contracts and React local state, but split the large `frontend/src/App.tsx` into focused components. Build a new `StudioShell` around the existing workflows, then move chat, knowledge, evaluation, advanced settings, and AI settings into dedicated files.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, lucide-react, framer-motion, Radix Dialog/Tooltip, optional Vitest + React Testing Library for component regression tests.

---

## File structure

Create focused files under `frontend/src`:

- `frontend/src/types.ts`: shared TypeScript interfaces currently defined in `App.tsx`.
- `frontend/src/api.ts`: `defaultConfig` and the generic `api<T>()` helper.
- `frontend/src/components/studio/primitives.tsx`: shared presentational primitives: `cn`, `Button`, `IconButton`, `Card`, `Callout`, `Chip`, `Field`, `SectionHeading`.
- `frontend/src/components/studio/StudioShell.tsx`: high-level studio layout, header, panel switcher, responsive structure.
- `frontend/src/components/studio/ChatExperience.tsx`: chat empty state, messages, prompt, clear action.
- `frontend/src/components/studio/MessageBubble.tsx`: user/assistant message rendering and source details.
- `frontend/src/components/studio/KnowledgePanel.tsx`: upload, document list, remove document, clear collection.
- `frontend/src/components/studio/EvaluationPanel.tsx`: evaluation input and result cards.
- `frontend/src/components/studio/AdvancedSettingsPanel.tsx`: LumenVec/retrieval config controls and health action.
- `frontend/src/components/studio/AiSettingsModal.tsx`: AI provider/model/API key modal.
- `frontend/src/App.tsx`: orchestrates state, API calls, handlers, and composes the new components.
- `frontend/src/index.css`: update global theme tokens and utility component classes.

Optional testing setup:

- `frontend/vitest.config.ts`: Vitest + jsdom config.
- `frontend/src/test/setup.ts`: jest-dom setup.
- `frontend/src/components/studio/*.test.tsx`: component tests.

---

### Task 1: Add shared types and API helper

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create shared types**

Create `frontend/src/types.ts` with this content:

```ts
export type Tab = "chat" | "ingest" | "eval";
export type StudioPanel = "knowledge" | "evaluation" | "advanced" | null;

export interface Config {
  base_url: string;
  collection: string;
  session_id: string;
  chat_provider: string;
  embedding_provider: string;
  embed_model: string;
  chat_model: string;
  dimensions: number;
  top_k: number;
  context_budget_chars: number;
}

export interface Source {
  source: number;
  document_name: string;
  chunk_index: number;
  rerank_score: number;
  distance: number;
  preview: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export interface DocumentSummary {
  document_name: string;
  source_path: string;
  chunks_indexed: number;
  chunk_count: number;
  document_hash: string;
}

export interface EvalRow {
  question: string;
  sources: number;
  top_source: string;
  score: number;
  verdict: string;
  justification: string;
  answer_preview: string;
}

export interface AIProvider {
  id: string;
  name: string;
  base_url: string;
  api_key_env: string;
  supports_chat: boolean;
  supports_embeddings: boolean;
  default_chat_model: string;
  default_embedding_model: string;
}

export interface AIProviderRuntimeConfig {
  base_url: string;
  has_api_key?: boolean;
  api_key_masked?: string;
}

export interface AIConfig {
  chat_provider: string;
  embedding_provider: string;
  chat_model: string;
  embed_model: string;
  providers: Record<string, AIProviderRuntimeConfig>;
}

export interface AIModel {
  id: string;
  owned_by?: string;
}
```

- [ ] **Step 2: Create API helper**

Create `frontend/src/api.ts` with this content:

```ts
import type { Config } from "./types";

export const defaultConfig: Config = {
  base_url: "http://localhost:19190",
  collection: "default",
  session_id: "default",
  chat_provider: "openai",
  embedding_provider: "openai",
  embed_model: "text-embedding-3-small",
  chat_model: "gpt-4.1-mini",
  dimensions: 256,
  top_k: 5,
  context_budget_chars: 6000,
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(payload.detail || response.statusText);
  }
  return response.json() as Promise<T>;
}
```

- [ ] **Step 3: Update `App.tsx` imports and remove duplicated declarations**

At the top of `frontend/src/App.tsx`, replace local type declarations and helper declarations with:

```ts
import React from "react";
import type {
  AIConfig,
  AIModel,
  AIProvider,
  AIProviderRuntimeConfig,
  Config,
  DocumentSummary,
  EvalRow,
  Message,
  StudioPanel,
} from "./types";
import { api, defaultConfig } from "./api";
```

Remove these from `App.tsx` because they now live in `types.ts` and `api.ts`:

```ts
type Tab = "chat" | "ingest" | "eval";
interface Config { /* existing body */ }
interface Source { /* existing body */ }
interface Message { /* existing body */ }
interface DocumentSummary { /* existing body */ }
interface EvalRow { /* existing body */ }
interface AIProvider { /* existing body */ }
interface AIProviderRuntimeConfig { /* existing body */ }
interface AIConfig { /* existing body */ }
interface AIModel { /* existing body */ }
const defaultConfig: Config = { /* existing body */ };
async function api<T>(path: string, init?: RequestInit): Promise<T> { /* existing body */ }
```

Do not change runtime behavior in this step.

- [ ] **Step 4: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 5: Commit if commits are authorized**

```bash
git add frontend/src/types.ts frontend/src/api.ts frontend/src/App.tsx
git commit -m "refactor: extract frontend types and API helper"
```

---

### Task 2: Add studio primitives and theme classes

**Files:**
- Create: `frontend/src/components/studio/primitives.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Create primitive components**

Create `frontend/src/components/studio/primitives.tsx` with this content:

```tsx
import React from "react";

export const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(" ");

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary: "border-cyan-300/70 bg-cyan-200 text-slate-950 hover:bg-cyan-100",
    secondary: "border-white/10 bg-white/[0.06] text-slate-100 hover:border-cyan-300/40 hover:bg-white/[0.09]",
    ghost: "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white",
    danger: "border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/15",
  };

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-300 transition hover:border-cyan-300/40 hover:bg-white/[0.09] hover:text-white disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20 backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}

export function Callout({
  className,
  tone = "info",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "info" | "success" | "error" }) {
  const tones = {
    info: "border-cyan-300/25 bg-cyan-300/10 text-cyan-50",
    success: "border-emerald-300/25 bg-emerald-300/10 text-emerald-50",
    error: "border-red-300/30 bg-red-400/10 text-red-50",
  };

  return <div className={cn("rounded-2xl border px-4 py-3 text-sm", tones[tone], className)} {...props} />;
}

export function Chip({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-300",
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-400">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">{eyebrow}</div>}
      <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Update global CSS theme**

Replace `frontend/src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: #070a12;
  color: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(34, 211, 238, 0.16), transparent 32rem),
    radial-gradient(circle at top right, rgba(168, 85, 247, 0.14), transparent 34rem),
    linear-gradient(135deg, #070a12 0%, #0f172a 48%, #09090f 100%);
}

button,
input,
textarea,
select {
  font: inherit;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.28);
  border-radius: 999px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.45);
}

@layer components {
  .input {
    @apply w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-slate-950/80;
  }

  .primary-btn {
    @apply inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/70 bg-cyan-200 px-3 py-2 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-cyan-100 disabled:pointer-events-none disabled:opacity-50;
  }

  .secondary-btn {
    @apply inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/[0.09] disabled:pointer-events-none disabled:opacity-50;
  }

  .icon-btn {
    @apply inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-300 transition hover:border-cyan-300/40 hover:bg-white/[0.09] hover:text-white disabled:pointer-events-none disabled:opacity-50;
  }
}
```

- [ ] **Step 3: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit if commits are authorized**

```bash
git add frontend/src/components/studio/primitives.tsx frontend/src/index.css
git commit -m "style: add warm studio primitives"
```

---

### Task 3: Extract chat message rendering

**Files:**
- Create: `frontend/src/components/studio/MessageBubble.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `MessageBubble` component**

Create `frontend/src/components/studio/MessageBubble.tsx` with this content:

```tsx
import { Bot, FileText, User } from "lucide-react";
import type { Message } from "../../types";
import { Card, Chip } from "./primitives";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[88%] gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div
          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${
            isUser
              ? "border-cyan-200/50 bg-cyan-200 text-slate-950"
              : "border-violet-300/30 bg-violet-300/10 text-violet-100"
          }`}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>

        <Card
          className={`px-4 py-3 ${
            isUser
              ? "border-cyan-300/25 bg-cyan-300/10"
              : "border-white/10 bg-slate-950/45"
          }`}
        >
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{message.content}</div>

          {!!message.sources?.length && (
            <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-200" />
                  Fontes recuperadas
                </span>
                <Chip>{message.sources.length} fonte(s)</Chip>
              </summary>
              <div className="mt-3 space-y-3">
                {message.sources.map((source) => (
                  <div key={`${source.document_name}-${source.chunk_index}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-slate-300">
                    <div className="font-medium text-white">
                      [Fonte {source.source}] {source.document_name} · chunk {source.chunk_index}
                    </div>
                    <div className="mt-1 text-slate-500">
                      score={source.rerank_score.toFixed(4)} · distance={source.distance.toFixed(4)}
                    </div>
                    <div className="mt-2 text-slate-300">{source.preview}...</div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Import component in `App.tsx`**

Add:

```ts
import { MessageBubble } from "./components/studio/MessageBubble";
```

Remove the old inline `MessageBubble` function from `App.tsx`.

- [ ] **Step 3: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds and `MessageBubble` is imported successfully.

- [ ] **Step 4: Commit if commits are authorized**

```bash
git add frontend/src/components/studio/MessageBubble.tsx frontend/src/App.tsx
git commit -m "refactor: extract chat message bubble"
```

---

### Task 4: Extract chat experience

**Files:**
- Create: `frontend/src/components/studio/ChatExperience.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `ChatExperience` component**

Create `frontend/src/components/studio/ChatExperience.tsx` with this content:

```tsx
import { Sparkles, Trash2, Upload } from "lucide-react";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import type { Message } from "../../types";
import { Button, Callout, Card, Chip } from "./primitives";
import { MessageBubble } from "./MessageBubble";

const suggestions = [
  "Quais documentos estão indexados?",
  "Resuma os arquivos enviados.",
  "Quais são os pontos mais importantes da base?",
];

export function ChatExperience({
  messages,
  documentsCount,
  loading,
  onSend,
  onClear,
  onOpenKnowledge,
}: {
  messages: Message[];
  documentsCount: number;
  loading: boolean;
  onSend: (message: string, files?: File[]) => void;
  onClear: () => void;
  onOpenKnowledge: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 py-5 lg:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip>
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
              Chat com RAG
            </Chip>
            <Chip>{documentsCount} documento(s)</Chip>
          </div>
          <Button variant="ghost" onClick={onClear} disabled={loading || !messages.length}>
            <Trash2 className="h-4 w-4" />
            Limpar
          </Button>
        </div>

        {documentsCount === 0 && (
          <Callout className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span>Envie arquivos para começar a conversar com a sua base de conhecimento.</span>
            <Button variant="secondary" onClick={onOpenKnowledge}>
              <Upload className="h-4 w-4" />
              Enviar arquivos
            </Button>
          </Callout>
        )}

        <div className="flex-1 overflow-y-auto pb-6">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[52vh] items-center justify-center text-center">
              <div className="max-w-2xl">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-cyan-200/25 bg-cyan-200/10 text-cyan-100 shadow-2xl shadow-cyan-950/30">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  Converse com sua base de conhecimento
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 md:text-base">
                  Faça perguntas aos documentos indexados, confira as fontes recuperadas e ajuste o RAG quando precisar.
                </p>
                <div className="mt-7 grid gap-2 md:grid-cols-3">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-left text-sm text-slate-300 transition hover:border-cyan-300/40 hover:bg-white/[0.08] hover:text-white"
                      onClick={() => onSend(suggestion)}
                      disabled={loading}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message, index) => (
                <MessageBubble key={`${message.role}-${index}`} message={message} />
              ))}
              {loading && (
                <Card className="w-fit px-4 py-3 text-sm text-slate-300">
                  Recuperando contexto e gerando resposta...
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-[#070a12] via-[#070a12]/95 to-transparent pb-4 pt-6">
          <PromptInputBox onSend={onSend} isLoading={loading} className="border-cyan-300/20 bg-slate-950/80" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace old chat view usage in `App.tsx`**

Import:

```ts
import { ChatExperience } from "./components/studio/ChatExperience";
```

Replace the current chat render:

```tsx
{tab === "chat" && (
  <ChatView
    messages={messages}
    loading={loading}
    onSend={sendMessage}
    onClear={clearChat}
  />
)}
```

with:

```tsx
<ChatExperience
  messages={messages}
  documentsCount={documents.length}
  loading={loading}
  onSend={sendMessage}
  onClear={clearChat}
  onOpenKnowledge={() => setActivePanel("knowledge")}
/>
```

Add state near the existing `tab` state:

```ts
const [activePanel, setActivePanel] = React.useState<StudioPanel>(null);
```

Remove the old inline `ChatView` function from `App.tsx`.

- [ ] **Step 3: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds. If TypeScript reports `StudioPanel` unused, keep it only if `activePanel` is typed with it.

- [ ] **Step 4: Commit if commits are authorized**

```bash
git add frontend/src/components/studio/ChatExperience.tsx frontend/src/App.tsx
git commit -m "feat: add chat-first studio experience"
```

---

### Task 5: Extract Knowledge panel

**Files:**
- Create: `frontend/src/components/studio/KnowledgePanel.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `KnowledgePanel`**

Create `frontend/src/components/studio/KnowledgePanel.tsx` with this content:

```tsx
import { FileText, Send, Trash2, Upload } from "lucide-react";
import type { DocumentSummary } from "../../types";
import { Button, Card, SectionHeading } from "./primitives";

export function KnowledgePanel({
  documents,
  loading,
  selectedFiles,
  onSelectFiles,
  onIngest,
  onDelete,
  onClear,
}: {
  documents: DocumentSummary[];
  loading: boolean;
  selectedFiles: FileList | null;
  onSelectFiles: (files: FileList | null) => void;
  onIngest: () => void;
  onDelete: (documentName: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Base de conhecimento"
        title="Documentos do RAG"
        description="Envie arquivos para criar contexto recuperável pelo LumenVec."
      />

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
          <Upload className="h-4 w-4 text-cyan-200" />
          Enviar arquivos
        </div>
        <input
          type="file"
          multiple
          accept=".txt,.md,.py,.js,.ts,.tsx,.go,.java,.json,.yaml,.yml,.html,.css,.csv,.pdf,.docx"
          onChange={(event) => onSelectFiles(event.currentTarget.files)}
          className="block w-full rounded-2xl border border-dashed border-white/15 bg-slate-950/60 p-4 text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">{selectedFiles?.length || 0} arquivo(s) selecionados</div>
          <Button onClick={onIngest} disabled={loading || !selectedFiles?.length}>
            <Send className="h-4 w-4" />
            Indexar
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <FileText className="h-4 w-4 text-cyan-200" />
            Documentos indexados
          </div>
          <Button variant="danger" onClick={onClear} disabled={loading || !documents.length}>
            <Trash2 className="h-4 w-4" />
            Limpar
          </Button>
        </div>

        <div className="divide-y divide-white/10">
          {documents.length === 0 ? (
            <div className="p-4 text-sm leading-6 text-slate-400">
              Nenhum documento indexado nesta collection. Após enviar arquivos, eles aparecerão aqui com contagem de chunks.
            </div>
          ) : (
            documents.map((document) => (
              <div key={document.document_name} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="font-medium text-white">{document.document_name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {document.chunks_indexed}/{document.chunk_count} chunks · hash {document.document_hash}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => onDelete(document.document_name)} disabled={loading}>
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Import and remove old inline ingest view**

In `frontend/src/App.tsx`, import:

```ts
import { KnowledgePanel } from "./components/studio/KnowledgePanel";
```

Remove the old inline `IngestView` function. Do not render it directly in the main area after the shell is added in Task 8.

- [ ] **Step 3: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit if commits are authorized**

```bash
git add frontend/src/components/studio/KnowledgePanel.tsx frontend/src/App.tsx
git commit -m "refactor: extract knowledge panel"
```

---

### Task 6: Extract Evaluation panel

**Files:**
- Create: `frontend/src/components/studio/EvaluationPanel.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `EvaluationPanel`**

Create `frontend/src/components/studio/EvaluationPanel.tsx` with this content:

```tsx
import { Activity, CheckCircle2 } from "lucide-react";
import type { EvalRow } from "../../types";
import { Button, Card, Chip, Field, SectionHeading } from "./primitives";

export function EvaluationPanel({
  evalText,
  evalRows,
  loading,
  onChangeText,
  onRun,
}: {
  evalText: string;
  evalRows: EvalRow[];
  loading: boolean;
  onChangeText: (value: string) => void;
  onRun: () => void;
}) {
  const average = evalRows.length
    ? evalRows.reduce((sum, row) => sum + row.score, 0) / evalRows.length
    : null;

  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Avaliação"
        title="Qualidade das respostas"
        description="Teste perguntas recorrentes para verificar recuperação, fontes e coerência."
      />

      <Card className="p-4">
        <Field label="Perguntas de teste, uma por linha">
          <textarea className="input min-h-40 resize-y" value={evalText} onChange={(e) => onChangeText(e.target.value)} />
        </Field>
        <Button className="mt-3" onClick={onRun} disabled={loading}>
          <Activity className="h-4 w-4" />
          Executar avaliação
        </Button>
      </Card>

      {average !== null && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs text-slate-500">Score médio</div>
            <div className="mt-1 text-2xl font-semibold text-white">{average.toFixed(2)}/5</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500">Perguntas</div>
            <div className="mt-1 text-2xl font-semibold text-white">{evalRows.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500">Boas respostas</div>
            <div className="mt-1 text-2xl font-semibold text-white">
              {evalRows.filter((row) => row.score >= 4).length}
            </div>
          </Card>
        </div>
      )}

      {evalRows.length === 0 ? (
        <Card className="p-4 text-sm leading-6 text-slate-400">
          Use perguntas como “Qual o assunto principal dos arquivos?” para medir se a base está recuperando boas fontes.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {evalRows.map((row) => (
            <details key={row.question} className="border-b border-white/10 p-4 last:border-b-0">
              <summary className="grid cursor-pointer gap-3 text-sm text-white md:grid-cols-[1fr_auto_auto] md:items-center">
                <span>{row.question}</span>
                <Chip>{row.score}/5</Chip>
                <Chip>
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-200" />
                  {row.verdict}
                </Chip>
              </summary>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                <div>Fonte principal: {row.top_source || "sem fonte"}</div>
                <div>{row.justification}</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-slate-300">{row.answer_preview}</div>
              </div>
            </details>
          ))}
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Import and remove old inline eval view**

In `frontend/src/App.tsx`, import:

```ts
import { EvaluationPanel } from "./components/studio/EvaluationPanel";
```

Remove the old inline `EvalView` function. Do not render it directly in the main area after Task 8.

- [ ] **Step 3: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit if commits are authorized**

```bash
git add frontend/src/components/studio/EvaluationPanel.tsx frontend/src/App.tsx
git commit -m "refactor: extract evaluation panel"
```

---

### Task 7: Extract Advanced settings panel

**Files:**
- Create: `frontend/src/components/studio/AdvancedSettingsPanel.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `AdvancedSettingsPanel`**

Create `frontend/src/components/studio/AdvancedSettingsPanel.tsx` with this content:

```tsx
import { Activity, RefreshCw, Settings2 } from "lucide-react";
import type { Config } from "../../types";
import { Button, Card, Field, IconButton, SectionHeading } from "./primitives";

export function AdvancedSettingsPanel({
  config,
  collections,
  sessions,
  health,
  loading,
  onChangeConfig,
  onRefreshMeta,
  onCheckHealth,
  onOpenAiSettings,
}: {
  config: Config;
  collections: string[];
  sessions: string[];
  health: string;
  loading: boolean;
  onChangeConfig: React.Dispatch<React.SetStateAction<Config>>;
  onRefreshMeta: () => void;
  onCheckHealth: () => void;
  onOpenAiSettings: () => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Avançado"
        title="Configuração técnica"
        description="Ajuste conexão, collection, sessão e parâmetros de recuperação quando precisar."
      />

      <Card className="space-y-4 p-4">
        <Field label="LumenVec URL">
          <input className="input" value={config.base_url} onChange={(e) => onChangeConfig({ ...config, base_url: e.target.value })} />
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="Collection">
            <input list="collections" className="input" value={config.collection} onChange={(e) => onChangeConfig({ ...config, collection: e.target.value })} />
            <datalist id="collections">
              {collections.map((collection) => <option key={collection} value={collection} />)}
            </datalist>
          </Field>
          <IconButton className="mt-6" onClick={onRefreshMeta} disabled={loading} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </IconButton>
        </div>

        <Field label="Sessão">
          <input list="sessions" className="input" value={config.session_id} onChange={(e) => onChangeConfig({ ...config, session_id: e.target.value })} />
          <datalist id="sessions">
            {sessions.map((session) => <option key={session} value={session} />)}
          </datalist>
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Dim">
            <input className="input" type="number" value={config.dimensions} onChange={(e) => onChangeConfig({ ...config, dimensions: Number(e.target.value) })} />
          </Field>
          <Field label="Top K">
            <input className="input" type="number" min={1} max={20} value={config.top_k} onChange={(e) => onChangeConfig({ ...config, top_k: Number(e.target.value) })} />
          </Field>
          <Field label="Budget">
            <input className="input" type="number" value={config.context_budget_chars} onChange={(e) => onChangeConfig({ ...config, context_budget_chars: Number(e.target.value) })} />
          </Field>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Button onClick={onCheckHealth} disabled={loading}>
            <Activity className="h-4 w-4" />
            Health: {health}
          </Button>
          <Button variant="secondary" onClick={onOpenAiSettings}>
            <Settings2 className="h-4 w-4" />
            IA e modelos
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Import in `App.tsx`**

Add:

```ts
import { AdvancedSettingsPanel } from "./components/studio/AdvancedSettingsPanel";
```

Do not remove the old sidebar until Task 8 replaces the app shell.

- [ ] **Step 3: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit if commits are authorized**

```bash
git add frontend/src/components/studio/AdvancedSettingsPanel.tsx frontend/src/App.tsx
git commit -m "refactor: extract advanced settings panel"
```

---

### Task 8: Add StudioShell and replace tab/sidebar layout

**Files:**
- Create: `frontend/src/components/studio/StudioShell.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `StudioShell`**

Create `frontend/src/components/studio/StudioShell.tsx` with this content:

```tsx
import { Activity, BookOpen, ClipboardCheck, Database, PanelRight, Settings2, X } from "lucide-react";
import type { StudioPanel } from "../../types";
import { Button, Card, Chip, IconButton } from "./primitives";

export function StudioShell({
  collection,
  sessionId,
  health,
  activePanel,
  onChangePanel,
  onOpenAiSettings,
  panelContent,
  children,
}: {
  collection: string;
  sessionId: string;
  health: string;
  activePanel: StudioPanel;
  onChangePanel: (panel: StudioPanel) => void;
  onOpenAiSettings: () => void;
  panelContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.14),transparent_28rem),radial-gradient(circle_at_82%_12%,rgba(168,85,247,0.14),transparent_30rem)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 backdrop-blur-xl lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-200/10 text-cyan-100 shadow-2xl shadow-cyan-950/30">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-white">RAG LumenVec Studio</div>
              <div className="text-xs text-slate-500">Chat acolhedor com profundidade técnica</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip>
              <Activity className="h-3.5 w-3.5 text-cyan-200" />
              {health}
            </Chip>
            <Chip>{collection}</Chip>
            <Chip>{sessionId}</Chip>
            <IconButton onClick={onOpenAiSettings} aria-label="Configurar IA">
              <Settings2 className="h-4 w-4" />
            </IconButton>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav className="hidden w-20 border-r border-white/10 px-3 py-5 lg:block">
            <div className="space-y-2">
              <PanelButton active={activePanel === "knowledge"} label="Base" onClick={() => onChangePanel(activePanel === "knowledge" ? null : "knowledge")}>
                <BookOpen className="h-5 w-5" />
              </PanelButton>
              <PanelButton active={activePanel === "evaluation"} label="Avaliar" onClick={() => onChangePanel(activePanel === "evaluation" ? null : "evaluation")}>
                <ClipboardCheck className="h-5 w-5" />
              </PanelButton>
              <PanelButton active={activePanel === "advanced"} label="Avançado" onClick={() => onChangePanel(activePanel === "advanced" ? null : "advanced")}>
                <PanelRight className="h-5 w-5" />
              </PanelButton>
            </div>
          </nav>

          <section className="flex min-w-0 flex-1 flex-col">{children}</section>

          {activePanel && (
            <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-xl border-l border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:static lg:z-auto lg:w-[430px] lg:bg-white/[0.035]">
              <div className="mb-4 flex justify-end lg:hidden">
                <IconButton onClick={() => onChangePanel(null)} aria-label="Fechar painel">
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">{panelContent}</div>
            </aside>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-3 lg:hidden">
          <Button variant={activePanel === "knowledge" ? "primary" : "secondary"} onClick={() => onChangePanel(activePanel === "knowledge" ? null : "knowledge")}>Base</Button>
          <Button variant={activePanel === "evaluation" ? "primary" : "secondary"} onClick={() => onChangePanel(activePanel === "evaluation" ? null : "evaluation")}>Avaliar</Button>
          <Button variant={activePanel === "advanced" ? "primary" : "secondary"} onClick={() => onChangePanel(activePanel === "advanced" ? null : "advanced")}>Avançado</Button>
        </div>
      </div>
    </main>
  );
}

function PanelButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`group flex w-full flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-[11px] transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
          : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-200"
      }`}
      onClick={onClick}
    >
      {children}
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Compose shell in `App.tsx`**

Import:

```ts
import { StudioShell } from "./components/studio/StudioShell";
```

Replace the existing returned `<main>...</main>` structure with this shape, preserving the existing `isAiModalOpen` modal block after the shell:

```tsx
const panelContent =
  activePanel === "knowledge" ? (
    <KnowledgePanel
      documents={documents}
      loading={loading}
      selectedFiles={selectedFiles}
      onSelectFiles={setSelectedFiles}
      onIngest={ingestFiles}
      onDelete={deleteDocument}
      onClear={clearCollection}
    />
  ) : activePanel === "evaluation" ? (
    <EvaluationPanel
      evalText={evalText}
      evalRows={evalRows}
      loading={loading}
      onChangeText={setEvalText}
      onRun={runEvaluation}
    />
  ) : activePanel === "advanced" ? (
    <AdvancedSettingsPanel
      config={config}
      collections={collections}
      sessions={sessions}
      health={health}
      loading={loading}
      onChangeConfig={setConfig}
      onRefreshMeta={() => refreshMeta()}
      onCheckHealth={checkHealth}
      onOpenAiSettings={() => setIsAiModalOpen(true)}
    />
  ) : null;

return (
  <>
    <StudioShell
      collection={config.collection}
      sessionId={config.session_id}
      health={health}
      activePanel={activePanel}
      onChangePanel={setActivePanel}
      onOpenAiSettings={() => setIsAiModalOpen(true)}
      panelContent={panelContent}
    >
      {(notice || error) && (
        <div className="mx-4 mt-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-100 lg:mx-6">
          {error || notice}
        </div>
      )}
      <ChatExperience
        messages={messages}
        documentsCount={documents.length}
        loading={loading}
        onSend={sendMessage}
        onClear={clearChat}
        onOpenKnowledge={() => setActivePanel("knowledge")}
      />
    </StudioShell>

    {isAiModalOpen && (
      <AiSettingsModal
        config={config}
        providers={aiProviders}
        providerConfig={aiProviderConfig}
        apiKeyDrafts={apiKeyDrafts}
        chatModels={chatModels}
        embeddingModels={embeddingModels}
        loading={loading}
        onClose={() => setIsAiModalOpen(false)}
        onChangeConfig={setConfig}
        onLoadModels={loadModels}
        onSave={saveAiSettings}
        onChangeBaseUrl={(providerId, baseUrl) =>
          setAiProviderConfig((current) => ({
            ...current,
            [providerId]: { ...current[providerId], base_url: baseUrl },
          }))
        }
        onChangeApiKey={(providerId, apiKey) =>
          setApiKeyDrafts((current) => ({ ...current, [providerId]: apiKey }))
        }
      />
    )}
  </>
);
```

Remove the old `tab` state and old tab rendering. Keep all API handlers unchanged.

- [ ] **Step 3: Remove unused imports from `App.tsx`**

After replacing the shell, remove imports no longer used by `App.tsx`, especially lucide icons only used by removed inline views.

- [ ] **Step 4: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds. Fix only unused imports or missing imports introduced by this task.

- [ ] **Step 5: Commit if commits are authorized**

```bash
git add frontend/src/components/studio/StudioShell.tsx frontend/src/App.tsx
git commit -m "feat: introduce command-center studio shell"
```

---

### Task 9: Extract and restyle AI settings modal

**Files:**
- Create: `frontend/src/components/studio/AiSettingsModal.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `AiSettingsModal`**

Create `frontend/src/components/studio/AiSettingsModal.tsx` by moving the existing `AiSettingsModal` and `ProviderSettings` logic from `App.tsx`, then update its imports and wrappers to use studio primitives.

Use this component signature exactly:

```tsx
import React from "react";
import { RefreshCw, X } from "lucide-react";
import type { AIModel, AIProvider, AIProviderRuntimeConfig, Config } from "../../types";
import { Button, Card, Field, IconButton, SectionHeading } from "./primitives";

export function AiSettingsModal({
  config,
  providers,
  providerConfig,
  apiKeyDrafts,
  chatModels,
  embeddingModels,
  loading,
  onClose,
  onChangeConfig,
  onLoadModels,
  onSave,
  onChangeBaseUrl,
  onChangeApiKey,
}: {
  config: Config;
  providers: AIProvider[];
  providerConfig: Record<string, AIProviderRuntimeConfig>;
  apiKeyDrafts: Record<string, string>;
  chatModels: AIModel[];
  embeddingModels: AIModel[];
  loading: boolean;
  onClose: () => void;
  onChangeConfig: React.Dispatch<React.SetStateAction<Config>>;
  onLoadModels: (providerId: string, purpose: "chat" | "embeddings") => void;
  onSave: () => void;
  onChangeBaseUrl: (providerId: string, baseUrl: string) => void;
  onChangeApiKey: (providerId: string, apiKey: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl">
      <Card className="max-h-[90vh] w-full max-w-4xl overflow-hidden bg-slate-950/95">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <SectionHeading eyebrow="IA" title="Configuração da IA" description="Providers, modelos, endpoints e API keys." />
          <IconButton onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="max-h-[calc(90vh-130px)] space-y-4 overflow-y-auto p-5">
          <section className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/70">Chat</div>
              <Field label="Provider">
                <select className="input" value={config.chat_provider} onChange={(e) => onChangeConfig((current) => ({ ...current, chat_provider: e.target.value }))}>
                  {providers.filter((provider) => provider.supports_chat).map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Modelo">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input className="input" list="chat-models" value={config.chat_model} onChange={(e) => onChangeConfig((current) => ({ ...current, chat_model: e.target.value }))} />
                  <Button variant="secondary" className="px-2" onClick={() => onLoadModels(config.chat_provider, "chat")} disabled={loading}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <datalist id="chat-models">
                  {chatModels.map((model) => <option key={model.id} value={model.id} />)}
                </datalist>
              </Field>
            </Card>

            <Card className="space-y-3 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200/70">Embeddings</div>
              <Field label="Provider">
                <select className="input" value={config.embedding_provider} onChange={(e) => onChangeConfig((current) => ({ ...current, embedding_provider: e.target.value }))}>
                  {providers.filter((provider) => provider.supports_embeddings).map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Modelo">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input className="input" list="embedding-models" value={config.embed_model} onChange={(e) => onChangeConfig((current) => ({ ...current, embed_model: e.target.value }))} />
                  <Button variant="secondary" className="px-2" onClick={() => onLoadModels(config.embedding_provider, "embeddings")} disabled={loading}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <datalist id="embedding-models">
                  {embeddingModels.map((model) => <option key={model.id} value={model.id} />)}
                </datalist>
              </Field>
            </Card>
          </section>

          <ProviderSettings
            providers={providers}
            providerConfig={providerConfig}
            apiKeyDrafts={apiKeyDrafts}
            onChangeBaseUrl={onChangeBaseUrl}
            onChangeApiKey={onChangeApiKey}
            defaultOpen
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={loading}>Salvar IA</Button>
        </div>
      </Card>
    </div>
  );
}

function ProviderSettings({
  providers,
  providerConfig,
  apiKeyDrafts,
  onChangeBaseUrl,
  onChangeApiKey,
  defaultOpen = false,
}: {
  providers: AIProvider[];
  providerConfig: Record<string, AIProviderRuntimeConfig>;
  apiKeyDrafts: Record<string, string>;
  onChangeBaseUrl: (providerId: string, baseUrl: string) => void;
  onChangeApiKey: (providerId: string, apiKey: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-300" onClick={() => setOpen((current) => !current)}>
        <span>Credenciais e endpoints</span>
        <span className="text-xs text-slate-500">{open ? "ocultar" : "editar"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/10 p-4">
          {providers.map((provider) => {
            const runtime = providerConfig[provider.id] || { base_url: provider.base_url };
            return (
              <div key={provider.id} className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-100">{provider.name}</span>
                  <span className="text-slate-500">{runtime.has_api_key ? runtime.api_key_masked || "key salva" : provider.api_key_env}</span>
                </div>
                <input className="input" value={runtime.base_url || provider.base_url} onChange={(e) => onChangeBaseUrl(provider.id, e.target.value)} placeholder="Base URL" />
                <input className="input" type="password" value={apiKeyDrafts[provider.id] || ""} onChange={(e) => onChangeApiKey(provider.id, e.target.value)} placeholder={runtime.has_api_key ? "Nova API key opcional" : "API key"} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Import and remove old modal code**

In `App.tsx`, import:

```ts
import { AiSettingsModal } from "./components/studio/AiSettingsModal";
```

Remove the old inline `AiSettingsModal` and `ProviderSettings` functions from `App.tsx`.

- [ ] **Step 3: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit if commits are authorized**

```bash
git add frontend/src/components/studio/AiSettingsModal.tsx frontend/src/App.tsx
git commit -m "refactor: extract AI settings modal"
```

---

### Task 10: Clean final `App.tsx` and verify UX

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/ui/ai-prompt-box.tsx` only if the prompt clashes visually with the new shell

- [ ] **Step 1: Remove obsolete code from `App.tsx`**

Ensure `App.tsx` contains only:

- imports;
- state declarations;
- API loading/mutation handlers;
- `panelContent` selection;
- final JSX composition with `StudioShell`, `ChatExperience`, and `AiSettingsModal`.

Remove obsolete functions if still present:

```ts
Field
TabButton
ChatView
MessageBubble
IngestView
EvalView
AiSettingsModal
ProviderSettings
```

- [ ] **Step 2: Ensure all user-facing Portuguese labels are accented**

Update labels in touched components to use Portuguese accents consistently:

```txt
Ingestão -> Base de conhecimento
Avaliação
Configuração da IA
Sessão
Histórico
Conexão
```

- [ ] **Step 3: Run build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Run local visual check**

Run:

```bash
cd frontend && npm run dev
```

Open the dev server URL printed by Vite and verify:

- Empty chat shows the Warm AI Studio landing state.
- Suggested questions send messages.
- “Enviar arquivos” opens the Knowledge panel.
- Base, Avaliar, and Avançado panel controls open and close.
- AI settings modal opens from header and Advanced panel.
- No horizontal overflow on a narrow viewport.

Stop the dev server after checking.

- [ ] **Step 5: Commit if commits are authorized**

```bash
git add frontend/src/App.tsx frontend/src/components/ui/ai-prompt-box.tsx frontend/src/components/studio frontend/src/index.css
git commit -m "chore: polish studio frontend integration"
```

---

### Task 11: Optional component tests

Use this task if the project owner approves adding test dependencies. Skip the task if dependency changes are not desired.

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/components/studio/ChatExperience.test.tsx`
- Create: `frontend/src/components/studio/KnowledgePanel.test.tsx`

- [ ] **Step 1: Install test dependencies if approved**

Run:

```bash
cd frontend && npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: package files update successfully.

- [ ] **Step 2: Add test script**

In `frontend/package.json`, update scripts to include:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Add Vitest config**

Create `frontend/vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
```

- [ ] **Step 4: Add test setup**

Create `frontend/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Add ChatExperience test**

Create `frontend/src/components/studio/ChatExperience.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatExperience } from "./ChatExperience";

vi.mock("@/components/ui/ai-prompt-box", () => ({
  PromptInputBox: ({ onSend }: { onSend: (message: string) => void }) => (
    <button type="button" onClick={() => onSend("Mensagem de teste")}>Enviar mock</button>
  ),
}));

describe("ChatExperience", () => {
  it("shows warm empty state and sends suggested question", async () => {
    const onSend = vi.fn();

    render(
      <ChatExperience
        messages={[]}
        documentsCount={1}
        loading={false}
        onSend={onSend}
        onClear={vi.fn()}
        onOpenKnowledge={vi.fn()}
      />
    );

    expect(screen.getByText("Converse com sua base de conhecimento")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Quais documentos estão indexados?"));

    expect(onSend).toHaveBeenCalledWith("Quais documentos estão indexados?");
  });

  it("opens knowledge panel when there are no documents", async () => {
    const onOpenKnowledge = vi.fn();

    render(
      <ChatExperience
        messages={[]}
        documentsCount={0}
        loading={false}
        onSend={vi.fn()}
        onClear={vi.fn()}
        onOpenKnowledge={onOpenKnowledge}
      />
    );

    await userEvent.click(screen.getByText("Enviar arquivos"));

    expect(onOpenKnowledge).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Add KnowledgePanel test**

Create `frontend/src/components/studio/KnowledgePanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KnowledgePanel } from "./KnowledgePanel";

const documents = [
  {
    document_name: "manual.pdf",
    source_path: "manual.pdf",
    chunks_indexed: 3,
    chunk_count: 3,
    document_hash: "abc123",
  },
];

describe("KnowledgePanel", () => {
  it("shows indexed documents and removes one", async () => {
    const onDelete = vi.fn();

    render(
      <KnowledgePanel
        documents={documents}
        loading={false}
        selectedFiles={null}
        onSelectFiles={vi.fn()}
        onIngest={vi.fn()}
        onDelete={onDelete}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText("manual.pdf")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Remover"));
    expect(onDelete).toHaveBeenCalledWith("manual.pdf");
  });
});
```

- [ ] **Step 7: Run tests and build**

Run:

```bash
cd frontend && npm test && npm run build
```

Expected: tests pass and build succeeds.

- [ ] **Step 8: Commit if commits are authorized**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/components/studio/*.test.tsx
git commit -m "test: add studio component coverage"
```

---

## Self-review notes

- Spec coverage:
  - Warm AI Studio visual direction: Tasks 2, 4, 8, 9, 10.
  - Chat-first home: Task 4.
  - Contextual Knowledge/Evaluation/Advanced panels: Tasks 5, 6, 7, 8.
  - Existing backend contracts preserved: Tasks 1 and 8 explicitly keep existing handlers and API calls.
  - Error/empty states: Tasks 4, 5, 6, 8.
  - Verification: Tasks 1-10 run `npm run build`; Task 10 includes manual UX verification.
- Placeholder scan: no TBD/TODO placeholders are used. The optional test task is explicitly conditional on dependency approval and can be skipped without affecting the redesign.
- Type consistency: `StudioPanel`, `Config`, `Message`, `DocumentSummary`, `EvalRow`, `AIProvider`, `AIProviderRuntimeConfig`, `AIConfig`, and `AIModel` are defined once in `types.ts` and imported by later tasks.
