export type PromptTemplateId = "universal" | "chat" | "image" | "custom";

export type PromptDoc = {
  type: PromptTemplateId;
  prompt_raw: string;
  fields: Record<string, string>;
  meta: {
    version: number;
    template: PromptTemplateId;
    updated_at_iso: string;
  };
};

export type FieldStatus = "confident" | "review" | "missing";

export const TEMPLATE_FIELDS: Record<Exclude<PromptTemplateId, "custom">, string[]> = {
  universal: [
    "goal",
    "context",
    "constraints",
    "style",
    "input",
    "output_format",
    "examples",
    "negative",
    "notes",
  ],
  chat: [
    "system",
    "user",
    "assistant",
    "constraints",
    "tools",
    "output_format",
    "examples",
    "negative",
    "notes",
  ],
  image: [
    "subject",
    "hair",
    "clothing",
    "pose",
    "expression",
    "environment",
    "lighting",
    "camera",
    "composition",
    "style",
    "color_palette",
    "quality",
    "negative",
    "notes",
  ],
};

const REQUIRED_FIELDS: Record<Exclude<PromptTemplateId, "custom">, string[]> = {
  universal: ["goal", "output_format"],
  chat: ["system", "user"],
  image: ["subject", "style"],
};

const REVIEW_FIELDS = new Set(["goal", "system", "user", "subject", "output_format", "style", "negative"]);

function nowIso() {
  return new Date().toISOString();
}

export function normalizeKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");
}

export function isPromptTemplateId(value: unknown): value is PromptTemplateId {
  return value === "universal" || value === "chat" || value === "image" || value === "custom";
}

export function mergeTemplateFields(template: PromptTemplateId, existing: Record<string, string>) {
  if (template === "custom") return { ...existing };
  const keys = TEMPLATE_FIELDS[template];
  const next: Record<string, string> = {};
  for (const key of keys) next[key] = existing[key] ?? "";
  for (const [key, value] of Object.entries(existing)) {
    if (!(key in next)) next[key] = value;
  }
  return next;
}

function pickNegativeBlock(lines: string[]) {
  const index = lines.findIndex((line) => /^\s*negative(?:\s+prompt)?\s*:/i.test(line));
  if (index < 0) return "";

  const firstLine = lines[index].replace(/^\s*negative(?:\s+prompt)?\s*:\s*/i, "").trim();
  const block: string[] = [];
  if (firstLine) block.push(firstLine);

  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) break;
    if (/^\s*[A-Za-z][A-Za-z0-9 \-_/]{1,40}\s*:\s*/.test(line)) break;
    block.push(line.trim());
  }

  return block.join("\n").trim();
}

function detectOutputFormat(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("json")) return "json";
  if (lower.includes("markdown")) return "markdown";
  if (lower.includes("html")) return "html";
  if (lower.includes("table") || lower.includes("csv")) return "table";
  return "";
}

function detectUniversalGoal(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const commandLine = lines.find((line) => /^(write|create|generate|draft|summarize|extract|translate|plan|brainstorm)\b/i.test(line));
  if (commandLine) return commandLine;

  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  if (firstSentence && firstSentence.length <= 180) return firstSentence;
  return lines[0] ?? "";
}

export function autoExtract(prompt: string, template: PromptTemplateId): Record<string, string> {
  const out: Record<string, string> = {};
  const text = prompt.trim();
  if (!text) return out;

  const lines = text.split(/\r?\n/);
  const negative = pickNegativeBlock(lines);
  if (negative) out.negative = negative;

  const roleHeader = /^\s*(system|user|assistant)\s*:\s*(.*)\s*$/i;
  const roleBuffers: Record<"system" | "user" | "assistant", string[]> = { system: [], user: [], assistant: [] };
  let currentRole: "system" | "user" | "assistant" | null = null;

  for (const line of lines) {
    const roleMatch = line.match(roleHeader);
    if (roleMatch) {
      currentRole = roleMatch[1].toLowerCase() as "system" | "user" | "assistant";
      const rest = roleMatch[2]?.trim();
      if (rest) roleBuffers[currentRole].push(rest);
      continue;
    }

    if (currentRole) {
      if (/^\s*[A-Za-z][A-Za-z0-9 \-_/]{1,40}\s*:\s*/.test(line)) {
        currentRole = null;
      } else {
        roleBuffers[currentRole].push(line);
        continue;
      }
    }
  }

  if (template === "chat") {
    (["system", "user", "assistant"] as const).forEach((role) => {
      const joined = roleBuffers[role].join("\n").trim();
      if (joined) out[role] = joined;
    });
  }

  const kvRegex = /^\s*([A-Za-z][A-Za-z0-9 \-_/]{1,40})\s*:\s*(.+?)\s*$/;
  for (const line of lines) {
    const match = line.match(kvRegex);
    if (!match) continue;
    const key = normalizeKey(match[1]);
    const value = match[2].trim();
    if (!value) continue;
    if (template === "chat" && (key === "system" || key === "user" || key === "assistant")) continue;
    out[key] = out[key] ? `${out[key]}\n${value}` : value;
  }

  if (!out.output_format) {
    const format = detectOutputFormat(text);
    if (format) out.output_format = format;
  }

  if (template === "image") {
    const lower = text.toLowerCase();
    if (!out.style) {
      const styleHits = ["cinematic", "photorealistic", "anime", "illustration", "3d", "film", "noir"].filter((word) =>
        lower.includes(word),
      );
      if (styleHits.length) out.style = styleHits.join(", ");
    }
    if (!out.quality) {
      const qualityHits = ["high detail", "ultra detailed", "8k", "hdr", "sharp focus"].filter((word) => lower.includes(word));
      if (qualityHits.length) out.quality = qualityHits.join(", ");
    }
    if (!out.subject) {
      const firstLine = text.split(/\r?\n/).find((line) => line.trim())?.trim() ?? "";
      if (firstLine) out.subject = firstLine.slice(0, 180);
    }
  }

  if (template === "universal" && !out.goal) {
    const goal = detectUniversalGoal(text);
    if (goal) out.goal = goal;
  }

  if (template === "chat" && !out.user) {
    const cleaned = text.replace(/^\s*system\s*:/im, "").trim();
    if (cleaned) out.user = cleaned.slice(0, 1200);
  }

  return out;
}

export function buildPromptDoc(template: PromptTemplateId, promptRaw: string, fields: Record<string, string>): PromptDoc {
  return {
    type: template,
    prompt_raw: promptRaw,
    fields,
    meta: {
      version: 1,
      template,
      updated_at_iso: nowIso(),
    },
  };
}

export function buildCleanPrompt(template: PromptTemplateId, fields: Record<string, string>) {
  const rows = Object.entries(fields)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value);

  if (!rows.length) return "";

  if (template === "chat") {
    return (["system", "user", "assistant"] as const)
      .filter((role) => fields[role]?.trim())
      .map((role) => `${role}:\n${fields[role].trim()}`)
      .join("\n\n");
  }

  return rows.map(([key, value]) => `${key}: ${value}`).join("\n");
}

export function getFieldStatusMap(template: PromptTemplateId, fields: Record<string, string>): Record<string, FieldStatus> {
  const result: Record<string, FieldStatus> = {};

  for (const [key, value] of Object.entries(fields)) {
    const trimmed = value.trim();
    if (!trimmed) {
      result[key] = "missing";
      continue;
    }
    result[key] = REVIEW_FIELDS.has(key) && trimmed.length < 12 ? "review" : "confident";
  }

  if (template !== "custom") {
    for (const key of REQUIRED_FIELDS[template]) {
      if (!fields[key]?.trim()) result[key] = "missing";
    }
  }

  return result;
}

export function getMissingQuestions(template: PromptTemplateId, fields: Record<string, string>) {
  if (template === "custom") return [];

  const questions: string[] = [];
  if (template === "universal") {
    if (!fields.goal?.trim()) questions.push("What is the exact job this prompt should complete?");
    if (!fields.output_format?.trim()) questions.push("What format should the answer come back in?");
  }
  if (template === "chat") {
    if (!fields.system?.trim()) questions.push("What role or behavior should the assistant follow?");
    if (!fields.user?.trim()) questions.push("What should the user actually ask the model to do?");
  }
  if (template === "image") {
    if (!fields.subject?.trim()) questions.push("What is the main subject of the image?");
    if (!fields.style?.trim()) questions.push("What visual style should the image use?");
    if (!fields.lighting?.trim()) questions.push("What lighting should define the scene?");
  }

  return questions.slice(0, 3);
}

export function parseImportedDoc(raw: string): { ok: true; value: PromptDoc } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Imported value must be an object." };
  }

  const candidate = parsed as Partial<PromptDoc> & { meta?: { template?: unknown } };
  const templateValue = candidate.meta?.template ?? candidate.type ?? "custom";
  if (!isPromptTemplateId(templateValue)) {
    return { ok: false, error: "Template must be universal, chat, image, or custom." };
  }

  const fields =
    candidate.fields && typeof candidate.fields === "object" && !Array.isArray(candidate.fields)
      ? Object.fromEntries(Object.entries(candidate.fields).map(([key, value]) => [normalizeKey(key), String(value ?? "")]))
      : {};

  return {
    ok: true,
    value: buildPromptDoc(templateValue, typeof candidate.prompt_raw === "string" ? candidate.prompt_raw : "", mergeTemplateFields(templateValue, fields)),
  };
}
