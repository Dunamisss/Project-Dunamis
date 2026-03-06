import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import hackerImage from "@/assets/hacker.png";
import TubesEffect from "@/components/TubesEffect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { JSON_PROMPT_CARDS, type JsonPromptCard } from "@/data/jsonPromptCards";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

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
    return BASIC_PROMPT_CARDS.filter((card) =>
      `${card.label} ${card.description}`.toLowerCase().includes(q),
    );
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
      // Non-blocking if payload is malformed.
    }
  }, []);

  return (
    <div className="min-h-screen relative selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      <img src={hackerImage} alt="" aria-hidden="true" className="fixed inset-0 z-0 h-screen w-full object-cover" />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/40 via-black/55 to-black/80" />
      <TubesEffect />

      <div className="relative z-10 min-h-screen text-white">
        <header className="max-w-7xl mx-auto px-4 xl:px-8 py-6 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-wide">DUNAMIS</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/prompt-repair"><Button variant="ghost" className="text-yellow-200 hover:text-yellow-100">Prompt Repair</Button></Link>
            <Link href="/prompt-boxes"><Button variant="ghost" className="text-yellow-200 hover:text-yellow-100">Prompt Boxes</Button></Link>
            <Link href="/prompts"><Button variant="ghost" className="text-yellow-200 hover:text-yellow-100">Prompt Library</Button></Link>
            <Link href="/images"><Button variant="ghost" className="text-yellow-200 hover:text-yellow-100">Image Library</Button></Link>
            <Link href="/tutorials"><Button variant="ghost" className="text-yellow-200 hover:text-yellow-100">Tutorials</Button></Link>
          </div>
        </header>

        <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 pb-16 space-y-6">
          <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-5 py-4 text-amber-100">
            <p className="text-xs uppercase tracking-[0.22em]">Under Construction</p>
            <p className="text-sm">This site is still being built. Some features may change or be incomplete while updates roll out.</p>
          </div>
          <div className="rounded-lg border border-yellow-500/40 bg-black/70 px-5 py-4 text-center text-base md:text-lg font-semibold text-yellow-200 shadow-lg">
            Start Here: pick a prompt type, fill the boxes, and copy your ready JSON.
          </div>
          <div className="rounded-lg border border-yellow-500/30 bg-black/65 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm text-yellow-100 font-semibold">Need to clean up a messy prompt first?</p>
              <p className="text-xs text-gray-300">Use Prompt Boxes Lab to paste rough prompts, extract fields, and rebuild clean JSON before using the starter cards here.</p>
            </div>
            <Link href="/prompt-boxes">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300">Open Prompt Boxes</Button>
            </Link>
          </div>
          <div className="rounded-lg border border-yellow-500/30 bg-black/65 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm text-yellow-100 font-semibold">Prompt weak, vague, or contradictory?</p>
              <p className="text-xs text-gray-300">Run it through Prompt Repair first to see defect findings, then copy a stronger prompt back into your normal workflow.</p>
            </div>
            <Link href="/prompt-repair">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300">Open Prompt Repair</Button>
            </Link>
          </div>
          {importedPromptTitle && (
            <div className="rounded-lg border border-yellow-500/30 bg-black/65 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-sm text-yellow-100">
                Loaded from Prompt Library: <span className="font-semibold">{importedPromptTitle}</span>
              </p>
              <Button
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={clearImportedPrompt}
              >
                Clear Imported Prompt
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-yellow-500/30 bg-black/65 p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-200">New here?</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div className="rounded-md border border-yellow-500/20 bg-black/35 p-3">
                <p className="text-yellow-100 font-semibold">1. Pick a Starter Card</p>
                <p className="text-xs text-gray-300">Use a preset so you never start from blank.</p>
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/35 p-3">
                <p className="text-yellow-100 font-semibold">2. Fill Simple Boxes</p>
                <p className="text-xs text-gray-300">Write plain words (colors, style, mood, setting).</p>
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/35 p-3">
                <p className="text-yellow-100 font-semibold">3. Copy and Run</p>
                <p className="text-xs text-gray-300">Build JSON, copy it, then run it in your AI tool.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {starterCards.map((card) => (
                <Button
                  key={`starter-${card.id}`}
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  onClick={() => selectCard(card)}
                >
                  Try: {card.label}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-gray-300">Tip: press a starter button, then click Build JSON Prompt.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <section className="xl:col-span-6 rounded-lg border border-yellow-500/30 bg-black/60 p-5 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Choose Prompt Type</h2>
                <p className="text-xs text-gray-300">Pick one card below. You only need one to start.</p>
              </div>
              <Input
                value={cardSearch}
                onChange={(event) => setCardSearch(event.target.value)}
                className="bg-black/40 border-yellow-500/30 text-white placeholder:text-gray-500"
                placeholder="Search prompt type..."
              />

              <div className="grid grid-cols-1 gap-2">
                {filteredCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => selectCard(card)}
                    className={[
                      "rounded-md border px-3 py-3 text-left transition",
                      selectedCardId === card.id
                        ? "border-yellow-300 bg-yellow-500/10"
                        : "border-yellow-500/30 bg-black/30 hover:bg-yellow-500/10",
                    ].join(" ")}
                  >
                    <p className="text-sm text-yellow-100 font-semibold">{card.label}</p>
                    <p className="text-[11px] text-gray-300">{card.description}</p>
                  </button>
                ))}
              </div>

              {selectedCard && (
                <div className="space-y-3 rounded-md border border-yellow-500/25 bg-black/30 p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-200/80">{selectedCard.label} Fields</p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={fillDemoValues}
                      >
                        Fill Demo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        onClick={clearCurrentFields}
                      >
                        Clear Fields
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedCard.fields.map((field) => (
                      <label key={`${selectedCard.id}-${field.key}`} className="space-y-1 text-xs text-gray-300">
                        <span>{field.label}</span>
                        <Input
                          value={cardValues[field.key] || ""}
                          onChange={(event) =>
                            setCardValues((prev) => ({
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
                  <Button className="w-full bg-yellow-400 text-black hover:bg-yellow-300" onClick={buildDraft}>
                    Build JSON Prompt
                  </Button>
                </div>
              )}
            </section>

            <section className="xl:col-span-6 rounded-lg border border-yellow-500/30 bg-black/60 p-5 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Your Ready JSON</h2>
                <p className="text-xs text-gray-300">This is your final output from the boxes on the left.</p>
              </div>
              <Textarea
                value={draft}
                readOnly
                className="min-h-[520px] bg-black/30 border-yellow-500/20 text-white placeholder:text-gray-500"
                placeholder="Your generated JSON draft appears here..."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10" onClick={copyDraft} disabled={!draft}>
                  Copy JSON Draft
                </Button>
                <div className="w-full overflow-hidden rounded-md border border-yellow-500/40 flex items-stretch">
                  <Button
                    variant="outline"
                    className="flex-1 min-w-0 rounded-none border-0 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={() => handleTryIn(TRY_IN_PROVIDERS[0])}
                    disabled={!draft}
                  >
                    <span className="truncate">Copy + Open {TRY_IN_PROVIDERS[0].label}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-none border-0 border-l border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-3"
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
                      className="bg-black/90 text-white border-yellow-500/30 z-50 w-56"
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
              <p className="text-[11px] text-gray-300">
                {copyFeedback || "Tip: for lists like background elements, separate items with commas."}
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
