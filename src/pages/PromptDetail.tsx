import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PROMPT_LIBRARY } from "@/data/promptLibrary";
import { useChat } from "@/contexts/ChatContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

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

const DEFAULT_META = {
  title: "DUNAMIS — Precision Prompt Engineering",
  description: "Build, score, and refine prompts with a production-grade optimizer and auditor built for creators who ship.",
  image: "https://dunamiss.xyz/dunamis-hero.webp",
  url: "https://dunamiss.xyz/",
};

const setMeta = (name: string, content: string) => {
  const selector = name.startsWith("og:") ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let tag = document.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    if (name.startsWith("og:")) {
      tag.setAttribute("property", name);
    } else {
      tag.setAttribute("name", name);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

export default function PromptDetail({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { loadPrompt } = useChat();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const promptId = params?.id;

  const prompt = useMemo(
    () => PROMPT_LIBRARY.find((item) => item.id === promptId),
    [promptId]
  );

  useEffect(() => {
    if (!prompt) {
      document.title = "Prompt Not Found — DUNAMIS";
      setMeta("og:title", "Prompt Not Found — DUNAMIS");
      setMeta("og:description", DEFAULT_META.description);
      setMeta("og:image", DEFAULT_META.image);
      setMeta("og:url", window.location.href);
      setMeta("twitter:title", "Prompt Not Found — DUNAMIS");
      setMeta("twitter:description", DEFAULT_META.description);
      setMeta("twitter:image", DEFAULT_META.image);
      return;
    }
    document.title = `${prompt.title} — DUNAMIS`;
    const description = prompt.description || DEFAULT_META.description;
    const url = window.location.href;
    setMeta("og:title", `${prompt.title} — DUNAMIS`);
    setMeta("og:description", description);
    setMeta("og:image", DEFAULT_META.image);
    setMeta("og:url", url);
    setMeta("twitter:title", `${prompt.title} — DUNAMIS`);
    setMeta("twitter:description", description);
    setMeta("twitter:image", DEFAULT_META.image);
  }, [prompt]);

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    window.setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleCopy = async (content: string) => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      showCopyFeedback("Copied to clipboard.");
    } catch {
      showCopyFeedback("Copy failed. Please select and copy manually.");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    await handleCopy(url);
  };

  const handleTryMe = () => {
    if (!prompt) return;
    loadPrompt(prompt.content);
    setLocation("/");
  };

  const handleTryIn = async (provider: { label: string; url: string }) => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.content);
      showCopyFeedback(`Copied. Opening ${provider.label}...`);
      window.open(provider.url, "_blank", "noopener,noreferrer");
    } catch {
      showCopyFeedback("Copy failed. Please select and copy manually.");
    }
  };

  if (!prompt) {
    return (
      <div className="min-h-screen relative overflow-x-hidden">
        <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="relative z-10 px-4 py-16 max-w-4xl mx-auto space-y-6 text-center">
          <h1 className="text-3xl font-semibold text-yellow-200">Prompt not found</h1>
          <p className="text-sm text-gray-300">That prompt doesn’t exist or was removed.</p>
          <Link href="/prompts">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back to Prompt Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 px-4 py-10 max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">{prompt.title}</h1>
            <p className="text-sm text-gray-300 max-w-2xl">{prompt.description}</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
              <span className="px-2 py-1 rounded-full border border-yellow-500/20 bg-black/40">
                {prompt.category}
              </span>
              {prompt.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-full border border-yellow-500/20 bg-black/40">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/prompts">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back to Library
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-black/70 p-5 shadow-lg space-y-4">
          <div className="rounded-md border border-yellow-500/20 bg-black/40 p-4 text-sm text-gray-200 whitespace-pre-wrap">
            {prompt.content}
          </div>
          {copyFeedback && <div className="text-[11px] text-yellow-200/80">{copyFeedback}</div>}
          <div className="flex flex-wrap items-center gap-3">
            <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={handleTryMe}>
              Try Me
            </Button>
            <Button
              variant="outline"
              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
              onClick={() => handleCopy(prompt.content)}
            >
              Copy
            </Button>
            <Button
              variant="outline"
              className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
              onClick={handleShare}
            >
              Share
            </Button>
            <div className="overflow-hidden rounded-md border border-yellow-500/40 flex items-stretch">
              <Button
                variant="outline"
                className="flex-1 min-w-0 rounded-none border-0 text-yellow-200 hover:bg-yellow-500/10"
                onClick={() => handleTryIn(tryInProviders[0])}
              >
                <span className="truncate">Try in {tryInProviders[0].label}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-none border-0 border-l border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-3"
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
                      onClick={() => handleTryIn(provider)}
                    >
                      Try in {provider.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
