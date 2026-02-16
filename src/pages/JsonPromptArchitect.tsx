import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import AddToPackDialog from "@/components/AddToPackDialog";
import { useChat } from "@/contexts/ChatContext";

type PromptSchema = {
  subject: {
    gender: string;
    age_group: string;
    hair: string;
    expression: string;
    skin: string;
  };
  apparel: {
    item: string;
    color: string;
    fit: string;
    style: string;
  };
  accessories: {
    necklaces: string[];
    wristwear: {
      right_wrist: string;
      left_wrist: string;
    };
    bag: {
      type: string;
      color: string;
      texture: string;
      details: string;
    };
  };
  environment: {
    location: string;
    flooring: string;
    background_details: string;
  };
  technical: {
    lighting: string;
    framing: string;
    vibe: string;
    aspect_ratio: string;
    seed: string;
  };
  negative_prompt: string;
};

const PRESETS: Record<string, PromptSchema> = {
  streetwear: {
    subject: {
      gender: "Female",
      age_group: "Gen Z / Early 20s",
      hair: "Sleek high ponytail, dark brown, face-framing strands",
      expression: "Confident, direct eye contact with the lens",
      skin: "Sun-kissed glow, freckles, dewy makeup",
    },
    apparel: {
      item: "Oversized graphic hoodie and baggy cargo pants",
      color: "Charcoal black and sage green",
      fit: "Loose, streetwear aesthetic, boxy silhouette",
      style: "Hypebeast, urban, casual",
    },
    accessories: {
      necklaces: ["Silver chunky cuban link chain", "Small padlock pendant"],
      wristwear: {
        right_wrist: "Silver digital watch",
        left_wrist: "Black hair tie",
      },
      bag: {
        type: "Crossbody sling bag",
        color: "Matte black",
        texture: "Cordura nylon",
        details: "White logo embroidery, utility buckles",
      },
    },
    environment: {
      location: "Concrete city alleyway at dusk",
      flooring: "Wet asphalt with puddle reflections",
      background_details: "Graffiti art, neon signage glowing in the distance, metal fire escapes",
    },
    technical: {
      lighting: "Cool blue ambient dusk light with orange neon rim lighting",
      framing: "Full-body shot, low angle for a powerful look",
      vibe: "Moody, cinematic streetwear, high contrast",
      aspect_ratio: "16:9",
      seed: "",
    },
    negative_prompt: "blurry face, deformed hands, text watermark, overexposure",
  },
  luxury: {
    subject: {
      gender: "Female",
      age_group: "Late 20s",
      hair: "Voluminous blowout, honey blonde, soft curls",
      expression: "Serene, looking slightly away from camera",
      skin: "Polished matte finish, soft glam makeup",
    },
    apparel: {
      item: "Tweed blazer and matching tailored trousers",
      color: "Cream with gold accents",
      fit: "Structured and elegant, tailor-made fit",
      style: "Old money, quiet luxury",
    },
    accessories: {
      necklaces: ["Classic single-strand pearls", "Small gold locket"],
      wristwear: {
        right_wrist: "Gold vintage tank watch with leather strap",
        left_wrist: "Thin gold bangle",
      },
      bag: {
        type: "Top-handle vanity bag",
        color: "Tan leather",
        texture: "Smooth calfskin",
        details: "Gold clasp, structured shape",
      },
    },
    environment: {
      location: "Luxury hotel lobby",
      flooring: "Polished checkered marble",
      background_details: "Grand staircase, velvet curtains, crystal chandelier bokeh",
    },
    technical: {
      lighting: "Warm soft indoor light with subtle golden-hour window glow",
      framing: "Medium close shot (waist-up)",
      vibe: "Refined high-end lifestyle",
      aspect_ratio: "3:4",
      seed: "",
    },
    negative_prompt: "cheap fabrics, harsh flash, low detail, noise artifacts",
  },
  vintage90s: {
    subject: {
      gender: "Female",
      age_group: "Early 20s",
      hair: "Short bob with bangs, messy bedhead texture",
      expression: "Dreamy candid smile, looking down",
      skin: "Natural no-makeup look with soft film texture",
    },
    apparel: {
      item: "Oversized denim jacket over floral slip dress",
      color: "Washed indigo and pale yellow",
      fit: "Draped thrifted silhouette",
      style: "Retro 90s, grunge-lite, nostalgic",
    },
    accessories: {
      necklaces: ["Black velvet choker with silver star", "Thin silver chain"],
      wristwear: {
        right_wrist: "Thin silver ring stack",
        left_wrist: "Braided friendship bracelet",
      },
      bag: {
        type: "Canvas tote bag",
        color: "Off-white",
        texture: "Worn-in cotton canvas",
        details: "Faded screen-printed graphic",
      },
    },
    environment: {
      location: "Outdoor record store / flea market",
      flooring: "Weathered wooden floorboards",
      background_details: "Vinyl crates, sun-faded posters, vintage clothing racks",
    },
    technical: {
      lighting: "Natural sun-drenched lighting with slight lens flare",
      framing: "Candid medium shot",
      vibe: "Analog film aesthetic, Kodak Portra 400 tones",
      aspect_ratio: "4:5",
      seed: "",
    },
    negative_prompt: "modern glossy look, digital oversharpen, flat lighting, CGI skin",
  },
};

function emptyState(): PromptSchema {
  return {
    subject: { gender: "", age_group: "", hair: "", expression: "", skin: "" },
    apparel: { item: "", color: "", fit: "", style: "" },
    accessories: {
      necklaces: [],
      wristwear: { right_wrist: "", left_wrist: "" },
      bag: { type: "", color: "", texture: "", details: "" },
    },
    environment: { location: "", flooring: "", background_details: "" },
    technical: { lighting: "", framing: "", vibe: "", aspect_ratio: "1:1", seed: "" },
    negative_prompt: "",
  };
}

function toPlainPrompt(state: PromptSchema): string {
  const necklaceText = state.accessories.necklaces.filter(Boolean).join(", ");
  return [
    `Subject: ${state.subject.gender || "person"}, ${state.subject.age_group || "adult"}, ${state.subject.hair || "styled hair"}, ${state.subject.expression || "neutral expression"}, ${state.subject.skin || "natural skin texture"}.`,
    `Outfit: ${state.apparel.item || "fashion outfit"}, ${state.apparel.color || "balanced tones"}, ${state.apparel.fit || "tailored fit"}, ${state.apparel.style || "cohesive style"}.`,
    `Accessories: necklaces (${necklaceText || "minimal"}), right wrist (${state.accessories.wristwear.right_wrist || "none"}), left wrist (${state.accessories.wristwear.left_wrist || "none"}), bag (${state.accessories.bag.type || "none"}, ${state.accessories.bag.color || "neutral"}, ${state.accessories.bag.texture || "smooth"}, ${state.accessories.bag.details || "clean details"}).`,
    `Environment: ${state.environment.location || "studio space"}, flooring ${state.environment.flooring || "clean floor"}, background ${state.environment.background_details || "subtle depth elements"}.`,
    `Technical: ${state.technical.lighting || "soft balanced light"}, ${state.technical.framing || "medium shot"}, vibe ${state.technical.vibe || "modern editorial"}, aspect ratio ${state.technical.aspect_ratio || "1:1"}${state.technical.seed ? `, seed ${state.technical.seed}` : ""}.`,
    state.negative_prompt ? `Negative prompt: ${state.negative_prompt}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function JsonPromptArchitect() {
  const { loadPrompt } = useChat();
  const [, setLocation] = useLocation();
  const [state, setState] = useState<PromptSchema>(emptyState());
  const [necklaceInput, setNecklaceInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tryInProvider, setTryInProvider] = useState<{
    id: string;
    label: string;
    url: string;
  }>({
    id: "chatgpt",
    label: "ChatGPT",
    url: "https://chatgpt.com/",
  });

  const tryInProviders = [
    { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
    { id: "grok", label: "Grok (xAI)", url: "https://grok.com/" },
    { id: "gemini", label: "Gemini", url: "https://gemini.google.com/" },
    { id: "claude", label: "Claude", url: "https://claude.ai/" },
    { id: "perplexity", label: "Perplexity", url: "https://www.perplexity.ai/" },
    { id: "poe", label: "Poe", url: "https://poe.com/" },
    { id: "qwen", label: "Qwen", url: "https://chat.qwen.ai/" },
    { id: "deepseek", label: "DeepSeek", url: "https://chat.deepseek.com/" },
  ];

  useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("preset") || "";
    if (preset && PRESETS[preset]) {
      setState(PRESETS[preset]);
    }
  }, []);

  const jsonOutput = useMemo(() => JSON.stringify(state, null, 2), [state]);
  const plainOutput = useMemo(() => toPlainPrompt(state), [state]);

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(message);
      window.setTimeout(() => setFeedback(null), 1600);
    } catch {
      setFeedback("Copy failed.");
      window.setTimeout(() => setFeedback(null), 1600);
    }
  };

  const setPath = (path: string, value: string) => {
    setState((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let current: any = next;
      for (let i = 0; i < keys.length - 1; i += 1) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const loadPreset = (key: keyof typeof PRESETS) => setState(PRESETS[key]);
  const clearAll = () => setState(emptyState());

  const optimizeInHome = () => {
    loadPrompt(plainOutput);
    setLocation("/?focus=optimizer");
  };

  const tryInProviderSite = async (provider = tryInProvider) => {
    try {
      await navigator.clipboard.writeText(plainOutput);
      setFeedback(`Copied. Opening ${provider.label}...`);
      window.setTimeout(() => setFeedback(null), 1800);
      window.open(provider.url, "_blank", "noopener,noreferrer");
    } catch {
      setFeedback("Copy failed.");
      window.setTimeout(() => setFeedback(null), 1800);
    }
  };

  const addNecklace = () => {
    const clean = necklaceInput.trim();
    if (!clean) return;
    setState((prev) => ({
      ...prev,
      accessories: {
        ...prev.accessories,
        necklaces: [...prev.accessories.necklaces, clean],
      },
    }));
    setNecklaceInput("");
  };

  const removeNecklace = (idx: number) => {
    setState((prev) => ({
      ...prev,
      accessories: {
        ...prev.accessories,
        necklaces: prev.accessories.necklaces.filter((_, i) => i !== idx),
      },
    }));
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),rgba(0,0,0,0.94)_45%,rgba(0,0,0,1)_80%)]" />
      <div className="relative z-10 px-4 py-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis Lab</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">JSON Prompt Architect</h1>
            <p className="text-sm text-gray-300 max-w-4xl">
              Most prompts break because details get buried. JSON turns your concept into a structured blueprint:
              precision, consistency, and pro-level control without guesswork.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back to Homepage
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-black/65 p-4 md:p-5 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80 mb-3">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10" onClick={() => loadPreset("streetwear")}>Streetwear / Urban</Button>
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10" onClick={() => loadPreset("luxury")}>Luxury / Old Money</Button>
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10" onClick={() => loadPreset("vintage90s")}>90s Vintage / Film</Button>
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10" onClick={clearAll}>Clear</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Architect Form</p>

            <Input value={state.subject.gender} onChange={(e) => setPath("subject.gender", e.target.value)} placeholder="Subject gender" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.subject.age_group} onChange={(e) => setPath("subject.age_group", e.target.value)} placeholder="Age group" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.subject.hair} onChange={(e) => setPath("subject.hair", e.target.value)} placeholder="Hair style" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.subject.expression} onChange={(e) => setPath("subject.expression", e.target.value)} placeholder="Expression" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.subject.skin} onChange={(e) => setPath("subject.skin", e.target.value)} placeholder="Skin details" className="bg-black/40 border-yellow-500/30 text-white" />

            <Input value={state.apparel.item} onChange={(e) => setPath("apparel.item", e.target.value)} placeholder="Clothing item" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.apparel.color} onChange={(e) => setPath("apparel.color", e.target.value)} placeholder="Clothing colors" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.apparel.fit} onChange={(e) => setPath("apparel.fit", e.target.value)} placeholder="Fit" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.apparel.style} onChange={(e) => setPath("apparel.style", e.target.value)} placeholder="Style" className="bg-black/40 border-yellow-500/30 text-white" />

            <div className="flex gap-2">
              <Input value={necklaceInput} onChange={(e) => setNecklaceInput(e.target.value)} placeholder="Add necklace item" className="bg-black/40 border-yellow-500/30 text-white" />
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10" onClick={addNecklace}>Add</Button>
            </div>
            {state.accessories.necklaces.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {state.accessories.necklaces.map((n, i) => (
                  <button key={`${n}-${i}`} onClick={() => removeNecklace(i)} className="rounded-full border border-yellow-500/40 px-2 py-1 text-xs text-yellow-200">
                    {n} x
                  </button>
                ))}
              </div>
            )}

            <Input value={state.accessories.wristwear.right_wrist} onChange={(e) => setPath("accessories.wristwear.right_wrist", e.target.value)} placeholder="Right wrist accessory" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.accessories.wristwear.left_wrist} onChange={(e) => setPath("accessories.wristwear.left_wrist", e.target.value)} placeholder="Left wrist accessory" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.accessories.bag.type} onChange={(e) => setPath("accessories.bag.type", e.target.value)} placeholder="Bag type" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.accessories.bag.color} onChange={(e) => setPath("accessories.bag.color", e.target.value)} placeholder="Bag color" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.accessories.bag.texture} onChange={(e) => setPath("accessories.bag.texture", e.target.value)} placeholder="Bag texture" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.accessories.bag.details} onChange={(e) => setPath("accessories.bag.details", e.target.value)} placeholder="Bag details" className="bg-black/40 border-yellow-500/30 text-white" />

            <Input value={state.environment.location} onChange={(e) => setPath("environment.location", e.target.value)} placeholder="Scene location" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.environment.flooring} onChange={(e) => setPath("environment.flooring", e.target.value)} placeholder="Flooring" className="bg-black/40 border-yellow-500/30 text-white" />
            <Textarea value={state.environment.background_details} onChange={(e) => setPath("environment.background_details", e.target.value)} placeholder="Background details" className="min-h-[90px] bg-black/40 border-yellow-500/30 text-white" />

            <Input value={state.technical.lighting} onChange={(e) => setPath("technical.lighting", e.target.value)} placeholder="Lighting style" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.technical.framing} onChange={(e) => setPath("technical.framing", e.target.value)} placeholder="Framing (e.g. medium shot)" className="bg-black/40 border-yellow-500/30 text-white" />
            <Input value={state.technical.vibe} onChange={(e) => setPath("technical.vibe", e.target.value)} placeholder="Vibe / aesthetic" className="bg-black/40 border-yellow-500/30 text-white" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={state.technical.aspect_ratio} onChange={(e) => setPath("technical.aspect_ratio", e.target.value)} placeholder="Aspect ratio (e.g. 4:5)" className="bg-black/40 border-yellow-500/30 text-white" />
              <Input value={state.technical.seed} onChange={(e) => setPath("technical.seed", e.target.value)} placeholder="Seed (optional)" className="bg-black/40 border-yellow-500/30 text-white" />
            </div>
            <Textarea value={state.negative_prompt} onChange={(e) => setPath("negative_prompt", e.target.value)} placeholder="Negative prompt (what to avoid)" className="min-h-[90px] bg-black/40 border-yellow-500/30 text-white" />
          </div>

          <div className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Output</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-yellow-200">JSON Blueprint</p>
                <Button size="sm" variant="outline" className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2" onClick={() => copy(jsonOutput, "JSON copied.")}>Copy JSON</Button>
              </div>
              <Textarea value={jsonOutput} readOnly className="min-h-[320px] bg-black/40 border-yellow-500/20 text-white font-mono text-[12px]" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-yellow-200">Plain Prompt (Converted)</p>
                <Button size="sm" variant="outline" className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2" onClick={() => copy(plainOutput, "Plain prompt copied.")}>Copy Prompt</Button>
              </div>
              <Textarea value={plainOutput} readOnly className="min-h-[220px] bg-black/40 border-yellow-500/20 text-white" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={optimizeInHome}
              >
                Optimize Prompt
              </Button>
              <AddToPackDialog
                promptText={plainOutput}
                suggestedTitle="JSON Architect Result"
                onDone={(msg) => {
                  setFeedback(msg);
                  window.setTimeout(() => setFeedback(null), 1600);
                }}
                trigger={(
                  <Button
                    variant="outline"
                    className="w-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                  >
                    Add to Pack
                  </Button>
                )}
              />
              <div className="w-full overflow-hidden rounded-md border border-yellow-500/40 flex items-stretch">
                <Button
                  variant="outline"
                  className="flex-1 min-w-0 rounded-none border-0 text-yellow-200 hover:bg-yellow-500/10"
                  onClick={() => {
                    void tryInProviderSite();
                  }}
                >
                  <span className="truncate">Try in {tryInProvider.label}</span>
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
                        onClick={() => {
                          setTryInProvider(provider);
                          void tryInProviderSite(provider);
                        }}
                      >
                        Try in {provider.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {feedback && <p className="text-xs text-yellow-200">{feedback}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
