export type Tab = "dashboard" | "chat" | "ingest" | "eval" | "ops";

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

export type IngestStatus = "indexed" | "skipped" | "empty" | "error";

export interface IngestResult {
  filename: string;
  stored_as: string;
  status: IngestStatus;
  chunks: number;
  vectors: number;
  message?: string;
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

export interface EvalRun {
  id: string;
  collection: string;
  created_at: number;
  total: number;
  avg_score: number;
  good_answers: number;
  top_sources: string[];
  json_path: string;
  csv_path: string;
}

export interface EvalRunDetail extends EvalRun {
  weak_answers: number;
  rows: EvalRow[];
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

export interface StatusCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface OperationalStatus {
  service: {
    name: string;
    version: string;
    base_url: string;
    collection: string;
  };
  ready: boolean;
  checks: StatusCheck[];
  metrics: {
    collections: number;
    sessions: number;
    documents: number;
    chunks: number;
    evaluations: number;
  };
  storage: {
    data_dir: string;
    uploads_dir: string;
    metadata_path: string;
    evaluations_dir: string;
  };
}
