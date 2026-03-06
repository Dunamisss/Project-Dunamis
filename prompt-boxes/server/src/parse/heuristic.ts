import type { PromptDoc, ParseResponse, InputItem } from "../types.js";

const URL_RE = /\bhttps?:\/\/[^\s)]+/gi;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function normalizeFormat(text: string): PromptDoc["output"]["format"] {
  const t = text.toLowerCase();
  if (t.includes("markdown") || t.includes("md")) return "markdown";
  if (t.includes("json")) return "json";
  if (t.includes("html")) return "html";
  if (t.includes("table") || t.includes("csv")) return "table";
  return "text";
}

function detectLength(text: string): PromptDoc["style"]["length"] {
  const t = text.toLowerCase();
  if (/(very short|short|brief|under \d+ words|max \d+ words)/.test(t)) return "short";
  if (/(long|detailed|in-depth|extended)/.test(t)) return "long";
  return "medium";
}

function detectTone(text: string): string {
  const t = text.toLowerCase();
  const tones = ["formal", "friendly", "professional", "casual", "persuasive", "funny", "serious", "empathetic", "neutral"];
  for (const tone of tones) if (t.includes(tone)) return tone;
  return "neutral";
}

function splitConstraints(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];

  for (const l of lines) {
    const low = l.toLowerCase();
    if (
      low.startsWith("must ") ||
      low.startsWith("must:") ||
      low.startsWith("do not") ||
      low.startsWith("don't") ||
      low.startsWith("avoid") ||
      low.startsWith("never") ||
      low.startsWith("no ") ||
      low.startsWith("only ")
    ) {
      out.push(l.replace(/^[-*•]\s*/, ""));
      continue;
    }
    if (/(must|do not|don't|avoid|never|no emojis|max \d+|under \d+ words)/i.test(l)) {
      out.push(l.replace(/^[-*•]\s*/, ""));
    }
  }

  return Array.from(new Set(out)).slice(0, 20);
}

function detectAudience(text: string): string {
  const m =
    text.match(/(?:for|audience|targeted at|to)\s+([^.!\n]{3,80})/i) ||
    text.match(/(?:aimed at|intended for)\s+([^.!\n]{3,80})/i);
  return m?.[1]?.trim() ?? "";
}

function detectGoal(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates = lines.filter((l) => /^(write|create|generate|draft|summarize|extract|translate|plan|brainstorm)\b/i.test(l));
  if (candidates.length) return candidates[0].replace(/^[-*•]\s*/, "");

  const first = lines[0] ?? "";
  return first.length > 140 ? first.slice(0, 140).trim() + "…" : first;
}

function detectInputs(text: string): InputItem[] {
  const urls = (text.match(URL_RE) ?? []).map((u) => u.trim());
  const items: InputItem[] = urls.map((u, idx) => ({ name: `Link ${idx + 1}`, type: "url", value: u }));

  const inputBlocks = text.match(/(?:^|\n)(?:input|context|data)\s*:\s*([\s\S]{20,800})/i);
  if (inputBlocks?.[1]) {
    const val = inputBlocks[1].trim();
    items.unshift({ name: "Context", type: "text", value: val.slice(0, 4000) });
  }

  return items.slice(0, 10);
}

export function parsePromptHeuristic(source_prompt: string): ParseResponse {
  const text = (source_prompt ?? "").trim();

  const goal = text ? detectGoal(text) : "";
  const audience = text ? detectAudience(text) : "";
  const constraints = text ? splitConstraints(text) : [];
  const tone = text ? detectTone(text) : "neutral";
  const length = text ? detectLength(text) : "medium";
  const format = text ? normalizeFormat(text) : "text";
  const inputs = text ? detectInputs(text) : [];

  const data: PromptDoc = {
    goal,
    audience,
    inputs,
    constraints,
    style: {
      tone,
      voice: "",
      length,
      reading_level: ""
    },
    output: {
      format,
      schema: null
    },
    examples: [],
    source_prompt: source_prompt ?? "",
    notes: ""
  };

  const missing_questions: string[] = [];
  if (!data.goal.trim()) missing_questions.push("What do you want to achieve (in one sentence)?");
  if (!data.output.format) missing_questions.push("What output format do you want (text/markdown/json/html/table)?");
  if (!data.audience.trim()) missing_questions.push("Who is this for (audience)?");

  const field_confidence: Record<string, number> = {
    goal: clamp01(goal ? 0.8 : 0.1),
    audience: clamp01(audience ? 0.7 : 0.2),
    inputs: clamp01(inputs.length ? 0.7 : 0.3),
    constraints: clamp01(constraints.length ? 0.7 : 0.3),
    style: clamp01(tone !== "neutral" || length !== "medium" ? 0.7 : 0.4),
    output: clamp01(format !== "text" ? 0.7 : 0.5)
  };

  return {
    data,
    missing_questions: missing_questions.slice(0, 3),
    field_confidence
  };
}
