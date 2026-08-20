import {
  BookOpen,
  Check,
  FileText,
  Filter,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import type { DocumentSummary, Message, Source } from "../../types";
import { Button, Callout, Card, Chip } from "./primitives";
import { MessageBubble } from "./MessageBubble";
import type { Language } from "../../i18n";
import { t } from "../../i18n";

const SUGGESTED_QUESTIONS = {
  en: ["Which documents are indexed?", "Summarize the uploaded files.", "What are the most important points in this knowledge base?"],
  "pt-BR": ["Quais documentos estão indexados?", "Resuma os arquivos enviados.", "Quais são os pontos mais importantes da base?"]
} as const;

export function ChatExperience({
  messages,
  documents,
  selectedDocuments,
  documentsCount,
  loading,
  onSend,
  onClear,
  onOpenKnowledge,
  onToggleDocument,
  onClearDocumentFilter,
  language,
  researchMode,
}: {
  messages: Message[];
  documents: DocumentSummary[];
  selectedDocuments: string[];
  documentsCount: number;
  loading: boolean;
  onSend: (message: string, files?: File[]) => void;
  onClear: () => void;
  onOpenKnowledge: () => void;
  onToggleDocument: (documentName: string) => void;
  onClearDocumentFilter: () => void;
  language: Language;
  researchMode: boolean;
}) {
  const latestSources =
    [...messages].reverse().find((message) => message.role === "assistant" && message.sources?.length)?.sources ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="border-teal-200/20 bg-teal-200/10 text-teal-100">
            <BookOpen className="h-3.5 w-3.5" />
            {documentsCount} {t(language, "documents")} {t(language, "indexed")}
          </Chip>
          {selectedDocuments.length > 0 && (
            <Chip className="border-amber-200/20 bg-amber-200/10 text-amber-100">
              <Filter className="h-3.5 w-3.5" />
              {selectedDocuments.length} {selectedDocuments.length === 1 ? t(language, "filter") : t(language, "filters")}
            </Chip>
          )}
        </div>
        <Button variant="secondary" onClick={onClear} disabled={loading || !messages.length}>
          <Trash2 className="h-4 w-4" />
          {t(language, "clearChat")}
        </Button>
      </div>

      <div className={`grid min-h-0 flex-1 gap-4 px-4 lg:px-6 ${researchMode ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1"}`}>
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-col overflow-hidden">
          {documentsCount === 0 && (
            <Callout className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold text-teal-50">{t(language, "noDocuments")}</div>
                <div className="text-teal-50/75">
                  {t(language, "uploadPrompt")}
                </div>
              </div>
              <Button variant="secondary" onClick={onOpenKnowledge} className="shrink-0">
                <Upload className="h-4 w-4" />
                {t(language, "upload")}
              </Button>
            </Callout>
          )}

          <div className="flex-1 overflow-y-auto pb-6">
            {messages.length === 0 ? (
              <EmptyChatState loading={loading} onSend={onSend} language={language} />
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <MessageBubble key={`${message.role}-${index}`} message={message} language={language} showSources={researchMode} />
                ))}
                {loading && (
                  <Card
                    role="status"
                    aria-live="polite"
                    className="max-w-[82%] border-teal-200/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-300"
                  >
                    {t(language, "generating")}
                  </Card>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 bg-gradient-to-t from-slate-950 via-slate-950/96 to-transparent pb-4 pt-5">
            <PromptInputBox
              onSend={onSend}
              isLoading={loading}
              lastMessage={[...messages].reverse().find((message) => message.role === "user")?.content ?? ""}
              placeholder={
                selectedDocuments.length
                  ? t(language, "askSelected", selectedDocuments.length)
                  : t(language, "ask")
              }
              language={language}
            />
          </div>
        </div>

        {researchMode && <aside className="min-h-0 space-y-4 overflow-y-auto pb-4">
          <DocumentFilterPanel
            documents={documents}
            selectedDocuments={selectedDocuments}
            onToggleDocument={onToggleDocument}
            onClearDocumentFilter={onClearDocumentFilter}
            onOpenKnowledge={onOpenKnowledge}
            language={language}
          />
          <SourcesPanel sources={latestSources} language={language} />
        </aside>}
      </div>
    </div>
  );
}

function EmptyChatState({
  loading,
  onSend,
  language,
}: {
  loading: boolean;
  onSend: (message: string) => void;
  language: Language;
}) {
  return (
    <div className="flex h-full min-h-[45vh] items-center justify-center text-center">
      <div className="w-full max-w-2xl space-y-4">
        <Card className="border-slate-800 bg-[linear-gradient(180deg,rgba(30,41,48,0.76),rgba(24,33,38,0.70))] p-6 md:p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-teal-200/20 bg-teal-200/10 text-teal-100">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-50">
            {t(language, "emptyTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
            {t(language, "emptyDescription")}
          </p>
          <div className="mt-6 grid gap-2 text-left">
            {SUGGESTED_QUESTIONS[language].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSend(suggestion)}
                disabled={loading}
                className="rounded-lg border border-slate-800 bg-slate-950/45 px-4 py-3 text-sm text-slate-200 transition hover:border-teal-200/30 hover:bg-teal-200/10 hover:text-teal-50 disabled:pointer-events-none disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </Card>
        {loading && (
          <Card
            role="status"
            aria-live="polite"
            className="border-teal-200/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-300"
          >
            {t(language, "generating")}
          </Card>
        )}
      </div>
    </div>
  );
}

function DocumentFilterPanel({
  documents,
  selectedDocuments,
  onToggleDocument,
  onClearDocumentFilter,
  onOpenKnowledge,
  language,
}: {
  documents: DocumentSummary[];
  selectedDocuments: string[];
  onToggleDocument: (documentName: string) => void;
  onClearDocumentFilter: () => void;
  onOpenKnowledge: () => void;
  language: Language;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.18)]">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Filter className="h-4 w-4 text-teal-300" />
          {t(language, "scope")}
        </div>
        <button
          className="text-xs font-medium text-slate-400 transition hover:text-slate-100"
          onClick={onClearDocumentFilter}
          disabled={!selectedDocuments.length}
        >
          {t(language, "clear")}
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto p-3">
        {documents.length === 0 ? (
          <div className="space-y-3 p-2 text-sm text-slate-500">
            <p>{t(language, "noFilterDocs")}</p>
            <Button variant="secondary" onClick={onOpenKnowledge} className="w-full">
              <Upload className="h-4 w-4" />
              {t(language, "upload")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => {
              const selected = selectedDocuments.includes(document.document_name);
              return (
                <button
                  key={document.document_name}
                  type="button"
                  onClick={() => onToggleDocument(document.document_name)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                    selected
                      ? "border-teal-300/35 bg-teal-300/10"
                      : "border-slate-800 bg-slate-950/35 hover:border-slate-600"
                  }`}
                >
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    selected ? "border-teal-300 bg-teal-300 text-slate-950" : "border-slate-700 text-transparent"
                  }`}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-100">
                      {document.document_name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {document.chunks_indexed}/{document.chunk_count} chunks
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function SourcesPanel({ sources, language }: { sources: Source[]; language: Language }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.18)]">
      <div className="flex items-center gap-2 border-b border-slate-800 p-4 text-sm font-semibold text-slate-100">
        <FileText className="h-4 w-4 text-teal-300" />
        {t(language, "sourcesTitle")}
      </div>
      {sources.length === 0 ? (
        <div className="p-4 text-sm leading-6 text-slate-500">
          {t(language, "sourcesEmpty")}
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {sources.map((source) => (
            <SourceCard key={`${source.source}-${source.document_name}-${source.chunk_index}`} source={source} />
          ))}
        </div>
      )}
    </section>
  );
}

function SourceCard({ source }: { source: Source }) {
  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Chip className="border-teal-200/20 bg-teal-200/10 text-teal-100">
          Fonte {source.source}
        </Chip>
        <span className="text-xs text-slate-500">chunk {source.chunk_index}</span>
      </div>
      <div className="truncate text-sm font-medium text-slate-100">{source.document_name}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-slate-800 bg-slate-950/35 px-2 py-1 text-slate-400">
          rerank {source.rerank_score.toFixed(4)}
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/35 px-2 py-1 text-slate-400">
          dist {source.distance.toFixed(4)}
        </div>
      </div>
      <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-xs leading-5 text-slate-400">
        {source.preview}
      </p>
    </div>
  );
}
