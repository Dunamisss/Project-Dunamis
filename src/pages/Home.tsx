import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import hackerImage from "@/assets/hacker.png";
import TubesEffect from "@/components/TubesEffect";
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

const SHOW_TIMING = false;

const FRAMEWORK_TEMPLATES = [
  {
    id: "role",
    label: "Role Prompting",
    description: "Tell the AI who it is before the task.",
    template:
      "Role:\nObjective:\nContext:\nConstraints:\nOutput format:",
  },
  {
    id: "5w1h",
    label: "5W1H",
    description: "Who, What, When, Where, Why, How.",
    template:
      "Goal:\nWho:\nWhat:\nWhen:\nWhere:\nWhy:\nHow:\nConstraints:\nOutput format:",
  },
  {
    id: "star",
    label: "STAR",
    description: "Situation, Task, Action, Result.",
    template:
      "Situation:\nTask:\nAction:\nResult:\nConstraints:\nOutput format:",
  },
  {
    id: "bab",
    label: "Before-After-Bridge",
    description: "Current state, desired state, and the bridge.",
    template:
      "Before (current state):\nAfter (desired state):\nBridge (steps to get there):\nConstraints:\nOutput format:",
  },
  {
    id: "ipo",
    label: "Input-Process-Output",
    description: "Define inputs, steps, and output format.",
    template:
      "Input:\nProcess:\nOutput:\nConstraints:\nOutput format:",
  },
  {
    id: "zero",
    label: "Zero-Shot",
    description: "No examples, just clear instructions.",
    template:
      "Task:\nContext:\nConstraints:\nOutput format:",
  },
  {
    id: "few",
    label: "Few-Shot",
    description: "Provide 1–2 examples to lock the style.",
    template:
      "Task:\nContext:\nExamples:\n- Example 1:\n- Example 2:\nConstraints:\nOutput format:",
  },
  {
    id: "steps",
    label: "Step-by-Step",
    description: "Ask for structured steps and checkpoints.",
    template:
      "Task:\nSteps:\n1.\n2.\n3.\nConstraints:\nOutput format:",
  },
];

const SIMPLE_STARTER_EXAMPLES = [
  "Write a friendly welcome email for new customers of my small business.",
  "Create a social media post about our weekend sale with a clear call to action.",
  "Turn my rough notes into a clear, professional LinkedIn post.",
];

const HOME_WORKFLOW_STEPS = [
  {
    title: "1. Pick A Starting Point",
    text: "Choose a prompt from the library or type your own goal in plain English.",
  },
  {
    title: "2. Add Context",
    text: "Drop image references or add constraints, audience, tone, and must-have details.",
  },
  {
    title: "3. Optimize",
    text: "Generate a stronger structured prompt, then click Improve Again if needed.",
  },
  {
    title: "4. Run In Your AI Tool",
    text: "Use Try in ChatGPT/Gemini/etc or copy and paste manually.",
  },
];

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

type FootballPromptForm = {
  playerName: string;
  club: string;
  shirtName: string;
  shirtNumber: string;
  action: string;
  stadium: string;
  mood: string;
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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
  const isPromptDraft =
    /###\s*(role|objective|context|steps|constraints)/i.test(cleaned) ||
    /(^|\n)\s*(role|objective|context|steps|constraints)\s*:/i.test(cleaned);
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
    improveSource || isPromptDraft
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
    isPromptDraft
      ? [
          "Rewrite the draft below into one stronger, cleaner, production-ready prompt.",
          "Keep the same intent, but remove repetition and weak structure.",
          "",
          "Draft to improve:",
          cleaned,
        ].join("\n")
      : [
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

export default function Home() {
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
  const [frameworkId, setFrameworkId] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<OptimizerOutputFormat>("general");
  const [mode, setMode] = useState<"optimize" | "audit">("optimize");
  const [simpleMode, setSimpleMode] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [outputKind, setOutputKind] = useState<"optimize" | "audit" | "fix" | null>(null);
  const [lastAuditInput, setLastAuditInput] = useState("");
  const [vpnWarning, setVpnWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [promptDropActive, setPromptDropActive] = useState(false);
  const [imageDropActive, setImageDropActive] = useState(false);
  const [timingInfo, setTimingInfo] = useState<{
    totalMs: number;
    groqMs: number;
    model?: string;
  } | null>(null);
  const [tryInProvider, setTryInProvider] = useState<{
    id: string;
    label: string;
    url: string;
  }>({
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
  const [footballForm, setFootballForm] = useState<FootballPromptForm>({
    playerName: "",
    club: "",
    shirtName: "",
    shirtNumber: "",
    action: "mid-strike on goal",
    stadium: "packed premier league stadium at night",
    mood: "intense match-winning moment",
  });
  const [footballCardOpen, setFootballCardOpen] = useState(false);
  const optimizerRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const apiBase = (((import.meta as any).env?.VITE_API_BASE ?? "") as string).trim();
  const apiUrl = apiBase ? `${apiBase.replace(/\/+$/, "")}/api/optimize` : "/api/optimize";
  const outputQuality = useMemo(() => {
    if (!optimizedOutput || outputKind === "audit") return null;
    return evaluateOptimizerQuality(promptInput, optimizedOutput);
  }, [optimizedOutput, outputKind, promptInput]);
  const tryInProviders = [
    { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
    { id: "grok", label: "Grok (xAI)", url: "https://grok.com/" },
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
    const rawInput = promptInput.trim();
    const improveSource =
      forceImprove && mode === "optimize" && optimizedOutput.trim()
        ? optimizedOutput.trim()
        : "";
    const promptForModel = improveSource || rawInput;

    try {
      const systemPrompt =
        mode === "audit" ? AUDITOR_SYSTEM_PROMPT : OPTIMIZER_SYSTEM_PROMPT;
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
          ? [
              "Improve pass: rewrite the provided draft into a stronger version.",
              "Do not repeat sections verbatim.",
              "Tighten structure and keep only one final polished prompt.",
              `Original user goal: ${rawInput}`,
            ].join("\n")
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
        let quality = evaluateOptimizerQuality(rawInput, String(data?.output ?? ""));
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
          quality = evaluateOptimizerQuality(rawInput, String(data?.output ?? ""));
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
        setLastAuditInput(promptInput.trim());
        setOutputKind("audit");
        setLastRetryCount(0);
      } else {
        setOutputKind("optimize");
        setLastRetryCount(retryCount);
      }
      applyResponseMeta(data);
      void saveHistoryItem({
        input: rawInput,
        output: finalOutput,
        mode: mode === "audit" ? "audit" : "optimize",
      });
    } catch (error) {
      const fallback = buildLocalFallbackPrompt({
        raw: promptForModel,
        context: improveSource ? `${extraContext}\n\nOriginal user goal: ${rawInput}` : extraContext,
        outputFormat,
        improveFrom: "",
      });
      if (mode === "optimize") {
        setOptimizedOutput(fallback);
        setOutputKind("optimize");
        setLastRetryCount(0);
      }
      const message = `${(error as Error).message} Using local fallback.`;
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
    setFrameworkId("");
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
    setFrameworkId("");
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

  const copyToClipboard = async (text: string) => {
    if (!text.trim()) return false;

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
      showCopyFeedback("Copy failed. Please select and copy manually.");
      return false;
    }

    let verified = false;
    try {
      const readText = await navigator.clipboard.readText();
      verified = readText === text;
    } catch {
      verified = false;
    }

    showCopyFeedback(verified ? "Copied and verified." : "Copied to clipboard.");
    return true;
  };

  const handleCopy = async () => {
    if (!optimizedOutput) return;
    await copyToClipboard(optimizedOutput);
  };

  const handleTryIn = async (provider = tryInProvider) => {
    if (!optimizedOutput) return;
    const popup = window.open(provider.url, "_blank");
    if (!popup) {
      // If popup is blocked, continue in current tab.
      window.location.assign(provider.url);
      return;
    }
    void copyToClipboard(optimizedOutput);
    showCopyFeedback(`Opening ${provider.label}. Prompt copied to clipboard.`);
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

  const selectedFramework = FRAMEWORK_TEMPLATES.find((item) => item.id === frameworkId);

  const handleApplyFramework = () => {
    if (!selectedFramework) return;
    setPromptInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return selectedFramework.template;
      return `${trimmed}\n\n---\n${selectedFramework.template}`;
    });
  };

  const applySimpleStarter = (example: string) => {
    setPromptInput(example);
    setMode("optimize");
    if (optimizerRef.current) {
      optimizerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const buildFootballDraft = () => {
    const playerName = footballForm.playerName.trim();
    const club = footballForm.club.trim();
    const shirtName = footballForm.shirtName.trim();
    const shirtNumber = footballForm.shirtNumber.trim();
    const action = footballForm.action.trim() || "mid-strike on goal";
    const stadium = footballForm.stadium.trim() || "packed football stadium";
    const mood = footballForm.mood.trim() || "high-pressure decisive moment";
    const identity = [playerName, shirtName, club].filter(Boolean).join(" / ");

    if (!identity) {
      setOptimizerError("Add at least player name, shirt name, or club in Football Prompt Form.");
      return;
    }

    const draft = [
      "Create a photoreal football image prompt.",
      `Subject: ${playerName || "professional football player"} in ${club || "club kit"} ${shirtName ? `with shirt name "${shirtName}"` : ""}${shirtNumber ? ` and number ${shirtNumber}` : ""}.`,
      `Scene: ${action}, ${stadium}.`,
      `Mood: ${mood}.`,
      "Style: ultra-realistic sports photography, dynamic motion blur on background crowd, sharp subject focus.",
      "Lighting: stadium floodlights, cinematic contrast, realistic skin texture and fabric detail.",
      "Composition: low-angle action shot, full-body framing, ball visible, goal and crowd depth in background.",
      "Camera: 85mm sports lens look, fast shutter freeze on player, shallow depth of field.",
      "Negative prompt: cartoon, illustration, extra limbs, distorted face, blurry player, watermark, text artifacts.",
    ].join("\n");

    setOutputFormat("image-prompt");
    setMode("optimize");
    setPromptInput(draft);
    setOptimizerError(null);
    setShowAdvancedOptions(true);
    setCopyFeedback("Football prompt draft loaded into prompt box.");
  };

  return (
    <div className="min-h-screen relative selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Full Hero Background Image */}
      <img
        src={hackerImage}
        alt=""
        aria-hidden="true"
        className="fixed inset-0 z-0 h-screen w-full object-cover"
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />

      {/* Mouse Trail Canvas */}
      <TubesEffect />

      {/* Content Layer */}
      <div className="relative z-20">
        {/* Hero Header Section - Full Screen Height */}
        <header className="min-h-screen relative flex flex-col items-center justify-center px-4 text-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
          <div className="absolute top-6 right-6 z-20 max-w-[calc(100vw-2rem)]">
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <Link href="/prompts">
                <Button variant="ghost" className="text-yellow-200 hover:text-yellow-100">
                  Prompt Library
                </Button>
              </Link>
              <Link href="/images">
                <Button variant="ghost" className="text-yellow-200 hover:text-yellow-100">
                  Image Library
                </Button>
              </Link>
              {user ? (
                <>
                  <Link href="/profile">
                    <Button variant="ghost" className="text-yellow-200 hover:text-yellow-100">
                      Profile
                    </Button>
                  </Link>
                  <Button variant="ghost" onClick={logout} className="text-white hover:text-white">
                    Sign Out
                  </Button>
                </>
              ) : (
                <AuthModal />
              )}
            </div>
          </div>
          <div className="relative z-10 max-w-5xl 2xl:max-w-6xl mx-auto space-y-8 px-2">
            <h1
              className="dunamis-title text-7xl md:text-9xl 2xl:text-[11rem] leading-[0.95]"
              data-text="DUNAMIS"
            >
              DUNAMIS
            </h1>

            <div className="space-y-6">
              <p className="text-2xl md:text-3xl 2xl:text-4xl text-yellow-300 drop-shadow-lg italic font-light">
                "Precision prompts, zero noise — built for creators who ship."
              </p>
              
              <p className="max-w-4xl mx-auto text-base md:text-lg 2xl:text-xl text-gray-100 drop-shadow-md leading-relaxed 2xl:leading-9">
                Run powerful language models directly in your browser.<br/>
                No servers, no data collection, no compromises.
              </p>
              
              <div className="pt-6 border-t border-white/30">
                <p className="text-sm md:text-base 2xl:text-lg text-yellow-400 drop-shadow-md font-semibold tracking-widest uppercase">
                  Community-Driven Prompt Engineering
                </p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-yellow-200/80">
            <div className="scroll-mouse h-12 w-7 rounded-full border border-yellow-400/60 flex items-start justify-center">
              <span className="scroll-dot mt-2 h-2 w-2 rounded-full bg-yellow-300" />
            </div>
            <span className="scroll-text text-[11px] tracking-[0.35em] uppercase">Scroll</span>
          </div>
        </header>

        <main className="w-full max-w-7xl 2xl:max-w-[1700px] mx-auto px-4 xl:px-8 space-y-16 pb-20 bg-gradient-to-b from-black/80 to-black">
          <div className="pt-10">
            <div className="rounded-lg border border-yellow-500/40 bg-black/70 px-5 py-4 text-center text-base md:text-lg 2xl:text-xl font-semibold text-yellow-200 shadow-lg max-w-5xl mx-auto">
              Prompt Optimizer: describe what you want, and we’ll craft a production-ready prompt for you.
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
              <Link href="/?focus=optimizer">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                  Go to Optimizer
                </Button>
              </Link>
            </div>
          </div>
          <section className="rounded-xl border border-yellow-500/30 bg-black/70 p-6 lg:p-8 shadow-lg space-y-6">
            <div className="space-y-2 max-w-4xl">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80">How Dunamis Works</p>
              <h2 className="text-2xl md:text-3xl font-semibold text-yellow-200">Clear Prompts, Clear Results</h2>
              <p className="text-sm text-gray-300">
                We keep this simple: define your goal, strengthen the prompt, then run it in your preferred AI model.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HOME_WORKFLOW_STEPS.map((step) => (
                <div key={step.title} className="rounded-lg border border-yellow-500/20 bg-black/40 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/90">{step.title}</p>
                  <p className="text-sm text-gray-300">{step.text}</p>
                </div>
              ))}
            </div>
          </section>
          <section id="optimizer" ref={optimizerRef} className="pt-12 space-y-6">
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
                {simpleMode
                  ? "Simple Mode: Type what you want and click Make My Prompt Better."
                  : "Advanced Mode: Use Frameworks, Audit mode, and provider tools for full control."}
              </div>
              <div className="rounded-lg border border-yellow-500/20 bg-black/50 px-4 py-3 text-xs text-gray-200">
                <p className="text-yellow-200 font-semibold mb-1 uppercase tracking-[0.2em]">Quick Start</p>
                <p>1. Write what you need in plain English.</p>
                <p>2. Click <span className="text-yellow-200">Make My Prompt Better</span>.</p>
                <p>3. Copy output and paste into ChatGPT, Gemini, Claude, or Perplexity.</p>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl 2xl:text-3xl font-semibold">Prompt Optimizer</h2>
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
                        New: Prompt Auditor mode scores your prompt (0–100), calls out flaws, and can rebuild it on request.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-gray-300">
                    {simpleMode
                      ? "Step 1: Describe what you need. Step 2: Click Make My Prompt Better."
                      : "Choose Optimize to rebuild, or Audit to score and critique before fixing."}
                  </p>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-end flex-wrap md:flex-nowrap">
                  <Button
                    variant={simpleMode ? "default" : "outline"}
                    className={simpleMode ? "bg-yellow-400 text-black hover:bg-yellow-300" : "border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"}
                    onClick={() => setSimpleMode(true)}
                  >
                    Simple Mode
                  </Button>
                  <Button
                    variant={!simpleMode ? "default" : "outline"}
                    className={!simpleMode ? "bg-yellow-400 text-black hover:bg-yellow-300" : "border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"}
                    onClick={() => setSimpleMode(false)}
                  >
                    Advanced Mode
                  </Button>
                  {!simpleMode ? (
                    <Select
                      value={mode}
                      onValueChange={(value) => setMode(value as "optimize" | "audit")}
                    >
                      <SelectTrigger className="w-[160px] lg:w-[180px] border-yellow-500/40 bg-black/30 text-yellow-200 shrink-0">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 text-white border-yellow-500/30">
                        <SelectItem value="optimize">Optimize</SelectItem>
                        <SelectItem value="audit">Audit</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Button
                      variant="outline"
                      className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                      onClick={() => setShowAdvancedOptions((prev) => !prev)}
                    >
                      {showAdvancedOptions ? "Hide Options" : "More Options"}
                    </Button>
                  )}
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
                    <div className="rounded-md border border-yellow-500/30 bg-black/40 p-4 space-y-3">
                      <p className="text-xs text-yellow-200/90 font-semibold tracking-wide uppercase">Starter Examples</p>
                      <div className="grid grid-cols-1 gap-2">
                        {SIMPLE_STARTER_EXAMPLES.map((example, idx) => (
                          <Button
                            key={`${idx}-${example.slice(0, 12)}`}
                            variant="outline"
                            className="justify-start text-left h-auto whitespace-normal border-yellow-500/30 text-yellow-100 hover:bg-yellow-500/10"
                            onClick={() => applySimpleStarter(example)}
                          >
                            {example}
                          </Button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFootballCardOpen((prev) => !prev)}
                        className={[
                          "w-full rounded-md border px-3 py-3 text-left transition",
                          footballCardOpen
                            ? "border-yellow-300 bg-yellow-500/10"
                            : "border-yellow-500/30 bg-black/30 hover:bg-yellow-500/10",
                        ].join(" ")}
                      >
                        <p className="text-sm text-yellow-100 font-semibold">Football Image Prompt Card</p>
                        <p className="text-[11px] text-gray-300">
                          Click to {footballCardOpen ? "close" : "open"} a guided form for player, shirt, club, action, and stadium.
                        </p>
                      </button>
                    </div>
                  )}
                  {simpleMode && footballCardOpen && (
                    <div className="rounded-md border border-yellow-500/30 bg-black/40 p-4 space-y-3">
                      <p className="text-xs text-yellow-200/90 font-semibold tracking-wide uppercase">Football Prompt Form</p>
                      <p className="text-[11px] text-gray-400">
                        Fill the fields, then click Build Football Prompt.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          value={footballForm.playerName}
                          onChange={(event) => setFootballForm((prev) => ({ ...prev, playerName: event.target.value }))}
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                          placeholder="Player name (optional)"
                        />
                        <Input
                          value={footballForm.club}
                          onChange={(event) => setFootballForm((prev) => ({ ...prev, club: event.target.value }))}
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                          placeholder="Club"
                        />
                        <Input
                          value={footballForm.shirtName}
                          onChange={(event) => setFootballForm((prev) => ({ ...prev, shirtName: event.target.value }))}
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                          placeholder="Shirt name"
                        />
                        <Input
                          value={footballForm.shirtNumber}
                          onChange={(event) => setFootballForm((prev) => ({ ...prev, shirtNumber: event.target.value }))}
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                          placeholder="Shirt number"
                        />
                        <Input
                          value={footballForm.action}
                          onChange={(event) => setFootballForm((prev) => ({ ...prev, action: event.target.value }))}
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500 md:col-span-2"
                          placeholder="Action (e.g. bicycle kick in the box)"
                        />
                        <Input
                          value={footballForm.stadium}
                          onChange={(event) => setFootballForm((prev) => ({ ...prev, stadium: event.target.value }))}
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                          placeholder="Stadium / environment"
                        />
                        <Input
                          value={footballForm.mood}
                          onChange={(event) => setFootballForm((prev) => ({ ...prev, mood: event.target.value }))}
                          className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                          placeholder="Mood"
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={buildFootballDraft}
                      >
                        Build Football Prompt
                      </Button>
                    </div>
                  )}
                  {(!simpleMode || showAdvancedOptions) && (
                  <div className="rounded-md border border-yellow-500/30 bg-black/40 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-yellow-200/90 font-semibold tracking-wide uppercase">Frameworks</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                            aria-label="Frameworks help"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          Pick a framework to drop a proven prompt structure into your box. Edit any line.
                        </TooltipContent>
                      </Tooltip>
                      <Link href="/frameworks">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-yellow-500/40 bg-black/40 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-yellow-200 hover:bg-yellow-500/10"
                          aria-label="Open frameworks guide"
                        >
                          Learn
                        </button>
                      </Link>
                    </div>
                    <Select
                      value={frameworkId}
                      onValueChange={(value) => setFrameworkId(value)}
                    >
                      <SelectTrigger className="w-full border-yellow-500/40 bg-black/30 text-yellow-200">
                        <SelectValue placeholder="Choose a framework (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 text-white border-yellow-500/30">
                        {FRAMEWORK_TEMPLATES.map((framework) => (
                          <SelectItem key={framework.id} value={framework.id}>
                            {framework.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-gray-400">
                      {selectedFramework
                        ? selectedFramework.description
                        : "Frameworks give your prompt a clean structure."}
                    </p>
                    <div className="rounded-md border border-yellow-500/20 bg-black/30 p-3 text-[11px] text-gray-300 whitespace-pre-wrap">
                      {selectedFramework ? selectedFramework.template : "Template preview will appear here."}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={handleApplyFramework}
                        disabled={!selectedFramework}
                      >
                        Use Template
                      </Button>
                      {promptInput.trim() && (
                        <span className="text-[11px] text-yellow-200/70">
                          Template will be appended below your current prompt.
                        </span>
                      )}
                    </div>
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
                      LLM time: {(timingInfo.groqMs / 1000).toFixed(2)}s · Total: {(timingInfo.totalMs / 1000).toFixed(2)}s
                      {timingInfo.model ? ` · ${timingInfo.model}` : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </section>

          <section>
            <div className="bg-black/60 backdrop-blur rounded-lg p-6 border border-yellow-500/30 shadow-lg">
              <ContactSection />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
