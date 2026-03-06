import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronDown, Sparkles, Wand2, Wrench } from "lucide-react";
import AppShell from "@/components/AppShell";
import TubesEffect from "@/components/TubesEffect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { JSON_PROMPT_CARDS, type JsonPromptCard } from "@/data/jsonPromptCards";
import hackerImage from "@/assets/hacker.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADVANCED_CARD_IDS = new Set([
  "mirror-selfie-2000s",
  "cinema-selfie-scene",
  "style-mode-image-director",
]);
const BASIC_PROMPT_CARDS = JSON_PROMPT_CARDS.filter((card) => !ADVANCED_CARD_IDS.has(card.id));
const STARTER_CARD_IDS = [
  "chat-json-task",
  "techno-organic-cityscape",
  "football-player-image",
  "product-ad-copy",
] as const;
const HOME_PREFILL_KEY = "dunamis_home_prompt_prefill";
const TRY_IN_PROVIDERS = [
  { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "gemini", label: "Gemini", url: "https://gemini.google.com/" },
  { id: "claude", label: "Claude", url: "https://claude.ai/" },
  { id: "perplexity", label: "Perplexity", url: "https://www.perplexity.ai/" },
  { id: "poe", label: "Poe", url: "https://poe.com/" },
  { id: "qwen", label: "Qwen", url: "https://chat.qwen.ai/" },
  { id: "arena", label: "Arena", url: "https://arena.ai/" },
  { id: "deepseek", label: "DeepSeek", url: "https://chat.deepseek.com/" },
] as const;

const DEMO_VALUES_BY_CARD: Record<string, Record<string, string>> = {
  "chat-json-task": {
    role: "Senior growth strategist",
    objective: "Build a 30-day launch plan",
    audience: "solo creators selling digital products",
    context: "low budget, no paid ads yet",
    constraints: "no fluff, no legal claims",
    output_schema: "phases, tasks, KPIs, checklist",
  },
  "football-player-image": {
    player_name: "Mason Cole",
    club: "Manchester City style kit",
    shirt_name: "COLE",
    shirt_number: "11",
    hair_color: "dark brown",
    clothing_details: "long sleeves, white boots",
    action: "power shot in the box",
    stadium: "packed crowd, night match",
    lighting: "cinematic floodlights",
    camera_style: "low-angle 85mm sports photo",
  },
  "techno-organic-cityscape": {
    city_name: "London",
    weather: "rainy overcast weather",
    scene_structure: "gravity-defying street looping upward into a vertical wall and overhead city arc",
    landmarks: "Big Ben, bridges, civic buildings, urban towers",
    tech_forms: "glowing circuitry, biomechanical cables, elegant metallic veins",
    organic_forms: "root-like growth, skeletal arches, living gold tendrils",
    color_palette: "gold and black",
    street_details: "wet pavement, reflections, umbrellas, vehicles, pedestrians",
    lighting: "moody storm light with warm gold glow",
    render_style: "photorealistic, ultra-detailed, cinematic realism, 8k",
  },
};

function getDefaultCardId(): string {
  return STARTER_CARD_IDS[0] || BASIC_PROMPT_CARDS[0]?.id || "";
}

function flattenObject(input: unknown, bucket: Record<string, string> = {}): Record<string, string> {
  if (!input || typeof input !== "object") return bucket;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      bucket[key] = String(value);
      continue;
    }
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === "string" || typeof item === "number")) {
        bucket[key] = value.map(String).join(", ");
      }
      continue;
    }
    flattenObject(value, bucket);
  }
  return bucket;
}

function parseJsonFromText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // keep trying
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;

  try {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function deriveCardValuesFromContent(content: string): { card: JsonPromptCard; values: Record<string, string> } | null {
  const parsed = parseJsonFromText(content);
  if (!parsed || typeof parsed !== "object") return null;
  const flat = flattenObject(parsed);

  let best: { card: JsonPromptCard; score: number } | null = null;
  for (const card of BASIC_PROMPT_CARDS) {
    const score = card.fields.reduce((acc, field) => acc + (flat[field.key] ? 1 : 0), 0);
    if (!best || score > best.score) {
      best = { card, score };
    }
  }

  if (!best || best.score < 2) return null;
  const values = best.card.fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = flat[field.key] || "";
    return acc;
  }, {});
  return { card: best.card, values };
}

function toFieldValue(values: Record<string, string>, key: string, fallback: string): string {
  const value = (values[key] || "").trim();
  return value || fallback;
}

function buildCardPayload(card: JsonPromptCard, values: Record<string, string>) {
  const inputs = card.fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = toFieldValue(values, field.key, `[${field.label.toUpperCase()}]`);
    return acc;
  }, {});

  return {
    prompt_template_id: card.id,
    template_label: card.label,
    objective: card.description,
    output_mode: card.outputType,
    instructions: {
      strict_json: true,
      no_filler: true,
      keep_precise: true,
    },
    inputs,
  };
}

export default function Home() {
  const [selectedCardId, setSelectedCardId] = useState<string>(getDefaultCardId());
  const [cardValues, setCardValues] = useState<Record<string, string>>({});
  const [cardSearch, setCardSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [importedPromptTitle, setImportedPromptTitle] = useState<string | null>(null);

  const selectedCard = useMemo(
    () => BASIC_PROMPT_CARDS.find((card) => card.id === selectedCardId) || null,
    [selectedCardId],
  );
  const starterCards = useMemo(
    () => STARTER_CARD_IDS.map((id) => BASIC_PROMPT_CARDS.find((card) => card.id === id)).filter(Boolean) as JsonPromptCard[],
    [],
  );
  const filteredCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    if (!q) return BASIC_PROMPT_CARDS;
    return BASIC_PROMPT_CARDS.filter((card) => `${card.label} ${card.description}`.toLowerCase().includes(q));
  }, [cardSearch]);

  const selectCard = (card: JsonPromptCard) => {
    setSelectedCardId(card.id);
    setCardValues(
      card.fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = "";
        return acc;
      }, {}),
    );
  };

  const buildDraft = () => {
    if (!selectedCard) return;
    const payload = buildCardPayload(selectedCard, cardValues);
    setDraft(JSON.stringify(payload, null, 2));
    setCopyFeedback(`${selectedCard.label} draft created.`);
  };

  const copyDraft = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopyFeedback("Draft copied.");
  };

  const handleTryIn = async (provider: { label: string; url: string }) => {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopyFeedback(`Copied JSON. Opening ${provider.label}...`);
      window.open(provider.url, "_blank", "noopener,noreferrer");
    } catch {
      setCopyFeedback("Copy failed. Please copy manually.");
    }
  };

  const fillDemoValues = () => {
    if (!selectedCard) return;
    const cardDemoValues = DEMO_VALUES_BY_CARD[selectedCard.id] || {};
    setCardValues(
      selectedCard.fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = cardDemoValues[field.key] || "";
        return acc;
      }, {}),
    );
    setCopyFeedback("Demo values added.");
  };

  const clearCurrentFields = () => {
    if (!selectedCard) return;
    setCardValues(
      selectedCard.fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = "";
        return acc;
      }, {}),
    );
    setCopyFeedback("Fields cleared.");
  };

  const clearImportedPrompt = () => {
    setImportedPromptTitle(null);
    setSelectedCardId(getDefaultCardId());
    setCardValues({});
    setDraft("");
    setCopyFeedback("Imported prompt cleared.");
    try {
      localStorage.removeItem(HOME_PREFILL_KEY);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let raw = "";
    try {
      raw = localStorage.getItem(HOME_PREFILL_KEY) || "";
      if (raw) localStorage.removeItem(HOME_PREFILL_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as { title?: string; content?: string };
      const content = (payload.content || "").trim();
      if (!content) return;
      setImportedPromptTitle(payload.title?.trim() || "Prompt");

      const derived = deriveCardValuesFromContent(content);
      if (derived) {
        setSelectedCardId(derived.card.id);
        setCardValues(derived.values);
        const draftPayload = buildCardPayload(derived.card, derived.values);
        setDraft(JSON.stringify(draftPayload, null, 2));
        setCopyFeedback(`Loaded "${payload.title || "prompt"}" into ${derived.card.label}.`);
        return;
      }

      const fallbackCard = BASIC_PROMPT_CARDS.find((item) => item.id === "chat-json-task");
      if (!fallbackCard) return;
      const fallbackValues = fallbackCard.fields.reduce<Record<string, string>>((acc, field) => {
        if (field.key === "objective") acc[field.key] = "Convert this imported prompt into a clean JSON draft.";
        else if (field.key === "context") acc[field.key] = content.slice(0, 500);
        else acc[field.key] = "";
        return acc;
      }, {});
      setSelectedCardId(fallbackCard.id);
      setCardValues(fallbackValues);
      const draftPayload = buildCardPayload(fallbackCard, fallbackValues);
      setDraft(JSON.stringify(draftPayload, null, 2));
      setCopyFeedback(`Loaded "${payload.title || "prompt"}" into starter mode.`);
    } catch {
      // ignore malformed payload
    }
  }, []);

  return (
    <AppShell
      eyebrow="Start Here"
      title="One clear place to build your next prompt"
      description="This homepage now does one job: help you choose a prompt type, fill a few fields, and leave with a clean JSON draft. Everything else stays available, but out of the way."
      actions={
        <>
          <Link href="/prompts">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Browse Prompt Library
            </Button>
          </Link>
          <Link href="/images">
            <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
              Browse Image Library
            </Button>
          </Link>
        </>
      }
    >
      <section className="relative mb-8 overflow-hidden rounded-[32px] border border-yellow-500/20 bg-black/55 shadow-[0_35px_110px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0">
          <img src={hackerImage} alt="" aria-hidden="true" className="h-full w-full object-cover object-center opacity-35" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.96)_0%,rgba(5,5,5,0.82)_48%,rgba(5,5,5,0.58)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(245,192,74,0.18),transparent_28%),radial-gradient(circle_at_80%_25%,rgba(245,192,74,0.12),transparent_22%)]" />
        </div>
        <TubesEffect className="opacity-45" />

        <div className="relative z-10 grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex rounded-full border border-yellow-500/30 bg-yellow-500/8 px-3 py-1 text-[11px] uppercase tracking-[0.32em] text-yellow-200/85">
              Dunamis signal restored
            </div>
            <div className="space-y-3">
              <h2 className="max-w-xl text-3xl font-semibold leading-tight text-white lg:text-5xl">
                Stronger visual identity, without the old homepage chaos
              </h2>
              <p className="max-w-xl text-sm leading-7 text-zinc-300 lg:text-base">
                The structure stays simple, but the atmosphere comes back: darker mood, gold energy, sharper contrast, and a more deliberate entry point into the workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => selectedCard && buildDraft()}>
                Build from current starter
              </Button>
              <Link href="/prompt-boxes">
                <Button variant="outline" className="border-yellow-500/40 bg-black/20 text-yellow-100 hover:bg-yellow-500/10">
                  Open advanced tools
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 self-end sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-sm">
              <p className="mb-1 text-[11px] uppercase tracking-[0.28em] text-yellow-300/70">Identity</p>
              <p className="text-sm leading-6 text-zinc-200">Gold motion and dark contrast are back, but used with restraint.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-sm">
              <p className="mb-1 text-[11px] uppercase tracking-[0.28em] text-yellow-300/70">Flow</p>
              <p className="text-sm leading-6 text-zinc-200">The main path stays simple: choose, fill, build, copy.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-sm">
              <p className="mb-1 text-[11px] uppercase tracking-[0.28em] text-yellow-300/70">Next</p>
              <p className="text-sm leading-6 text-zinc-200">After this, the libraries get the same polish and restraint.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[24px] border border-yellow-500/15 bg-black/45 p-6">
          <p className="mb-3 text-[11px] uppercase tracking-[0.35em] text-yellow-300/70">Best flow</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="mb-2 text-sm font-semibold text-white">1. Choose a starter</p>
              <p className="text-sm leading-6 text-zinc-300">Pick a simple card that matches what you want to make. No blank-page feeling.</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="mb-2 text-sm font-semibold text-white">2. Fill the boxes</p>
              <p className="text-sm leading-6 text-zinc-300">Use everyday words for subject, style, mood, constraints, and output.</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="mb-2 text-sm font-semibold text-white">3. Copy and run</p>
              <p className="text-sm leading-6 text-zinc-300">Build the JSON draft, copy it, and paste it into your AI tool of choice.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-yellow-500/15 bg-[linear-gradient(180deg,rgba(245,192,74,0.08),rgba(255,255,255,0.02))] p-6">
          <p className="mb-3 text-[11px] uppercase tracking-[0.35em] text-yellow-300/70">Use only if needed</p>
          <div className="space-y-3">
            <div className="rounded-2xl border border-yellow-500/15 bg-black/35 p-4">
              <div className="mb-2 flex items-center gap-2 text-yellow-100">
                <Wrench className="h-4 w-4" />
                <p className="text-sm font-semibold">Prompt Repair</p>
              </div>
              <p className="mb-3 text-sm leading-6 text-zinc-300">For prompts that feel weak, messy, vague, or contradictory.</p>
              <Link href="/prompt-repair">
                <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
                  Open Repair
                </Button>
              </Link>
            </div>
            <div className="rounded-2xl border border-yellow-500/15 bg-black/35 p-4">
              <div className="mb-2 flex items-center gap-2 text-yellow-100">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-semibold">Prompt Boxes</p>
              </div>
              <p className="mb-3 text-sm leading-6 text-zinc-300">For rough prompts that need extracting, rebuilding, or boxing into structure.</p>
              <Link href="/prompt-boxes">
                <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10">
                  Open Boxes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {importedPromptTitle && (
        <section className="mb-8 rounded-[24px] border border-yellow-500/25 bg-yellow-500/8 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-yellow-100">
              Loaded from Prompt Library: <span className="font-semibold">{importedPromptTitle}</span>
            </p>
            <Button
              variant="outline"
              className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10"
              onClick={clearImportedPrompt}
            >
              Clear imported prompt
            </Button>
          </div>
        </section>
      )}

      <section className="mb-8 rounded-[28px] border border-yellow-500/15 bg-black/40 p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-yellow-300/70">Starter cards</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Pick the closest prompt type</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              Keep it simple. Choose the card that feels closest, even if it is not perfect.
            </p>
          </div>
          <Input
            value={cardSearch}
            onChange={(event) => setCardSearch(event.target.value)}
            className="max-w-sm border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-500"
            placeholder="Search prompt types..."
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {filteredCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => selectCard(card)}
              className={[
                "rounded-2xl border p-4 text-left transition",
                selectedCardId === card.id
                  ? "border-yellow-400/45 bg-yellow-500/10 shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                  : "border-white/8 bg-white/[0.03] hover:border-yellow-400/25 hover:bg-white/[0.05]",
              ].join(" ")}
            >
              <p className="mb-2 text-sm font-semibold text-white">{card.label}</p>
              <p className="text-sm leading-6 text-zinc-300">{card.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="rounded-[28px] border border-yellow-500/15 bg-black/45 p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-yellow-300/70">Build panel</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{selectedCard?.label || "Choose a prompt type"}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Fill only the fields you know. You can leave the rest blank and improve later.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10" onClick={fillDemoValues}>
                Fill demo
              </Button>
              <Button variant="outline" className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10" onClick={clearCurrentFields}>
                Clear fields
              </Button>
            </div>
          </div>

          {selectedCard && (
            <>
              <div className="mb-5 flex flex-wrap gap-2">
                {starterCards.map((card) => (
                  <Button
                    key={`starter-${card.id}`}
                    variant="outline"
                    className="border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-yellow-500/10 hover:text-yellow-100"
                    onClick={() => selectCard(card)}
                  >
                    {card.label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {selectedCard.fields.map((field) => (
                  <label key={`${selectedCard.id}-${field.key}`} className="space-y-2 text-sm text-zinc-300">
                    <span className="block text-xs uppercase tracking-[0.2em] text-zinc-400">{field.label}</span>
                    <Input
                      value={cardValues[field.key] || ""}
                      onChange={(event) =>
                        setCardValues((prev) => ({
                          ...prev,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-500"
                      placeholder={field.placeholder}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={buildDraft}>
                  <Wand2 className="h-4 w-4" />
                  Build JSON prompt
                </Button>
                <Link href="/prompts">
                  <Button variant="outline" className="border-white/10 bg-transparent text-zinc-200 hover:bg-white/[0.05]">
                    Need inspiration first
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="rounded-[28px] border border-yellow-500/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-yellow-300/70">Output</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Your ready JSON draft</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Build the prompt, copy it, then open your AI tool. This keeps the workflow predictable.
            </p>
          </div>

          <Textarea
            value={draft}
            readOnly
            className="min-h-[520px] border-white/10 bg-black/35 text-white placeholder:text-zinc-500"
            placeholder="Your generated JSON draft appears here..."
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Button
              variant="outline"
              className="border-yellow-500/40 bg-transparent text-yellow-100 hover:bg-yellow-500/10"
              onClick={copyDraft}
              disabled={!draft}
            >
              Copy JSON draft
            </Button>

            <div className="overflow-hidden rounded-md border border-yellow-500/40">
              <div className="flex items-stretch">
                <Button
                  variant="outline"
                  className="flex-1 rounded-none border-0 bg-transparent text-yellow-100 hover:bg-yellow-500/10"
                  onClick={() => handleTryIn(TRY_IN_PROVIDERS[0])}
                  disabled={!draft}
                >
                  Copy + open {TRY_IN_PROVIDERS[0].label}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-none border-0 border-l border-yellow-500/40 bg-transparent px-3 text-yellow-100 hover:bg-yellow-500/10"
                      aria-label="Choose a provider"
                      disabled={!draft}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    collisionPadding={12}
                    className="w-56 border-yellow-500/30 bg-black/90 text-white"
                  >
                    {TRY_IN_PROVIDERS.map((provider) => (
                      <DropdownMenuItem
                        key={provider.id}
                        className="cursor-pointer focus:bg-yellow-500/20"
                        onClick={() => handleTryIn(provider)}
                      >
                        Copy + Open {provider.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="mb-2 text-sm font-semibold text-white">Quick note</p>
            <p className="text-sm leading-6 text-zinc-300">
              {copyFeedback || "If a field is a list, separate items with commas. If the result feels weak, use Prompt Repair before trying again."}
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
