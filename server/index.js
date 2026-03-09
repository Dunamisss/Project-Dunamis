import express from "express";
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import multer from "multer";
import sharp from "sharp";

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const USAGE_LIMIT = Number.parseInt(process.env.DAILY_LIMIT || "5", 10);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const allowList = (process.env.ALLOWLIST_EMAILS || "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const DISPOSABLE_BLOCKLIST_URL =
  process.env.DISPOSABLE_BLOCKLIST_URL ||
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/refs/heads/main/disposable_email_blocklist.conf";
const DISPOSABLE_ALLOWLIST_URL =
  process.env.DISPOSABLE_ALLOWLIST_URL ||
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/refs/heads/main/allowlist.conf";
const VPN_IPV4_URL =
  process.env.VPN_IPV4_URL ||
  "https://raw.githubusercontent.com/X4BNet/lists_vpn/refs/heads/main/output/vpn/ipv4.txt";

const usageByKey = new Map();
const contactSubmissionsByIp = new Map();
const promptRepairRequestsByIp = new Map();
let disposableBlocklist = new Set();
let disposableAllowlist = new Set();
let vpnIpv4Cidrs = [];
const EDGE_KERNEL = {
  width: 3,
  height: 3,
  kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
};

function getPreferredOptimizerProvider() {
  const configured = (process.env.OPTIMIZER_PROVIDER || "").trim().toLowerCase();
  if (configured === "openrouter" || configured === "ollama") {
    return configured;
  }
  return process.env.OPENROUTER_API_KEY?.trim() ? "openrouter" : "ollama";
}

function getOpenRouterModel() {
  return (process.env.OPENROUTER_MODEL || "openrouter/free").trim();
}

function fingerprintSecret(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex").slice(0, 12);
}

function formatOpenRouterError(status, errText) {
  if (status === 401) {
    return `OpenRouter rejected the API key (401 Unauthorized). Re-save OPENROUTER_API_KEY in Render. ${errText}`.trim();
  }
  return errText || `OpenRouter API error (${status}).`;
}

function getUsageRecord(key) {
  const existing = usageByKey.get(key);
  if (!existing) {
    const record = { count: 0, is_banned: false };
    usageByKey.set(key, record);
    return record;
  }
  return existing;
}


function getSupabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_ENABLED) return null;
  const base = SUPABASE_URL.replace(/\/+$/, "");
  const url = `${base}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: getSupabaseHeaders(options.headers || {}),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Supabase error ${response.status}: ${errorText || "Request failed."}`);
  }
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function supabaseSelectSingle(table, filters) {
  const params = new URLSearchParams({ select: "*" });
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`);
  }
  params.set("limit", "1");
  const path = `${table}?${params.toString()}`;
  const rows = await supabaseRequest(path, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (Array.isArray(rows) && rows.length > 0) return rows[0];
  return null;
}

async function supabaseUpsert(table, payload) {
  return supabaseRequest(table, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
}

async function supabaseUpdate(table, filters, payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`);
  }
  const path = `${table}?${params.toString()}`;
  return supabaseRequest(path, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
}

async function supabaseDomainBlocked(domain) {
  if (!SUPABASE_ENABLED || !domain) return false;
  const parts = domain.split(".").filter(Boolean);
  if (parts.length < 2) return false;
  const candidates = [];
  for (let i = 0; i < parts.length - 1; i += 1) {
    candidates.push(parts.slice(i).join("."));
  }
  const params = new URLSearchParams({ select: "domain", limit: "1" });
  params.set("domain", `in.(${candidates.join(",")})`);
  const path = `blocked_domains?${params.toString()}`;
  try {
    const rows = await supabaseRequest(path, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.warn("Supabase blocked domain lookup failed.", error);
    return false;
  }
}

function parseDomainList(text) {
  return new Set(
    text
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith("#"))
  );
}

function domainMatchesList(domain, list) {
  const parts = domain.split(".").filter(Boolean);
  if (parts.length < 2) return false;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const candidate = parts.slice(i).join(".");
    if (list.has(candidate)) return true;
  }
  return false;
}

function isDisposableEmail(email) {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@").pop()?.trim().toLowerCase() || "";
  if (!domain) return false;
  if (domainMatchesList(domain, disposableAllowlist)) return false;
  return domainMatchesList(domain, disposableBlocklist);
}

function ipToInt(ip) {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  );
}

function parseCidrList(text) {
  const cidrs = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [ip, bitsRaw] = trimmed.split("/");
    const bits = bitsRaw ? Number.parseInt(bitsRaw, 10) : 32;
    if (!ip || Number.isNaN(bits) || bits < 0 || bits > 32) continue;
    const ipInt = ipToInt(ip);
    if (ipInt === null) continue;
    const mask = bits === 0 ? 0 : ((~0 << (32 - bits)) >>> 0);
    cidrs.push({ base: ipInt & mask, mask });
  }
  return cidrs;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = (Array.isArray(forwarded) ? forwarded[0] : forwarded || "").split(",")[0]?.trim();
  const candidate = raw || req.ip || "";
  if (!candidate) return null;
  if (candidate.includes(".") && candidate.includes(":")) {
    return candidate.split(":").pop() || null;
  }
  return candidate.includes(".") ? candidate : null;
}

function isLikelyVpnIp(ip) {
  if (!ip || vpnIpv4Cidrs.length === 0) return false;
  const ipInt = ipToInt(ip);
  if (ipInt === null) return false;
  for (const { base, mask } of vpnIpv4Cidrs) {
    if ((ipInt & mask) === base) return true;
  }
  return false;
}

function isContactRateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const windowMs = Number.parseInt(process.env.CONTACT_MIN_INTERVAL_MS || "60000", 10);
  const last = contactSubmissionsByIp.get(ip) || 0;
  if (now - last < windowMs) return true;
  contactSubmissionsByIp.set(ip, now);
  return false;
}

function isPromptRepairRateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const windowMs = Number.parseInt(process.env.PROMPT_REPAIR_WINDOW_MS || "60000", 10);
  const limit = Number.parseInt(process.env.PROMPT_REPAIR_MAX_PER_WINDOW || "12", 10);
  const record = promptRepairRequestsByIp.get(ip) || { count: 0, startedAt: now };

  if (now - record.startedAt >= windowMs) {
    promptRepairRequestsByIp.set(ip, { count: 1, startedAt: now });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count += 1;
  promptRepairRequestsByIp.set(ip, record);
  return false;
}

function getColoringStrength(ageGroup) {
  switch (ageGroup) {
    case "3-5":
      return { threshold: 122, blurSigma: 0.85, sharpenAmount: 0.8, fineOpacity: 0.5, dilate: 1 };
    case "6-8":
      return { threshold: 116, blurSigma: 0.7, sharpenAmount: 0.95, fineOpacity: 0.58, dilate: 1 };
    case "9-12":
      return { threshold: 110, blurSigma: 0.55, sharpenAmount: 1.05, fineOpacity: 0.66, dilate: 1 };
    case "13-17":
      return { threshold: 106, blurSigma: 0.4, sharpenAmount: 1.15, fineOpacity: 0.72, dilate: 1 };
    case "18+":
      return { threshold: 100, blurSigma: 0.3, sharpenAmount: 1.25, fineOpacity: 0.8, dilate: 1 };
    default:
      return { threshold: 110, blurSigma: 0.55, sharpenAmount: 1.05, fineOpacity: 0.66, dilate: 1 };
  }
}

async function fetchImageBuffer(imageUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Remote image fetch failed with status ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      throw new Error("Provided image URL did not return an image.");
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getInkCoverageRatio(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let inkPixels = 0;
  for (let i = 0; i < data.length; i += 1) {
    if (data[i] < 225) {
      inkPixels += 1;
    }
  }
  const totalPixels = info.width * info.height;
  if (!totalPixels) return 0;
  return inkPixels / totalPixels;
}

async function toColoringOutline(inputBuffer, ageGroup = "9-12") {
  const { threshold, blurSigma, sharpenAmount, fineOpacity, dilate } = getColoringStrength(ageGroup);

  const prepared = sharp(inputBuffer)
    .rotate()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .grayscale()
    .normalise();

  // Coarse edges keep clean printable boundaries.
  const coarseEdges = await prepared
    .clone()
    .blur(blurSigma)
    .convolve(EDGE_KERNEL)
    .linear(2.15, -18)
    .negate()
    .toBuffer();

  // Fine edges recover detail that can otherwise disappear.
  const fineEdges = await prepared
    .clone()
    .convolve({
      width: 3,
      height: 3,
      kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    })
    .linear(1.75, -10)
    .negate()
    .toBuffer();

  const renderOutline = async (tweak = 0) => {
    const adjustedThreshold = Math.max(70, threshold - tweak);
    const adjustedDilate = dilate + (tweak > 0 ? 1 : 0);

    return sharp(coarseEdges)
      .composite([{ input: fineEdges, blend: "screen", opacity: Math.min(0.95, fineOpacity + tweak * 0.004) }])
      .normalise()
      .linear(1.35 + tweak * 0.01, -16 - tweak * 0.5)
      .threshold(adjustedThreshold) // white lines on black
      .negate() // black lines on white
      .dilate(adjustedDilate)
      .median(1)
      .sharpen(sharpenAmount + tweak * 0.01)
      .grayscale()
      .png({ compressionLevel: 9 })
      .toBuffer();
  };

  let processed = await renderOutline(0);
  let inkCoverage = await getInkCoverageRatio(processed);

  // If output is almost blank, regenerate with stronger settings.
  if (inkCoverage < 0.01) {
    processed = await renderOutline(18);
    inkCoverage = await getInkCoverageRatio(processed);
  }
  if (inkCoverage < 0.01) {
    processed = await renderOutline(32);
  }

  return processed;
}

async function loadLists() {
  try {
    const [blocklistText, allowlistText, vpnText] = await Promise.all([
      fetch(DISPOSABLE_BLOCKLIST_URL).then((res) => (res.ok ? res.text() : "")),
      fetch(DISPOSABLE_ALLOWLIST_URL).then((res) => (res.ok ? res.text() : "")),
      fetch(VPN_IPV4_URL).then((res) => (res.ok ? res.text() : "")),
    ]);

    if (blocklistText) disposableBlocklist = parseDomainList(blocklistText);
    if (allowlistText) disposableAllowlist = parseDomainList(allowlistText);
    if (vpnText) vpnIpv4Cidrs = parseCidrList(vpnText);
  } catch (error) {
    console.warn("Warning: failed to refresh blocklists", error);
  }
}

async function callOpenRouter({ systemPrompt, prompt, context, images }) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OpenRouter API key is missing.");
  }

  const model = getOpenRouterModel();
  const contextBlock = context ? `\n\nAdditional context:\n${context}` : "";
  const imageBlock = Array.isArray(images) && images.length
    ? `\n\nImages attached (names only):\n${images.join(", ")}`
    : "";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://dunamiss.xyz",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "Project Dunamis",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt || "" },
        { role: "user", content: `${prompt}${contextBlock}${imageBlock}` },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(formatOpenRouterError(response.status, errText));
  }

  const data = await response.json();
  const output = data?.choices?.[0]?.message?.content ?? "";
  return { output, model };
}

async function callOllama({ systemPrompt, prompt, context, images }) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";
  const keepAlive = process.env.OLLAMA_KEEP_ALIVE || "5m";
  const contextBlock = context ? `\n\nAdditional context:\n${context}` : "";
  const imageBlock = Array.isArray(images) && images.length
    ? `\n\nImages attached (names only):\n${images.join(", ")}`
    : "";

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      keep_alive: keepAlive,
      options: {
        temperature: 0.2,
      },
      messages: [
        { role: "system", content: systemPrompt || "" },
        { role: "user", content: `${prompt}${contextBlock}${imageBlock}` },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(errText || `Ollama API error (${response.status}).`);
  }

  const data = await response.json();
  const output = data?.message?.content ?? "";
  return { output, model };
}

function normalizePromptInput(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function redactSensitiveText(value) {
  return String(value || "")
    .replace(/\b(sk-[A-Za-z0-9_-]{12,})\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(Bearer\s+[A-Za-z0-9._-]{12,})\b/gi, "[REDACTED_BEARER_TOKEN]");
}

function splitPromptClauses(value) {
  return normalizePromptInput(value)
    .split(/[\n.!?;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractEvidenceSnippet(value, matcher) {
  const match = value.match(matcher);
  if (!match) return null;
  return match[0].trim().slice(0, 160);
}

function buildRuleScan(rawPrompt, outputType) {
  const text = normalizePromptInput(rawPrompt);
  const lower = text.toLowerCase();
  const clauses = splitPromptClauses(text);
  const issues = [];

  const addIssue = (code, severity, message, evidence = []) => {
    if (issues.some((issue) => issue.code === code)) return;
    issues.push({ code, severity, message, evidence: evidence.filter(Boolean).slice(0, 2) });
  };

  const actionVerbRegex = /\b(write|create|generate|draft|summarize|extract|analyze|brainstorm|plan|explain|convert|rewrite|compare|list|design)\b/i;
  const hasObjective = clauses.some((clause, index) => index < 3 && actionVerbRegex.test(clause));
  const hasRole = /\b(you are|act as|behave as|role:)\b/i.test(text);
  const hasContext =
    /\b(audience|context|background|using|based on|from the following|target audience|purpose|for (?:an?|the|my|our|this)\b)\b/i.test(text);
  const hasOutputSpec =
    /\b(json|markdown|html|table|csv|bullet|bullets|list|steps|schema|format|response format|output)\b/i.test(text) ||
    outputType === "json";
  const ambiguityHits = [
    ...lower.matchAll(/\b(better|good|nice|improve|optimize|strong|high quality|professional|clean up|fix this)\b/g),
  ].map((match) => match[0]);
  const conciseSignal = /\b(short|brief|concise|one sentence|under \d+ words|max \d+ words)\b/i.test(text);
  const detailSignal = /\b(detailed|comprehensive|in depth|thorough|step by step)\b/i.test(text);
  const singleSentenceSignal = /\b(one sentence|single sentence)\b/i.test(text);
  const listSignal = /\b(bullet|bullets|list|steps)\b/i.test(text);
  const missingInputNeeded =
    /\b(summarize|analyze|extract|rewrite|improve this|based on the text|from the article)\b/i.test(text) &&
    !/\b(text:|article:|input:|context:|data:|notes:|transcript:|below|following)\b/i.test(text);
  const likelyAudienceTask = /\b(email|post|ad|headline|landing page|tweet|caption|proposal)\b/i.test(text);
  const hasAudience =
    /\b(audience|target audience|for (?:customers|clients|beginners|developers|founders|students|marketers|creators|parents|kids|teams))\b/i.test(text);

  if (!hasObjective) {
    addIssue("missing_objective", "high", "The prompt does not clearly state the task to perform.", [
      clauses[0]?.slice(0, 160) || "No clear action statement found.",
    ]);
  }

  if (!hasContext) {
    addIssue("missing_context", "medium", "The prompt lacks useful context such as audience, source material, or purpose.", [
      clauses[0]?.slice(0, 160) || "No context markers found.",
    ]);
  }

  if (!hasOutputSpec) {
    addIssue("missing_output_spec", "high", "The prompt does not say what shape the answer should take.", [
      extractEvidenceSnippet(text, /^.{1,160}/s) || "No output format or response boundary found.",
    ]);
  }

  if (ambiguityHits.length >= 2) {
    addIssue("ambiguous_terms", "medium", "The prompt uses vague quality words without measurable meaning.", ambiguityHits.slice(0, 2));
  }

  if ((conciseSignal && detailSignal) || (singleSentenceSignal && listSignal)) {
    addIssue("conflicting_instructions", "high", "The prompt contains instructions that pull in incompatible directions.", [
      conciseSignal && detailSignal ? "Contains both concise and detailed requirements." : "Contains both single-sentence and list-style requirements.",
    ]);
  }

  if (!/\b(do not|avoid|never|must|only|without|under \d+ words|max \d+ words)\b/i.test(text) && ambiguityHits.length > 0) {
    addIssue("vague_constraints", "medium", "The prompt asks for quality improvements but gives weak or missing constraints.", ambiguityHits.slice(0, 2));
  }

  if ((text.length > 650 && clauses.length > 8) || /\bplease can you|i was wondering if you could|if possible|kind of|sort of\b/i.test(text)) {
    addIssue("verbosity_noise", "low", "The prompt includes filler or low-signal phrasing that can be tightened.", [
      extractEvidenceSnippet(text, /\b(please can you|i was wondering if you could|if possible|kind of|sort of)\b[\s\S]{0,80}/i) ||
        `${text.length} characters across ${clauses.length} clauses.`,
    ]);
  }

  if (likelyAudienceTask && !hasAudience) {
    addIssue("underspecified_audience", "medium", "The task implies an audience, but the audience is not stated clearly.", [
      extractEvidenceSnippet(text, /\b(email|post|ad|headline|landing page|tweet|caption|proposal)\b[\s\S]{0,80}/i) || "Audience is missing.",
    ]);
  }

  if (missingInputNeeded) {
    addIssue("underspecified_input_material", "medium", "The task refers to source material without providing the actual material.", [
      extractEvidenceSnippet(text, /\b(summarize|analyze|extract|rewrite|improve this)\b[\s\S]{0,90}/i) || "Source material not supplied.",
    ]);
  }

  const highCount = issues.filter((issue) => issue.severity === "high").length;
  const mediumCount = issues.filter((issue) => issue.severity === "medium").length;
  const lowCount = issues.filter((issue) => issue.severity === "low").length;
  const score = Math.max(0, 100 - highCount * 24 - mediumCount * 12 - lowCount * 5 + (hasRole ? 4 : 0) + (hasOutputSpec ? 4 : 0));
  const rewriteNeeded =
    highCount > 0 ||
    score < 70 ||
    issues.some((issue) => issue.code === "missing_objective" || issue.code === "missing_output_spec");

  const recommendations = [];
  if (issues.some((issue) => issue.code === "missing_objective")) recommendations.push("State the exact job in one sentence.");
  if (issues.some((issue) => issue.code === "missing_context")) recommendations.push("Add audience, domain, or source context.");
  if (issues.some((issue) => issue.code === "missing_output_spec")) recommendations.push("Specify the output shape or format.");
  if (issues.some((issue) => issue.code === "conflicting_instructions")) recommendations.push("Remove contradictions and keep only one direction.");
  if (issues.some((issue) => issue.code === "verbosity_noise")) recommendations.push("Strip filler and keep only instructions that change the result.");

  return {
    quality_score: score,
    rewrite_needed: rewriteNeeded,
    issues,
    recommendations: recommendations.slice(0, 4),
    normalized: {
      text,
      clauses,
      signals: {
        hasObjective,
        hasRole,
        hasContext,
        hasOutputSpec,
      },
    },
  };
}

function buildPromptSpec(text, outputType) {
  const normalized = normalizePromptInput(text);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const objective =
    lines.find((line) => /\b(write|create|generate|draft|summarize|extract|analyze|brainstorm|plan|explain|convert|rewrite|compare|list|design)\b/i.test(line)) ||
    lines[0] ||
    "";
  const roleMatch = normalized.match(/\b(?:you are|act as|behave as|role:)\s*([^\n.]{3,120})/i);
  const outputInstructions = [];
  const outputTypeValue = outputType === "json" ? "json" : "";
  if (outputTypeValue) outputInstructions.push(`Return ${outputTypeValue} output.`);
  const formatMatch = normalized.match(/\b(json|markdown|html|table|csv|bullet list|bullets|list|steps)\b/i);
  if (formatMatch) outputInstructions.push(`Output format: ${formatMatch[1]}.`);

  const constraints = lines.filter((line) => /\b(do not|avoid|never|must|only|without|under \d+ words|max \d+ words)\b/i.test(line)).slice(0, 6);
  const context = lines
    .filter((line) => /\b(for|audience|context|background|using|based on|target|from the following|purpose)\b/i.test(line))
    .slice(0, 6);

  return {
    role: roleMatch?.[1]?.trim() || null,
    objective: objective.trim(),
    context,
    constraints,
    output_instructions: outputInstructions,
    notes: [],
  };
}

function buildRuleBasedFinalPrompt(spec) {
  const lines = [];
  if (spec.role) {
    lines.push("### ROLE");
    lines.push(spec.role);
    lines.push("");
  }
  if (spec.objective) {
    lines.push("### OBJECTIVE");
    lines.push(spec.objective);
    lines.push("");
  }
  if (spec.context.length) {
    lines.push("### CONTEXT");
    spec.context.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }
  if (spec.constraints.length) {
    lines.push("### CONSTRAINTS");
    spec.constraints.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }
  if (spec.output_instructions.length) {
    lines.push("### OUTPUT");
    spec.output_instructions.forEach((item) => lines.push(`- ${item}`));
  }
  return lines.join("\n").trim();
}

function inferOptimizerOutputFormat({ systemPrompt, prompt, context }) {
  const combined = `${systemPrompt || ""}\n${prompt || ""}\n${context || ""}`.toLowerCase();
  if (/\bjson\b|valid json only|strict json/i.test(combined)) {
    return "json";
  }
  if (/\bimage prompt\b|\bimage-generation\b|\bmidjourney\b|\blighting\b|\bcomposition\b|\bnegative prompt\b|\brender\b|\bphoto\b/i.test(combined)) {
    return "image-prompt";
  }
  if (/\bad copy\b|\bheadline\b|\bhook\b|\bcta\b|\boffer\b|\bcampaign\b|\bconversion\b/i.test(combined)) {
    return "ad-copy";
  }
  return "general";
}

function buildOptimizerFallbackOutput({ prompt, context, systemPrompt, images }) {
  const cleanedPrompt = normalizePromptInput(prompt);
  const cleanedContext = normalizePromptInput(context);
  const outputFormat = inferOptimizerOutputFormat({ systemPrompt, prompt: cleanedPrompt, context: cleanedContext });
  const goalType =
    /\b(email|newsletter|subject line)\b/i.test(cleanedPrompt) ? "email-writing" :
    /\b(ad|campaign|cta|conversion|offer)\b/i.test(cleanedPrompt) ? "marketing-copy" :
    /\b(image|photo|render|midjourney|sora|scene|style)\b/i.test(cleanedPrompt) ? "image-prompting" :
    /\b(code|script|function|api|sql|bug|refactor)\b/i.test(cleanedPrompt) ? "software-tasking" :
    "general-tasking";
  const formatHint =
    outputFormat === "json"
      ? "Return strict JSON only."
      : outputFormat === "image-prompt"
      ? "Return an image prompt with Subject, Style, Lighting, Composition, Negative Prompt."
      : outputFormat === "ad-copy"
      ? "Return ad copy with Headline, Hook, Body, Offer, CTA."
      : "Return a production-ready prompt format.";
  const imageNote = Array.isArray(images) && images.length
    ? `Reference image names: ${images.join(", ")}`
    : "No image references attached.";

  return [
    "### ROLE",
    `You are a senior ${goalType} specialist and prompt executor.`,
    "",
    "### OBJECTIVE",
    `Transform this request into a high-quality result: ${cleanedPrompt || "[ADD PRIMARY TASK]"}`,
    "",
    "### CONTEXT",
    cleanedContext || "No extra context provided.",
    imageNote,
    "",
    "### ASSUMPTIONS",
    "- If user data is missing, use clear placeholders in brackets.",
    "- Prioritize practical output over theory.",
    "",
    "### STEPS",
    "1. Clarify intent and expected deliverable.",
    "2. Apply structure, constraints, and quality checks.",
    "3. Produce a concise, practical final output.",
    "",
    "### CONSTRAINTS",
    "- Do not repeat the raw request verbatim.",
    "- Keep output direct, useful, and non-fluffy.",
    `- ${formatHint}`,
    "- If uncertain, produce best-effort output with explicit placeholders.",
    "",
    "### OUTPUT FORMAT",
    outputFormat === "json"
      ? '{"result":"...","notes":["..."]}'
      : outputFormat === "image-prompt"
      ? "Subject: ...\nStyle: ...\nLighting: ...\nComposition: ...\nNegative Prompt: ..."
      : outputFormat === "ad-copy"
      ? "Headline: ...\nHook: ...\nBody: ...\nOffer: ...\nCTA: ..."
      : "Final Prompt:\n- Role: ...\n- Objective: ...\n- Context: ...\n- Steps: ...\n- Constraints: ...\n- Output format: ...",
    "",
    "### FINAL PROMPT (PASTE INTO YOUR AI TOOL)",
    [
      "You are a high-skill assistant. Follow the instructions below exactly.",
      "",
      `Task: ${cleanedPrompt || "[ADD PRIMARY TASK]"}`,
      cleanedContext ? `Context: ${cleanedContext}` : "Context: [ADD CONTEXT IF NEEDED]",
      `Image references: ${imageNote.replace(/^Reference image names:\s*/, "")}`,
      "Requirements:",
      "- Clarify and structure before answering.",
      "- Use concrete, actionable language.",
      "- Avoid filler and repetition.",
      `- ${formatHint}`,
      "",
      "Deliverable:",
      outputFormat === "json"
        ? "Return valid JSON only."
        : outputFormat === "image-prompt"
        ? "Return a polished image-generation prompt with a negative prompt block."
        : outputFormat === "ad-copy"
        ? "Return final copy ready to publish."
        : "Return a final, polished response ready to use.",
    ].join("\n"),
  ].join("\n");
}

function buildAuditFallbackOutput(prompt) {
  const normalized = normalizePromptInput(prompt);
  const spec = buildPromptSpec(normalized, "text");
  let score = 38;
  if (spec.objective) score += 22;
  if (spec.role) score += 10;
  if (spec.context.length) score += 15;
  if (spec.constraints.length) score += 15;
  score = Math.max(18, Math.min(score, 92));

  const verdict =
    score < 80
      ? "This prompt requires optimization to meet professional standards."
      : "This prompt is usable but still benefits from tighter structure.";

  const clarityFlaw = spec.objective
    ? "The task is present, but the exact deliverable and success condition are still too loose."
    : "The prompt does not state the exact deliverable or success condition.";
  const constraintsFlaw = spec.constraints.length
    ? "Some constraints exist, but they are not strict enough to prevent drift or vague answers."
    : "There are no explicit constraints, limits, or exclusions to guide the model.";
  const contextFlaw = spec.context.length
    ? "Some context exists, but it is not specific enough to anchor audience, scope, or use-case."
    : "Important background, audience, or use-case details are missing.";

  return [
    `1. Score: ${score}`,
    `2. Verdict: ${verdict}`,
    "3. Flaws:",
    `- 🎯 Clarity: ${clarityFlaw}`,
    `- 🧱 Constraints: ${constraintsFlaw}`,
    `- 🧭 Context: ${contextFlaw}`,
    "4. Ask:",
    '"Shall I reconstruct this using advanced engineering techniques to maximize performance?"',
  ].join("\n");
}

function buildRewriteFallbackOutput({ prompt, context, systemPrompt, images }) {
  const finalPrompt = buildOptimizerFallbackOutput({ prompt, context, systemPrompt, images });
  return [
    "A) Technique: Rebuilt the request into explicit role, objective, constraints, and output requirements.",
    "B) Reason: The original prompt is too open-ended for stable results. This version reduces ambiguity and gives the model a clearer execution path.",
    "C) Final Draft:",
    "```prompt",
    finalPrompt,
    "```",
  ].join("\n");
}

function detectOptimizerRequestMode(systemPrompt) {
  const promptText = String(systemPrompt || "");
  if (/Evaluate a user-submitted prompt, score it/i.test(promptText) && /\b1\.\s*Score:/i.test(promptText)) {
    return "audit";
  }
  if (/Rewrite the user-submitted prompt to professional standards/i.test(promptText) && /\bC\)\s*Final Draft:/i.test(promptText)) {
    return "fix";
  }
  return "optimize";
}

function summarizeProviderError(message) {
  const normalized = String(message || "").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 280) : "Provider request failed.";
}

function buildOptimizerFallbackResponse({
  systemPrompt,
  prompt,
  context,
  images,
  remaining,
  limit,
  isAllowlisted,
  vpnWarning,
  warningMessage,
  requestStartedAt,
  providerError,
}) {
  const mode = detectOptimizerRequestMode(systemPrompt);
  const output =
    mode === "audit"
      ? buildAuditFallbackOutput(prompt)
      : mode === "fix"
      ? buildRewriteFallbackOutput({ prompt, context, systemPrompt, images })
      : buildOptimizerFallbackOutput({ prompt, context, systemPrompt, images });
  const summarizedError = summarizeProviderError(providerError);
  const fallbackLabel =
    mode === "audit" ? "built-in audit fallback" : mode === "fix" ? "built-in rewrite fallback" : "built-in optimizer fallback";

  return {
    output,
    remaining,
    limit,
    unlimited: isAllowlisted,
    vpnWarning,
    warningMessage,
    fallbackUsed: true,
    fallbackMessage: `${summarizedError} Using ${fallbackLabel}.`,
    timing: {
      totalMs: Date.now() - requestStartedAt,
      providerMs: 0,
      model: "rule-based-fallback",
      provider: "fallback",
    },
  };
}

function parseJsonObjectFromText(text) {
  if (!text || typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) return null;
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}

function sanitizeRepairPayload(payload, fallbackFinalPrompt, fallbackSpec) {
  const repairedPrompt =
    payload && typeof payload.repaired_prompt === "string" && payload.repaired_prompt.trim()
      ? payload.repaired_prompt.trim()
      : null;
  const finalPrompt =
    payload && typeof payload.final_prompt === "string" && payload.final_prompt.trim()
      ? payload.final_prompt.trim()
      : repairedPrompt || fallbackFinalPrompt;
  const changes = Array.isArray(payload?.changes)
    ? payload.changes.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
    : [];
  const jsonOutput = payload?.json_output && typeof payload.json_output === "object"
    ? {
        role: payload.json_output.role ? String(payload.json_output.role) : fallbackSpec.role,
        objective: String(payload.json_output.objective || fallbackSpec.objective || ""),
        context: Array.isArray(payload.json_output.context)
          ? payload.json_output.context.map((item) => String(item)).filter(Boolean).slice(0, 8)
          : fallbackSpec.context,
        constraints: Array.isArray(payload.json_output.constraints)
          ? payload.json_output.constraints.map((item) => String(item)).filter(Boolean).slice(0, 8)
          : fallbackSpec.constraints,
        output_instructions: Array.isArray(payload.json_output.output_instructions)
          ? payload.json_output.output_instructions.map((item) => String(item)).filter(Boolean).slice(0, 8)
          : fallbackSpec.output_instructions,
      }
    : {
        role: fallbackSpec.role,
        objective: fallbackSpec.objective,
        context: fallbackSpec.context,
        constraints: fallbackSpec.constraints,
        output_instructions: fallbackSpec.output_instructions,
      };

  return {
    repairedPrompt,
    finalPrompt,
    changes,
    jsonOutput,
  };
}

loadLists();
setInterval(loadLists, 24 * 60 * 60 * 1000);

app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const allowed = (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowAll = allowed.length === 0 || allowed.includes("*");

  if (allowAll) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (/^https:\/\/[a-z0-9-]+\.web\.app$/i.test(origin)) {
    // Allow Firebase Hosting default domains to reduce deployment friction.
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (/^https:\/\/[a-z0-9-]+\.firebaseapp\.com$/i.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.get("/api/health", (req, res) => {
  return res.json({
    ok: true,
    service: "dunamis-api",
    optimizerProvider: getPreferredOptimizerProvider(),
    openrouterModel: getOpenRouterModel(),
    openrouterKeyPresent: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    openrouterKeyFingerprint: fingerprintSecret(process.env.OPENROUTER_API_KEY),
    renderService: process.env.RENDER_SERVICE_NAME || null,
    renderCommit: process.env.RENDER_GIT_COMMIT?.slice(0, 12) || null,
  });
});

app.post("/api/prompt-repair", async (req, res) => {
  const startedAt = Date.now();
  const rawPrompt = typeof req.body?.raw_prompt === "string" ? req.body.raw_prompt : "";
  const targetModel = typeof req.body?.target_model === "string" ? req.body.target_model.trim() : "";
  const outputType = req.body?.output_type === "json" ? "json" : "text";
  const includeJson = Boolean(req.body?.include_json);
  const clientIp = getClientIp(req);

  if (!rawPrompt.trim()) {
    return res.status(400).json({ error: "raw_prompt is required." });
  }
  if (rawPrompt.length > 8000) {
    return res.status(413).json({ error: "Prompt too large. Maximum size is 8000 characters." });
  }
  if (isPromptRepairRateLimited(clientIp)) {
    return res.status(429).json({ error: "Too many repair requests. Please wait a moment and try again." });
  }

  let ruleScan;
  try {
    ruleScan = buildRuleScan(rawPrompt, outputType);
  } catch {
    ruleScan = {
      quality_score: 35,
      rewrite_needed: true,
      issues: [
        {
          code: "missing_objective",
          severity: "high",
          message: "The prompt could not be analyzed cleanly, so a manual repair is recommended.",
          evidence: ["Analyzer fallback activated."],
        },
      ],
      recommendations: ["State the exact job and desired output format."],
      normalized: {
        text: normalizePromptInput(rawPrompt),
        clauses: splitPromptClauses(rawPrompt),
        signals: {
          hasObjective: false,
          hasRole: false,
          hasContext: false,
          hasOutputSpec: false,
        },
      },
    };
  }

  const normalizedSpec = buildPromptSpec(rawPrompt, outputType);
  const fallbackFinalPrompt = buildRuleBasedFinalPrompt(normalizedSpec) || normalizePromptInput(rawPrompt);
  let repairedPrompt = null;
  let finalPrompt = fallbackFinalPrompt;
  let changes = [];
  let provider = null;
  let model = targetModel || null;
  let rewriteUsed = false;
  let fallbackMessage = null;
  let structuredJson = null;

  if (ruleScan.rewrite_needed) {
    const systemPrompt =
      "ROLE:\n" +
      "You repair weak prompts into clear, production-ready prompts.\n\n" +
      "TASK:\n" +
      "Given a raw user prompt, rule-based issue findings, and a normalized prompt spec, return strict JSON only.\n\n" +
      "RULES:\n" +
      "- Preserve the user's intent.\n" +
      "- Resolve contradictions where possible.\n" +
      "- Do not invent domain facts.\n" +
      "- Keep the result direct and copy-ready.\n" +
      "- Return plain text prompts, not markdown fences.\n" +
      "- Output valid JSON only using this schema:\n" +
      '{ "repaired_prompt": "string", "final_prompt": "string", "changes": ["string"], "json_output": { "role": "string|null", "objective": "string", "context": ["string"], "constraints": ["string"], "output_instructions": ["string"] } }';

    const providerPrompt = JSON.stringify(
      {
        raw_prompt: redactSensitiveText(rawPrompt),
        target_model: targetModel || null,
        output_type: outputType,
        issues: ruleScan.issues,
        recommendations: ruleScan.recommendations,
        normalized_spec: normalizedSpec,
      },
      null,
      2,
    );

    const optimizerProvider = getPreferredOptimizerProvider();
    const primaryProvider = optimizerProvider === "openrouter" ? "openrouter" : "ollama";
    const fallbackProvider = primaryProvider === "ollama" && process.env.OPENROUTER_API_KEY?.trim() ? "openrouter" : null;
    const runProvider = async (selectedProvider) => {
      const result =
        selectedProvider === "ollama"
          ? await callOllama({ systemPrompt, prompt: providerPrompt, context: "", images: [] })
          : await callOpenRouter({ systemPrompt, prompt: providerPrompt, context: "", images: [] });
      return result;
    };

    try {
      const result = await runProvider(primaryProvider);
      const parsed = parseJsonObjectFromText(result?.output || "");
      const sanitized = sanitizeRepairPayload(parsed || {}, fallbackFinalPrompt, normalizedSpec);
      repairedPrompt = sanitized.repairedPrompt;
      finalPrompt = sanitized.finalPrompt;
      changes = sanitized.changes;
      structuredJson = sanitized.jsonOutput;
      provider = primaryProvider;
      model = result?.model || model;
      rewriteUsed = Boolean(repairedPrompt || (parsed && typeof parsed === "object"));
    } catch (primaryError) {
      if (fallbackProvider) {
        try {
          const result = await runProvider(fallbackProvider);
          const parsed = parseJsonObjectFromText(result?.output || "");
          const sanitized = sanitizeRepairPayload(parsed || {}, fallbackFinalPrompt, normalizedSpec);
          repairedPrompt = sanitized.repairedPrompt;
          finalPrompt = sanitized.finalPrompt;
          changes = sanitized.changes;
          structuredJson = sanitized.jsonOutput;
          provider = fallbackProvider;
          model = result?.model || model;
          rewriteUsed = Boolean(repairedPrompt || (parsed && typeof parsed === "object"));
          fallbackMessage = `Primary provider failed. Used ${fallbackProvider} instead.`;
        } catch {
          fallbackMessage = "Rewrite unavailable; showing rule-based repair guidance only.";
        }
      } else {
        fallbackMessage = "Rewrite unavailable; showing rule-based repair guidance only.";
      }
      if (!fallbackMessage && primaryError) {
        fallbackMessage = "Rewrite unavailable; showing rule-based repair guidance only.";
      }
    }
  }

  const finalSpec = buildPromptSpec(finalPrompt, outputType);
  const jsonOutput = includeJson
    ? structuredJson || {
        role: finalSpec.role,
        objective: finalSpec.objective,
        context: finalSpec.context,
        constraints: finalSpec.constraints,
        output_instructions: finalSpec.output_instructions,
      }
    : null;

  return res.json({
    request_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    normalized_input: {
      raw_prompt: normalizePromptInput(rawPrompt),
      target_model: targetModel || null,
      output_type: outputType,
    },
    rule_scan: {
      quality_score: ruleScan.quality_score,
      rewrite_needed: ruleScan.rewrite_needed,
      issues: ruleScan.issues,
      recommendations: ruleScan.recommendations,
    },
    repaired_prompt: repairedPrompt,
    final_prompt: finalPrompt,
    changes,
    json_output: jsonOutput,
    processing: {
      rewrite_used: rewriteUsed,
      provider,
      model,
      fallback_message: fallbackMessage,
      duration_ms: Date.now() - startedAt,
    },
  });
});

app.post("/api/turnstile-verify", async (req, res) => {
  try {
    const secretKey = process.env.TURNSTILE_SECRET_KEY || "";
    if (!secretKey) {
      return res.status(503).json({ success: false, error: "Turnstile is not configured." });
    }

    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (!token) {
      return res.status(400).json({ success: false, error: "Missing Turnstile token." });
    }

    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });
    const clientIp = getClientIp(req);
    if (clientIp) {
      params.set("remoteip", clientIp);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      return res.status(400).json({
        success: false,
        error: "Turnstile verification failed.",
        errorCodes: data?.["error-codes"] || [],
      });
    }

    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Turnstile verification error.";
    return res.status(500).json({ success: false, error: message });
  }
});

app.post("/api/email-check", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ valid: false, error: "Invalid email format." });
    }

    const domain = email.split("@").pop()?.trim().toLowerCase() || "";
    if (!domain) {
      return res.status(400).json({ valid: false, error: "Invalid email domain." });
    }

    if (isDisposableEmail(email)) {
      return res.status(400).json({ valid: false, disposable: true, error: "Disposable email addresses are not allowed." });
    }

    if (SUPABASE_ENABLED) {
      const blocked = await supabaseDomainBlocked(domain);
      if (blocked) {
        return res.status(400).json({ valid: false, blocked: true, error: "Email domain is blocked." });
      }
    }

    return res.json({ valid: true, disposable: false, blocked: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email validation failed.";
    return res.status(500).json({ valid: false, error: message });
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const company = typeof req.body?.company === "string" ? req.body.company.trim() : "";

    if (company) {
      // Honeypot: silently accept to avoid teaching bots.
      return res.json({ ok: true });
    }

    if (!name || name.length < 2 || name.length > 80) {
      return res.status(400).json({ error: "Please enter a valid name." });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (isDisposableEmail(email)) {
      return res.status(400).json({ error: "Temporary email addresses are not allowed." });
    }
    if (SUPABASE_ENABLED) {
      const domain = email.split("@").pop()?.trim().toLowerCase();
      if (domain) {
        const blocked = await supabaseDomainBlocked(domain);
        if (blocked) {
          return res.status(400).json({ error: "Email domain is blocked." });
        }
      }
    }
    if (!message || message.length < 10 || message.length > 4000) {
      return res.status(400).json({ error: "Message must be between 10 and 4000 characters." });
    }

    const clientIp = getClientIp(req);
    if (isContactRateLimited(clientIp)) {
      return res.status(429).json({ error: "Please wait a moment before sending another message." });
    }

    const resendApiKey = process.env.RESEND_API_KEY || "";
    const contactFrom = process.env.CONTACT_FROM_EMAIL || "";
    const contactTo = process.env.CONTACT_TO_EMAIL || "";
    const contactWebhook = process.env.CONTACT_WEBHOOK_URL || "";

    if (resendApiKey && contactFrom && contactTo) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: contactFrom,
          to: [contactTo],
          reply_to: email,
          subject: `Dunamis Contact: ${name}`,
          text: `Name: ${name}\nEmail: ${email}\nIP: ${clientIp || "unknown"}\n\nMessage:\n${message}`,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return res.status(502).json({ error: `Email delivery failed. ${errorText || ""}`.trim() });
      }

      return res.json({ ok: true });
    }

    if (contactWebhook) {
      const webhookPayload = {
        source: "dunamiss.xyz contact form",
        submittedAt: new Date().toISOString(),
        name,
        email,
        message,
        ip: clientIp || "unknown",
      };
      const webhookResponse = await fetch(contactWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text().catch(() => "");
        return res.status(502).json({ error: `Webhook delivery failed. ${errorText || ""}`.trim() });
      }
      return res.json({ ok: true });
    }

    return res.status(503).json({
      error: "Contact form is not configured yet. Add RESEND or CONTACT_WEBHOOK settings on backend.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Contact request failed.";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/coloring/outline", upload.single("image"), async (req, res) => {
  try {
    const ageGroup = typeof req.body?.ageGroup === "string" ? req.body.ageGroup.trim() : "9-12";
    let sourceBuffer = req.file?.buffer || null;

    if (!sourceBuffer) {
      const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : "";
      if (!imageUrl) {
        return res.status(400).json({ error: "Provide an image file or imageUrl." });
      }
      sourceBuffer = await fetchImageBuffer(imageUrl);
    }

    const outputBuffer = await toColoringOutline(sourceBuffer, ageGroup);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    return res.send(outputBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate outline.";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/optimize", async (req, res) => {
  const requestStartedAt = Date.now();
  const optimizerProvider = getPreferredOptimizerProvider();
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();

  const { systemPrompt, prompt, context, images, userEmail } = req.body ?? {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const normalizedEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
  const clientIp = getClientIp(req);
  const usageKey = normalizedEmail || (clientIp ? `ip:${clientIp}` : "anonymous");
  let isAllowlisted = Boolean(normalizedEmail && allowList.includes(normalizedEmail));

  if (!isAllowlisted && normalizedEmail && isDisposableEmail(normalizedEmail)) {
    return res.status(400).json({ error: "Disposable email addresses are not allowed." });
  }

  if (SUPABASE_ENABLED && normalizedEmail) {
    try {
      const allowRow = await supabaseSelectSingle("optimizer_allowlist", { email: normalizedEmail });
      if (allowRow?.unlimited) {
        isAllowlisted = true;
      }
    } catch (error) {
      console.warn("Supabase allowlist lookup failed.", error);
    }
  }

  if (SUPABASE_ENABLED && normalizedEmail) {
    const domain = normalizedEmail.split("@").pop()?.trim().toLowerCase();
    if (domain) {
      const blocked = await supabaseDomainBlocked(domain);
      if (blocked) {
        return res.status(400).json({ error: "Email domain is blocked. Please use a different address." });
      }
    }
  }

  let usageRecord = null;
  if (SUPABASE_ENABLED) {
    try {
      usageRecord = await supabaseSelectSingle("optimizer_usage", { email: usageKey });
      if (usageRecord?.is_banned) {
        return res.status(403).json({ error: "Account banned. Please contact support." });
      }
    } catch (error) {
      console.warn("Supabase usage lookup failed.", error);
      usageRecord = null;
    }
  } else {
    usageRecord = getUsageRecord(usageKey);
    if (usageRecord?.is_banned) {
      return res.status(403).json({ error: "Account banned. Please contact support." });
    }
  }

  let remaining = null;
  let limit = USAGE_LIMIT;
  if (!isAllowlisted) {
    const currentCount = usageRecord?.count || 0;
    if (currentCount >= USAGE_LIMIT) {
      return res.status(429).json({ error: "Usage limit reached. Please donate for unlimited access.", remaining: 0, limit });
    }
    const nextCount = currentCount + 1;
    remaining = Math.max(USAGE_LIMIT - nextCount, 0);

    if (SUPABASE_ENABLED) {
      try {
        const now = new Date().toISOString();
        if (usageRecord) {
          await supabaseUpdate(
            "optimizer_usage",
            { email: usageKey },
            { count: nextCount, last_used_at: now }
          );
        } else {
          await supabaseUpsert("optimizer_usage", {
            email: usageKey,
            count: nextCount,
            first_used_at: now,
            last_used_at: now,
            is_banned: false,
          });
        }
      } catch (error) {
        console.warn("Supabase usage update failed.", error);
      }
    } else {
      const record = getUsageRecord(usageKey);
      record.count = nextCount;
    }
  }

  const vpnWarning = isLikelyVpnIp(clientIp);
  const warningMessage = vpnWarning
    ? "We detected a VPN/proxy IP. Access is allowed, but this may trigger review."
    : null;

  const runProvider = async (provider) => {
    const providerStartedAt = Date.now();
    const result =
      provider === "ollama"
        ? await callOllama({ systemPrompt, prompt, context, images })
        : await callOpenRouter({ systemPrompt, prompt, context, images });
    const providerMs = Date.now() - providerStartedAt;
    return { result, providerMs };
  };

  const primaryProvider = optimizerProvider === "openrouter" ? "openrouter" : "ollama";
  const fallbackProvider =
    primaryProvider === "ollama" && openRouterApiKey ? "openrouter" : null;

  try {
    const { result, providerMs } = await runProvider(primaryProvider);
    if (!result || !result.output) {
      throw new Error(`${primaryProvider} returned empty output.`);
    }
    const totalMs = Date.now() - requestStartedAt;
    return res.json({
      output: result.output,
      remaining,
      limit,
      unlimited: isAllowlisted,
      vpnWarning,
      warningMessage,
      timing: {
        totalMs,
        providerMs,
        model: result.model,
        provider: primaryProvider,
      },
    });
  } catch (error) {
    const primaryError = error instanceof Error ? error.message : `${primaryProvider} request failed.`;
    if (fallbackProvider) {
      try {
        const { result, providerMs } = await runProvider(fallbackProvider);
        if (!result || !result.output) {
          throw new Error(`${fallbackProvider} returned empty output.`);
        }
        const totalMs = Date.now() - requestStartedAt;
        return res.json({
          output: result.output,
          remaining,
          limit,
          unlimited: isAllowlisted,
          vpnWarning,
          warningMessage,
          fallbackUsed: true,
          timing: {
            totalMs,
            providerMs,
            model: result.model,
            provider: fallbackProvider,
          },
        });
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : `${fallbackProvider} request failed.`;
        return res.json(
          buildOptimizerFallbackResponse({
            systemPrompt,
            prompt,
            context,
            images,
            remaining,
            limit,
            isAllowlisted,
            vpnWarning,
            warningMessage,
            requestStartedAt,
            providerError: `${primaryProvider} failed: ${primaryError} | ${fallbackProvider} failed: ${fallbackMessage}`,
          }),
        );
      }
    }
    return res.json(
      buildOptimizerFallbackResponse({
        systemPrompt,
        prompt,
        context,
        images,
        remaining,
        limit,
        isAllowlisted,
        vpnWarning,
        warningMessage,
        requestStartedAt,
        providerError: primaryError,
      }),
    );
  }
});

app.post("/api/account-status", async (req, res) => {
  const { userEmail } = req.body ?? {};
  const normalizedEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
  if (!normalizedEmail) {
    return res.status(400).json({ error: "userEmail is required." });
  }

  const usageKey = normalizedEmail;
  let isAllowlisted = allowList.includes(normalizedEmail);
  let usageRecord = null;

  if (SUPABASE_ENABLED) {
    try {
      const [allowRow, usageRow] = await Promise.all([
        supabaseSelectSingle("optimizer_allowlist", { email: normalizedEmail }),
        supabaseSelectSingle("optimizer_usage", { email: usageKey }),
      ]);
      if (allowRow?.unlimited) {
        isAllowlisted = true;
      }
      usageRecord = usageRow || null;
    } catch (error) {
      console.warn("Account status lookup failed.", error);
      usageRecord = null;
    }
  } else {
    usageRecord = getUsageRecord(usageKey);
  }

  const used = Number(usageRecord?.count || 0);
  const banned = Boolean(usageRecord?.is_banned);
  const limit = USAGE_LIMIT;
  const remaining = isAllowlisted ? null : Math.max(limit - used, 0);

  return res.json({
    limit,
    used,
    remaining,
    unlimited: isAllowlisted,
    banned,
  });
});

app.post("/api/kofi-webhook", async (req, res) => {
  const token = process.env.KOFI_WEBHOOK_TOKEN;
  if (!token) {
    return res.status(500).send("Missing KOFI_WEBHOOK_TOKEN");
  }

  const payload = req.body?.data;
  if (!payload) {
    return res.status(400).send("Missing data payload");
  }

  try {
    const data = JSON.parse(payload);
    if (data?.verification_token !== token) {
      return res.status(403).send("Invalid token");
    }

    const email = (data?.email || "").toString().trim().toLowerCase();
    const isDonation = data?.type === "Donation";
    if (email && isDonation) {
      if (!allowList.includes(email)) {
        allowList.push(email);
      }
      if (SUPABASE_ENABLED) {
        try {
          await supabaseUpsert("optimizer_allowlist", { email, unlimited: true });
        } catch (error) {
          console.warn("Supabase allowlist update failed.", error);
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    return res.status(400).send("Invalid payload");
  }
});

app.use((error, req, res, next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Image too large. Maximum upload size is 8MB." });
  }
  return next(error);
});

app.listen(port, () => {
  console.log(`Optimizer API running on http://localhost:${port}`);
});
