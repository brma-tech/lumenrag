import { Bot, FileText, User } from "lucide-react";
import type { Message } from "../../types";
import { Card, Chip } from "./primitives";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const Icon = isUser ? User : Bot;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <Card
        className={`max-w-[82%] overflow-hidden px-4 py-3 ${
          isUser
            ? "border-teal-200/30 bg-[linear-gradient(135deg,rgba(20,184,166,0.18),rgba(15,23,42,0.78))] shadow-[0_18px_52px_rgba(20,184,166,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "border-slate-700 bg-[linear-gradient(135deg,rgba(30,41,59,0.92),rgba(15,23,42,0.88))] shadow-[0_22px_70px_rgba(2,6,23,0.30),inset_0_1px_0_rgba(255,255,255,0.04)]"
        }`}
      >
        <div className="mb-3 flex items-center gap-2">
          <Chip
            className={
              isUser
                ? "border-teal-200/25 bg-teal-200/10 text-teal-50"
                : "border-slate-600 bg-slate-800 text-slate-100"
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {isUser ? "Voce" : "Assistente"}
          </Chip>
        </div>

        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-100/95">
          {message.content}
        </div>

        {!!message.sources?.length && (
          <details className="mt-4 rounded-lg border border-slate-700 bg-slate-950/35 p-3 open:bg-slate-950/45">
            <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 transition hover:text-slate-200">
              Fontes recuperadas
            </summary>
            <div className="mt-3 space-y-3">
              {message.sources.map((source) => (
                <div
                  key={`${source.source}-${source.document_name}-${source.chunk_index}`}
                  className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs leading-5 text-slate-300"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Chip className="border-teal-200/20 bg-teal-200/10 text-teal-100">
                      Fonte {source.source}
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
