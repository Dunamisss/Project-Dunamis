import type { ParseResponse, PromptDoc } from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").trim().replace(/\/+$/, "");
const API_PREFIX = API_BASE ? `${API_BASE}/api` : "/api";

export async function parsePrompt(source_prompt: string): Promise<ParseResponse> {
  const res = await fetch(`${API_PREFIX}/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_prompt })
  });
  if (!res.ok) throw new Error("Parse failed");
  return res.json();
}

export async function renderCleanPrompt(doc: PromptDoc): Promise<string> {
  const res = await fetch(`${API_PREFIX}/render-clean-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc })
  });
  if (!res.ok) throw new Error("Render failed");
  const j = await res.json();
  return j.clean_prompt as string;
}
