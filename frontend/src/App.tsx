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
  FileText,
  Gauge,
  Globe2,
  History,
  Layers3,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
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
  const [evalText, setEvalText] = React.useState("Quais documentos estao indexados?\nQual o assunto principal dos arquivos enviados?");
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
  const [health, setHealth] = React.useState("nao verificado");

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
        if (showNotice) setNotice("Status operacional atualizado.");
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
      setHealth("verificando...");
      if (setBusy) setLoading(true);
      try {
        const payload = await api<{ status: string }>(
          `/api/health?base_url=${encodeURIComponent(baseUrl)}`
        );
        setHealth(payload.status);
        if (showNotice) setNotice("Conexao com LumenVec verificada.");
      } catch (exc) {
        setHealth("erro");
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
      setNotice("Configuracao de IA salva.");
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
      if (!options.silent) setNotice(`${payload.models.length} modelo(s) carregados.`);
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
    setNotice(files?.length ? "Anexos de imagem ficam apenas como preview local neste RAG." : "");
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
      setNotice(`${payload.indexed_files} arquivo(s), ${payload.total_chunks} chunk(s) indexados.`);
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
      setNotice(`${payload.deleted} vetor(es) removidos, ${payload.failed} falha(s).`);
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
      setNotice(`Collection limpa: ${payload.deleted} vetor(es) removidos, ${payload.failed} falha(s).`);
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
      setNotice("Historico da sessao removido.");
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
      setNotice(`Score medio ${payload.avg_score.toFixed(2)}/5, respostas boas ${payload.good_answers}/${payload.total}.`);
    } catch (exc) {
      setError((exc as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row">
        <aside className="border-b border-[#263031] bg-[#090d0e]/95 p-4 backdrop-blur-xl lg:w-[320px] lg:border-b-0 lg:border-r">
          <div className="pb-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="brand-orbit flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/25 bg-slate-950/55 p-1.5">
                <img
                  src="/lumenvec-logo.png"
                  alt="LumenVec"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-[-0.03em] text-slate-50">LumenRAG</h1>
                  <span className="rounded border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-200">Alpha</span>
                </div>
                <p className="text-xs text-slate-400">RAG Studio · powered by LumenVec</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric label="Docs" value={documents.length} />
              <Metric label="Top K" value={config.top_k} />
              <Metric label="Health" value={health} compact />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5 text-teal-300" />
              Ambiente
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
              <button className="icon-btn mt-6" onClick={() => refreshMeta()} disabled={loading} title="Atualizar" aria-label="Atualizar metadados">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <Field label="Sessao">
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

        <section className="flex min-h-screen flex-1 flex-col bg-slate-950/35">
          <header className="sticky top-0 z-20 border-b border-[#263031] bg-[#080b0c]/88 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-1">
                <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={<BarChart3 className="h-4 w-4" />}>Visão geral</TabButton>
                <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageSquare className="h-4 w-4" />}>Chat</TabButton>
                <TabButton active={tab === "ingest"} onClick={() => setTab("ingest")} icon={<Layers3 className="h-4 w-4" />}>Base</TabButton>
                <TabButton active={tab === "eval"} onClick={() => setTab("eval")} icon={<Gauge className="h-4 w-4" />}>Avaliação</TabButton>
                <TabButton active={tab === "ops"} onClick={() => setTab("ops")} icon={<Activity className="h-4 w-4" />}>Operação</TabButton>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill label={config.collection} />
                <StatusPill label={config.session_id} muted />
                <button
                  className="icon-btn"
                  aria-label="Configurar IA"
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
              onOpenChat={() => setTab("chat")}
              onOpenIngest={() => setTab("ingest")}
              onOpenEval={() => setTab("eval")}
              onCheckHealth={checkHealth}
              loading={loading}
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
            />
          )}
          {tab === "ops" && (
            <OperationsView
              status={operationalStatus}
              loading={loading}
              onRefresh={() => loadOperationalStatus(config, { setBusy: true, showNotice: true })}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Configuração da IA</h2>
            <p className="text-xs text-slate-500">Providers, modelos, endpoints e API keys.</p>
          </div>
          <button className="icon-btn h-8 w-8" onClick={onClose} aria-label="Fechar">
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
                />
              </Field>
              <Field label="Modelo">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    list="chat-models"
                    className="input"
                    value={config.chat_model}
                    onChange={(e) => onChangeConfig((current) => ({ ...current, chat_model: e.target.value }))}
                  />
                  <button className="secondary-btn px-2" onClick={() => onLoadModels(config.chat_provider, "chat")} disabled={loading} aria-label="Atualizar modelos de chat">
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
                />
              </Field>
              <Field label="Modelo">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    list="embedding-models"
                    className="input"
                    value={config.embed_model}
                    onChange={(e) => onChangeConfig((current) => ({ ...current, embed_model: e.target.value }))}
                  />
                  <button className="secondary-btn px-2" onClick={() => onLoadModels(config.embedding_provider, "embeddings")} disabled={loading} aria-label="Atualizar modelos de embeddings">
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
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
          <button className="secondary-btn" onClick={onClose}>Cancelar</button>
          <button className="primary-btn" onClick={onSave} disabled={loading}>Salvar IA</button>
        </div>
      </div>
    </div>
  );
}

function OperationsView({
  status,
  loading,
  onRefresh,
}: {
  status: OperationalStatus | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const storageEntries = status
    ? [
        ["Dados", status.storage.data_dir],
        ["Uploads", status.storage.uploads_dir],
        ["Metadados", status.storage.metadata_path],
        ["Avaliações", status.storage.evaluations_dir],
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 lg:p-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-50">
              <Activity className="h-4 w-4 text-teal-300" />
              Operação
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Estado consolidado do ambiente, base local, provedores e artefatos de execução.
            </p>
          </div>
          <button className="secondary-btn" onClick={onRefresh} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            status?.ready
              ? "border-teal-300/25 bg-teal-300/10 text-teal-200"
              : "border-amber-300/25 bg-amber-300/10 text-amber-200"
          }`}>
            {status?.ready ? "Pronto para uso" : "Requer atenção"}
          </span>
          <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1 text-xs text-slate-400">
            {status?.service.collection ?? "collection nao carregada"}
          </span>
          <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1 text-xs text-slate-400">
            {status?.service.base_url ?? "LumenVec nao verificado"}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardStat label="Collections" value={status?.metrics.collections ?? "-"} detail="bases locais" compact />
        <DashboardStat label="Sessões" value={status?.metrics.sessions ?? "-"} detail="historico de chat" compact />
        <DashboardStat label="Documentos" value={status?.metrics.documents ?? "-"} detail={`${status?.metrics.chunks ?? 0} chunks`} compact />
        <DashboardStat label="Avaliações" value={status?.metrics.evaluations ?? "-"} detail="rodadas salvas" compact />
        <DashboardStat label="Versão" value={status?.service.version ?? "-"} detail={status?.service.name ?? "serviço"} compact />
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
                Status operacional ainda nao carregado.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <h2 className="text-base font-semibold text-slate-50">Artefatos locais</h2>
          <div className="mt-4 divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
            {storageEntries.length ? (
              storageEntries.map(([label, value]) => (
                <div key={label} className="grid gap-2 bg-slate-950/35 p-3 md:grid-cols-[120px_1fr]">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
                  <div className="min-w-0 break-all text-sm text-slate-300">{value}</div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-slate-500">Nenhum caminho carregado.</div>
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
  loading,
  onOpenChat,
  onOpenIngest,
  onOpenEval,
  onCheckHealth,
}: {
  config: Config;
  health: string;
  documents: DocumentSummary[];
  messages: Message[];
  evalRuns: EvalRun[];
  providers: AIProvider[];
  providerConfig: Record<string, AIProviderRuntimeConfig>;
  loading: boolean;
  onOpenChat: () => void;
  onOpenIngest: () => void;
  onOpenEval: () => void;
  onCheckHealth: () => void;
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="Documentos" value={documents.length} detail={`${totalChunks} chunks`} />
        <DashboardStat label="Conversas" value={messages.length} detail={config.session_id} />
        <DashboardStat label="Avaliações" value={evalRuns.length} detail={latestRun ? `último score ${latestRun.avg_score.toFixed(2)}/5` : "sem rodadas"} />
        <DashboardStat label="LumenVec" value={health} detail={config.base_url} compact />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-50">Fluxo de trabalho</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Prepare a base, converse com os documentos e valide respostas com perguntas repetíveis.
              </p>
            </div>
            <button className="secondary-btn" onClick={onCheckHealth} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              Verificar
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <WorkflowStep
              icon={<Upload className="h-4 w-4" />}
              title="1. Indexar"
              description={`${documents.length} documento(s) na collection atual.`}
              action="Abrir base"
              onClick={onOpenIngest}
              done={documents.length > 0}
            />
            <WorkflowStep
              icon={<MessageSquare className="h-4 w-4" />}
              title="2. Explorar"
              description={`${messages.length} mensagem(ns) nesta sessão.`}
              action="Abrir chat"
              onClick={onOpenChat}
              done={messages.length > 0}
            />
            <WorkflowStep
              icon={<ClipboardList className="h-4 w-4" />}
              title="3. Avaliar"
              description={`${evalRuns.length} rodada(s) registrada(s).`}
              action="Avaliar"
              onClick={onOpenEval}
              done={evalRuns.length > 0}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <h2 className="text-base font-semibold text-slate-50">Prontidão</h2>
          <div className="mt-4 space-y-3">
            <ReadinessItem ok={health !== "erro" && health !== "nao verificado"} label="LumenVec acessível" value={health} />
            <ReadinessItem ok={documents.length > 0} label="Base com documentos" value={`${documents.length} docs`} />
            <ReadinessItem ok={missingKeys.length === 0} label="Chaves de IA configuradas" value={missingKeys.length ? missingKeys.map((provider) => provider.name).join(", ") : "ok"} />
            <ReadinessItem ok={Boolean(config.chat_model && config.embed_model)} label="Modelos selecionados" value={`${config.chat_model} / ${config.embed_model}`} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <RecentDocuments documents={documents} onOpenIngest={onOpenIngest} />
        <EvaluationHistory evalRuns={evalRuns} />
      </section>
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
}: {
  documents: DocumentSummary[];
  loading: boolean;
  selectedFiles: FileList | null;
  ingestResults: IngestResult[];
  onSelectFiles: (files: FileList | null) => void;
  onIngest: () => void;
  onDelete: (documentName: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 lg:p-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.25)]">
        <div className="mb-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Upload className="h-4 w-4 text-teal-300" />
            Enviar arquivos para a base
          </div>
          <p className="text-sm leading-6 text-slate-400">
            Indexe documentos técnicos, notas de pesquisa ou arquivos do dia a dia na collection ativa.
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
          <div className="text-xs text-slate-500">{selectedFiles?.length || 0} arquivo(s) selecionados</div>
          <button className="primary-btn" onClick={onIngest} disabled={loading || !selectedFiles?.length}>
            <Send className="h-4 w-4" />
            {loading ? "Indexando..." : "Indexar"}
          </button>
        </div>
      </section>

      {(loading || ingestResults.length > 0) && (
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <div className="flex items-center gap-2 border-b border-slate-800 p-4 text-sm font-semibold text-slate-100">
            <Activity className="h-4 w-4 text-teal-300" />
            Resultado da ingestão
          </div>
          {loading ? (
            <div className="space-y-3 p-4">
              {(selectedFiles ? Array.from(selectedFiles) : []).map((file) => (
                <IngestResultRow
                  key={file.name}
                  result={{
                    filename: file.name,
                    stored_as: "aguardando processamento",
                    status: "indexed",
                    chunks: 0,
                    vectors: 0,
                    message: "Na fila de indexação",
                  }}
                  pending
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {ingestResults.map((result) => (
                <IngestResultRow key={`${result.filename}-${result.stored_as}`} result={result} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <FileText className="h-4 w-4 text-teal-300" />
            Documentos indexados
          </div>
          <button className="secondary-btn" onClick={onClear} disabled={loading || !documents.length}>
            <Trash2 className="h-4 w-4" />
            Limpar collection
          </button>
        </div>
        <div className="divide-y divide-slate-800">
          {documents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhum documento indexado nesta collection.
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
                  Remover
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function IngestResultRow({ result, pending = false }: { result: IngestResult; pending?: boolean }) {
  const statusCopy: Record<IngestResult["status"], string> = {
    indexed: pending ? "pendente" : "indexado",
    skipped: "sem alteração",
    empty: "sem conteúdo",
    error: "erro",
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
          <span>{result.vectors} vetores</span>
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
}: {
  evalText: string;
  evalRows: EvalRow[];
  evalRuns: EvalRun[];
  selectedRun: EvalRunDetail | null;
  loading: boolean;
  onChangeText: (value: string) => void;
  onRun: () => void;
  onSelectRun: (runId: string) => void;
}) {
  const latestRun = evalRuns[0];
  const previousRun = evalRuns[1];
  const scoreDelta = latestRun && previousRun ? latestRun.avg_score - previousRun.avg_score : null;
  const weakRows = evalRows.filter(isWeakEvalRow);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 lg:p-6">
      <section className="grid gap-3 md:grid-cols-4">
        <DashboardStat
          label="Ultima rodada"
          value={latestRun ? `${latestRun.avg_score.toFixed(2)}/5` : "-"}
          detail={latestRun ? `${latestRun.total} pergunta(s)` : "Sem historico"}
          compact
        />
        <DashboardStat
          label="Variacao"
          value={scoreDelta === null ? "-" : `${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(2)}`}
          detail={previousRun ? "Contra rodada anterior" : "Aguardando comparativo"}
          compact
        />
        <DashboardStat
          label="Boas respostas"
          value={latestRun ? `${latestRun.good_answers}/${latestRun.total}` : "-"}
          detail="Vereditos good/excellent"
          compact
        />
        <DashboardStat
          label="Pontos fracos"
          value={evalRows.length ? weakRows.length : selectedRun?.weak_answers ?? "-"}
          detail="Score baixo ou sem suporte"
          compact
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-teal-200">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Rodada de avaliação</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Use perguntas padronizadas para comparar qualidade, fontes e consistência das respostas.
            </p>
          </div>
        </div>
        <Field label="Perguntas de teste, uma por linha">
          <textarea className="input min-h-40 resize-y" value={evalText} onChange={(e) => onChangeText(e.target.value)} />
        </Field>
        <button className="primary-btn mt-3" onClick={onRun} disabled={loading}>
          <Activity className="h-4 w-4" />
          Executar avaliacao
        </button>
      </section>

      {evalRows.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/35 p-4">
            <div className="text-sm font-semibold text-slate-100">Resultado da rodada atual</div>
            <div className="text-xs text-slate-500">{weakRows.length} ponto(s) fraco(s) detectado(s)</div>
          </div>
          <EvaluationRows rows={evalRows} />
        </section>
      )}

      <EvaluationHistory evalRuns={evalRuns} selectedRunId={selectedRun?.id} onSelectRun={onSelectRun} />

      {selectedRun && (
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.22)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/35 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-100">Detalhe da rodada</div>
              <div className="mt-1 text-xs text-slate-500">{selectedRun.id}</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1">{selectedRun.avg_score.toFixed(2)}/5</span>
              <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1">{selectedRun.weak_answers} fraca(s)</span>
              <span className="rounded-md border border-slate-800 bg-slate-950/45 px-2.5 py-1">{selectedRun.good_answers}/{selectedRun.total} boas</span>
            </div>
          </div>
          <EvaluationRows rows={selectedRun.rows} />
        </section>
      )}
    </div>
  );
}

function isWeakEvalRow(row: EvalRow) {
  return row.score < 3 || ["weak", "unsupported", "error", "unparsed"].includes(row.verdict);
}

function EvaluationRows({ rows }: { rows: EvalRow[] }) {
  return (
    <div className="divide-y divide-slate-800">
      {rows.map((row) => (
        <details key={`${row.question}-${row.verdict}`} className="p-4 open:bg-slate-800/25">
          <summary className="grid cursor-pointer gap-3 text-sm text-slate-100 md:grid-cols-[1fr_80px_120px] md:items-center">
            <span className="min-w-0">{row.question}</span>
            <span>{row.score}/5</span>
            <VerdictPill verdict={row.verdict} />
          </summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
            <div>Fonte principal: {row.top_source || "sem fonte"} · {row.sources} fonte(s)</div>
            <div>{row.justification}</div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/45 p-3 text-slate-200">{row.answer_preview}</div>
          </div>
        </details>
      ))}
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: string }) {
  const weak = ["weak", "unsupported", "error", "unparsed"].includes(verdict);
  const good = ["excellent", "good"].includes(verdict);
  const tone = good
    ? "border-teal-300/25 bg-teal-300/10 text-teal-200"
    : weak
      ? "border-rose-300/25 bg-rose-300/10 text-rose-200"
      : "border-amber-300/25 bg-amber-300/10 text-amber-200";

  return <span className={`w-fit rounded-md border px-2.5 py-1 text-xs font-medium ${tone}`}>{verdict}</span>;
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

function RecentDocuments({ documents, onOpenIngest }: { documents: DocumentSummary[]; onOpenIngest: () => void }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.18)]">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <FileText className="h-4 w-4 text-teal-300" />
          Documentos recentes
        </div>
        <button className="secondary-btn min-h-9 px-3 py-1.5" onClick={onOpenIngest}>Gerenciar</button>
      </div>
      <div className="divide-y divide-slate-800">
        {documents.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Nenhum documento indexado ainda.</div>
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
}: {
  evalRuns: EvalRun[];
  selectedRunId?: string;
  onSelectRun?: (runId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_52px_rgba(2,6,23,0.18)]">
      <div className="flex items-center gap-2 border-b border-slate-800 p-4 text-sm font-semibold text-slate-100">
        <History className="h-4 w-4 text-teal-300" />
        Histórico de avaliações
      </div>
      <div className="divide-y divide-slate-800">
        {evalRuns.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Nenhuma rodada registrada para esta collection.</div>
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
                  {new Date(run.created_at * 1000).toLocaleString()} · {run.total} pergunta(s) · {run.good_answers} boas
                </div>
                {!!run.top_sources.length && (
                  <div className="mt-2 truncate text-xs text-slate-400">Fontes: {run.top_sources.join(", ")}</div>
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
                    Detalhes
                  </button>
                )}
                <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-right">
                  <div className="text-sm font-semibold text-slate-50">{run.avg_score.toFixed(2)}/5</div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">score</div>
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

function providerVisual(providerId: string) {
  const visuals: Record<string, { icon: React.ReactNode; tone: string; hint: string }> = {
    openai: { icon: <Sparkles className="h-4 w-4" />, tone: "text-emerald-200 bg-emerald-300/10", hint: "Modelos GPT e embeddings" },
    openrouter: { icon: <Globe2 className="h-4 w-4" />, tone: "text-violet-200 bg-violet-300/10", hint: "Catálogo multi-provedor" },
    groq: { icon: <Zap className="h-4 w-4" />, tone: "text-orange-200 bg-orange-300/10", hint: "Inferência rápida" },
    together: { icon: <Cloud className="h-4 w-4" />, tone: "text-sky-200 bg-sky-300/10", hint: "Modelos open-source" },
    "local-openai": { icon: <Cpu className="h-4 w-4" />, tone: "text-teal-200 bg-teal-300/10", hint: "Executado localmente" },
  };
  return visuals[providerId] || { icon: <Bot className="h-4 w-4" />, tone: "text-slate-200 bg-slate-300/10", hint: "Provedor compatível" };
}

function ProviderPicker({
  providers,
  value,
  providerConfig,
  onChange,
}: {
  providers: AIProvider[];
  value: string;
  providerConfig: Record<string, AIProviderRuntimeConfig>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Selecionar provedor">
      {providers.map((provider) => {
        const selected = provider.id === value;
        const visual = providerVisual(provider.id);
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
            <span className={`h-2 w-2 rounded-full ${configured ? "bg-teal-300" : "bg-slate-700"}`} title={configured ? "Credencial configurada" : "Credencial pendente"} />
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
    <div className="rounded-lg border border-slate-800">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-300"
        onClick={() => setOpen((current) => !current)}
      >
        <span>Credenciais e endpoints</span>
        <span className="text-slate-500">{open ? "ocultar" : "editar"}</span>
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
                    {runtime.has_api_key ? runtime.api_key_masked || "key salva" : provider.api_key_env}
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
                  placeholder={runtime.has_api_key ? "Nova API key opcional" : "API key"}
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
