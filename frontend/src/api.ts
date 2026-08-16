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
    const detail = payload.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message || payload.message || response.statusText;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
