import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TubesEffect from "@/components/TubesEffect";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { AuthModal } from "@/components/AuthModal";
import ContactSection from "@/components/ContactSection";
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

export default function Home() {
  const { user, logout } = useAuth();
  const { promptToLoad, clearPromptToLoad } = useChat();
  const baseUrl = (import.meta as any).env?.BASE_URL || "/";
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
  const [mode, setMode] = useState<"optimize" | "audit">("optimize");
  const [outputKind, setOutputKind] = useState<"optimize" | "audit" | "fix" | null>(null);
  const [lastAuditInput, setLastAuditInput] = useState("");
  const [vpnWarning, setVpnWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
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
  const optimizerRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const apiBase = (import.meta as any).env?.VITE_API_BASE ?? "";
  const apiUrl = apiBase ? `${apiBase.replace(/\/+$/, "")}/api/optimize` : "/api/optimize";
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

  const handleOptimize = async () => {
    if (!promptInput.trim()) return;
    setOptimizerError(null);
    setVpnWarning(false);
    setWarningMessage(null);
    setIsOptimizing(true);

    try {
      const systemPrompt =
        mode === "audit" ? AUDITOR_SYSTEM_PROMPT : OPTIMIZER_SYSTEM_PROMPT;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          prompt: promptInput.trim(),
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
      if (mode === "audit") {
        setLastAuditInput(promptInput.trim());
        setOutputKind("audit");
      } else {
        setOutputKind("optimize");
      }
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
    } catch (error) {
      setOptimizerError((error as Error).message);
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
    clearPromptToLoad();
    if (optimizerRef.current) {
      optimizerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [promptToLoad, clearPromptToLoad]);

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
    const copied = await copyToClipboard(optimizedOutput);
    if (!copied) return;
    showCopyFeedback(`Copied. Opening ${provider.label}...`);
    window.open(provider.url, "_blank", "noopener,noreferrer");
  };

  const selectedFramework = FRAMEWORK_TEMPLATES.find((item) => item.id === frameworkId);

  const handleApplyFramework = () => {
    if (!selectedFramework) return;
    setPromptInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return selectedFramework.template;
      return `${trimmed}\n\n---\n${selectedFramework.template}`;
    });
  };

  return (
    <div className="min-h-screen relative selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Full Hero Background Image */}
      <div 
        className="fixed inset-0 z-0 w-full h-screen"
        style={{
          backgroundImage: `url(${baseUrl}dunamis-hero.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed"
        }}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
      </div>

      {/* Mouse Trail Canvas */}
      <TubesEffect />

      {/* Content Layer */}
      <div className="relative z-20">
        {/* Hero Header Section - Full Screen Height */}
        <header className="min-h-screen relative flex flex-col items-center justify-center px-4 text-center overflow-hidden">
          <div
            className="absolute inset-0 z-0 bg-center bg-no-repeat bg-cover opacity-40"
            style={{ backgroundImage: `url(${baseUrl}cyber_hacker.png)` }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
          <div className="absolute top-6 right-6 z-20">
            <div className="flex items-center gap-2">
              <Link href="/prompts">
                <Button variant="ghost" className="text-yellow-200 hover:text-yellow-100">
                  Prompt Library
                </Button>
              </Link>
              {user ? (
                <Button variant="ghost" onClick={logout} className="text-white hover:text-white">
                  Sign Out
                </Button>
              ) : (
                <AuthModal />
              )}
            </div>
          </div>
          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            <h1 className="font-display text-7xl md:text-9xl font-light text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-orange-200 tracking-widest leading-tight drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">
              DUNAMIS
            </h1>
            
            <div className="space-y-6">
              <p className="text-2xl md:text-3xl text-yellow-300 drop-shadow-lg italic font-light">
                "Precision prompts, zero noise — built for creators who ship."
              </p>
              
              <p className="text-base md:text-lg text-gray-100 drop-shadow-md leading-relaxed">
                Run powerful language models directly in your browser.<br/>
                No servers, no data collection, no compromises.
              </p>
              
              <div className="pt-6 border-t border-white/30">
                <p className="text-sm md:text-base text-yellow-400 drop-shadow-md font-semibold tracking-widest uppercase">
                  Community-Driven Prompt Engineering
                </p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-yellow-200/80">
            <div className="h-12 w-7 rounded-full border border-yellow-400/60 flex items-start justify-center">
              <span className="mt-2 h-2 w-2 rounded-full bg-yellow-300 animate-bounce" />
            </div>
            <span className="text-[11px] tracking-[0.35em] uppercase">Scroll</span>
          </div>
        </header>

        <main className="w-full max-w-5xl mx-auto px-4 space-y-16 pb-20 bg-gradient-to-b from-black/80 to-black">
          <div className="pt-10">
            <div className="rounded-lg border border-yellow-500/40 bg-black/70 px-5 py-4 text-center text-base md:text-lg font-semibold text-yellow-200 shadow-lg">
              Prompt Optimizer: describe what you want, and we’ll craft a production-ready prompt for you.
            </div>
          </div>
          <section ref={optimizerRef} className="pt-12 space-y-6">
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
                "rounded-lg border border-yellow-500/30 bg-black/70 p-6 shadow-lg space-y-6",
                isFullscreen ? "fixed inset-4 z-50 overflow-y-auto" : ""
              ].join(" ")}
            >
              <div className="rounded-lg border border-yellow-500/30 bg-black/60 px-4 py-3 text-xs text-yellow-100/90">
                What’s new: Use Frameworks to drop a proven template into your prompt box in one click.
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold">Prompt Optimizer</h2>
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
                    Choose Optimize to rebuild, or Audit to score and critique before fixing.
                  </p>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-end">
                  <Select
                    value={mode}
                    onValueChange={(value) => setMode(value as "optimize" | "audit")}
                  >
                    <SelectTrigger className="w-[180px] border-yellow-500/40 bg-black/30 text-yellow-200">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 text-white border-yellow-500/30">
                      <SelectItem value="optimize">Optimize</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                    </SelectContent>
                  </Select>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-lg border border-yellow-500/30 bg-black/60 p-6 shadow-lg space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Your Prompt</h3>
                  <p className="text-xs text-gray-300">Paste your rough prompt here.</p>
                  <p className="text-[11px] text-gray-400">
                    Even a few words is enough — we’ll craft a perfect, production-ready prompt. More features coming soon.
                  </p>
                </div>
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
                  <Textarea
                    value={promptInput}
                    onChange={(event) => setPromptInput(event.target.value)}
                    className="min-h-[200px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-400"
                    placeholder="Write or paste your prompt here..."
                  />
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
                  <Textarea
                    value={extraContext}
                    onChange={(event) => setExtraContext(event.target.value)}
                    className="min-h-[140px] bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-400"
                    placeholder="Extra context: goals, constraints, audience, tone, or examples..."
                  />
                  <p className="text-[11px] text-gray-400">
                    This box is for details that help the optimizer (audience, tone, must-have points).
                    Example: “Audience is SaaS founders. Keep it punchy. Include a CTA.”
                  </p>
                  {attachedImages.length > 0 && (
                    <div className="text-xs text-yellow-200/80">
                      Attached images: {attachedImages.join(", ")}
                    </div>
                  )}
                  <Button
                    className="w-full bg-yellow-400 text-black hover:bg-yellow-300"
                    onClick={handleOptimize}
                    disabled={isOptimizing || !promptInput.trim()}
                  >
                    {isOptimizing ? "Sending..." : mode === "audit" ? "Score It" : "Send"}
                  </Button>
                  <div className="text-xs text-yellow-200/80 text-center">
                    {isUnlimited
                      ? "Unlimited access enabled."
                      : dailyLimit !== null && remainingUses !== null
                        ? `${remainingUses} of ${dailyLimit} uses remaining`
                        : "You have 3 free uses total."}
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

                <div className="rounded-lg border border-yellow-500/30 bg-black/60 p-6 shadow-lg space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">
                      {outputKind === "audit" ? "Audit Output" : "Optimized Output"}
                    </h3>
                    <p className="text-xs text-gray-300">
                      {outputKind === "audit"
                        ? "Brutal score and critique appears here."
                        : "Your improved prompt appears here."}
                    </p>
                  </div>
                  <Textarea
                    value={optimizedOutput}
                    readOnly
                    className="min-h-[420px] bg-black/30 border-yellow-500/20 text-white placeholder:text-gray-500"
                    placeholder={
                      mode === "audit"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={handleCopy}
                        disabled={!optimizedOutput}
                      >
                        Copy Optimized Prompt
                      </Button>
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
                  <div className="text-[11px] text-gray-300">
                    {copyFeedback
                      ? copyFeedback
                      : outputKind === "audit"
                        ? "Audit mode is for scoring and critique. Use Fix It to generate a rewritten prompt."
                        : "We copy the prompt and open your provider in a new tab. Browsers don’t allow auto‑pasting into other sites."}
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
