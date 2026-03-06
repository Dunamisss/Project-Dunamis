import { type DragEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ShareMenu from "@/components/ShareMenu";
import AddToPackDialog from "@/components/AddToPackDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { PROMPT_LIBRARY, type PromptLibraryItem } from "@/data/promptLibrary";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";

const categories = ["All", "Art", "Marketing", "Development", "Business", "Creative Writing", "Productivity", "SEO", "Other"] as const;
const LEGACY_CONTENT_TERMS = [
  "suno",
  "song machine",
  "song architect",
  "toy factory",
  "toy figure",
  "coloring studio",
  "coloring page",
];

function isLegacyContentPrompt(item: Pick<PromptLibraryItem, "title" | "description" | "tags" | "content">): boolean {
  const haystack = [
    item.title,
    item.description,
    item.content,
    item.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return LEGACY_CONTENT_TERMS.some((term) => haystack.includes(term));
}

const tryInProviders = [
  { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "gemini", label: "Gemini", url: "https://gemini.google.com/" },
  { id: "claude", label: "Claude", url: "https://claude.ai/" },
  { id: "perplexity", label: "Perplexity", url: "https://www.perplexity.ai/" },
  { id: "poe", label: "Poe", url: "https://poe.com/" },
  { id: "qwen", label: "Qwen", url: "https://chat.qwen.ai/" },
  { id: "arena", label: "Arena", url: "https://arena.ai/" },
  { id: "deepseek", label: "DeepSeek", url: "https://chat.deepseek.com/" },
];
const HOME_PREFILL_KEY = "dunamis_home_prompt_prefill";
type TemplateOverrideMode = "auto" | "editable" | "fixed";
type TemplateToken = {
  raw: string;
  key: string;
  label: string;
};

function toTokenKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function prettifyTokenLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function extractTemplateTokens(content: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  const seen = new Set<string>();
  const pushToken = (raw: string, inner: string) => {
    const clean = inner.trim();
    if (!clean) return;
    if (/^section tag/i.test(clean)) return;
    const isVariableLike = /insert|placeholder|here/i.test(clean) || /^[A-Z0-9_ ]{3,40}$/.test(clean);
    if (!isVariableLike) return;
    const key = toTokenKey(clean);
    if (!key || seen.has(raw)) return;
    seen.add(raw);
    tokens.push({ raw, key, label: prettifyTokenLabel(clean) });
  };

  for (const match of content.matchAll(/\{([^{}\n]{1,60})\}/g)) {
    pushToken(match[0], match[1]);
  }

  for (const match of content.matchAll(/\[([^[\]\n]{2,60})\]/g)) {
    pushToken(match[0], match[1]);
  }

  return tokens;
}

function renderPromptTemplate(content: string, tokens: TemplateToken[], values: Record<string, string>): string {
  return tokens.reduce((acc, token) => {
    const replacement = (values[token.key] || "").trim();
    return acc.split(token.raw).join(replacement || token.raw);
  }, content);
}

function buildTemplateJsonPayload(
  prompt: PromptLibraryItem,
  tokens: TemplateToken[],
  values: Record<string, string>,
  renderedPrompt: string,
): string {
  const inputs = tokens.reduce<Record<string, string>>((acc, token) => {
    const value = (values[token.key] || "").trim();
    acc[token.key] = value || `[${token.label.toUpperCase().replace(/\s+/g, "_")}]`;
    return acc;
  }, {});

  return JSON.stringify(
    {
      prompt_template_id: prompt.id,
      template_label: prompt.title,
      category: prompt.category,
      output_mode: "prompt",
      inputs,
      rendered_prompt: renderedPrompt,
    },
    null,
    2,
  );
}

export default function PromptLibrary() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [sourceFilter, setSourceFilter] = useState<"all" | "nanobanana" | "core">("all");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [communityPrompts, setCommunityPrompts] = useState<PromptLibraryItem[]>([]);
  const [templateValues, setTemplateValues] = useState<Record<string, Record<string, string>>>({});
  const [templateOverrides, setTemplateOverrides] = useState<Record<string, TemplateOverrideMode>>({});

  useEffect(() => {
    const submissionsQuery = fsQuery(collection(db, "submissions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      submissionsQuery,
      (snapshot) => {
        const approved: PromptLibraryItem[] = [];
        snapshot.docs.forEach((docSnap) => {
          const item = docSnap.data() as Record<string, unknown>;
          if (item.type !== "prompt" || item.status !== "approved") return;
          approved.push({
            id: `community-${docSnap.id}`,
            title: String(item.title || "Community Prompt"),
            category: String(item.category || "Other") as PromptLibraryItem["category"],
            description: String(item.description || "Community submitted prompt."),
            tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
            content: String(item.promptContent || ""),
            createdAt: Number(item.approvedAt || item.createdAt || Date.now()),
          });
        });
        setCommunityPrompts(approved);
      },
      () => setCommunityPrompts([]),
    );
    return () => unsubscribe();
  }, []);

  const libraryItems = useMemo(() => {
    const map = new Map<string, PromptLibraryItem>();
    [...communityPrompts, ...PROMPT_LIBRARY].forEach((item) => {
      if (isLegacyContentPrompt(item)) return;
      map.set(item.id, item);
    });
    return Array.from(map.values());
  }, [communityPrompts]);

  const filteredPrompts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libraryItems.filter((prompt) => {
      const isNanoBanana = prompt.id.startsWith("nanobanana-");
      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "nanobanana" && isNanoBanana) ||
        (sourceFilter === "core" && !isNanoBanana);
      if (!matchesSource) return false;
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
  }, [category, query, libraryItems, sourceFilter]);

  const sortedPrompts = useMemo(() => {
    const dir = sortOrder === "newest" ? -1 : 1;
    return [...filteredPrompts].sort((a, b) => dir * ((a.createdAt ?? 0) - (b.createdAt ?? 0)));
  }, [filteredPrompts, sortOrder]);

  const promptTemplates = useMemo(
    () =>
      sortedPrompts.map((prompt) => ({
        prompt,
        tokens: extractTemplateTokens(prompt.content),
        mode: templateOverrides[prompt.id] || "auto",
      })),
    [sortedPrompts, templateOverrides],
  );

  const editablePromptTemplates = useMemo(
    () =>
      promptTemplates.filter((entry) => {
        if (entry.mode === "editable") return true;
        if (entry.mode === "fixed") return false;
        return entry.tokens.length > 0;
      }),
    [promptTemplates],
  );

  const fixedPrompts = useMemo(
    () =>
      promptTemplates.filter((entry) => {
        if (entry.mode === "fixed") return true;
        if (entry.mode === "editable") return false;
        return entry.tokens.length === 0;
      }),
    [promptTemplates],
  );

  const getModeLabel = (mode: TemplateOverrideMode): string => {
    if (mode === "editable") return "Force Editable";
    if (mode === "fixed") return "Force Fixed";
    return "Auto";
  };

  const handleStartOnHome = (prompt: Pick<PromptLibraryItem, "title" | "description" | "content">) => {
    try {
      const payload = {
        title: prompt.title,
        description: prompt.description,
        content: prompt.content,
        createdAt: Date.now(),
      };
      localStorage.setItem(HOME_PREFILL_KEY, JSON.stringify(payload));
    } catch {
      // Non-blocking: still route home even if storage fails.
    }
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
      showCopyFeedback(`Copied prompt. Opening ${provider.label}...`);
      window.open(provider.url, "_blank", "noopener,noreferrer");
    } catch {
      showCopyFeedback("Copy failed. Please select and copy manually.");
    }
  };

  const handlePromptCardDrag = (event: DragEvent<HTMLDivElement>, prompt: PromptLibraryItem) => {
    const payload = {
      type: "prompt",
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
    };
    event.dataTransfer.setData("application/x-dunamis-prompt", JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", prompt.content);
    event.dataTransfer.effectAllowed = "copy";
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
    <AppShell
      eyebrow="Library"
      title="Prompt Library"
      description="Curated prompts for fast starts. Open any prompt on the homepage when you want to turn it into a cleaner, more structured draft."
    >

        <div className="rounded-lg border border-yellow-500/30 bg-black/70 p-4 md:p-6 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={sourceFilter === "all" ? "default" : "outline"}
              className={sourceFilter === "all" ? "bg-yellow-400 text-black hover:bg-yellow-300" : "border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"}
              onClick={() => setSourceFilter("all")}
            >
              All Sources
            </Button>
            <Button
              variant={sourceFilter === "nanobanana" ? "default" : "outline"}
              className={sourceFilter === "nanobanana" ? "bg-yellow-400 text-black hover:bg-yellow-300" : "border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"}
              onClick={() => setSourceFilter("nanobanana")}
            >
              Nano Banana
            </Button>
            <Button
              variant={sourceFilter === "core" ? "default" : "outline"}
              className={sourceFilter === "core" ? "bg-yellow-400 text-black hover:bg-yellow-300" : "border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"}
              onClick={() => setSourceFilter("core")}
            >
              Core Library
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(180px,220px)_minmax(140px,180px)] gap-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prompts, tags, or categories..."
              className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
            />
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as (typeof categories)[number])}
            >
              <SelectTrigger className="border-yellow-500/40 bg-black/30 text-yellow-200">
                <SelectValue placeholder="All categories" className="sr-only" />
                <span className="truncate">{category === "All" ? "All categories" : category}</span>
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-white border-yellow-500/30">
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest")}>
              <SelectTrigger className="border-yellow-500/40 bg-black/30 text-yellow-200">
                <SelectValue placeholder="Sort" className="sr-only" />
                <span className="truncate">{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-white border-yellow-500/30">
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {copyFeedback && (
            <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-yellow-500/40 bg-black/90 px-4 py-2 text-[12px] text-yellow-200 shadow-lg">
              {copyFeedback}
            </div>
          )}
        </div>

        {editablePromptTemplates.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-yellow-100">Editable JSON Templates</h2>
              <p className="text-xs text-gray-300">Fill boxes, then copy rendered prompt or JSON payload.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {editablePromptTemplates.map(({ prompt, tokens, mode }) => {
                const values = templateValues[prompt.id] || {};
                const renderedPrompt = renderPromptTemplate(prompt.content, tokens, values);
                const jsonPayload = buildTemplateJsonPayload(prompt, tokens, values, renderedPrompt);

                return (
                  <div
                    key={prompt.id}
                    id={`prompt-${prompt.id}`}
                    draggable
                    onDragStart={(event) => handlePromptCardDrag(event, { ...prompt, content: renderedPrompt })}
                    className={[
                      "rounded-lg border border-yellow-500/20 bg-black/60 p-5 shadow-lg space-y-4 transition cursor-grab active:cursor-grabbing",
                      highlightId === prompt.id ? "ring-2 ring-yellow-400/80" : ""
                    ].join(" ")}
                  >
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-yellow-300/70">{prompt.category}</p>
                      <h3 className="text-xl font-semibold text-yellow-100 break-words">{prompt.title}</h3>
                      <p className="text-sm text-gray-300 break-words">{prompt.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 h-7 px-2 text-[11px]"
                          onClick={() =>
                            setTemplateOverrides((prev) => ({
                              ...prev,
                              [prompt.id]: "auto",
                            }))
                          }
                        >
                          {mode === "auto" ? "Mode: Auto" : "Set Auto"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 h-7 px-2 text-[11px]"
                          onClick={() =>
                            setTemplateOverrides((prev) => ({
                              ...prev,
                              [prompt.id]: "fixed",
                            }))
                          }
                        >
                          Force Fixed
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                        {prompt.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 rounded-full border border-yellow-500/20 bg-black/40">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 rounded-md border border-yellow-500/25 bg-black/35 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-200/80">Template Fields</p>
                      <div className="grid grid-cols-1 gap-2">
                        {tokens.map((token) => (
                          <label key={`${prompt.id}-${token.key}`} className="space-y-1 text-xs text-gray-300">
                            <span>{token.label}</span>
                            <Input
                              value={values[token.key] || ""}
                              onChange={(event) =>
                                setTemplateValues((prev) => ({
                                  ...prev,
                                  [prompt.id]: {
                                    ...(prev[prompt.id] || {}),
                                    [token.key]: event.target.value,
                                  },
                                }))
                              }
                              placeholder={`Enter ${token.label.toLowerCase()}...`}
                              className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 text-xs text-gray-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto overflow-x-auto">
                      {renderedPrompt}
                    </div>

                    <Textarea
                      readOnly
                      value={jsonPayload}
                      className="min-h-[140px] bg-black/30 border-yellow-500/20 text-[11px] text-gray-300"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className="bg-yellow-400 text-black hover:bg-yellow-300"
                        onClick={() => handleStartOnHome({ ...prompt, content: renderedPrompt })}
                      >
                        Start on Homepage
                      </Button>
                      <Button
                        variant="outline"
                        className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={() => handleCopy(renderedPrompt)}
                      >
                        Copy Prompt
                      </Button>
                      <Button
                        variant="outline"
                        className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={() => handleCopy(jsonPayload)}
                      >
                        Copy JSON
                      </Button>
                      <AddToPackDialog
                        promptText={renderedPrompt}
                        suggestedTitle={prompt.title}
                        onDone={showCopyFeedback}
                        trigger={
                          <Button
                            variant="outline"
                            className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                          >
                            Add to Pack
                          </Button>
                        }
                      />
                      <ShareMenu
                        title={prompt.title}
                        url={`${window.location.origin}/prompts?prompt=${encodeURIComponent(prompt.id)}`}
                        onCopy={showCopyFeedback}
                      />
                      <div className="w-full sm:w-auto sm:ml-auto overflow-hidden rounded-md border border-yellow-500/40 flex items-stretch">
                        <Button
                          variant="outline"
                          className="flex-1 min-w-0 rounded-none border-0 text-yellow-200 hover:bg-yellow-500/10"
                          onClick={() => handleTryIn(renderedPrompt, tryInProviders[0])}
                        >
                          <span className="truncate">Copy + Open {tryInProviders[0].label}</span>
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
                                onClick={() => handleTryIn(renderedPrompt, provider)}
                              >
                                Copy + Open {provider.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-yellow-100">Fixed Prompts</h2>
            <p className="text-xs text-gray-300">These are non-template prompts kept separate from editable cards.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {fixedPrompts.map(({ prompt, tokens, mode }) => (
            <div
              key={prompt.id}
              id={`prompt-${prompt.id}`}
              draggable
              onDragStart={(event) => handlePromptCardDrag(event, prompt)}
              className={[
                "rounded-lg border border-yellow-500/20 bg-black/60 p-5 shadow-lg space-y-4 transition cursor-grab active:cursor-grabbing",
                highlightId === prompt.id ? "ring-2 ring-yellow-400/80" : ""
              ].join(" ")}
            >
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-yellow-300/70">{prompt.category}</p>
                <button
                  type="button"
                  onClick={() => handleStartOnHome(prompt)}
                  className="text-left"
                >
                  <h2 className="text-xl font-semibold text-yellow-100 hover:text-yellow-200 transition break-words">
                    {prompt.title}
                  </h2>
                </button>
                <p className="text-sm text-gray-300 break-words">{prompt.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 h-7 px-2 text-[11px]"
                    onClick={() =>
                      setTemplateOverrides((prev) => ({
                        ...prev,
                        [prompt.id]: "auto",
                      }))
                    }
                  >
                    {mode === "auto" ? "Mode: Auto" : "Set Auto"}
                  </Button>
                  {tokens.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 h-7 px-2 text-[11px]"
                      onClick={() =>
                        setTemplateOverrides((prev) => ({
                          ...prev,
                          [prompt.id]: "editable",
                        }))
                      }
                    >
                      Force Editable
                    </Button>
                  )}
                  <span className="text-[11px] text-gray-400 self-center">{getModeLabel(mode)}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                  {prompt.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 rounded-full border border-yellow-500/20 bg-black/40">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/40 p-3 text-xs text-gray-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto overflow-x-auto">
                {prompt.content}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="bg-yellow-400 text-black hover:bg-yellow-300"
                  onClick={() => handleStartOnHome(prompt)}
                >
                  Start on Homepage
                </Button>
                <AddToPackDialog
                  promptText={prompt.content}
                  suggestedTitle={prompt.title}
                  onDone={showCopyFeedback}
                  trigger={
                    <Button
                      variant="outline"
                      className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                    >
                      Add to Pack
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  onClick={() => handleCopy(prompt.content)}
                >
                  Copy
                </Button>
                <ShareMenu
                  title={prompt.title}
                  url={`${window.location.origin}/prompts?prompt=${encodeURIComponent(prompt.id)}`}
                  onCopy={showCopyFeedback}
                />
                <div className="w-full sm:w-auto sm:ml-auto overflow-hidden rounded-md border border-yellow-500/40 flex items-stretch">
                  <Button
                    variant="outline"
                    className="flex-1 min-w-0 rounded-none border-0 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={() => handleTryIn(prompt.content, tryInProviders[0])}
                  >
                    <span className="truncate">Copy + Open {tryInProviders[0].label}</span>
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
                          Copy + Open {provider.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>

        {sortedPrompts.length === 0 && (
          <div className="text-sm text-gray-400">No prompts matched your search.</div>
        )}
    </AppShell>
  );
}
