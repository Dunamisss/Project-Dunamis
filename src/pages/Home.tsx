import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TubesEffect from "@/components/TubesEffect";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import ContactSection from "@/components/ContactSection";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Maximize2, Minimize2, Trash2 } from "lucide-react";

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

export default function Home() {
  const { user, logout } = useAuth();
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
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
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
    { id: "grok", label: "Grok (xAI)", url: "https://x.com/" },
    { id: "gemini", label: "Gemini", url: "https://gemini.google.com/" },
    { id: "claude", label: "Claude", url: "https://claude.ai/" },
  ];

  const handleOptimize = async () => {
    if (!promptInput.trim()) return;
    setOptimizerError(null);
    setIsOptimizing(true);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: OPTIMIZER_SYSTEM_PROMPT,
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
        throw new Error(data?.error || "Optimization failed.");
      }

      const data = await response.json();
      setOptimizedOutput(data?.output ?? "");
      if (typeof data?.remaining === "number") {
        setRemainingUses(data.remaining);
      }
      if (typeof data?.limit === "number") {
        setDailyLimit(data.limit);
      }
      if (typeof data?.unlimited === "boolean") {
        setIsUnlimited(data.unlimited);
      }
    } catch (error) {
      setOptimizerError((error as Error).message);
    } finally {
      setIsOptimizing(false);
    }
  };

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
            {user ? (
              <Button variant="ghost" onClick={logout} className="text-white hover:text-white">
                Sign Out
              </Button>
            ) : (
              <AuthModal />
            )}
          </div>
          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            <h1 className="font-display text-7xl md:text-9xl font-light text-white drop-shadow-2xl tracking-widest leading-tight">
              DUNAMIS
            </h1>
            
            <div className="space-y-6">
              <p className="text-2xl md:text-3xl text-yellow-300 drop-shadow-lg italic font-light">
                "In-browser AI — private, fast, and offline-capable"
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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">Prompt Optimizer</h2>
                  <p className="text-xs text-gray-300">
                    Paste a rough prompt and get a clean, production-ready version.
                  </p>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-end">
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
                    placeholder="Optional extra context (notes, constraints, goals)..."
                  />
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
                    {isOptimizing ? "Sending..." : "Send"}
                  </Button>
                  <div className="text-xs text-yellow-200/80 text-center">
                    {isUnlimited
                      ? "Unlimited access enabled."
                      : dailyLimit !== null && remainingUses !== null
                        ? `${remainingUses} of ${dailyLimit} uses left today`
                        : "You have 3 free uses per day."}
                  </div>
                  <div className="text-[11px] text-gray-300 text-center">
                    Supporters can be upgraded to unlimited daily uses.
                  </div>
                  {optimizerError && (
                    <div className="text-xs text-red-300">{optimizerError}</div>
                  )}
                </div>

                <div className="rounded-lg border border-yellow-500/30 bg-black/60 p-6 shadow-lg space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Optimized Output</h3>
                    <p className="text-xs text-gray-300">Your improved prompt appears here.</p>
                  </div>
                  <Textarea
                    value={optimizedOutput}
                    readOnly
                    className="min-h-[420px] bg-black/30 border-yellow-500/20 text-white placeholder:text-gray-500"
                    placeholder="Click Send to generate an improved version."
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                      onClick={handleCopy}
                      disabled={!optimizedOutput}
                    >
                      Copy Optimized Prompt
                    </Button>
                    <ButtonGroup className="w-full">
                      <Button
                        variant="outline"
                        className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={() => handleTryIn()}
                        disabled={!optimizedOutput}
                      >
                        Try in {tryInProvider.label}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-3"
                            disabled={!optimizedOutput}
                            aria-label="Choose a provider"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black/90 text-white border-yellow-500/30">
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
                    </ButtonGroup>
                  </div>
                  <div className="text-[11px] text-gray-300">
                    {copyFeedback
                      ? copyFeedback
                      : "We copy the prompt and open your provider in a new tab. Browsers don’t allow auto‑pasting into other sites."}
                  </div>
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
