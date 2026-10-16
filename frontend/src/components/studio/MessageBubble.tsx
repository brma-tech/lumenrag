import { Bot, FileText, User } from "lucide-react";
import type { Message } from "../../types";
import { Card, Chip } from "./primitives";
import type { Language } from "../../i18n";
import { tr } from "../../i18n";

export function MessageBubble({ message, language, showSources = true }: { message: Message; language: Language; showSources?: boolean }) {
  const isUser = message.role === "user";
  const Icon = isUser ? User : Bot;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <Card
        className={`max-w-[94%] sm:max-w-[85%] overflow-hidden px-5 py-4 ${
          isUser
            ? "bg-violet-500/12"
            : "bg-transparent"
        }`}
      >
        <div className="mb-3 flex items-center gap-2">
          <Chip
            className={
              isUser
                ? "bg-violet-400/10 text-violet-200"
                : "bg-transparent text-teal-200"
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {isUser ? tr(language, "You", "Você") : tr(language, "Assistant", "Assistente")}
          </Chip>
        </div>

        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-100/95">
          {message.content}
        </div>

        {showSources && !!message.sources?.length && (
          <details className="mt-4 rounded-lg bg-slate-900/40 p-3 open:bg-slate-950/45">
            <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 transition hover:text-slate-200">
              {tr(language, "Retrieved sources", "Fontes recuperadas")}
            </summary>
            <div className="mt-3 space-y-3">
              {message.sources.map((source) => (
                <div
                  key={`${source.source}-${source.document_name}-${source.chunk_index}`}
                  className="border-l-2 border-violet-400/25 pl-4 p-3 text-xs leading-5 text-slate-300"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Chip className="border-teal-200/20 bg-teal-200/10 text-teal-100">
                      {tr(language, "Source", "Fonte")} {source.source}
                    </Chip>
                    <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-slate-100">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{source.document_name}</span>
                    </span>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-slate-500">
                    <span>chunk {source.chunk_index}</span>
                    <span>rerank {source.rerank_score.toFixed(4)}</span>
                    <span>distance {source.distance.toFixed(4)}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-slate-300/90">{source.preview}</div>
                </div>
              ))}
            </div>
          </details>
        )}
      </Card>
    </div>
  );
}
