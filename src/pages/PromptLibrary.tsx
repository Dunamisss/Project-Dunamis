import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROMPT_LIBRARY } from "@/data/promptLibrary";
import { useChat } from "@/contexts/ChatContext";
import { ChevronDown } from "lucide-react";

const categories = ["All", "Art", "Marketing", "Development", "Business", "Creative Writing", "Productivity", "SEO", "Other"] as const;
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

export default function PromptLibrary() {
  const [, setLocation] = useLocation();
  const { loadPrompt } = useChat();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const filteredPrompts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROMPT_LIBRARY.filter((prompt) => {
      const matchesCategory = category === "All" || prompt.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      const haystack = [
        prompt.title,
        prompt.description,
        prompt.category,
        prompt.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [category, query]);

  const handleTryMe = (content: string) => {
    loadPrompt(content);
    setLocation("/");
  };

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

  const handleTryIn = async (content: string, provider: { label: string; url: string }) => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      showCopyFeedback(`Copied. Opening ${provider.label}...`);
      window.open(provider.url, "_blank", "noopener,noreferrer");
    } catch {
      showCopyFeedback("Copy failed. Please select and copy manually.");
    }
  };

  const handleShare = async (id: string) => {
    const url = `${window.location.origin}/prompt/${encodeURIComponent(id)}`;
    await handleCopy(url);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promptId = params.get("prompt");
    if (!promptId) return;
    setHighlightId(promptId);
    const target = document.getElementById(`prompt-${promptId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10 px-4 py-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Prompt Library</h1>
            <p className="text-sm text-gray-300 max-w-2xl">
              Curated, production-ready prompts. Click Try Me to load one straight into the optimizer.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back to Optimizer
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-black/70 p-4 md:p-6 shadow-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prompts, tags, or categories..."
              className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
            />
            <Select value={category} onValueChange={(value) => setCategory(value as (typeof categories)[number])}>
              <SelectTrigger className="border-yellow-500/40 bg-black/30 text-yellow-200">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-white border-yellow-500/30">
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {copyFeedback && <div className="text-[11px] text-yellow-200/80">{copyFeedback}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              id={`prompt-${prompt.id}`}
              className={[
                "rounded-lg border border-yellow-500/20 bg-black/60 p-5 shadow-lg space-y-4 transition",
                highlightId === prompt.id ? "ring-2 ring-yellow-400/80" : ""
              ].join(" ")}
            >
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-yellow-300/70">{prompt.category}</p>
                <Link href={`/prompt/${prompt.id}`}>
                  <h2 className="text-xl font-semibold text-yellow-100 hover:text-yellow-200 transition">
                    {prompt.title}
                  </h2>
                </Link>
                <p className="text-sm text-gray-300">{prompt.description}</p>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                  {prompt.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-full border border-yellow-500/20 bg-black/40">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {prompt.content}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  className="bg-yellow-400 text-black hover:bg-yellow-300"
                  onClick={() => handleTryMe(prompt.content)}
                >
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
                  onClick={() => handleShare(prompt.id)}
                >
                  Share
                </Button>
                <div className="flex-1 min-w-0" />
                <div className="overflow-hidden rounded-md border border-yellow-500/40 flex items-stretch">
                  <Button
                    variant="outline"
                    className="flex-1 min-w-0 rounded-none border-0 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={() => handleTryIn(prompt.content, tryInProviders[0])}
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
                          onClick={() => handleTryIn(prompt.content, provider)}
                        >
                          Try in {provider.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPrompts.length === 0 && (
          <div className="text-sm text-gray-400">No prompts matched your search.</div>
        )}
      </div>
    </div>
  );
}
