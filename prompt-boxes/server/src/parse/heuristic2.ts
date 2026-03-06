import type { PromptDoc, ParseResponse, InputItem } from "../types.js";

const URL_RE = /\bhttps?:\/\/[^\s)]+/gi;

type Sections = Partial<
  Record<"goal" | "audience" | "constraints" | "style" | "output" | "inputs" | "examples" | "other", string>
>;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function splitLines(s: string) {
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function extractSections(text: string): Sections {
  const lines = text.split(/\r?\n/);
  const out: Sections = {};
  let cur: keyof Sections = "other";
  const headerMap: Array<[RegExp, keyof Sections]> = [
    [/^\s*(goal|task|objective)\s*:\s*/i, "goal"],
    [/^\s*(audience|for)\s*:\s*/i, "audience"],
    [/^\s*(constraints|rules|requirements)\s*:\s*/i, "constraints"],
    [/^\s*(style|tone|voice)\s*:\s*/i, "style"],
    [/^\s*(output|format|response)\s*:\s*/i, "output"],
    [/^\s*(inputs|context|data|source)\s*:\s*/i, "inputs"],
    [/^\s*(examples?)\s*:\s*/i, "examples"]
  ];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    let matched: keyof Sections | null = null;
    let stripped = line;

    for (const [re, key] of headerMap) {
      if (re.test(line)) {
        matched = key;
        stripped = line.replace(re, "");
        break;
      }
    }

    if (matched) cur = matched;

    const prev = out[cur] ?? "";
    out[cur] = (prev ? `${prev}\n` : "") + stripped.trim();
  }

  return out;
}

function normalizeFormat(t: string): PromptDoc["output"]["format"] {
  const s = t.toLowerCase();
  if (/(json|valid json|object|array|return as json)/.test(s)) return "json";
  if (/(markdown|respond with markdown|md\b)/.test(s)) return "markdown";
  if (/(html)/.test(s)) return "html";
  if (/(table|csv|tsv|spreadsheet|in a table)/.test(s)) return "table";
  return "text";
}

function detectTone(t: string): string {
  const s = t.toLowerCase();
  const tones = ["formal", "friendly", "professional", "casual", "persuasive", "funny", "serious", "empathetic", "neutral"];
  for (const tone of tones) if (s.includes(tone)) return tone;
  if (/(concise|to the point)/.test(s)) return "professional";
  return "neutral";
}

function detectLength(t: string): PromptDoc["style"]["length"] {
  const s = t.toLowerCase();
  if (/(very short|brief|under \d+ words|max \d+ words)/.test(s)) return "short";
  if (/(long|detailed|in-depth|extended|thorough)/.test(s)) return "long";
  return "medium";
}

function extractConstraints(text: string): string[] {
  const lines = splitLines(text);
  const out: string[] = [];

  const push = (v: string) => {
    const x = v.replace(/^[-*•]\s*/, "").trim();
    if (!x) return;
    out.push(x);
  };

  for (const l of lines) {
    const low = l.toLowerCase();
    if (
      low.startsWith("must") ||
      low.startsWith("do not") ||
      low.startsWith("don't") ||
      low.startsWith("avoid") ||
      low.startsWith("never") ||
      low.startsWith("no ") ||
      low.startsWith("only ")
    ) {
      push(l);
    } else if (/(must|do not|don't|avoid|never|only|max \d+|under \d+|no emojis|no links)/i.test(l)) {
      push(l);
    }
  }

  const inline = text.match(/(?:must|should|avoid|never|do not|don't)\s+[^.!\n]{5,120}/gi) ?? [];
  for (const frag of inline) push(frag);

  return Array.from(new Set(out)).slice(0, 25);
}

function extractAudience(text: string): string {
  const m =
    text.match(/(?:for|audience|targeted at|aimed at|intended for)\s+([^.!\n]{3,90})/i) ??
    text.match(/(?:to)\s+(beginners|developers|students|customers|clients|managers|executives)\b/i);

  if (!m) return "";
  return (m[1] ?? m[0]).replace(/^to\s+/i, "").trim();
}

function extractGoal(text: string): string {
  const lines = splitLines(text);
  const candidates = lines.filter((l) => /^(write|create|generate|draft|summarize|extract|translate|plan|brainstorm|convert)\b/i.test(l));
  const best = candidates[0] ?? lines[0] ?? "";
  return best.length > 220 ? `${best.slice(0, 220).trim()}...` : best;
}

function extractInputs(text: string, inputsSection?: string): InputItem[] {
  const urls = (text.match(URL_RE) ?? []).map((u) => u.trim());
  const items: InputItem[] = urls.map((u, idx) => ({ name: `Link ${idx + 1}`, type: "url", value: u }));

  const ctx = (inputsSection ?? "").trim();
  if (ctx && ctx.length >= 15) {
    items.unshift({ name: "Context", type: "text", value: ctx.slice(0, 4000) });
  }

  return items.slice(0, 10);
}

function scoreField(valuePresent: boolean, fromHeader: boolean, countHint = 0): number {
  const base = valuePresent ? 0.55 : 0.1;
  const headerBoost = fromHeader ? 0.3 : 0;
  const countBoost = clamp01(countHint / 10) * 0.15;
  return clamp01(base + headerBoost + countBoost);
}

function lowSpecificityPenalty(value: string, weakValues: string[]): number {
  const v = value.trim().toLowerCase();
  if (!v) return 0.25;
  if (v.length <= 8) return 0.2;
  if (weakValues.includes(v)) return 0.2;
  return 0;
}

export function parsePromptHeuristicV2(source_prompt: string): ParseResponse {
  const text = (source_prompt ?? "").trim();
  const sections = extractSections(text);

  const goalRaw = (sections.goal ?? "").trim();
  const goal = goalRaw || extractGoal(text);

  const audienceRaw = (sections.audience ?? "").trim();
  const audience = audienceRaw || extractAudience(text);

  const constraintsRaw = (sections.constraints ?? "").trim();
  const constraints = extractConstraints(constraintsRaw || text);

  const styleText = `${sections.style ?? ""}\n${text}`.trim();
  const tone = detectTone(styleText);
  const length = detectLength(styleText);

  const outputText = `${sections.output ?? ""}\n${text}`.trim();
  const format = normalizeFormat(outputText);

  const inputs = extractInputs(text, sections.inputs);

  const data: PromptDoc = {
    goal,
    audience,
    inputs,
    constraints,
    style: { tone, voice: "", length, reading_level: "" },
    output: { format, schema: null },
    examples: [],
    source_prompt: source_prompt ?? "",
    notes: ""
  };

  const missing_questions: string[] = [];
  if (!data.goal.trim()) missing_questions.push("What do you want to achieve (in one sentence)?");
  if (!data.audience.trim()) missing_questions.push("Who is this for (audience)?");
  if (!data.output.format) missing_questions.push("What output format do you want (text/markdown/json/html/table)?");

  const goalScore = scoreField(Boolean(data.goal.trim()), Boolean(goalRaw)) - lowSpecificityPenalty(data.goal, ["help me", "help", "do this"]);
  const audienceScore = scoreField(Boolean(data.audience.trim()), Boolean(audienceRaw)) - lowSpecificityPenalty(data.audience, ["people", "everyone", "users"]);

  const field_confidence: Record<string, number> = {
    goal: clamp01(goalScore),
    audience: clamp01(audienceScore),
    inputs: scoreField(data.inputs.length > 0, Boolean((sections.inputs ?? "").trim()), data.inputs.length),
    constraints: scoreField(data.constraints.length > 0, Boolean(constraintsRaw), data.constraints.length),
    style: scoreField(true, Boolean((sections.style ?? "").trim()), Number(tone !== "neutral") + Number(length !== "medium")),
    output: scoreField(Boolean(data.output.format), Boolean((sections.output ?? "").trim()), Number(format !== "text"))
  };

  return { data, missing_questions: missing_questions.slice(0, 3), field_confidence };
}

