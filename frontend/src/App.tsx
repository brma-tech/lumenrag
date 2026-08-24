import React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Cpu,
  Database,
  FileText,
  FlaskConical,
  Gauge,
  Globe2,
  History,
  Layers3,
  MessageSquare,
  Minus,
  PlayCircle,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { ChatExperience } from "./components/studio/ChatExperience";
import { api, defaultConfig } from "./api";
import type {
  AIConfig,
  AIModel,
  AIProvider,
  AIProviderRuntimeConfig,
  Config,
  DocumentSummary,
  EvalRow,
  EvalRun,
  EvalRunDetail,
  IngestResult,
  Message,
  OperationalStatus,
  Tab,
} from "./types";
import type { Language } from "./i18n";
import { t, tr } from "./i18n";

const DEFAULT_EVAL_QUESTIONS: Record<Language, string> = {
  en: "Which documents are indexed?\nWhat is the main topic of the uploaded files?",
  "pt-BR": "Quais documentos estão indexados?\nQual é o assunto principal dos arquivos enviados?",
};

function App() {
  const [config, setConfig] = React.useState<Config>(defaultConfig);
  const [tab, setTab] = React.useState<Tab>("dashboard");
  const [collections, setCollections] = React.useState<string[]>(["default"]);
  const [sessions, setSessions] = React.useState<string[]>(["default"]);
  const [documents, setDocuments] = React.useState<DocumentSummary[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [selectedChatDocuments, setSelectedChatDocuments] = React.useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = React.useState<FileList | null>(null);
  const [ingestResults, setIngestResults] = React.useState<IngestResult[]>([]);
  const [evalText, setEvalText] = React.useState(() =>
    window.localStorage.getItem("lumenrag.language") === "pt-BR"
      ? DEFAULT_EVAL_QUESTIONS["pt-BR"]
      : DEFAULT_EVAL_QUESTIONS.en
  );
  const [evalRows, setEvalRows] = React.useState<EvalRow[]>([]);
  const [evalRuns, setEvalRuns] = React.useState<EvalRun[]>([]);
  const [selectedEvalRun, setSelectedEvalRun] = React.useState<EvalRunDetail | null>(null);
  const [aiProviders, setAiProviders] = React.useState<AIProvider[]>([]);
  const [aiProviderConfig, setAiProviderConfig] = React.useState<Record<string, AIProviderRuntimeConfig>>({});
  const [apiKeyDrafts, setApiKeyDrafts] = React.useState<Record<string, string>>({});
  const [chatModels, setChatModels] = React.useState<AIModel[]>([]);
  const [embeddingModels, setEmbeddingModels] = React.useState<AIModel[]>([]);
  const [operationalStatus, setOperationalStatus] = React.useState<OperationalStatus | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [health, setHealth] = React.useState("not checked");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(
    () => window.localStorage.getItem("lumenrag.sidebar-collapsed") === "true"
  );
  const [researchMode, setResearchMode] = React.useState(
    () => window.localStorage.getItem("lumenrag.research-mode") !== "false"
  );
  const [language, setLanguage] = React.useState<Language>(() => {
    const saved = window.localStorage.getItem("lumenrag.language");
    return saved === "pt-BR" ? "pt-BR" : "en";
  });

  React.useEffect(() => {
    window.localStorage.setItem("lumenrag.language", language);
    document.documentElement.lang = language;
    setHealth((current) => {
      if (["not checked", "nao verificado", "não verificado"].includes(current)) return tr(language, "not checked", "não verificado");
      if (["checking...", "verificando..."].includes(current)) return tr(language, "checking...", "verificando...");
      if (["error", "erro"].includes(current)) return tr(language, "error", "erro");
      return current;
    });
    setEvalText((current) =>
      Object.values(DEFAULT_EVAL_QUESTIONS).includes(current)
        ? DEFAULT_EVAL_QUESTIONS[language]
        : current
    );
  }, [language]);

  React.useEffect(() => {
    window.localStorage.setItem("lumenrag.sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  React.useEffect(() => {
    window.localStorage.setItem("lumenrag.research-mode", String(researchMode));
    if (!researchMode && tab === "eval") setTab("chat");
  }, [researchMode, tab]);

  const loadDocuments = React.useCallback(async (collection: string) => {
    const payload = await api<{ documents: DocumentSummary[] }>(
      `/api/documents?collection=${encodeURIComponent(collection)}`
    );
    setDocuments(payload.documents);
  }, []);

  const loadMessages = React.useCallback(async (collection: string, sessionId: string) => {
    const payload = await api<{ messages: Message[] }>(
      `/api/chat/history?collection=${encodeURIComponent(collection)}&session_id=${encodeURIComponent(sessionId)}`
    );
    setMessages(payload.messages);
  }, []);

  const loadEvalRuns = React.useCallback(async (collection: string) => {
    const payload = await api<{ runs: EvalRun[] }>(
      `/api/evaluations?collection=${encodeURIComponent(collection)}`
    );
    setEvalRuns(payload.runs);
  }, []);

  const loadEvalRunDetail = async (runId: string) => {
    setError("");
    setLoading(true);
    try {
      const payload = await api<{ run: EvalRunDetail }>(
        `/api/evaluations/${encodeURIComponent(runId)}`
      );
      setSelectedEvalRun(payload.run);
    } catch (exc) {
      setError((exc as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadOperationalStatus = React.useCallback(
    async (
      nextConfig = config,
      options: { setBusy?: boolean; showNotice?: boolean } = {}
    ) => {
      const { setBusy = false, showNotice = false } = options;
      setError("");
      if (setBusy) setLoading(true);
      try {
        const payload = await api<OperationalStatus>(
          `/api/status?collection=${encodeURIComponent(nextConfig.collection)}&base_url=${encodeURIComponent(nextConfig.base_url)}`
        );
        setOperationalStatus(payload);
        if (showNotice) setNotice(tr(language, "Operational status updated.", "Status operacional atualizado."));
      } catch (exc) {
        setError((exc as Error).message);
      } finally {
        if (setBusy) setLoading(false);
      }
    },
    [config]
  );

  const refreshMeta = React.useCallback(
    async (nextConfig = config) => {
      const [collectionPayload, sessionPayload] = await Promise.all([
        api<{ collections: string[] }>("/api/collections"),
        api<{ sessions: string[] }>(`/api/sessions?collection=${encodeURIComponent(nextConfig.collection)}`),
      ]);
      setCollections(collectionPayload.collections);
      setSessions(sessionPayload.sessions);
      await Promise.all([
        loadDocuments(nextConfig.collection),
        loadMessages(nextConfig.collection, nextConfig.session_id),
        loadEvalRuns(nextConfig.collection),
        loadOperationalStatus(nextConfig),
      ]);
    },
    [config, loadDocuments, loadEvalRuns, loadMessages, loadOperationalStatus]
  );

  const loadAiProviders = React.useCallback(async () => {
    const payload = await api<{ providers: AIProvider[]; config: AIConfig }>("/api/ai/providers");
    setAiProviders(payload.providers);
    setAiProviderConfig(payload.config.providers);
    setConfig((current) => ({
      ...current,
      chat_provider: payload.config.chat_provider,
      embedding_provider: payload.config.embedding_provider,
      chat_model: payload.config.chat_model,
      embed_model: payload.config.embed_model,
    }));
    return payload;
  }, []);

  const runHealthCheck = React.useCallback(
    async (
      baseUrl: string,
      options: { showNotice?: boolean; setBusy?: boolean } = {}
    ) => {
      const { showNotice = false, setBusy = false } = options;
      setError("");
      setHealth(tr(language, "checking...", "verificando..."));
      if (setBusy) setLoading(true);
      try {
        const payload = await api<{ status: string }>(
          `/api/health?base_url=${encodeURIComponent(baseUrl)}`
        );
        setHealth(payload.status);
        if (showNotice) setNotice(tr(language, "LumenVec connection verified.", "Conexão com LumenVec verificada."));
      } catch (exc) {
        setHealth(tr(language, "error", "erro"));
        setError((exc as Error).message);
      } finally {
        if (setBusy) setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    api<Config>("/api/config")
      .then(async (payload) => {
        setConfig(payload);
        await Promise.all([
          refreshMeta(payload),
          runHealthCheck(payload.base_url),
          loadAiProviders(),
          loadOperationalStatus(payload),
        ]);
      })
      .catch((exc) => setError(exc.message));
  }, []);

  React.useEffect(() => {
    refreshMeta().catch((exc) => setError(exc.message));
  }, [config.collection, config.session_id]);

  const checkHealth = async () => {
    await runHealthCheck(config.base_url, { showNotice: true, setBusy: true });
  };

  const saveAiSettings = async () => {
    setError("");
    setLoading(true);
    try {
      const providersPayload = Object.fromEntries(
        Object.entries(aiProviderConfig).map(([providerId, providerConfig]) => [
          providerId,
          {
            base_url: providerConfig.base_url,
            api_key: apiKeyDrafts[providerId] ?? undefined,
          },
        ])
      );
      const payload = await api<{ config: AIConfig }>("/api/ai/config", {
        method: "PUT",
        body: JSON.stringify({
          chat_provider: config.chat_provider,
          embedding_provider: config.embedding_provider,
          chat_model: config.chat_model,
          embed_model: config.embed_model,
          providers: providersPayload,
        }),
      });
      setAiProviderConfig(payload.config.providers);
      setApiKeyDrafts({});
      setNotice(tr(language, "AI configuration saved.", "Configuração de IA salva."));
    } catch (exc) {
      setError((exc as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = React.useCallback(async (
    providerId: string,
    purpose: "chat" | "embeddings",
    options: { silent?: boolean } = {}
  ) => {
    if (!options.silent) {
      setError("");
      setLoading(true);
    }
    try {
      const payload = await api<{ models: AIModel[] }>(
        `/api/ai/models?provider=${encodeURIComponent(providerId)}&purpose=${encodeURIComponent(purpose)}`
      );
      if (purpose === "chat") setChatModels(payload.models);
      else setEmbeddingModels(payload.models);
      if (!options.silent) setNotice(tr(language, `${payload.models.length} model(s) loaded.`, `${payload.models.length} modelo(s) carregados.`));
    } catch (exc) {
      if (!options.silent) setError((exc as Error).message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const provider = aiProviders.find((item) => item.id === config.chat_provider);
    const runtime = aiProviderConfig[config.chat_provider];
    if (!provider?.supports_chat) return;
    if (!runtime?.has_api_key && config.chat_provider !== "local-openai") return;
    loadModels(config.chat_provider, "chat", { silent: true });
  }, [aiProviders, aiProviderConfig, config.chat_provider, loadModels]);

  React.useEffect(() => {
    const provider = aiProviders.find((item) => item.id === config.embedding_provider);
    const runtime = aiProviderConfig[config.embedding_provider];
    if (!provider?.supports_embeddings) return;
    if (!runtime?.has_api_key && config.embedding_provider !== "local-openai") return;
    loadModels(config.embedding_provider, "embeddings", { silent: true });
  }, [aiProviders, aiProviderConfig, config.embedding_provider, loadModels]);

  const sendMessage = async (message: string, files?: File[]) => {
    if (!message.trim()) return;
    setError("");
    setNotice(files?.length ? tr(language, "Image attachments remain local previews in this RAG.", "Anexos de imagem ficam apenas como preview local neste RAG.") : "");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: message }]);
    try {
      const payload = await api<{ messages: Message[] }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          ...config,
          message,
          document_names: selectedChatDocuments,
        }),
      });
      setMessages(payload.messages);
      await refreshMeta();
    } catch (exc) {
      setError((exc as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const ingestFiles = async () => {
    if (!selectedFiles?.length) return;
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const form = new FormData();
      Array.from(selectedFiles).forEach((file) => form.append("files", file));
      form.append("base_url", config.base_url);
      form.append("collection", config.collection);
      form.append("embedding_provider", config.embedding_provider);
      form.append("embed_model", config.embed_model);
      form.append("dimensions", String(config.dimensions || 0));
      const payload = await api<{ indexed_files: number; total_chunks: number; documents: DocumentSummary[]; results: IngestResult[] }>(
        "/api/ingest",
        { method: "POST", body: form }
      );
      setDocuments(payload.documents);
      setIngestResults(payload.results);
      setNotice(tr(language, `${payload.indexed_files} file(s), ${payload.total_chunks} chunk(s) indexed.`, `${payload.indexed_files} arquivo(s), ${payload.total_chunks} chunk(s) indexados.`));
      await refreshMeta();
    } catch (exc) {
      setError((exc as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentName: string) => {
    setError("");
    setLoading(true);
    try {
      const payload = await api<{ deleted: number; failed: number; documents: DocumentSummary[] }>(
        `/api/documents?document_name=${encodeURIComponent(documentName)}&collection=${encodeURIComponent(config.collection)}&base_url=${encodeURIComponent(config.base_url)}`,
        { method: "DELETE" }
      );
      setDocuments(payload.documents);
      setNotice(tr(language, `${payload.deleted} vector(s) removed, ${payload.failed} failure(s).`, `${payload.deleted} vetor(es) removidos, ${payload.failed} falha(s).`));
    } catch (exc) {
      setError((exc as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const clearCollection = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = await api<{ deleted: number; failed: number }>("/api/collections/clear", {
        method: "POST",
        body: JSON.stringify(config),
      });
      setDocuments([]);
      setNotice(tr(language, `Collection cleared: ${payload.deleted} vector(s) removed, ${payload.failed} failure(s).`, `Collection limpa: ${payload.deleted} vetor(es) removidos, ${payload.failed} falha(s).`));
      await refreshMeta();
    } catch (exc) {
      setError((exc as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    setLoading(true);
    try {
      const payload = await api<{ messages: Message[] }>(
        `/api/chat/history?collection=${encodeURIComponent(config.collection)}&session_id=${encodeURIComponent(config.session_id)}`,
        { method: "DELETE" }
      );
      setMessages(payload.messages);
      setNotice(tr(language, "Session history removed.", "Histórico da sessão removido."));
    } catch (exc) {
      setError((exc as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runEvaluation = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = await api<{ rows: EvalRow[]; avg_score: number; good_answers: number; total: number }>(
        "/api/evaluate",
        { method: "POST", body: JSON.stringify({ ...config, questions: evalText }) }
      );
      setEvalRows(payload.rows);
      setSelectedEvalRun(null);
      await loadEvalRuns(config.collection);
      setNotice(tr(language, `Average score ${payload.avg_score.toFixed(2)}/5, good answers ${payload.good_answers}/${payload.total}.`, `Score médio ${payload.avg_score.toFixed(2)}/5, respostas boas ${payload.good_answers}/${payload.total}.`));
    } catch (exc) {
      setError((exc as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`${tab === "chat" ? "lg:h-screen lg:overflow-hidden" : "min-h-screen"} text-slate-100`}>
      <div className={`mx-auto flex w-full max-w-[1500px] flex-col lg:flex-row ${tab === "chat" ? "lg:h-screen lg:overflow-hidden" : "min-h-screen"}`}>
        <aside className={`relative overflow-x-hidden border-b border-[#3a4749] bg-[#182124]/95 p-4 backdrop-blur-xl transition-[width] duration-300 lg:border-b-0 lg:border-r ${tab === "chat" ? "lg:h-screen lg:overflow-y-auto" : ""} ${sidebarCollapsed ? "lg:w-[82px]" : "lg:w-[320px]"}`}>
          <button
            type="button"
            className={`icon-btn absolute z-10 hidden h-5 w-5 lg:inline-flex ${
              sidebarCollapsed
                ? "left-1/2 top-[76px] -translate-x-1/2"
                : "right-3 top-3"
            }`}
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={t(language, sidebarCollapsed ? "expandSidebar" : "collapseSidebar")}
            title={t(language, sidebarCollapsed ? "expandSidebar" : "collapseSidebar")}
          >
            {sidebarCollapsed ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </button>
          <div className={`pb-5 ${sidebarCollapsed ? "lg:pb-14" : ""}`}>
            <div className={`mb-5 flex items-center gap-3 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
              <div className="brand-orbit flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/25 bg-slate-950/55 p-0.5">
                <img
                  src="/lumenvec-logo.png"
                  alt="LumenVec"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className={sidebarCollapsed ? "lg:hidden" : ""}>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-[-0.03em] text-slate-50">LumenRAG</h1>
                  <span className="rounded border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-200">Alpha</span>
                </div>
                <p className="text-xs text-slate-400">RAG Studio · powered by LumenVec</p>
              </div>
            </div>

            <div className={`grid grid-cols-3 gap-2 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              <Metric label="Docs" value={documents.length} />
              <Metric label="Top K" value={config.top_k} />
              <Metric label="Health" value={health} compact />
            </div>
            {sidebarCollapsed && (
              <div className="hidden flex-col items-center gap-2 pt-8 lg:flex">
                <CollapsedMetric icon={<FileText className="h-3 w-3" />} label="Docs" value={documents.length} />
                <CollapsedMetric icon={<Layers3 className="h-3 w-3" />} label="Top K" value={config.top_k} />
                <CollapsedMetric icon={<Activity className="h-3 w-3" />} label="Health" value={health === "ok" ? "OK" : "—"} healthy={health === "ok"} />
                <CollapsedMetric icon={<Cpu className="h-3 w-3" />} label="Dim" value={config.dimensions} />
                <CollapsedMetric icon={<Gauge className="h-3 w-3" />} label="Budget" value={config.context_budget_chars} />
              </div>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={researchMode}
              aria-label={researchMode ? t(language, "researchMode") : t(language, "userMode")}
              title={researchMode ? t(language, "researchModeHint") : t(language, "userModeHint")}
              onClick={() => setResearchMode((current) => !current)}
              className={`mt-3 flex items-center border transition ${
                sidebarCollapsed
                  ? "mx-auto h-9 w-12 justify-center rounded-lg border-slate-600/60 bg-slate-900/45"
                  : "w-full justify-between rounded-lg border-slate-700 bg-slate-900/55 px-3 py-2"
              }`}
            >
              <span className={`flex items-center gap-2 text-xs font-medium ${researchMode ? "text-teal-200" : "text-slate-300"}`}>
                {researchMode ? <FlaskConical className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                {!sidebarCollapsed && (researchMode ? t(language, "researchMode") : t(language, "userMode"))}
              </span>
              {!sidebarCollapsed && (
                <span className={`relative h-4 w-7 rounded-full transition ${researchMode ? "bg-teal-400/70" : "bg-slate-700"}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition ${researchMode ? "left-3.5" : "left-0.5"}`} />
                </span>
              )}
            </button>
          </div>

          <div className={`space-y-3 rounded-xl border border-slate-800 bg-slate-900/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5 text-teal-300" />
              {tr(language, "Environment", "Ambiente")}
            </div>
            <Field label="LumenVec URL">
              <input className="input" value={config.base_url} onChange={(e) => setConfig({ ...config, base_url: e.target.value })} />
            </Field>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label="Collection">
                <input list="collections" className="input" value={config.collection} onChange={(e) => setConfig({ ...config, collection: e.target.value })} />
                <datalist id="collections">
                  {collections.map((collection) => <option key={collection} value={collection} />)}
                </datalist>
              </Field>
              <button className="icon-btn mt-6" onClick={() => refreshMeta()} disabled={loading} title={tr(language, "Refresh", "Atualizar")} aria-label={tr(language, "Refresh metadata", "Atualizar metadados")}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <Field label={tr(language, "Session", "Sessão")}>
              <input list="sessions" className="input" value={config.session_id} onChange={(e) => setConfig({ ...config, session_id: e.target.value })} />
              <datalist id="sessions">
                {sessions.map((session) => <option key={session} value={session} />)}
              </datalist>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Dim">
                <input className="input" type="number" value={config.dimensions} onChange={(e) => setConfig({ ...config, dimensions: Number(e.target.value) })} />
              </Field>
              <Field label="Top K">
                <input className="input" type="number" min={1} max={20} value={config.top_k} onChange={(e) => setConfig({ ...config, top_k: Number(e.target.value) })} />
              </Field>
              <Field label="Budget">
                <input className="input" type="number" value={config.context_budget_chars} onChange={(e) => setConfig({ ...config, context_budget_chars: Number(e.target.value) })} />
              </Field>
            </div>
            <button className="primary-btn w-full" onClick={checkHealth} disabled={loading}>
              <Activity className="h-4 w-4" />
              Health: {health}
            </button>
          </div>
        </aside>

        <section className={`flex flex-1 flex-col bg-slate-950/35 ${tab === "chat" ? "min-h-0 lg:h-screen lg:overflow-hidden" : "min-h-screen"}`}>
          <header className="sticky top-0 z-20 shrink-0 border-b border-[#263031] bg-[#080b0c]/88 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-1">
                <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={<BarChart3 className="h-4 w-4" />}>{t(language, "overview")}</TabButton>
                <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageSquare className="h-4 w-4" />}>{t(language, "chat")}</TabButton>
                <TabButton active={tab === "ingest"} onClick={() => setTab("ingest")} icon={<Layers3 className="h-4 w-4" />}>{t(language, "knowledge")}</TabButton>
                {researchMode && <TabButton active={tab === "eval"} onClick={() => setTab("eval")} icon={<Gauge className="h-4 w-4" />}>{t(language, "evaluation")}</TabButton>}
                <TabButton active={tab === "ops"} onClick={() => setTab("ops")} icon={<Activity className="h-4 w-4" />}>{researchMode ? t(language, "explorer") : t(language, "operations")}</TabButton>
                <select aria-label={t(language, "language")} value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200">
                  <option value="en">EN</option>
                  <option value="pt-BR">PT</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill label={config.collection} />
                <StatusPill label={config.session_id} muted />
                <button
                  className="icon-btn"
                  aria-label={t(language, "configureAi")}
                  onClick={() => setIsAiModalOpen(true)}
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          {(notice || error) && (
            <div className={`mx-4 mt-4 rounded-lg border px-3 py-2 text-sm ${error ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-teal-400/30 bg-teal-400/10 text-teal-100"}`}>
              {error || notice}
            </div>
          )}

          {tab === "dashboard" && (
            <DashboardView
              config={config}
              health={health}
              documents={documents}
              messages={messages}
              evalRuns={evalRuns}
              providers={aiProviders}
              providerConfig={aiProviderConfig}
              operationalStatus={operationalStatus}
              onOpenChat={() => setTab("chat")}
              onOpenIngest={() => setTab("ingest")}
              onOpenEval={() => setTab("eval")}
              onOpenExplorer={() => setTab("ops")}
              onCheckHealth={checkHealth}
              loading={loading}
              language={language}
              researchMode={researchMode}
            />
          )}
          {tab === "chat" && (
            <ChatExperience
              messages={messages}
              documents={documents}
              selectedDocuments={selectedChatDocuments}
              documentsCount={documents.length}
              loading={loading}
              onSend={sendMessage}
              onClear={clearChat}
              onOpenKnowledge={() => setTab("ingest")}
              onToggleDocument={(documentName) =>
                setSelectedChatDocuments((current) =>
                  current.includes(documentName)
                    ? current.filter((item) => item !== documentName)
                    : [...current, documentName]
                )
              }
              onClearDocumentFilter={() => setSelectedChatDocuments([])}
              language={language}
              researchMode={researchMode}
            />
          )}
          {tab === "ingest" && (
            <IngestView
              documents={documents}
              loading={loading}
              selectedFiles={selectedFiles}
              ingestResults={ingestResults}
              onSelectFiles={setSelectedFiles}
              onIngest={ingestFiles}
              onDelete={deleteDocument}
              onClear={clearCollection}
              language={language}
            />
          )}
          {tab === "eval" && (
            <EvalView
              evalText={evalText}
              evalRows={evalRows}
              evalRuns={evalRuns}
              selectedRun={selectedEvalRun}
              loading={loading}
              onChangeText={setEvalText}
              onRun={runEvaluation}
              onSelectRun={loadEvalRunDetail}
              language={language}
            />
          )}
          {tab === "ops" && (
            <OperationsView
              status={operationalStatus}
              config={config}
              documents={documents}
              health={health}
              loading={loading}
              onRefresh={() => loadOperationalStatus(config, { setBusy: true, showNotice: true })}
              language={language}
              researchMode={researchMode}
            />
          )}
        </section>
      </div>
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
          language={language}
        />
      )}
    </main>
  );
}

function AiSettingsModal({
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
  language,
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
  language: Language;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{tr(language, "AI configuration", "Configuração da IA")}</h2>
            <p className="text-xs text-slate-500">{tr(language, "Providers, models, endpoints, and API keys.", "Provedores, modelos, endpoints e chaves de API.")}</p>
          </div>
          <button className="icon-btn h-8 w-8" onClick={onClose} aria-label={tr(language, "Close", "Fechar")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-120px)] space-y-4 overflow-y-auto p-4">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Chat</div>
              <Field label="Provider">
                <ProviderPicker
                  providers={providers.filter((provider) => provider.supports_chat)}
                  value={config.chat_provider}
                  providerConfig={providerConfig}
                  onChange={(value) => onChangeConfig((current) => ({ ...current, chat_provider: value }))}
                  language={language}
                />
              </Field>
              <Field label={tr(language, "Model", "Modelo")}>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    list="chat-models"
                    className="input"
                    value={config.chat_model}
                    onChange={(e) => onChangeConfig((current) => ({ ...current, chat_model: e.target.value }))}
                  />
                  <button className="secondary-btn px-2" onClick={() => onLoadModels(config.chat_provider, "chat")} disabled={loading} aria-label={tr(language, "Refresh chat models", "Atualizar modelos de chat")}>
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <datalist id="chat-models">
                  {chatModels.map((model) => <option key={model.id} value={model.id} />)}
                </datalist>
              </Field>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Embeddings</div>
              <Field label="Provider">
                <ProviderPicker
                  providers={providers.filter((provider) => provider.supports_embeddings)}
                  value={config.embedding_provider}
                  providerConfig={providerConfig}
                  onChange={(value) => onChangeConfig((current) => ({ ...current, embedding_provider: value }))}
                  language={language}
                />
              </Field>
              <Field label={tr(language, "Model", "Modelo")}>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    list="embedding-models"
                    className="input"
                    value={config.embed_model}
                    onChange={(e) => onChangeConfig((current) => ({ ...current, embed_model: e.target.value }))}
                  />
                  <button className="secondary-btn px-2" onClick={() => onLoadModels(config.embedding_provider, "embeddings")} disabled={loading} aria-label={tr(language, "Refresh embedding models", "Atualizar modelos de embeddings")}>
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <datalist id="embedding-models">
                  {embeddingModels.map((model) => <option key={model.id} value={model.id} />)}
                </datalist>
              </Field>
            </div>
          </section>

          <ProviderSettings
            providers={providers}
            providerConfig={providerConfig}
            apiKeyDrafts={apiKeyDrafts}
            onChangeBaseUrl={onChangeBaseUrl}
            onChangeApiKey={onChangeApiKey}
            defaultOpen
            language={language}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
          <button className="secondary-btn" onClick={onClose}>{tr(language, "Cancel", "Cancelar")}</button>
          <button className="primary-btn" onClick={onSave} disabled={loading}>{tr(language, "Save AI settings", "Salvar IA")}</button>
        </div>
      </div>
    </div>
  );
}

function OperationsView({
  status,
  config,
  documents,
  health,
  loading,
  onRefresh,
  language,
  researchMode,
}: {
  status: OperationalStatus | null;
  config: Config;
  documents: DocumentSummary[];
  health: string;
  loading: boolean;
  onRefresh: () => void;
  language: Language;
  researchMode: boolean;
}) {
  const storageEntries = status
    ? [
        [tr(language, "Data", "Dados"), status.storage.data_dir],
        ["Uploads", status.storage.uploads_dir],
        [tr(language, "Metadata", "Metadados"), status.storage.metadata_path],
        ...(researchMode ? [[tr(language, "Evaluations", "Avaliações"), status.storage.evaluations_dir]] : []),
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 lg:p-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-50">
              <Activity className="h-4 w-4 text-teal-300" />
              {researchMode ? t(language, "explorer") : tr(language, "Operations", "Operação")}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {tr(language, "Consolidated status of the environment, local knowledge base, providers, and runtime artifacts.", "Estado consolidado do ambiente, base local, provedores e artefatos de execução.")}
            </p>
          </div>
          <button className="secondary-btn" onClick={onRefresh} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            {tr(language, "Refresh", "Atualizar")}
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            status?.ready
              ? "border-teal-300/25 bg-teal-300/10 text-teal-200"
              : "border-amber-300/25 bg-amber-300/10 text-amber-200"
          }`}>
            {status?.ready ? tr(language, "Ready to use", "Pronto para uso") : tr(language, "Needs attention", "Requer atenção")}
          </span>
          <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1 text-xs text-slate-400">
            {status?.service.collection ?? tr(language, "collection not loaded", "collection não carregada")}
          </span>
          <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1 text-xs text-slate-400">
            {status?.service.base_url ?? tr(language, "LumenVec not checked", "LumenVec não verificado")}
          </span>
        </div>
      </section>

      {researchMode && (
        <LumenVecResearchPreview config={config} documents={documents} health={health} status={status} language={language} />
      )}

      <section className={`grid gap-4 md:grid-cols-2 ${researchMode ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        <DashboardStat label="Collections" value={status?.metrics.collections ?? "-"} detail={tr(language, "local knowledge bases", "bases locais")} compact />
        <DashboardStat label={tr(language, "Sessions", "Sessões")} value={status?.metrics.sessions ?? "-"} detail={tr(language, "chat history", "histórico de chat")} compact />
        <DashboardStat label={tr(language, "Documents", "Documentos")} value={status?.metrics.documents ?? "-"} detail={`${status?.metrics.chunks ?? 0} chunks`} compact />
        {researchMode && <DashboardStat label={tr(language, "Evaluations", "Avaliações")} value={status?.metrics.evaluations ?? "-"} detail={tr(language, "saved runs", "rodadas salvas")} compact />}
        <DashboardStat label={tr(language, "Version", "Versão")} value={status?.service.version ?? "-"} detail={status?.service.name ?? tr(language, "service", "serviço")} compact />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <h2 className="text-base font-semibold text-slate-50">Readiness</h2>
          <div className="mt-4 space-y-3">
            {status ? (
              status.checks.map((check) => (
                <ReadinessItem key={check.id} ok={check.ok} label={check.label} value={check.detail} />
              ))
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-4 text-sm text-slate-500">
                {tr(language, "Operational status has not been loaded yet.", "Status operacional ainda não carregado.")}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <h2 className="text-base font-semibold text-slate-50">{tr(language, "Local artifacts", "Artefatos locais")}</h2>
          <div className="mt-4 divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
            {storageEntries.length ? (
              storageEntries.map(([label, value]) => (
                <div key={label} className="grid gap-2 bg-slate-950/35 p-3 md:grid-cols-[120px_1fr]">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
                  <div className="min-w-0 break-all text-sm text-slate-300">{value}</div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-slate-500">{tr(language, "No paths loaded.", "Nenhum caminho carregado.")}</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardView({
  config,
  health,
  documents,
  messages,
  evalRuns,
  providers,
  providerConfig,
  operationalStatus,
  loading,
  onOpenChat,
  onOpenIngest,
  onOpenEval,
  onOpenExplorer,
  onCheckHealth,
  language,
  researchMode,
}: {
  config: Config;
  health: string;
  documents: DocumentSummary[];
  messages: Message[];
  evalRuns: EvalRun[];
  providers: AIProvider[];
  providerConfig: Record<string, AIProviderRuntimeConfig>;
  operationalStatus: OperationalStatus | null;
  loading: boolean;
  onOpenChat: () => void;
  onOpenIngest: () => void;
  onOpenEval: () => void;
  onOpenExplorer: () => void;
  onCheckHealth: () => void;
  language: Language;
  researchMode: boolean;
}) {
  const totalChunks = documents.reduce((sum, document) => sum + document.chunks_indexed, 0);
  const latestRun = evalRuns[0];
  const chatProvider = providers.find((provider) => provider.id === config.chat_provider);
  const embeddingProvider = providers.find((provider) => provider.id === config.embedding_provider);
  const missingKeys = [chatProvider, embeddingProvider]
    .filter((provider): provider is AIProvider => Boolean(provider))
    .filter((provider) => provider.id !== "local-openai" && !providerConfig[provider.id]?.has_api_key);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 lg:p-6">
      <section className={`grid gap-4 md:grid-cols-2 ${researchMode ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        <DashboardStat label={tr(language, "Documents", "Documentos")} value={documents.length} detail={`${totalChunks} chunks`} />
        <DashboardStat label={tr(language, "Conversations", "Conversas")} value={messages.length} detail={config.session_id} />
        {researchMode && <DashboardStat label={tr(language, "Evaluations", "Avaliações")} value={evalRuns.length} detail={latestRun ? tr(language, `latest score ${latestRun.avg_score.toFixed(2)}/5`, `último score ${latestRun.avg_score.toFixed(2)}/5`) : tr(language, "no runs", "sem rodadas")} />}
        <DashboardStat label="LumenVec" value={health} detail={config.base_url} compact />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-50">{tr(language, "Workflow", "Fluxo de trabalho")}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {tr(language, "Prepare the knowledge base, chat with your documents, and validate answers with repeatable questions.", "Prepare a base, converse com os documentos e valide respostas com perguntas repetíveis.")}
              </p>
            </div>
            <button className="secondary-btn" onClick={onCheckHealth} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              {tr(language, "Check", "Verificar")}
            </button>
          </div>
          <div className={`grid gap-3 ${researchMode ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <WorkflowStep
              icon={<Upload className="h-4 w-4" />}
              title={tr(language, "1. Index", "1. Indexar")}
              description={tr(language, `${documents.length} document(s) in the current collection.`, `${documents.length} documento(s) na collection atual.`)}
              action={tr(language, "Open knowledge base", "Abrir base")}
              onClick={onOpenIngest}
              done={documents.length > 0}
            />
            <WorkflowStep
              icon={<MessageSquare className="h-4 w-4" />}
              title={tr(language, "2. Explore", "2. Explorar")}
              description={tr(language, `${messages.length} message(s) in this session.`, `${messages.length} mensagem(ns) nesta sessão.`)}
              action={tr(language, "Open chat", "Abrir chat")}
              onClick={onOpenChat}
              done={messages.length > 0}
            />
            {researchMode && <WorkflowStep
              icon={<ClipboardList className="h-4 w-4" />}
              title={tr(language, "3. Evaluate", "3. Avaliar")}
              description={tr(language, `${evalRuns.length} registered run(s).`, `${evalRuns.length} rodada(s) registrada(s).`)}
              action={tr(language, "Evaluate", "Avaliar")}
              onClick={onOpenEval}
              done={evalRuns.length > 0}
            />}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <h2 className="text-base font-semibold text-slate-50">{tr(language, "Readiness", "Prontidão")}</h2>
          <div className="mt-4 space-y-3">
            <ReadinessItem ok={!['error', 'erro', 'not checked', 'nao verificado'].includes(health)} label={tr(language, "LumenVec reachable", "LumenVec acessível")} value={health} />
            <ReadinessItem ok={documents.length > 0} label={tr(language, "Knowledge base has documents", "Base com documentos")} value={`${documents.length} docs`} />
            <ReadinessItem ok={missingKeys.length === 0} label={tr(language, "AI keys configured", "Chaves de IA configuradas")} value={missingKeys.length ? missingKeys.map((provider) => provider.name).join(", ") : "ok"} />
            <ReadinessItem ok={Boolean(config.chat_model && config.embed_model)} label={tr(language, "Models selected", "Modelos selecionados")} value={`${config.chat_model} / ${config.embed_model}`} />
          </div>
        </div>
      </section>

      {researchMode && (
        <LumenVecResearchPreview
          config={config}
          documents={documents}
          health={health}
          status={operationalStatus}
          language={language}
          compact
          onOpenExplorer={onOpenExplorer}
        />
      )}

      <section className={`grid gap-5 ${researchMode ? "xl:grid-cols-2" : "xl:grid-cols-1"}`}>
        <RecentDocuments documents={documents} onOpenIngest={onOpenIngest} language={language} />
        {researchMode && <EvaluationHistory evalRuns={evalRuns} language={language} />}
      </section>
    </div>
  );
}

interface VectorGraphNode {
  id: string;
  index: number;
  x: number;
  y: number;
  document_name: string;
  chunk_index: number;
  preview: string;
}

interface VectorGraphEdge {
  source: number;
  target: number;
  distance: number;
  similarity: number;
}

interface VectorGraphData {
  nodes: VectorGraphNode[];
  edges: VectorGraphEdge[];
  sampled: number;
  dimension: number;
}

function LumenVecResearchPreview({
  config,
  documents,
  health,
  status,
  language,
  compact = false,
  onOpenExplorer,
}: {
  config: Config;
  documents: DocumentSummary[];
  health: string;
  status: OperationalStatus | null;
  language: Language;
  compact?: boolean;
  onOpenExplorer?: () => void;
}) {
  const totalChunks = documents.reduce((sum, document) => sum + document.chunks_indexed, 0);
  const isHealthy = health === "ok" || status?.ready === true;
  const [graph, setGraph] = React.useState<VectorGraphData | null>(null);
  const [graphError, setGraphError] = React.useState("");
  const [selectedNode, setSelectedNode] = React.useState<VectorGraphNode | null>(null);
  const displayedNodes = compact ? (graph?.nodes.slice(0, 9) ?? []) : (graph?.nodes ?? []);
  const displayedIndexes = new Set(displayedNodes.map((node) => node.index));
  const displayedEdges = (graph?.edges ?? []).filter(
    (edge) => displayedIndexes.has(edge.source) && displayedIndexes.has(edge.target)
  );

  React.useEffect(() => {
    let active = true;
    setGraphError("");
    api<VectorGraphData>(
      `/api/vector-map?collection=${encodeURIComponent(config.collection)}&base_url=${encodeURIComponent(config.base_url)}&limit=60`
    )
      .then((payload) => {
        if (active) setGraph(payload);
      })
      .catch((exc: Error) => {
        if (active) setGraphError(exc.message);
      });
    return () => {
      active = false;
    };
  }, [config.base_url, config.collection, documents]);

  return (
    <section className="overflow-hidden rounded-xl border border-teal-300/15 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.20)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Database className="h-4 w-4 text-teal-300" />
            {compact ? t(language, "vectorMapPreview") : tr(language, "LumenVec semantic explorer", "Explorador semântico LumenVec")}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {tr(language, "Semantic vector proximity using real cosine distances.", "Proximidade semântica vetorial usando distâncias cosseno reais.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${isHealthy ? "border-teal-300/25 bg-teal-300/10 text-teal-200" : "border-amber-300/25 bg-amber-300/10 text-amber-200"}`}>
          <span className={`h-2 w-2 rounded-full ${isHealthy ? "animate-pulse bg-teal-300" : "bg-amber-300"}`} />
          {isHealthy ? tr(language, "Database online", "Banco online") : tr(language, "Checking database", "Verificando banco")}
        </span>
        {compact && onOpenExplorer && <button className="secondary-btn min-h-8 px-3 py-1 text-xs" onClick={onOpenExplorer}>{t(language, "exploreVectorMap")}</button>}
        </div>
      </div>

      <div className={`grid gap-0 ${compact ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]"}`}>
        <div className="min-w-0 border-b border-slate-800 p-4 xl:border-b-0 xl:border-r">
          {graph?.nodes.length ? (
            <svg
              viewBox="0 0 620 280"
              className={`${compact ? "h-[190px]" : "h-[340px]"} w-full rounded-lg bg-slate-950/25`}
              role="img"
              aria-label={tr(language, "Semantic graph of indexed vector chunks and cosine distances", "Grafo semântico dos chunks vetoriais indexados e distâncias cosseno")}
            >
              {displayedEdges.map((edge) => {
                const source = graph.nodes[edge.source];
                const target = graph.nodes[edge.target];
                if (!source || !target) return null;
                const x1 = 45 + source.x * 530;
                const y1 = 28 + source.y * 224;
                const x2 = 45 + target.x * 530;
                const y2 = 28 + target.y * 224;
                return (
                  <g key={`${source.id}-${target.id}`}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeOpacity={Math.max(0.22, edge.similarity * 0.72)} strokeWidth={Math.max(1, edge.similarity * 3)} />
                    {!compact && <><rect x={(x1 + x2) / 2 - 20} y={(y1 + y2) / 2 - 8} width="40" height="14" rx="7" fill="#0f172a" fillOpacity="0.92" /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 2} fill="#94a3b8" fontSize="7.5" textAnchor="middle">d {edge.distance.toFixed(3)}</text></>}
                  </g>
                );
              })}
              {displayedNodes.map((node) => {
                const x = 45 + node.x * 530;
                const y = 28 + node.y * 224;
                const selected = selectedNode?.id === node.id;
                const hue = [...node.document_name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 120 + 155;
                return (
                  <g key={node.id} role="button" tabIndex={0} className="cursor-pointer" onClick={() => !compact && setSelectedNode(node)} onKeyDown={(event) => event.key === "Enter" && !compact && setSelectedNode(node)}>
                    <circle cx={x} cy={y} r={selected ? 15 : 11} fill={`hsl(${hue} 58% 38%)`} fillOpacity="0.88" stroke={selected ? "#f8fafc" : `hsl(${hue} 70% 68%)`} strokeWidth={selected ? 2 : 1} />
                    <text x={x} y={y + 3} fill="#f8fafc" fontSize="7" fontWeight="700" textAnchor="middle">{node.chunk_index}</text>
                    <text x={x} y={y + 24} fill="#94a3b8" fontSize="7.5" textAnchor="middle">{node.document_name.length > 14 ? `${node.document_name.slice(0, 14)}…` : node.document_name}</text>
                    <title>{`${node.document_name} · chunk ${node.chunk_index}`}</title>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="flex h-[270px] items-center justify-center text-center text-sm text-slate-500">
              {graphError || tr(language, "Loading semantic vector graph...", "Carregando grafo vetorial semântico...")}
            </div>
          )}
          {!compact && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <span>{tr(language, "Node = indexed chunk · Edge = nearest semantic neighbor", "Nó = chunk indexado · Aresta = vizinho semântico mais próximo")}</span>
            <span>{graph?.sampled ?? 0} {tr(language, "sampled vectors", "vetores amostrados")}</span>
          </div>}
          {!compact && selectedNode && (
            <div className="mt-3 rounded-lg border border-teal-300/15 bg-teal-300/5 p-3 text-xs">
              <div className="font-semibold text-teal-100">{selectedNode.document_name} · chunk {selectedNode.chunk_index}</div>
              <div className="mt-1 line-clamp-2 leading-5 text-slate-400">{selectedNode.preview}</div>
            </div>
          )}
        </div>

        {!compact && <div className="p-5">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {tr(language, "Live monitoring", "Monitoramento ao vivo")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniMonitor label={tr(language, "Vectors", "Vetores")} value={totalChunks} />
            <MiniMonitor label={tr(language, "Documents", "Documentos")} value={documents.length} />
            <MiniMonitor label={tr(language, "Dimensions", "Dimensões")} value={config.dimensions} />
            <MiniMonitor label="Top K" value={config.top_k} />
            <MiniMonitor label={tr(language, "Collections", "Collections")} value={status?.metrics.collections ?? 1} />
            <MiniMonitor label={tr(language, "Sessions", "Sessões")} value={status?.metrics.sessions ?? 0} />
          </div>
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/35 p-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Endpoint</div>
            <div className="mt-1 truncate font-mono text-xs text-slate-400" title={config.base_url}>{config.base_url}</div>
          </div>
        </div>}
      </div>
    </section>
  );
}

function MiniMonitor({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/35 px-3 py-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}


function IngestView({
  documents,
  loading,
  selectedFiles,
  ingestResults,
  onSelectFiles,
  onIngest,
  onDelete,
  onClear,
  language,
}: {
  documents: DocumentSummary[];
  loading: boolean;
  selectedFiles: FileList | null;
  ingestResults: IngestResult[];
  onSelectFiles: (files: FileList | null) => void;
  onIngest: () => void;
  onDelete: (documentName: string) => void;
  onClear: () => void;
  language: Language;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 lg:p-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.25)]">
        <div className="mb-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Upload className="h-4 w-4 text-teal-300" />
            {tr(language, "Upload files to the knowledge base", "Enviar arquivos para a base")}
          </div>
          <p className="text-sm leading-6 text-slate-400">
            {tr(language, "Index technical documents, research notes, or everyday files in the active collection.", "Indexe documentos técnicos, notas de pesquisa ou arquivos do dia a dia na collection ativa.")}
          </p>
        </div>
        <input
          type="file"
          multiple
          accept=".txt,.md,.py,.js,.ts,.tsx,.go,.java,.json,.yaml,.yml,.html,.css,.csv,.pdf,.docx"
          onChange={(event) => onSelectFiles(event.currentTarget.files)}
          className="block w-full rounded-lg border border-dashed border-slate-700 bg-slate-950/55 p-4 text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-100 hover:border-teal-300/45"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">{tr(language, `${selectedFiles?.length || 0} selected file(s)`, `${selectedFiles?.length || 0} arquivo(s) selecionados`)}</div>
          <button className="primary-btn" onClick={onIngest} disabled={loading || !selectedFiles?.length}>
            <Send className="h-4 w-4" />
            {loading ? tr(language, "Indexing...", "Indexando...") : tr(language, "Index", "Indexar")}
          </button>
        </div>
      </section>

      {(loading || ingestResults.length > 0) && (
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <div className="flex items-center gap-2 border-b border-slate-800 p-4 text-sm font-semibold text-slate-100">
            <Activity className="h-4 w-4 text-teal-300" />
            {tr(language, "Ingestion result", "Resultado da ingestão")}
          </div>
          {loading ? (
            <div className="space-y-3 p-4">
              {(selectedFiles ? Array.from(selectedFiles) : []).map((file) => (
                <IngestResultRow
                  key={file.name}
                  result={{
                    filename: file.name,
                    stored_as: tr(language, "waiting for processing", "aguardando processamento"),
                    status: "indexed",
                    chunks: 0,
                    vectors: 0,
                    message: tr(language, "Queued for indexing", "Na fila de indexação"),
                  }}
                  pending language={language}
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {ingestResults.map((result) => (
                <IngestResultRow key={`${result.filename}-${result.stored_as}`} result={result} language={language} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <FileText className="h-4 w-4 text-teal-300" />
            {tr(language, "Indexed documents", "Documentos indexados")}
          </div>
          <button className="secondary-btn" onClick={onClear} disabled={loading || !documents.length}>
            <Trash2 className="h-4 w-4" />
            {tr(language, "Clear collection", "Limpar collection")}
          </button>
        </div>
        <div className="divide-y divide-slate-800">
          {documents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              {tr(language, "No documents indexed in this collection.", "Nenhum documento indexado nesta collection.")}
            </div>
          ) : (
            documents.map((document) => (
              <div key={document.document_name} className="grid gap-3 p-4 transition hover:bg-slate-800/35 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="font-medium text-slate-100">{document.document_name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{document.chunks_indexed}/{document.chunk_count} chunks</span>
                    <span>hash {document.document_hash}</span>
                  </div>
                </div>
                <button className="secondary-btn" onClick={() => onDelete(document.document_name)} disabled={loading}>
                  <Trash2 className="h-4 w-4" />
                  {tr(language, "Remove", "Remover")}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function IngestResultRow({ result, pending = false, language }: { result: IngestResult; pending?: boolean; language: Language }) {
  const statusCopy: Record<IngestResult["status"], string> = {
    indexed: pending ? tr(language, "pending", "pendente") : tr(language, "indexed", "indexado"),
    skipped: tr(language, "unchanged", "sem alteração"),
    empty: tr(language, "empty", "sem conteúdo"),
    error: tr(language, "error", "erro"),
  };
  const tone =
    result.status === "indexed"
      ? "border-teal-300/25 bg-teal-300/10 text-teal-200"
      : result.status === "error"
        ? "border-rose-300/25 bg-rose-300/10 text-rose-200"
        : "border-amber-300/25 bg-amber-300/10 text-amber-200";

  return (
    <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-100">{result.filename}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{result.stored_as}</span>
          <span>{result.chunks} chunks</span>
          <span>{result.vectors} {tr(language, "vectors", "vetores")}</span>
        </div>
        {result.message && <div className="mt-2 text-xs text-slate-400">{result.message}</div>}
      </div>
      <div className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tone}`}>
        {statusCopy[result.status]}
      </div>
    </div>
  );
}

function EvalView({
  evalText,
  evalRows,
  evalRuns,
  selectedRun,
  loading,
  onChangeText,
  onRun,
  onSelectRun,
  language,
}: {
  evalText: string;
  evalRows: EvalRow[];
  evalRuns: EvalRun[];
  selectedRun: EvalRunDetail | null;
  loading: boolean;
  onChangeText: (value: string) => void;
  onRun: () => void;
  onSelectRun: (runId: string) => void;
  language: Language;
}) {
  const latestRun = evalRuns[0];
  const previousRun = evalRuns[1];
  const scoreDelta = latestRun && previousRun ? latestRun.avg_score - previousRun.avg_score : null;
  const weakRows = evalRows.filter(isWeakEvalRow);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 lg:p-6">
      <section className="grid gap-3 md:grid-cols-4">
        <DashboardStat
          label={tr(language, "Latest run", "Última rodada")}
          value={latestRun ? `${latestRun.avg_score.toFixed(2)}/5` : "-"}
          detail={latestRun ? tr(language, `${latestRun.total} question(s)`, `${latestRun.total} pergunta(s)`) : tr(language, "No history", "Sem histórico")}
          compact
        />
        <DashboardStat
          label={tr(language, "Change", "Variação")}
          value={scoreDelta === null ? "-" : `${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(2)}`}
          detail={previousRun ? tr(language, "Compared with previous run", "Contra rodada anterior") : tr(language, "Waiting for comparison", "Aguardando comparativo")}
          compact
        />
        <DashboardStat
          label={tr(language, "Good answers", "Boas respostas")}
          value={latestRun ? `${latestRun.good_answers}/${latestRun.total}` : "-"}
          detail={tr(language, "Good/excellent verdicts", "Vereditos bons/excelentes")}
          compact
        />
        <DashboardStat
          label={tr(language, "Weak points", "Pontos fracos")}
          value={evalRows.length ? weakRows.length : selectedRun?.weak_answers ?? "-"}
          detail={tr(language, "Low score or unsupported", "Score baixo ou sem suporte")}
          compact
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-teal-200">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{tr(language, "Evaluation run", "Rodada de avaliação")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {tr(language, "Use standardized questions to compare answer quality, sources, and consistency.", "Use perguntas padronizadas para comparar qualidade, fontes e consistência das respostas.")}
            </p>
          </div>
        </div>
        <Field label={tr(language, "Test questions, one per line", "Perguntas de teste, uma por linha")}>
          <textarea className="input min-h-40 resize-y" value={evalText} onChange={(e) => onChangeText(e.target.value)} />
        </Field>
        <button className="primary-btn mt-3" onClick={onRun} disabled={loading}>
          <Activity className="h-4 w-4" />
          {tr(language, "Run evaluation", "Executar avaliação")}
        </button>
      </section>

      {evalRows.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/35 p-4">
            <div className="text-sm font-semibold text-slate-100">{tr(language, "Current run results", "Resultado da rodada atual")}</div>
            <div className="text-xs text-slate-500">{tr(language, `${weakRows.length} weak point(s) detected`, `${weakRows.length} ponto(s) fraco(s) detectado(s)`)}</div>
          </div>
          <EvaluationRows rows={evalRows} language={language} />
        </section>
      )}

      <EvaluationHistory evalRuns={evalRuns} selectedRunId={selectedRun?.id} onSelectRun={onSelectRun} language={language} />

      {selectedRun && (
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/35 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-100">{tr(language, "Run details", "Detalhe da rodada")}</div>
              <div className="mt-1 text-xs text-slate-500">{selectedRun.id}</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1">{selectedRun.avg_score.toFixed(2)}/5</span>
              <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1">{selectedRun.weak_answers} {tr(language, "weak", "fraca(s)")}</span>
              <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1">{selectedRun.good_answers}/{selectedRun.total} {tr(language, "good", "boas")}</span>
            </div>
          </div>
          <EvaluationRows rows={selectedRun.rows} language={language} />
        </section>
      )}
    </div>
  );
}

function isWeakEvalRow(row: EvalRow) {
  return row.score < 3 || ["weak", "unsupported", "error", "unparsed"].includes(row.verdict);
}

function EvaluationRows({ rows, language }: { rows: EvalRow[]; language: Language }) {
  return (
    <div className="divide-y divide-slate-800">
      {rows.map((row) => (
        <details key={`${row.question}-${row.verdict}`} className="p-4 open:bg-slate-800/25">
          <summary className="grid cursor-pointer gap-3 text-sm text-slate-100 md:grid-cols-[1fr_80px_120px] md:items-center">
            <span className="min-w-0">{row.question}</span>
            <span>{row.score}/5</span>
            <VerdictPill verdict={row.verdict} language={language} />
          </summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
            <div>{tr(language, "Top source", "Fonte principal")}: {row.top_source || tr(language, "no source", "sem fonte")} · {row.sources} {tr(language, "source(s)", "fonte(s)")}</div>
            <div>{row.justification}</div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/45 p-3 text-slate-200">{row.answer_preview}</div>
          </div>
        </details>
      ))}
    </div>
  );
}

function VerdictPill({ verdict, language }: { verdict: string; language: Language }) {
  const weak = ["weak", "unsupported", "error", "unparsed"].includes(verdict);
  const good = ["excellent", "good"].includes(verdict);
  const tone = good
    ? "border-teal-300/25 bg-teal-300/10 text-teal-200"
    : weak
      ? "border-rose-300/25 bg-rose-300/10 text-rose-200"
      : "border-amber-300/25 bg-amber-300/10 text-amber-200";

  const labels: Record<string, [string, string]> = {
    excellent: ["Excellent", "Excelente"],
    good: ["Good", "Bom"],
    weak: ["Weak", "Fraco"],
    unsupported: ["Unsupported", "Não suportado"],
    error: ["Error", "Erro"],
    unparsed: ["Unparsed", "Não interpretado"],
    unknown: ["Unknown", "Desconhecido"],
  };
  const label = labels[verdict]
    ? tr(language, labels[verdict][0], labels[verdict][1])
    : verdict;

  return <span className={`w-fit rounded-md border px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>;
}

function DashboardStat({ label, value, detail, compact = false }: { label: string; value: React.ReactNode; detail: string; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_52px_rgba(2,6,23,0.18)]">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-2 truncate font-semibold text-slate-50 ${compact ? "text-xl" : "text-3xl"}`}>{value}</div>
      <div className="mt-1 truncate text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function WorkflowStep({ icon, title, description, action, done, onClick }: { icon: React.ReactNode; title: string; description: string; action: string; done: boolean; onClick: () => void }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${done ? "border-teal-300/25 bg-teal-300/10 text-teal-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
          {icon}
        </div>
        {done ? <CheckCircle2 className="h-4 w-4 text-teal-300" /> : <PlayCircle className="h-4 w-4 text-slate-500" />}
      </div>
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{description}</p>
      <button className="secondary-btn mt-3 w-full" onClick={onClick}>{action}</button>
    </div>
  );
}

function ReadinessItem({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/35 p-3">
      <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md ${ok ? "bg-teal-300/10 text-teal-300" : "bg-amber-300/10 text-amber-300"}`}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-100">{label}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{value}</div>
      </div>
    </div>
  );
}

function RecentDocuments({ documents, onOpenIngest, language }: { documents: DocumentSummary[]; onOpenIngest: () => void; language: Language }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.18)]">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <FileText className="h-4 w-4 text-teal-300" />
          {tr(language, "Recent documents", "Documentos recentes")}
        </div>
        <button className="secondary-btn min-h-9 px-3 py-1.5" onClick={onOpenIngest}>{tr(language, "Manage", "Gerenciar")}</button>
      </div>
      <div className="divide-y divide-slate-800">
        {documents.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{tr(language, "No documents indexed yet.", "Nenhum documento indexado ainda.")}</div>
        ) : (
          documents.slice(0, 5).map((document) => (
            <div key={document.document_name} className="p-4">
              <div className="truncate text-sm font-medium text-slate-100">{document.document_name}</div>
              <div className="mt-1 text-xs text-slate-500">{document.chunks_indexed}/{document.chunk_count} chunks · hash {document.document_hash}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function EvaluationHistory({
  evalRuns,
  selectedRunId,
  onSelectRun,
  language,
}: {
  evalRuns: EvalRun[];
  selectedRunId?: string;
  onSelectRun?: (runId: string) => void;
  language: Language;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.18)]">
      <div className="flex items-center gap-2 border-b border-slate-800 p-4 text-sm font-semibold text-slate-100">
        <History className="h-4 w-4 text-teal-300" />
        {tr(language, "Evaluation history", "Histórico de avaliações")}
      </div>
      <div className="divide-y divide-slate-800">
        {evalRuns.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{tr(language, "No runs recorded for this collection.", "Nenhuma rodada registrada para esta collection.")}</div>
        ) : (
          evalRuns.slice(0, 6).map((run) => (
            <div
              key={run.id}
              className={`grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center ${
                selectedRunId === run.id ? "bg-teal-300/5" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-100">{run.id}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(run.created_at * 1000).toLocaleString(language)} · {tr(language, `${run.total} question(s)`, `${run.total} pergunta(s)`)} · {run.good_answers} {tr(language, "good", "boas")}
                </div>
                {!!run.top_sources.length && (
                  <div className="mt-2 truncate text-xs text-slate-400">{tr(language, "Sources", "Fontes")}: {run.top_sources.join(", ")}</div>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2 py-1">JSON: {run.json_path}</span>
                  <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2 py-1">CSV: {run.csv_path}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                {onSelectRun && (
                  <button
                    type="button"
                    className="secondary-btn min-h-9 px-3 py-1.5"
                    onClick={() => onSelectRun(run.id)}
                  >
                    {tr(language, "Details", "Detalhes")}
                  </button>
                )}
                <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-right">
                  <div className="text-sm font-semibold text-slate-50">{run.avg_score.toFixed(2)}/5</div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{tr(language, "score", "pontuação")}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block text-xs font-medium text-slate-400">
      <div className="mb-1">{label}</div>
      {children}
    </div>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: React.ReactNode; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-1 truncate font-semibold text-slate-100 ${compact ? "text-xs" : "text-lg"}`}>{value}</div>
    </div>
  );
}

function CollapsedMetric({
  icon,
  label,
  value,
  healthy = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  healthy?: boolean;
}) {
  return (
    <div
      className="flex w-12 flex-col items-center gap-1 rounded-lg border border-slate-600/60 bg-slate-900/45 px-1 py-2 text-center shadow-sm"
      title={`${label}: ${value}`}
      aria-label={`${label}: ${value}`}
    >
      <span className={healthy ? "text-teal-300" : "text-slate-300"}>{icon}</span>
      <span className="max-w-full truncate text-[9px] font-semibold leading-none text-slate-200">{value}</span>
      <span className="text-[8px] uppercase leading-none tracking-[0.08em] text-slate-500">{label}</span>
    </div>
  );
}

function StatusPill({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span className={`hidden max-w-[180px] truncate rounded-md border px-2.5 py-1.5 text-xs sm:inline-flex ${
      muted
        ? "border-slate-800 bg-slate-900/60 text-slate-400"
        : "border-teal-300/20 bg-teal-300/10 text-teal-100"
    }`}>
      {label}
    </span>
  );
}

function providerVisual(providerId: string, language: Language) {
  const visuals: Record<string, { icon: React.ReactNode; tone: string; hint: string }> = {
    openai: { icon: <Sparkles className="h-4 w-4" />, tone: "text-emerald-200 bg-emerald-300/10", hint: tr(language, "GPT models and embeddings", "Modelos GPT e embeddings") },
    openrouter: { icon: <Globe2 className="h-4 w-4" />, tone: "text-violet-200 bg-violet-300/10", hint: tr(language, "Multi-provider catalog", "Catálogo multi-provedor") },
    groq: { icon: <Zap className="h-4 w-4" />, tone: "text-orange-200 bg-orange-300/10", hint: tr(language, "Fast inference", "Inferência rápida") },
    together: { icon: <Cloud className="h-4 w-4" />, tone: "text-sky-200 bg-sky-300/10", hint: tr(language, "Open-source models", "Modelos open-source") },
    "local-openai": { icon: <Cpu className="h-4 w-4" />, tone: "text-teal-200 bg-teal-300/10", hint: tr(language, "Runs locally", "Executado localmente") },
  };
  return visuals[providerId] || { icon: <Bot className="h-4 w-4" />, tone: "text-slate-200 bg-slate-300/10", hint: tr(language, "Compatible provider", "Provedor compatível") };
}

function ProviderPicker({
  providers,
  value,
  providerConfig,
  onChange,
  language,
}: {
  providers: AIProvider[];
  value: string;
  providerConfig: Record<string, AIProviderRuntimeConfig>;
  onChange: (value: string) => void;
  language: Language;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={tr(language, "Select provider", "Selecionar provedor")}>
      {providers.map((provider) => {
        const selected = provider.id === value;
        const visual = providerVisual(provider.id, language);
        const configured = providerConfig[provider.id]?.has_api_key || provider.id === "local-openai";
        return (
          <button
            key={provider.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`group flex min-h-[68px] items-center gap-3 rounded-lg border p-3 text-left transition ${
              selected
                ? "border-teal-300/70 bg-teal-300/10 shadow-[0_0_0_2px_rgba(45,212,191,0.10)]"
                : "border-slate-800 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900"
            }`}
            onClick={() => onChange(provider.id)}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${visual.tone}`}>
              {visual.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                {provider.name}
                {selected && <CheckCircle2 className="h-3.5 w-3.5 text-teal-200" />}
              </span>
              <span className="block truncate text-[11px] text-slate-500">{visual.hint}</span>
            </span>
            <span className={`h-2 w-2 rounded-full ${configured ? "bg-teal-300" : "bg-slate-700"}`} title={configured ? tr(language, "Credential configured", "Credencial configurada") : tr(language, "Credential pending", "Credencial pendente")} />
          </button>
        );
      })}
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
  language,
}: {
  providers: AIProvider[];
  providerConfig: Record<string, AIProviderRuntimeConfig>;
  apiKeyDrafts: Record<string, string>;
  onChangeBaseUrl: (providerId: string, baseUrl: string) => void;
  onChangeApiKey: (providerId: string, apiKey: string) => void;
  defaultOpen?: boolean;
  language: Language;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="rounded-lg border border-slate-800">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-300"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{tr(language, "Credentials and endpoints", "Credenciais e endpoints")}</span>
        <span className="text-slate-500">{open ? tr(language, "hide", "ocultar") : tr(language, "edit", "editar")}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-800 p-3">
          {providers.map((provider) => {
            const runtime = providerConfig[provider.id] || { base_url: provider.base_url };
            return (
              <div key={provider.id} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-200">{provider.name}</span>
                  <span className="text-slate-500">
                    {runtime.has_api_key ? runtime.api_key_masked || tr(language, "saved key", "key salva") : provider.api_key_env}
                  </span>
                </div>
                <input
                  className="input"
                  value={runtime.base_url || provider.base_url}
                  onChange={(e) => onChangeBaseUrl(provider.id, e.target.value)}
                  placeholder="Base URL"
                />
                <input
                  className="input"
                  type="password"
                  value={apiKeyDrafts[provider.id] || ""}
                  onChange={(e) => onChangeApiKey(provider.id, e.target.value)}
                  placeholder={runtime.has_api_key ? tr(language, "New optional API key", "Nova chave de API opcional") : "API key"}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-slate-100 text-slate-950 shadow-sm" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
      }`}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

export default App;
