import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { AuthModal } from "@/components/AuthModal";
import ContactSection from "@/components/ContactSection";
import AddToPackDialog from "@/components/AddToPackDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, Info, Maximize2, Minimize2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { JSON_PROMPT_CARDS, type JsonPromptCard } from "@/data/jsonPromptCards";

const SHOW_TIMING = false;

const SIMPLE_STARTER_EXAMPLES = [
  "Write a friendly welcome email for new customers of my small business.",
  "Create a social media post about our weekend sale with a clear call to action.",
  "Turn my rough notes into a clear, professional LinkedIn post.",
];

const BUILDER_TASK_TYPES = [
  "Create from scratch",
  "Rewrite and improve",
  "Analyze and summarize",
  "Plan and strategize",
] as const;

const BUILDER_TONES = [
  "Professional",
  "Friendly",
  "Persuasive",
  "Technical",
  "Creative",
  "Direct",
] as const;

const BUILDER_OUTPUT_TYPES = [
  "General prompt",
  "Email",
  "Social post",
  "Article",
  "JSON",
  "Image prompt",
] as const;

const BUILDER_LENGTHS = ["Short", "Medium", "Long"] as const;

const OPTIMIZER_SYSTEM_PROMPT =
  "PERSONA: You are the Chief Prompt Architect, an expert in Large Language Model logic and instruction design.\n\n" +
  "CONTEXT: A user will provide a raw, unstructured idea or request. They require a rigorous, production-ready prompt that can be pasted directly into an AI model (like ChatGPT, Claude, or Gemini) to achieve a specific result.\n\n" +
  "TASK:\n" +
  "1. Analyze: Deeply evaluate the user's raw input to understand their core intent, desired tone, and end goal.\n" +
  "2. Fill Gaps: Identify logical holes or missing context in the user's request and intelligently fill them to ensure the prompt is robust.\n" +
  "3. Draft: Construct a high-fidelity prompt using the specific structure outlined below.\n\n" +
  "REQUIRED OUTPUT STRUCTURE:\n" +
  "The output must be a single, copy-pasteable prompt containing these headers:\n" +
  "* ### ROLE: (Define who the AI should act as).\n" +
  "* ### OBJECTIVE: (A clear, active-voice summary of what needs to be done).\n" +
  "* ### CONTEXT: (Background info derived from the user's input).\n" +
  "* ### STEPS: (A numbered, step-by-step logical process for the AI to follow).\n" +
  "* ### CONSTRAINTS: (Negative constraints, e.g., \"Do not use code,\" \"No moralizing\").\n\n" +
  "CONSTRAINTS FOR YOU (THE ARCHITECT):\n" +
  "* Zero Fluff: Do not provide an introduction (e.g., \"Here is your prompt\"). Output *only* the prompt text.\n" +
  "* Variables: If the user's input requires specific data they haven't provided yet, use bracketed placeholders (e.g., \"[INSERT TEXT HERE]\") in your final output.\n" +
  "* Clarity: Use imperative, direct language (e.g., \"Analyze this,\" \"Write that\") rather than polite suggestions.";

const AUDITOR_SYSTEM_PROMPT =
  "ROLE:\n" +
  "You are a Lead Prompt Engineer and LLM Optimization Specialist.\n\n" +
  "OBJECTIVE:\n" +
  "Evaluate a user-submitted prompt, score it, critique it with zero fluff, and (only if the user agrees) rewrite it to professional standards.\n\n" +
  "INPUT:\n" +
  "The user’s prompt is provided in the user message. Do NOT ask for it again.\n\n" +
  "OUTPUT FORMAT (STRICT):\n" +
  "1. Score: <integer 0-100>\n" +
  "2. Verdict: <one short sentence>\n" +
  "3. Flaws:\n" +
  "- 🎯 Clarity: <issue>\n" +
  "- 🧱 Constraints: <issue>\n" +
  "- 🧭 Context: <issue>\n" +
  "(Use 2 or 3 lines only.)\n" +
  "4. Ask:\n" +
  "\"Shall I reconstruct this using advanced engineering techniques to maximize performance?\"\n\n" +
  "SCORING CRITERIA:\n" +
  "Clarity, constraints, context completeness, logical flow, output schema, and robustness.\n\n" +
  "RULES:\n" +
  "- If Score < 80, Verdict must be: \"This prompt requires optimization to meet professional standards.\"\n" +
  "- List exactly 2 or 3 flaws using the emoji labels above.\n" +
  "- No praise or filler. Be direct.\n" +
  "- Do not rewrite unless the user explicitly says yes.";

const AUDITOR_REWRITE_PROMPT =
  "ROLE:\n" +
  "You are a Lead Prompt Engineer and LLM Optimization Specialist.\n\n" +
  "OBJECTIVE:\n" +
  "Rewrite the user-submitted prompt to professional standards.\n\n" +
  "INPUT:\n" +
  "The user’s prompt is provided in the user message. Do NOT ask for it again.\n\n" +
  "OUTPUT FORMAT (STRICT):\n" +
  "A) Technique: <single sentence, no jargon>\n" +
  "B) Reason: <1–2 sentences>\n" +
  "C) Final Draft:\n" +
  "```prompt\n" +
  "<rewritten prompt>\n" +
  "```\n\n" +
  "FINAL DRAFT REQUIREMENTS:\n" +
  "- Professional, precise, and concise.\n" +
  "- Explicit role, objective, constraints, and output format.\n" +
  "- Use clear delimiters (e.g., ### sections).\n" +
  "- No hidden reasoning or internal analysis.";

type OptimizerQuality = {
  score: number;
  label: "Weak" | "Good" | "Strong";
  notes: string[];
};

type OptimizerOutputFormat = "general" | "json" | "image-prompt" | "ad-copy";
type PromptDragPayload = {
  type: "prompt";
  title?: string;
  content: string;
  description?: string;
};
type ImageDragPayload = {
  type: "image";
  title?: string;
  url?: string;
  tags?: string[];
};

type TryInProvider = {
  id: string;
  label: string;
  url: string;
};


function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeOptimizerErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "Optimization request failed.";

  if (/groq authentication failed|groq_api_key/i.test(trimmed)) {
    return "Backend looks outdated (Groq-era config). Use local API on http://localhost:8787 or update the backend.";
  }

  if (/failed to fetch|networkerror|network error/i.test(trimmed)) {
    return "Could not reach /api/optimize. Start the backend with `npm run dev:api`.";
  }

  return trimmed;
}

function buildTryInUrl(provider: TryInProvider, text: string): string {
  const encoded = encodeURIComponent(text.trim());
  if (!encoded) return provider.url;

  switch (provider.id) {
    case "chatgpt":
      return `https://chatgpt.com/?q=${encoded}`;
    case "promptschat":
      return `https://prompts.chat/?q=${encoded}`;
    case "perplexity":
      return `https://www.perplexity.ai/search?q=${encoded}`;
    default:
      return provider.url;
  }
}

function getOutputContractFor(card: JsonPromptCard): string[] {
  if (card.outputType === "ad-copy") {
    return ["headline", "hook", "body", "offer", "cta"];
  }
  if (card.outputType === "json") {
    return ["role", "objective", "context", "constraints", "output_schema"];
  }
  return ["subject", "style", "lighting", "composition", "camera_details", "negative_prompt"];
}

function toFieldValue(values: Record<string, string>, key: string, fallback: string): string {
  const value = (values[key] || "").trim();
  return value || fallback;
}

function toListValue(values: Record<string, string>, key: string, fallback: string[]): string[] {
  const raw = (values[key] || "").trim();
  if (!raw) return fallback;
  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length ? parsed : fallback;
}

function isLikelyEcho(input: string, output: string): boolean {
  const cleanInput = normalizeText(input);
  const cleanOutput = normalizeText(output);
  if (!cleanInput || !cleanOutput) return false;
  if (cleanOutput.includes(cleanInput)) return true;
  const inputWords = cleanInput.split(" ").filter(Boolean);
  if (inputWords.length < 6) return false;
  const outputWords = new Set(cleanOutput.split(" ").filter(Boolean));
  const overlap = inputWords.filter((word) => outputWords.has(word)).length;
  return overlap / inputWords.length > 0.72;
}

function evaluateOptimizerQuality(input: string, output: string): OptimizerQuality {
  const text = output.trim();
  if (!text) return { score: 0, label: "Weak", notes: ["No output generated."] };

  let score = 0;
  const notes: string[] = [];

  if (text.length >= 280) {
    score += 25;
  } else {
    notes.push("Output is short.");
  }

  if (/###\s*ROLE/i.test(text) && /###\s*OBJECTIVE/i.test(text)) {
    score += 25;
  } else {
    notes.push("Missing clear role/objective headers.");
  }

  if (/###\s*CONTEXT/i.test(text) && /###\s*CONSTRAINTS/i.test(text)) {
    score += 20;
  } else {
    notes.push("Missing context/constraints structure.");
  }

  if (/(^|\n)\s*1[\).\s]/.test(text) || /###\s*STEPS/i.test(text)) {
    score += 15;
  } else {
    notes.push("No obvious step-by-step flow.");
  }

  if (!isLikelyEcho(input, text)) {
    score += 15;
  } else {
    notes.push("Reads too close to raw input.");
  }

  const label: OptimizerQuality["label"] = score >= 80 ? "Strong" : score >= 55 ? "Good" : "Weak";
  return { score, label, notes };
}

function formatInstructionFor(outputFormat: OptimizerOutputFormat): string {
  switch (outputFormat) {
    case "json":
      return "Output format requirement: Return valid JSON only. Use clear keys, no markdown fences, no prose outside JSON.";
    case "image-prompt":
      return "Output format requirement: Produce an image-generation prompt with distinct sections for Subject, Style, Lighting, Composition, Camera/Render details, and Negative Prompt.";
    case "ad-copy":
      return "Output format requirement: Produce marketing copy with Headline, Hook, Body, Offer, and CTA. Keep it concise and conversion-focused.";
    case "general":
    default:
      return "Output format requirement: Return a production-ready prompt with ROLE, OBJECTIVE, CONTEXT, STEPS, CONSTRAINTS.";
  }
}

function buildLocalFallbackPrompt(params: {
  raw: string;
  context: string;
  outputFormat: OptimizerOutputFormat;
  improveFrom?: string;
}): string {
  const cleaned = params.raw.trim();
  const extra = params.context.trim();
  const improveSource = params.improveFrom?.trim() || "";
  const goalType =
    /\b(email|newsletter|subject line)\b/i.test(cleaned) ? "email-writing" :
    /\b(ad|campaign|cta|conversion|offer)\b/i.test(cleaned) ? "marketing-copy" :
    /\b(image|photo|render|midjourney|sora|scene|style)\b/i.test(cleaned) ? "image-prompting" :
    /\b(code|script|function|api|sql|bug|refactor)\b/i.test(cleaned) ? "software-tasking" :
    "general-tasking";
  const formatHint =
    params.outputFormat === "json"
      ? "Return strict JSON only."
      : params.outputFormat === "image-prompt"
      ? "Return an image prompt with Subject, Style, Lighting, Composition, Negative Prompt."
      : params.outputFormat === "ad-copy"
      ? "Return ad copy with Headline, Hook, Body, Offer, CTA."
      : "Return a production-ready prompt format.";

  return [
    "### ROLE",
    `You are a senior ${goalType} specialist and prompt executor.`,
    "",
    "### OBJECTIVE",
    improveSource
      ? `Refine and improve this existing draft into a stronger final prompt: ${cleaned}`
      : `Transform this request into a high-quality result: ${cleaned}`,
    "",
    "### CONTEXT",
    extra || "No extra context provided.",
    improveSource ? `\nPrevious draft to improve:\n${improveSource}` : "",
    "",
    "### ASSUMPTIONS",
    "- If user data is missing, use clear placeholders in brackets.",
    "- Prioritize practical output over theory.",
    "",
    "### STEPS",
    improveSource
      ? "1. Diagnose weaknesses in the previous draft (clarity, constraints, output shape)."
      : "1. Clarify intent and expected deliverable.",
    improveSource
      ? "2. Rewrite to improve structure, precision, and usefulness."
      : "2. Apply structure, constraints, and quality checks.",
    improveSource
      ? "3. Return a stronger replacement draft, not a near-duplicate."
      : "3. Produce a concise, practical final output.",
    "",
    "### CONSTRAINTS",
    "- Do not repeat the raw request verbatim.",
    "- Keep output direct, useful, and non-fluffy.",
    `- ${formatHint}`,
    "- If uncertain, produce best-effort output with explicit placeholders.",
    "",
    "### OUTPUT FORMAT",
    params.outputFormat === "json"
      ? '{"result":"...","notes":["..."]}'
      : params.outputFormat === "image-prompt"
      ? "Subject: ...\nStyle: ...\nLighting: ...\nComposition: ...\nNegative Prompt: ..."
      : params.outputFormat === "ad-copy"
      ? "Headline: ...\nHook: ...\nBody: ...\nOffer: ...\nCTA: ..."
      : "Final Prompt:\n- Role: ...\n- Objective: ...\n- Context: ...\n- Steps: ...\n- Constraints: ...\n- Output format: ...",
    "",
    "### FINAL PROMPT (PASTE INTO YOUR AI TOOL)",
    [
      "You are a high-skill assistant. Follow the instructions below exactly.",
      "",
      `Task: ${cleaned}`,
      extra ? `Context: ${extra}` : "Context: [ADD CONTEXT IF NEEDED]",
      "Requirements:",
      "- Clarify and structure before answering.",
      "- Use concrete, actionable language.",
      "- Avoid filler and repetition.",
      `- ${formatHint}`,
      "",
      "Deliverable:",
      params.outputFormat === "json"
        ? "Return valid JSON only."
        : params.outputFormat === "image-prompt"
        ? "Return a polished image-generation prompt with a negative prompt block."
        : params.outputFormat === "ad-copy"
        ? "Return final copy ready to publish."
        : "Return a final, polished response ready to use.",
    ].join("\n"),
  ].join("\n");
}

export default function Optimizer() {
  const { user, logout } = useAuth();
  const { promptToLoad, clearPromptToLoad } = useChat();
  const [promptInput, setPromptInput] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [optimizedOutput, setOptimizedOutput] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizerError, setOptimizerError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OptimizerOutputFormat>("json");
  const [mode, setMode] = useState<"optimize" | "audit">("optimize");
  const [simpleMode, setSimpleMode] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [builderTaskType, setBuilderTaskType] = useState<(typeof BUILDER_TASK_TYPES)[number]>("Create from scratch");
  const [builderGoal, setBuilderGoal] = useState("");
  const [builderAudience, setBuilderAudience] = useState("");
  const [builderTone, setBuilderTone] = useState<(typeof BUILDER_TONES)[number]>("Professional");
  const [builderOutputType, setBuilderOutputType] = useState<(typeof BUILDER_OUTPUT_TYPES)[number]>("General prompt");
  const [builderLength, setBuilderLength] = useState<(typeof BUILDER_LENGTHS)[number]>("Medium");
  const [builderMustInclude, setBuilderMustInclude] = useState("");
  const [builderMustAvoid, setBuilderMustAvoid] = useState("");
  const [selectedJsonCardId, setSelectedJsonCardId] = useState<JsonPromptCard["id"] | "">("");
  const [jsonCardValues, setJsonCardValues] = useState<Record<string, string>>({});
  const [footballPlayerName, setFootballPlayerName] = useState("");
  const [footballClub, setFootballClub] = useState("");
  const [footballShirtName, setFootballShirtName] = useState("");
  const [footballShirtNumber, setFootballShirtNumber] = useState("");
  const [footballAction, setFootballAction] = useState("standing on the pitch");
  const [footballStadium, setFootballStadium] = useState("");
  const [footballMood, setFootballMood] = useState("cinematic night match");
  const [outputKind, setOutputKind] = useState<"optimize" | "audit" | "fix" | null>(null);
  const [lastAuditInput, setLastAuditInput] = useState("");
  const [vpnWarning, setVpnWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [promptDropActive, setPromptDropActive] = useState(false);
  const [imageDropActive, setImageDropActive] = useState(false);
  const [timingInfo, setTimingInfo] = useState<{
    totalMs: number;
    providerMs?: number;
    groqMs?: number;
    xaiMs?: number;
    fallbackMs?: number;
    model?: string;
  } | null>(null);
  const [tryInProvider, setTryInProvider] = useState<TryInProvider>({
    id: "chatgpt",
    label: "ChatGPT",
    url: "https://chatgpt.com/",
  });
  const [historyItems, setHistoryItems] = useState<Array<{
    id: string;
    input: string;
    output: string;
    mode: "optimize" | "audit" | "fix";
    createdAt: number;
  }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastRetryCount, setLastRetryCount] = useState(0);
  const optimizerRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const apiBase = (((import.meta as any).env?.VITE_API_BASE ?? "") as string).trim();
  const apiUrl = apiBase ? `${apiBase.replace(/\/+$/, "")}/api/optimize` : "/api/optimize";
  const outputQuality = useMemo(() => {
    if (!optimizedOutput || outputKind === "audit") return null;
    return evaluateOptimizerQuality(promptInput, optimizedOutput);
  }, [optimizedOutput, outputKind, promptInput]);
  const tryInProviders: TryInProvider[] = [
    { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
    { id: "promptschat", label: "Prompts.chat", url: "https://prompts.chat/" },
    { id: "gemini", label: "Gemini", url: "https://gemini.google.com/" },
    { id: "claude", label: "Claude", url: "https://claude.ai/" },
    { id: "perplexity", label: "Perplexity", url: "https://www.perplexity.ai/" },
    { id: "poe", label: "Poe", url: "https://poe.com/" },
    { id: "qwen", label: "Qwen", url: "https://chat.qwen.ai/" },
    { id: "arena", label: "Arena", url: "https://arena.ai/" },
    { id: "deepseek", label: "DeepSeek", url: "https://chat.deepseek.com/" },
  ];

  const handleOptimize = async (forceImprove = false) => {
    if (!promptInput.trim()) return;
    setOptimizerError(null);
    setVpnWarning(false);
    setWarningMessage(null);
    setIsOptimizing(true);

    try {
      const systemPrompt =
        mode === "audit" ? AUDITOR_SYSTEM_PROMPT : OPTIMIZER_SYSTEM_PROMPT;
      const rawPrompt = promptInput.trim();
      const improveSource =
        forceImprove && mode === "optimize" && optimizedOutput.trim()
          ? optimizedOutput.trim()
          : "";
      const promptForModel = improveSource || rawPrompt;
      const submit = async (contextValue: string) =>
        fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemPrompt,
            prompt: promptForModel,
            context: contextValue,
            images: attachedImages,
            userEmail: user?.email || "",
          }),
        });

      const applyResponseMeta = (data: any) => {
        if (typeof data?.remaining === "number") {
          setRemainingUses(data.remaining);
        }
        if (typeof data?.limit === "number") {
          setDailyLimit(data.limit);
        }
        if (typeof data?.unlimited === "boolean") {
          setIsUnlimited(data.unlimited);
        }
        if (typeof data?.vpnWarning === "boolean") {
          setVpnWarning(data.vpnWarning);
          setWarningMessage(typeof data?.warningMessage === "string" ? data.warningMessage : null);
        }
      };

      const formatInstruction = formatInstructionFor(outputFormat);
      const baseContext = [
        extraContext.trim(),
        mode === "optimize" ? formatInstruction : "",
        improveSource
          ? `Improve pass: tighten clarity and precision while preserving intent.\nOriginal goal:\n${rawPrompt.slice(0, 500)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      let response = await submit(baseContext);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        applyResponseMeta(data);
        throw new Error(data?.error || `Optimization failed (${response.status}).`);
      }

      let data = await response.json();
      let retryCount = 0;
      if (mode !== "audit") {
        const maxRetries = 2;
        let quality = evaluateOptimizerQuality(rawPrompt, String(data?.output ?? ""));
        while (quality.label === "Weak" && retryCount < maxRetries) {
          retryCount += 1;
          const retryContext = [
            baseContext,
            "Revision rules: fully rewrite; do not repeat user wording; preserve intent but improve clarity; include strong structure and practical output.",
            formatInstruction,
            `Retry pass ${retryCount}: prioritize usefulness over verbosity.`,
          ]
            .filter(Boolean)
            .join("\n\n");
          const retryResponse = await submit(retryContext);
          if (!retryResponse.ok) break;
          data = await retryResponse.json();
          quality = evaluateOptimizerQuality(rawPrompt, String(data?.output ?? ""));
        }
      }

      const finalOutput = String(data?.output ?? "");
      setOptimizedOutput(finalOutput);
      if (data?.timing) {
        setTimingInfo(data.timing);
      } else {
        setTimingInfo(null);
      }
      if (mode === "audit") {
        setLastAuditInput(rawPrompt);
        setOutputKind("audit");
        setLastRetryCount(0);
      } else {
        setOutputKind("optimize");
        setLastRetryCount(retryCount);
      }
      applyResponseMeta(data);
      void saveHistoryItem({
        input: rawPrompt,
        output: finalOutput,
        mode: mode === "audit" ? "audit" : "optimize",
      });
    } catch (error) {
      const fallback = buildLocalFallbackPrompt({
        raw: promptInput.trim(),
        context: extraContext,
        outputFormat,
        improveFrom: "",
      });
      if (mode === "optimize") {
        setOptimizedOutput(fallback);
        setOutputKind("optimize");
        setLastRetryCount(0);
      }
      const message = `${normalizeOptimizerErrorMessage((error as Error).message)} Using local fallback.`;
      setOptimizerError(
        message.includes("(500)")
          ? `${message} Hint: check backend model/API keys on the server.`
          : message,
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    if (!promptToLoad) return;
    setPromptInput(promptToLoad);
    setExtraContext("");
    setAttachedImages([]);
    setOptimizedOutput("");
    setOutputKind(null);
    setMode("optimize");
    setOptimizerError(null);
    setVpnWarning(false);
    setWarningMessage(null);
    // When a prompt is loaded from library/detail pages, expose upload/context controls immediately.
    setShowAdvancedOptions(true);
    clearPromptToLoad();
    if (optimizerRef.current) {
      optimizerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [promptToLoad, clearPromptToLoad]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("focus") !== "optimizer") return;
    const timer = window.setTimeout(() => {
      if (optimizerRef.current) {
        optimizerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  const handleTxtUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setExtraContext((prev) => {
      const next = prev ? `${prev}\n\n${text}` : text;
      return next.trim();
    });
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const names = Array.from(files).map((file) => file.name);
    setAttachedImages((prev) => Array.from(new Set([...prev, ...names])));
  };

  const handlePromptDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setPromptDropActive(false);
    const json = event.dataTransfer.getData("application/x-dunamis-prompt");
    if (json) {
      try {
        const parsed = JSON.parse(json) as PromptDragPayload;
        if (parsed?.content?.trim()) {
          setPromptInput((prev) => (prev.trim() ? `${prev.trim()}\n\n${parsed.content.trim()}` : parsed.content.trim()));
          setShowAdvancedOptions(true);
          return;
        }
      } catch {
        // fall through to plain text
      }
    }
    const plain = event.dataTransfer.getData("text/plain");
    if (plain?.trim()) {
      setPromptInput((prev) => (prev.trim() ? `${prev.trim()}\n\n${plain.trim()}` : plain.trim()));
      setShowAdvancedOptions(true);
    }
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setImageDropActive(false);
    const next: string[] = [];
    const json = event.dataTransfer.getData("application/x-dunamis-image");
    if (json) {
      try {
        const parsed = JSON.parse(json) as ImageDragPayload;
        if (parsed?.url) next.push(parsed.url);
        if (parsed?.title) next.push(parsed.title);
      } catch {
        // ignore malformed payload
      }
    }
    const uri = event.dataTransfer.getData("text/uri-list");
    if (uri?.trim()) next.push(uri.trim());
    if (event.dataTransfer.files?.length) {
      next.push(...Array.from(event.dataTransfer.files).map((file) => file.name));
    }
    if (next.length) {
      setAttachedImages((prev) => Array.from(new Set([...prev, ...next])));
      setShowAdvancedOptions(true);
    }
  };

  const handleClear = () => {
    setPromptInput("");
    setExtraContext("");
    setAttachedImages([]);
    setOptimizedOutput("");
    setOptimizerError(null);
    setVpnWarning(false);
    setWarningMessage(null);
    setOutputKind(null);
    setLastAuditInput("");
    setLastRetryCount(0);
    setTimingInfo(null);
  };

  const handleAuditFix = async () => {
    if (!lastAuditInput.trim()) return;
    setOptimizerError(null);
    setVpnWarning(false);
    setWarningMessage(null);
    setIsOptimizing(true);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: AUDITOR_REWRITE_PROMPT,
          prompt: lastAuditInput.trim(),
          context: extraContext.trim(),
          images: attachedImages,
          userEmail: user?.email || ""
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (typeof data?.remaining === "number") {
          setRemainingUses(data.remaining);
        }
        if (typeof data?.limit === "number") {
          setDailyLimit(data.limit);
        }
        if (typeof data?.unlimited === "boolean") {
          setIsUnlimited(data.unlimited);
        }
        if (typeof data?.vpnWarning === "boolean") {
          setVpnWarning(data.vpnWarning);
          setWarningMessage(typeof data?.warningMessage === "string" ? data.warningMessage : null);
        }
        throw new Error(data?.error || "Optimization failed.");
      }

      const data = await response.json();
      setOptimizedOutput(data?.output ?? "");
      if (data?.timing) {
        setTimingInfo(data.timing);
      } else {
        setTimingInfo(null);
      }
      setOutputKind("fix");
      if (typeof data?.remaining === "number") {
        setRemainingUses(data.remaining);
      }
      if (typeof data?.limit === "number") {
        setDailyLimit(data.limit);
      }
      if (typeof data?.unlimited === "boolean") {
        setIsUnlimited(data.unlimited);
      }
      if (typeof data?.vpnWarning === "boolean") {
        setVpnWarning(data.vpnWarning);
        setWarningMessage(typeof data?.warningMessage === "string" ? data.warningMessage : null);
      }
      void saveHistoryItem({
        input: lastAuditInput.trim(),
        output: data?.output ?? "",
        mode: "fix",
      });
    } catch (error) {
      setOptimizerError((error as Error).message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedback(null);
      copyTimeoutRef.current = null;
    }, 2500);
  };

  const copyToClipboard = async (text: string, options?: { silent?: boolean }) => {
    if (!text.trim()) return false;
    const silent = options?.silent === true;

    let wrote = false;

    try {
      await navigator.clipboard.writeText(text);
      wrote = true;
    } catch {
      wrote = false;
    }

    if (!wrote) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const fallbackSuccess = document.execCommand("copy");
      document.body.removeChild(textarea);
      wrote = fallbackSuccess;
    }

    if (!wrote) {
      if (!silent) showCopyFeedback("Copy failed. Please select and copy manually.");
      return false;
    }

    let verified = false;
    try {
      const readText = await navigator.clipboard.readText();
      verified = readText === text;
    } catch {
      verified = false;
    }

    if (!silent) {
      showCopyFeedback(verified ? "Copied and verified." : "Copied to clipboard.");
    }
    return true;
  };

  const handleCopy = async () => {
    if (!optimizedOutput) return;
    await copyToClipboard(optimizedOutput);
  };

  const handleTryIn = async (provider = tryInProvider) => {
    if (!optimizedOutput) return;
    const launchUrl = buildTryInUrl(provider, optimizedOutput);
    const copied = await copyToClipboard(optimizedOutput, { silent: true });
    const popup = window.open(launchUrl, "_blank");
    if (!popup) {
      // If popup is blocked, continue in current tab.
      window.location.assign(launchUrl);
      showCopyFeedback(
        copied
          ? `Opening ${provider.label}. Prompt copied. Paste with Ctrl+V.`
          : `Opening ${provider.label}. Copy failed - use Copy Optimized Prompt.`,
      );
      return;
    }
    showCopyFeedback(
      copied
        ? `Opening ${provider.label}. Prefill used where supported. Prompt copied as backup.`
        : `Opening ${provider.label}. Prefill used where supported. If needed, copy manually.`,
    );
    try {
      popup.focus();
    } catch {
      // no-op
    }
  };

  const saveHistoryItem = async ({
    input,
    output,
    mode: itemMode,
  }: {
    input: string;
    output: string;
    mode: "optimize" | "audit" | "fix";
  }) => {
    if (!user?.uid) return;
    const trimmedInput = input.trim();
    const trimmedOutput = output.trim();
    if (!trimmedInput || !trimmedOutput) return;
    try {
      await addDoc(collection(db, "users", user.uid, "optimizerHistory"), {
        input: trimmedInput,
        output: trimmedOutput,
        mode: itemMode,
        createdAt: Date.now(),
      });
    } catch {
      // Silent fail: history should not block optimizer flow.
    }
  };

  const loadFromHistory = (item: {
    input: string;
    output: string;
    mode: "optimize" | "audit" | "fix";
  }) => {
    setPromptInput(item.input);
    setOptimizedOutput(item.output);
    setOutputKind(item.mode);
    setMode(item.mode === "audit" ? "audit" : "optimize");
    setOptimizerError(null);
    setCopyFeedback("Loaded from recent history.");
    if (optimizerRef.current) {
      optimizerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const removeHistoryItem = async (itemId: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "optimizerHistory", itemId));
      setCopyFeedback("History item deleted.");
    } catch {
      setCopyFeedback("Could not delete history item.");
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setHistoryItems([]);
      return;
    }

    setLoadingHistory(true);
    const historyQuery = query(
      collection(db, "users", user.uid, "optimizerHistory"),
      orderBy("createdAt", "desc"),
      limit(12),
    );
    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const next = snapshot.docs.map((historyDoc) => {
          const data = historyDoc.data() as {
            input?: string;
            output?: string;
            mode?: "optimize" | "audit" | "fix";
            createdAt?: number;
          };
          return {
            id: historyDoc.id,
            input: data.input || "",
            output: data.output || "",
            mode: data.mode || "optimize",
            createdAt: Number(data.createdAt || Date.now()),
          };
        });
        setHistoryItems(next);
        setLoadingHistory(false);
      },
      () => {
        setLoadingHistory(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const selectedJsonCard = JSON_PROMPT_CARDS.find((card) => card.id === selectedJsonCardId);

  const applySimpleStarter = (example: string) => {
    setPromptInput(example);
    setMode("optimize");
    if (optimizerRef.current) {
      optimizerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const buildGuidedPromptDraft = () => {
    const goal = builderGoal.trim();
    if (!goal) {
      showCopyFeedback("Add your main goal first.");
      return;
    }
    const draft = {
      prompt_template_id: "guided-general",
      template_label: "Guided General Prompt",
      objective: goal,
      output_mode: builderOutputType.toLowerCase().includes("json") ? "json" : "general",
      instructions: {
        strict_json: true,
        no_filler: true,
        keep_precise: true,
      },
      inputs: {
        task_type: builderTaskType,
        audience: builderAudience.trim() || "[AUDIENCE]",
        tone: builderTone,
        output_type: builderOutputType,
        preferred_length: builderLength,
        must_include: builderMustInclude.trim() || "[MUST_INCLUDE]",
        must_avoid: builderMustAvoid.trim() || "[MUST_AVOID]",
      },
      output_contract: ["role", "objective", "context", "steps", "constraints", "final_output"],
    };

    setOutputFormat("json");
    setPromptInput(JSON.stringify(draft, null, 2));
    showCopyFeedback("Guided draft added to prompt box.");
    setSimpleMode(true);
  };

  const buildFootballPromptDraft = () => {
    const playerName = footballPlayerName.trim();
    const shirtName = footballShirtName.trim();
    const shirtNumber = footballShirtNumber.trim();
    const club = footballClub.trim();
    const action = footballAction.trim();
    const stadium = footballStadium.trim();
    const mood = footballMood.trim();

    if (!playerName && !shirtName && !club) {
      showCopyFeedback("Add at least player name, shirt name, or club.");
      return;
    }

    const prompt = {
      prompt_template_id: "football-player-image",
      template_label: "Football Player Image",
      objective: "Generate a photoreal football image prompt with strict details.",
      output_mode: "image-prompt",
      instructions: {
        strict_json: true,
        no_filler: true,
        keep_precise: true,
      },
      inputs: {
        player_name: playerName || "[PLAYER_NAME]",
        club: club || "[CLUB]",
        shirt_name: shirtName || "[SHIRT_NAME]",
        shirt_number: shirtNumber || "[SHIRT_NUMBER]",
        action: action || "[ACTION]",
        stadium: stadium || "[STADIUM]",
        mood: mood || "[MOOD]",
      },
      output_contract: ["subject", "style", "lighting", "composition", "camera_details", "negative_prompt"],
    };

    setOutputFormat("json");
    setPromptInput(JSON.stringify(prompt, null, 2));
    setSimpleMode(true);
    showCopyFeedback("Football JSON prompt draft created.");
  };

  const handleSelectJsonCard = (cardId: JsonPromptCard["id"]) => {
    const card = JSON_PROMPT_CARDS.find((item) => item.id === cardId);
    if (!card) return;
    setSelectedJsonCardId(cardId);
    setJsonCardValues(
      card.fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = "";
        return acc;
      }, {}),
    );
  };

  const buildJsonCardPromptDraft = () => {
    if (!selectedJsonCard) {
      showCopyFeedback("Select a JSON prompt card first.");
      return;
    }

    const inputs = selectedJsonCard.fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = (jsonCardValues[field.key] || "").trim() || `[${field.label.toUpperCase()}]`;
      return acc;
    }, {});

    const payload =
      selectedJsonCard.id === "cinema-selfie-scene"
        ? {
            prompt: {
              characters: [
                {
                  name: toFieldValue(inputs, "character_1_name", "[CHARACTER_1_NAME]"),
                  description: toFieldValue(inputs, "character_1_description", "[CHARACTER_1_DESCRIPTION]"),
                },
                {
                  name: toFieldValue(inputs, "character_2_name", "[CHARACTER_2_NAME]"),
                  description: toFieldValue(inputs, "character_2_description", "[CHARACTER_2_DESCRIPTION]"),
                },
              ],
              scene: {
                location: toFieldValue(inputs, "location", "[LOCATION]"),
                background: toFieldValue(inputs, "background", "[BACKGROUND]"),
                lighting: toFieldValue(inputs, "lighting", "[LIGHTING]"),
              },
              interaction: toFieldValue(inputs, "interaction", "[INTERACTION]"),
              style: toFieldValue(inputs, "style", "[STYLE]"),
            },
          }
        : selectedJsonCard.id === "mirror-selfie-2000s"
        ? {
            request: toFieldValue(inputs, "request_text", "[REQUEST_TEXT]"),
            subject: {
              description: toFieldValue(inputs, "subject_description", "[SUBJECT_DESCRIPTION]"),
              age: toFieldValue(inputs, "age", "[AGE]"),
              expression: toFieldValue(inputs, "expression", "[EXPRESSION]"),
              hair: {
                color: toFieldValue(inputs, "hair_color", "[HAIR_COLOR]"),
                style: toFieldValue(inputs, "hair_style", "[HAIR_STYLE]"),
              },
              clothing: {
                top: {
                  type: toFieldValue(inputs, "top_type", "[TOP_TYPE]"),
                  color: toFieldValue(inputs, "top_color", "[TOP_COLOR]"),
                  details: toFieldValue(inputs, "top_details", "[TOP_DETAILS]"),
                },
                shoes: {
                  type: toFieldValue(inputs, "shoe_type", "[SHOE_TYPE]"),
                  colors: {
                    primary: toFieldValue(inputs, "shoe_primary_color", "[SHOE_PRIMARY_COLOR]"),
                    secondary: toFieldValue(inputs, "shoe_secondary_color", "[SHOE_SECONDARY_COLOR]"),
                    laces: toFieldValue(inputs, "shoe_laces_color", "[SHOE_LACES_COLOR]"),
                  },
                },
              },
              face: {
                preserve_original: true,
                makeup: toFieldValue(inputs, "makeup", "[MAKEUP]"),
              },
            },
            accessories: {
              earrings: { type: toFieldValue(inputs, "earrings", "[EARRINGS]") },
              jewelry: { waistchain: toFieldValue(inputs, "waistchain", "[WAISTCHAIN]") },
              device: {
                type: toFieldValue(inputs, "phone_type", "[PHONE_TYPE]"),
                details: toFieldValue(inputs, "phone_details", "[PHONE_DETAILS]"),
              },
            },
            photography: {
              camera_style: toFieldValue(inputs, "camera_style", "[CAMERA_STYLE]"),
              lighting: toFieldValue(inputs, "photo_lighting", "[PHOTO_LIGHTING]"),
              angle: toFieldValue(inputs, "angle", "[ANGLE]"),
              shot_type: toFieldValue(inputs, "shot_type", "[SHOT_TYPE]"),
              texture: toFieldValue(inputs, "texture", "[TEXTURE]"),
            },
            background: {
              setting: toFieldValue(inputs, "setting", "[SETTING]"),
              wall_color: toFieldValue(inputs, "wall_color", "[WALL_COLOR]"),
              elements: toListValue(inputs, "background_elements", ["[BACKGROUND_ELEMENT_1]", "[BACKGROUND_ELEMENT_2]"]),
              atmosphere: toFieldValue(inputs, "atmosphere", "[ATMOSPHERE]"),
              lighting: toFieldValue(inputs, "background_lighting", "[BACKGROUND_LIGHTING]"),
            },
          }
        : selectedJsonCard.id === "style-mode-image-director"
        ? {
            persona: "professional AI Image Generator, cinematographer, and visual director.",
            userStyleModeHandling: {
              modes: ["CINEMA", "STUDIO", "ART"],
              defaultMode: "CINEMA",
              selectedMode: toFieldValue(inputs, "mode", "CINEMA").toUpperCase(),
              description:
                "Before generating the image, determine which mode the user requests. If the user does not explicitly choose, default to MODE: CINEMA.",
            },
            objective:
              "Transform short, minimal user prompts into ultra-high-quality images by intelligently expanding them using expert visual reasoning, strictly following the selected STYLE MODE.",
            userInput: {
              minimalPrompt: toFieldValue(inputs, "user_prompt", "[USER_PROMPT]"),
            },
            expansionMethod: {
              description: "Expand the user input using the 8-Element Prompt Formula:",
              formulaElements: [
                "Subject: clearly defined, physically coherent",
                "Composition: framing, camera angle, focal length",
                "Style: strictly controlled by STYLE MODE",
                "Lighting: physically accurate or stylized based on MODE",
                "Color: intentional grading or palette",
                "Mood: emotional tone and atmosphere",
                "Details: texture, material, micro-detail or brush detail",
                "Context: environment, era, or narrative setting",
              ],
            },
            styleModeRules: {
              CINEMA: [
                "Treat the image as a live-action film frame",
                "Naturalistic composition, imperfect framing allowed",
                "Cinematic lenses, depth of field, realistic exposure",
                "Motivated lighting (practical lights, moonlight, neon, fire, etc.)",
                "Filmic color grading, realistic contrast, subtle grain",
                "Environmental storytelling and atmosphere are prioritized",
              ],
              STUDIO: [
                "Treat the image as a professional studio photograph",
                "Clean, intentional composition and framing",
                "Controlled lighting setups (key, fill, rim, softboxes, reflectors)",
                "Neutral or seamless backgrounds unless specified",
                "Extremely sharp focus, clean materials, minimal noise",
                "Commercial-grade realism and polish are prioritized",
              ],
              ART: [
                "Allow stylization, abstraction, and artistic interpretation",
                "Painterly, illustrative, surreal, or conceptual techniques permitted",
                "Expressive lighting, color theory, and form",
                "Strong visual identity over physical realism",
                "Photorealistic constraints only if they serve the artwork",
              ],
            },
            metaTokens: [
              "cinematic or studio optics, depth of field control",
              "global illumination or expressive lighting",
              "physically based materials or artistic surface treatment",
              "filmic grading or intentional color theory",
              "high dynamic range where appropriate",
            ],
            behaviorRules: [
              "If the user prompt is short or vague, expand it intelligently without asking questions",
              "Never mix CINEMA, STUDIO, or ART styles in the same output",
              "Prefer clarity, realism, and visual intent over randomness",
              "Output must be high-quality and deliberate",
            ],
            outputDescription: toFieldValue(
              inputs,
              "output_description",
              "Generate one fully expanded, high-quality image based on the user's minimal prompt and selected STYLE MODE.",
            ),
            negativePrompt: {
              alwaysApply: [
                "low quality",
                "worst quality",
                "low resolution",
                "blurry",
                "soft focus",
                "out of focus",
                "pixelated",
                "jpeg artifacts",
                "noise",
                "grainy",
                "oversharpened",
                "overprocessed",
                "poor composition",
                "awkward framing",
                "random cropping",
                "duplicate elements",
                "broken perspective",
                "visual confusion",
                "text",
                "captions",
                "subtitles",
                "logos",
                "watermarks",
                "signatures",
                "UI elements",
              ],
              additionalByMode: {
                CINEMA: [
                  "cartoon",
                  "anime",
                  "illustration",
                  "painting",
                  "sketch",
                  "CGI",
                  "3D render",
                  "plastic look",
                  "toy-like materials",
                  "fake lighting",
                  "staged studio look",
                ],
                STUDIO: [
                  "cinematic haze",
                  "heavy grain",
                  "dramatic shadows without purpose",
                  "environmental clutter",
                  "uncontrolled lighting",
                  "motion blur",
                ],
                ART: [
                  "camera metadata obsession",
                  "flat realism",
                  "boring lighting",
                  "unintentional photorealism",
                  "lifeless composition",
                ],
              },
            },
          }
        : {
            prompt_template_id: selectedJsonCard.id,
            template_label: selectedJsonCard.label,
            objective: selectedJsonCard.description,
            output_mode: selectedJsonCard.outputType,
            instructions: {
              strict_json: true,
              no_filler: true,
              keep_precise: true,
            },
            inputs,
            output_contract: getOutputContractFor(selectedJsonCard),
          };

    setOutputFormat("json");
    setPromptInput(JSON.stringify(payload, null, 2));
    setMode("optimize");
    setShowAdvancedOptions(true);
    showCopyFeedback(`${selectedJsonCard.label} JSON draft created.`);
  };

  return (
    <AppShell
      eyebrow="Workspace"
      title="Advanced Optimizer"
      description="Draft, audit, and refine prompts in one deeper workspace. The brand stays fixed at the top, while this page focuses on structured output, retries, and history."
      actions={
        <>
          <Link href="/prompts">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Prompt Library
            </Button>
          </Link>
          <Link href="/images">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Image Library
            </Button>
          </Link>
          <Link href="/audit-json">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Audit JSON
            </Button>
          </Link>
          {user ? (
            <Button
              variant="outline"
              className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10"
              onClick={() => {
                void logout();
              }}
            >
              Sign Out
            </Button>
          ) : (
            <AuthModal
              trigger={
                <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
                  Sign In
                </Button>
              }
            />
          )}
        </>
      }
    >
      <div className="space-y-16 pb-20 selection:bg-primary selection:text-primary-foreground">
        <div>
          <div className="rounded-lg border border-yellow-500/40 bg-black/70 px-5 py-4 text-center text-base font-semibold text-yellow-200 shadow-lg lg:text-lg 2xl:text-xl">
              Advanced Optimizer: draft, audit, and refine prompts with strict output controls.
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/prompts">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Browse Prompt Library
              </Button>
            </Link>
            <Link href="/images">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Browse Image Library
              </Button>
            </Link>
            <Link href="/tutorials">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Open Tutorials
              </Button>
            </Link>
          </div>
        </div>
        <section id="optimizer" ref={optimizerRef} className="space-y-6">
            {!user && (
              <div className="rounded-lg border border-yellow-500/40 bg-black/80 p-6 text-center shadow-lg">
                <h2 className="text-xl md:text-2xl font-semibold text-white">Sign in to use the Prompt Optimizer</h2>
                <p className="mt-2 text-sm md:text-base text-gray-300">
                  Create a free account to access the optimizer and save your results.
                </p>
                <div className="mt-4 flex items-center justify-center">
                  <AuthModal />
                </div>
              </div>
            )}
            {user && (
            <div
              className={[
                "rounded-lg border border-yellow-500/30 bg-black/70 p-6 lg:p-8 shadow-lg space-y-6",
                isFullscreen ? "fixed inset-3 md:inset-6 2xl:inset-10 z-50 overflow-y-auto" : ""
              ].join(" ")}
            >
              <div className="rounded-lg border border-yellow-500/30 bg-black/60 px-4 py-3 text-xs text-yellow-100/90">
                Advanced Workspace: optimize or audit prompts, then iterate with retries and history.
              </div>
              <div className="rounded-lg border border-yellow-500/20 bg-black/50 px-4 py-3 text-xs text-gray-200">
                <p className="text-yellow-200 font-semibold mb-1 uppercase tracking-[0.2em]">Quick Start</p>
                <p>1. Paste or write your rough prompt.</p>
                <p>2. Choose Simple or Advanced, then Optimize or Audit.</p>
                <p>3. Copy the result, retry if needed, and save it to your history.</p>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl 2xl:text-3xl font-semibold">Advanced Optimizer</h2>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                          aria-label="Read me first"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Use Optimize for production rewrites and Audit for score-first diagnostics.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-gray-300">Designed for deeper refinement, scoring, and controlled prompt iteration.</p>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-end flex-wrap md:flex-nowrap">
                  <Button
                    variant="outline"
                    className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={() => setShowAdvancedOptions((prev) => !prev)}
                  >
                    {showAdvancedOptions ? "Hide Options" : "More Options"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={handleClear}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
                    {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-yellow-500/20 bg-black/45 p-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-200/75">Workspace Mode</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className={simpleMode ? "border-yellow-300 bg-yellow-500/10 text-yellow-100" : "border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/10"}
                      onClick={() => setSimpleMode(true)}
                    >
                      Simple
                    </Button>
                    <Button
                      variant="outline"
                      className={!simpleMode ? "border-yellow-300 bg-yellow-500/10 text-yellow-100" : "border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/10"}
                      onClick={() => {
                        setSimpleMode(false);
                        setShowAdvancedOptions(true);
                      }}
                    >
                      Advanced
                    </Button>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-gray-400">
                    {simpleMode ? "Start with plain language and optional helper tools." : "Work directly with full controls, context uploads, and format tuning."}
                  </p>
                </div>
                <div className="rounded-lg border border-yellow-500/20 bg-black/45 p-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-200/75">Result Type</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className={mode !== "audit" ? "border-yellow-300 bg-yellow-500/10 text-yellow-100" : "border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/10"}
                      onClick={() => setMode("optimize")}
                    >
                      Optimize
                    </Button>
                    <Button
                      variant="outline"
                      className={mode === "audit" ? "border-yellow-300 bg-yellow-500/10 text-yellow-100" : "border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/10"}
                      onClick={() => {
                        setMode("audit");
                        setSimpleMode(false);
                      }}
                    >
                      Audit
                    </Button>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-gray-400">
                    {mode === "audit" ? "Score and critique the prompt before deciding whether to fix it." : "Generate a cleaner production-ready prompt draft."}
                  </p>
                </div>
                <div className="rounded-lg border border-yellow-500/20 bg-black/45 p-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-200/75">Optional Helpers</p>
                  <p className="mt-3 text-sm text-white">{showAdvancedOptions || !simpleMode ? "Expanded" : "Hidden"}</p>
                  <p className="mt-1 text-[11px] leading-5 text-gray-400">
                    Prompt cards, uploads, and extra context stay tucked away until you need them.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="rounded-lg border border-yellow-500/30 bg-black/60 p-6 shadow-lg space-y-4 xl:col-span-5 min-w-0">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Your Prompt</h3>
                  <p className="text-xs text-gray-300">
                    {simpleMode ? "Describe what you want help with in plain English." : "Paste your rough prompt here."}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {simpleMode
                      ? "You can type normally. Example: “Write a short Facebook post about my cafe’s new menu.”"
                      : "Even a few words is enough — we’ll craft a perfect, production-ready prompt. More features coming soon."}
                  </p>
                </div>
                  <div className="rounded-md border border-yellow-500/30 bg-black/40 p-3 space-y-2">
                    <p className="text-xs text-yellow-200/90 font-semibold tracking-wide uppercase">Output format</p>
                    <Select
                      value={outputFormat}
                      onValueChange={(value) => setOutputFormat(value as OptimizerOutputFormat)}
                    >
                      <SelectTrigger className="w-full border-yellow-500/40 bg-black/30 text-yellow-200">
                        <SelectValue placeholder="Choose output format" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 text-white border-yellow-500/30">
                        <SelectItem value="general">General Prompt</SelectItem>
                        <SelectItem value="json">JSON Output</SelectItem>
                        <SelectItem value="image-prompt">Image Prompt</SelectItem>
                        <SelectItem value="ad-copy">Ad Copy</SelectItem>
                      </SelectContent>
                    </Select>
                    {mode === "audit" && (
                      <p className="text-[11px] text-gray-400">Audit mode scores quality. Format selection is used in Optimize mode.</p>
                    )}
                  </div>
                  {simpleMode && (
                    <details open className="rounded-md border border-yellow-500/30 bg-black/40 p-4">
                      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-yellow-200/90">
                        Starter Examples
                      </summary>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {SIMPLE_STARTER_EXAMPLES.map((example, idx) => (
                          <Button
                            key={`${idx}-${example.slice(0, 12)}`}
                            variant="outline"
                            className="justify-start whitespace-normal border-yellow-500/30 text-left text-yellow-100 hover:bg-yellow-500/10"
                            onClick={() => applySimpleStarter(example)}
                          >
                            {example}
                          </Button>
                        ))}
                      </div>
                    </details>
                  )}
                  {simpleMode && (
                    <details className="rounded-md border border-yellow-500/30 bg-black/40 p-4">
                      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-yellow-200/90">
                        JSON Prompt Cards
                      </summary>
                      <p className="mt-3 text-[11px] text-gray-400">
                        Pick a card, fill field boxes, then build a strict JSON prompt draft.
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {JSON_PROMPT_CARDS.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => handleSelectJsonCard(card.id)}
                            className={[
                              "rounded-md border px-3 py-3 text-left transition",
                              selectedJsonCardId === card.id
                                ? "border-yellow-300 bg-yellow-500/10"
                                : "border-yellow-500/30 bg-black/30 hover:bg-yellow-500/10",
                            ].join(" ")}
                          >
                            <p className="text-sm text-yellow-100 font-semibold">{card.label}</p>
                            <p className="text-[11px] text-gray-300">{card.description}</p>
                          </button>
                        ))}
                      </div>
                      {selectedJsonCard && (
                        <div className="space-y-3 rounded-md border border-yellow-500/25 bg-black/30 p-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-200/80">
                            {selectedJsonCard.label} Fields
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedJsonCard.fields.map((field) => (
                              <label key={`${selectedJsonCard.id}-${field.key}`} className="space-y-1 text-xs text-gray-300">
                                <span>{field.label}</span>
                                <Input
                                  value={jsonCardValues[field.key] || ""}
                                  onChange={(event) =>
                                    setJsonCardValues((prev) => ({
                                      ...prev,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                                  placeholder={field.placeholder}
                                />
                              </label>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                            onClick={buildJsonCardPromptDraft}
                          >
                            Build JSON Prompt
                          </Button>
                        </div>
                      )}
                    </details>
                  )}
                  {simpleMode && (
                    <details className="rounded-md border border-yellow-500/30 bg-black/40 p-4">
                      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-yellow-200/90">
                        Guided Prompt Builder
                      </summary>
                      <p className="mt-3 text-[11px] text-gray-400">
                        Choose your options, then build a structured draft into your prompt box.
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-xs text-gray-300">
                          <span>Task type</span>
                          <select
                            value={builderTaskType}
                            onChange={(event) => setBuilderTaskType(event.target.value as (typeof BUILDER_TASK_TYPES)[number])}
                            className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
                          >
                            {BUILDER_TASK_TYPES.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs text-gray-300">
                          <span>Tone</span>
                          <select
                            value={builderTone}
                            onChange={(event) => setBuilderTone(event.target.value as (typeof BUILDER_TONES)[number])}
                            className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
                          >
                            {BUILDER_TONES.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs text-gray-300">
                          <span>Output type</span>
                          <select
                            value={builderOutputType}
                            onChange={(event) => setBuilderOutputType(event.target.value as (typeof BUILDER_OUTPUT_TYPES)[number])}
                            className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
                          >
                            {BUILDER_OUTPUT_TYPES.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs text-gray-300">
                          <span>Length</span>
                          <select
                            value={builderLength}
                            onChange={(event) => setBuilderLength(event.target.value as (typeof BUILDER_LENGTHS)[number])}
                            className="h-10 w-full rounded-md border border-yellow-500/30 bg-black/40 px-3 text-sm text-white"
                          >
                            {BUILDER_LENGTHS.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <Input
                        value={builderGoal}
                        onChange={(event) => setBuilderGoal(event.target.value)}
                        placeholder="Main goal (required): What do you want the AI to produce?"
                        className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                      />
                      <Input
                        value={builderAudience}
                        onChange={(event) => setBuilderAudience(event.target.value)}
                        placeholder="Audience (optional): founders, beginners, customers, etc."
                        className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                      />
                      <Textarea
                        value={builderMustInclude}
                        onChange={(event) => setBuilderMustInclude(event.target.value)}
                        placeholder="Must include (optional): key points, CTA, keywords, constraints..."
                        className="min-h-[90px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                      />
                      <Textarea
                        value={builderMustAvoid}
                        onChange={(event) => setBuilderMustAvoid(event.target.value)}
                        placeholder="Must avoid (optional): jargon, fluff, specific words, risky claims..."
                        className="min-h-[80px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                      />
                      <Button
                        variant="outline"
                        className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={buildGuidedPromptDraft}
                      >
                        Build Draft Into Prompt Box
                      </Button>
                    </details>
                  )}
                  {simpleMode && (
                    <details className="rounded-md border border-yellow-500/30 bg-black/40 p-4">
                      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-yellow-200/90">
                        Football Prompt Form
                      </summary>
                      <p className="mt-3 text-[11px] text-gray-400">
                        Fill this in like the site you showed: shirt name, number, club, scene details.
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                          value={footballPlayerName}
                          onChange={(event) => setFootballPlayerName(event.target.value)}
                          placeholder="Player look/name (optional)"
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                        />
                        <Input
                          value={footballClub}
                          onChange={(event) => setFootballClub(event.target.value)}
                          placeholder="Club (e.g. Arsenal)"
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                        />
                        <Input
                          value={footballShirtName}
                          onChange={(event) => setFootballShirtName(event.target.value)}
                          placeholder="Shirt name"
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                        />
                        <Input
                          value={footballShirtNumber}
                          onChange={(event) => setFootballShirtNumber(event.target.value)}
                          placeholder="Shirt number"
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                        />
                        <Input
                          value={footballAction}
                          onChange={(event) => setFootballAction(event.target.value)}
                          placeholder="Action (e.g. celebrating a goal)"
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                        />
                        <Input
                          value={footballStadium}
                          onChange={(event) => setFootballStadium(event.target.value)}
                          placeholder="Stadium / location"
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                        />
                      </div>
                      <Input
                        value={footballMood}
                        onChange={(event) => setFootballMood(event.target.value)}
                        placeholder="Mood / lighting (e.g. rainy under floodlights)"
                        className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                      />
                      <Button
                        variant="outline"
                        className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={buildFootballPromptDraft}
                      >
                        Build Football Prompt
                      </Button>
                    </details>
                  )}
                  {(!simpleMode || showAdvancedOptions) && (
                    <div className="rounded-md border border-yellow-500/25 bg-black/35 p-3">
                      <p className="text-[11px] text-gray-300">
                        Frameworks moved to tutorial pages to keep this optimizer focused on JSON cards and precision inputs.
                        <Link href="/tutorials" className="text-yellow-200 ml-1 underline">Open framework tutorial</Link>
                      </p>
                    </div>
                  )}
                  <Textarea
                    value={promptInput}
                    onChange={(event) => setPromptInput(event.target.value)}
                    className="min-h-[200px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-400"
                    placeholder={simpleMode ? "Example: Write a friendly email to customers about our new weekend offer..." : "Write or paste your prompt here..."}
                  />
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setPromptDropActive(true);
                    }}
                    onDragLeave={() => setPromptDropActive(false)}
                    onDrop={handlePromptDrop}
                    className={[
                      "rounded-md border border-dashed p-3 text-xs transition",
                      promptDropActive
                        ? "border-yellow-300 bg-yellow-500/10 text-yellow-100"
                        : "border-yellow-500/30 bg-black/30 text-gray-300",
                    ].join(" ")}
                  >
                    Drag a prompt card from Prompt Library and drop it here.
                  </div>
                  {(!simpleMode || showAdvancedOptions) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-2 text-xs text-gray-300">
                      Upload .txt context
                      <Input
                        type="file"
                        accept=".txt"
                        onChange={(event) => handleTxtUpload(event.target.files?.[0] ?? null)}
                        className="bg-black/40 border-yellow-500/30 text-white"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-gray-300">
                      Upload images
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => handleImageUpload(event.target.files)}
                        className="bg-black/40 border-yellow-500/30 text-white"
                      />
                    </label>
                  </div>
                  )}
                  {(!simpleMode || showAdvancedOptions) && (
                  <Textarea
                    value={extraContext}
                    onChange={(event) => setExtraContext(event.target.value)}
                    className="min-h-[140px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-400"
                    placeholder="Extra context: goals, constraints, audience, tone, or examples..."
                  />
                  )}
                  {(!simpleMode || showAdvancedOptions) && (
                  <p className="text-[11px] text-gray-400">
                    This box is for details that help the optimizer (audience, tone, must-have points).
                    Example: “Audience is SaaS founders. Keep it punchy. Include a CTA.”
                  </p>
                  )}
                  {attachedImages.length > 0 && (
                    <div className="text-xs text-yellow-200/80">
                      Attached images: {attachedImages.join(", ")}
                    </div>
                  )}
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setImageDropActive(true);
                    }}
                    onDragLeave={() => setImageDropActive(false)}
                    onDrop={handleImageDrop}
                    className={[
                      "rounded-md border border-dashed p-3 text-xs transition",
                      imageDropActive
                        ? "border-yellow-300 bg-yellow-500/10 text-yellow-100"
                        : "border-yellow-500/30 bg-black/30 text-gray-300",
                    ].join(" ")}
                  >
                    Drag image cards from Image Library and drop here to add references.
                  </div>
                  <Button
                    className="w-full bg-yellow-400 text-black hover:bg-yellow-300"
                    onClick={() => { void handleOptimize(); }}
                    disabled={isOptimizing || !promptInput.trim()}
                  >
                    {isOptimizing ? "Working..." : simpleMode ? "Make My Prompt Better" : mode === "audit" ? "Score It" : "Send"}
                  </Button>
                  <div className="text-xs text-yellow-200/80 text-center">
                    {isUnlimited
                      ? "Unlimited access enabled."
                      : dailyLimit !== null && remainingUses !== null
                        ? `${remainingUses} of ${dailyLimit} uses remaining`
                        : "You have 5 free uses total."}
                  </div>
                  <div className="text-[11px] text-gray-300 text-center">
                    Supporters can be upgraded to unlimited uses.
                  </div>
                  <div className="text-[11px] text-gray-400 text-center">
                    Performance tip: disable browser scripts/extensions (e.g., Tampermonkey) if the optimizer feels slow.
                  </div>
                  {vpnWarning && (
                    <div className="text-[11px] text-yellow-200/90 text-center">
                      {warningMessage ?? "VPN/proxy detected. Access allowed, but this may trigger review."}
                    </div>
                  )}
                  {optimizerError && (
                    <div className="text-xs text-red-300">{optimizerError}</div>
                  )}
                </div>

                <div className="rounded-lg border border-yellow-500/30 bg-black/60 p-6 shadow-lg space-y-4 xl:col-span-7 min-w-0">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">
                      {simpleMode ? "Your Improved Prompt" : outputKind === "audit" ? "Audit Output" : "Optimized Output"}
                    </h3>
                    <p className="text-xs text-gray-300">
                      {simpleMode
                        ? "Copy this and paste it into your AI tool (like ChatGPT)."
                        : outputKind === "audit"
                        ? "Brutal score and critique appears here."
                        : "Your improved prompt appears here."}
                    </p>
                    {outputQuality && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-gray-300">Draft quality:</span>
                        <span
                          className={[
                            "text-[11px] px-2 py-0.5 rounded-full border",
                            outputQuality.label === "Strong"
                              ? "border-emerald-400/40 text-emerald-300"
                              : outputQuality.label === "Good"
                              ? "border-yellow-400/40 text-yellow-200"
                              : "border-red-400/40 text-red-300",
                          ].join(" ")}
                        >
                          {outputQuality.label} ({outputQuality.score}/100)
                        </span>
                        {lastRetryCount > 0 && (
                          <span className="text-[11px] text-gray-400">after {lastRetryCount} retry{lastRetryCount > 1 ? "ies" : ""}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={optimizedOutput}
                    readOnly
                    className="min-h-[420px] 2xl:min-h-[500px] bg-black/30 border-yellow-500/20 text-white placeholder:text-gray-500"
                    placeholder={
                      simpleMode
                        ? "Your improved prompt will appear here after you click Make My Prompt Better."
                        : mode === "audit"
                        ? "Click Score It to get a brutal audit."
                        : "Click Send to generate an improved version."
                    }
                  />
                  {outputKind === "audit" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={handleCopy}
                        disabled={!optimizedOutput}
                      >
                        Copy Audit Result
                      </Button>
                      <Button
                        className="w-full bg-yellow-400 text-black hover:bg-yellow-300"
                        onClick={handleAuditFix}
                        disabled={!optimizedOutput || isOptimizing}
                      >
                        Fix It
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button
                        variant="outline"
                        className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={handleCopy}
                        disabled={!optimizedOutput}
                      >
                        Copy Optimized Prompt
                      </Button>
                      <AddToPackDialog
                        promptText={optimizedOutput}
                        suggestedTitle="Optimizer Result"
                        onDone={showCopyFeedback}
                        trigger={
                          <Button
                            variant="outline"
                            className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                            disabled={!optimizedOutput}
                          >
                            Add to Pack
                          </Button>
                        }
                      />
                      <div className="w-full overflow-hidden rounded-md border border-yellow-500/40 flex items-stretch">
                        <Button
                          variant="outline"
                          className="flex-1 min-w-0 rounded-none border-0 text-yellow-200 hover:bg-yellow-500/10"
                          onClick={() => handleTryIn()}
                          disabled={!optimizedOutput}
                        >
                          <span className="truncate">Try in {tryInProvider.label}</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="rounded-none border-0 border-l border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-3"
                              disabled={!optimizedOutput}
                              aria-label="Choose a provider"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            side="bottom"
                            sideOffset={8}
                            collisionPadding={12}
                            className="bg-black/90 text-white border-yellow-500/30 z-50 w-56"
                          >
                            {tryInProviders.map((provider) => (
                              <DropdownMenuItem
                                key={provider.id}
                                className="cursor-pointer focus:bg-yellow-500/20"
                                onClick={() => {
                                  setTryInProvider(provider);
                                  handleTryIn(provider);
                                }}
                              >
                                Try in {provider.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                  {outputKind !== "audit" && (
                    <Button
                      variant="outline"
                      className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                      onClick={() => { void handleOptimize(true); }}
                      disabled={isOptimizing || !promptInput.trim()}
                    >
                      {isOptimizing ? "Improving..." : "Improve Again"}
                    </Button>
                  )}
                  {outputQuality?.label === "Weak" && (
                    <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-red-200">
                          Weak output detected. Regenerate for a stronger structured prompt.
                        </p>
                        {outputQuality.notes.slice(0, 2).map((note, idx) => (
                          <p key={`${note}-${idx}`} className="text-[11px] text-red-100/90">- {note}</p>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="bg-yellow-400 text-black hover:bg-yellow-300"
                        onClick={() => { void handleOptimize(true); }}
                        disabled={isOptimizing}
                      >
                        {isOptimizing ? "Regenerating..." : "Regenerate Stronger"}
                      </Button>
                    </div>
                  )}
                  <div className="text-[11px] text-gray-300 break-words">
                    {copyFeedback
                      ? copyFeedback
                      : outputKind === "audit"
                        ? "Audit mode is for scoring and critique. Use Fix It to generate a rewritten prompt."
                        : "We copy the prompt and open your provider in a new tab. Browsers don’t allow auto‑pasting into other sites."}
                  </div>
                  <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Recent History</p>
                      <p className="text-[11px] text-gray-400 text-right">Last 12 results</p>
                    </div>
                    {loadingHistory ? (
                      <p className="text-[12px] text-gray-300">Loading history...</p>
                    ) : historyItems.length === 0 ? (
                      <p className="text-[12px] text-gray-300">No history yet. Your results will appear here automatically.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {historyItems.map((item) => {
                          const preview = item.input.replace(/\s+/g, " ").trim();
                          const modeLabel = item.mode === "fix" ? "Fix" : item.mode === "audit" ? "Audit" : "Optimize";
                          return (
                            <div key={item.id} className="rounded-md border border-yellow-500/20 bg-black/30 p-2 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-[11px] text-yellow-200">{modeLabel}</p>
                                <p className="text-[10px] text-gray-400 text-right">
                                  {new Date(item.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <p className="text-[11px] text-gray-300 line-clamp-2 break-words">
                                {preview || "No input text"}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                                  onClick={() => loadFromHistory(item)}
                                >
                                  Load
                                </Button>
                                <Button
                                  variant="outline"
                                  className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                                  onClick={() => copyToClipboard(item.output)}
                                >
                                  Copy Output
                                </Button>
                                <Button
                                  variant="outline"
                                  className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                                  onClick={() => removeHistoryItem(item.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {SHOW_TIMING && timingInfo && (
                    <div className="text-[11px] text-gray-400">
                      LLM time: {(((timingInfo.providerMs ?? timingInfo.groqMs ?? timingInfo.xaiMs ?? timingInfo.fallbackMs ?? 0) / 1000).toFixed(2))}s · Total: {(timingInfo.totalMs / 1000).toFixed(2)}s
                      {timingInfo.model ? ` · ${timingInfo.model}` : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
        </section>

        <section>
          <div className="rounded-lg border border-yellow-500/30 bg-black/60 p-6 shadow-lg backdrop-blur">
            <ContactSection />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
                                                                                                                                                              
                                                                                                                                                                          
