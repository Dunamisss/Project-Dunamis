import { useMemo, useState, type ChangeEvent } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/contexts/ChatContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

type FigureSpec = {
  figureName: string;
  vibe: string;
  outfit: string;
  accessories: string;
  cardbackTheme: string;
  branding: string;
  ageLabel: string;
  articulation: string;
  scale: string;
};

type StudioMode = "form" | "photo";

type PhotoFlow = {
  targetStyle: string;
  packagingMood: string;
  accessoryHints: string;
};

function buildPrompt(spec: FigureSpec): string {
  const accessoryList = spec.accessories
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  const accessoryText =
    accessoryList.length > 0
      ? accessoryList.join(", ")
      : "infer three fitting accessories from the character vibe";

  return [
    "Analyze the uploaded photo and retain strong facial likeness, hairstyle, and outfit identity.",
    `Re-imagine the person as a ${spec.scale} collectible action figure named "${spec.figureName}".`,
    `Character vibe: ${spec.vibe}. Outfit direction: ${spec.outfit}.`,
    "Display the figure inside a premium clear plastic blister pack on a printed cardboard cardback.",
    `Packaging theme: ${spec.cardbackTheme}. Branding style: ${spec.branding}. Age label: ${spec.ageLabel}.`,
    `Articulation style: ${spec.articulation}; articulation points should be visibly sculpted (shoulders, elbows, knees).`,
    `Place exactly three accessories in separate plastic bubbles: ${accessoryText}.`,
    "Style as professional studio product photography with controlled highlights on plastic surfaces, crisp molded PVC textures, high realism, 8k detail, centered product framing.",
    "Avoid brand/IP infringement, avoid real brand logos, no watermark, no text artifacts.",
  ].join(" ");
}

function buildPromptFromPhoto(spec: FigureSpec, photo: PhotoFlow, photoName: string): string {
  const hints = photo.accessoryHints
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  const hintText = hints.length > 0 ? hints.join(", ") : "infer three relevant accessories from the uploaded photo";

  return [
    `Input photo: ${photoName || "uploaded user photo"}.`,
    "Analyze the uploaded photo and extract facial features, hairstyle, expression, and current outfit details with high likeness retention.",
    `Convert the person into a ${spec.scale} collectible action figure named "${spec.figureName}".`,
    `Target style: ${photo.targetStyle}. Packaging mood: ${photo.packagingMood}.`,
    `Cardback theme: ${spec.cardbackTheme}. Branding: ${spec.branding}. Age label: ${spec.ageLabel}.`,
    `Use ${spec.articulation} articulation with visible joints at shoulders, elbows, and knees.`,
    `Accessories requirement: exactly three accessories in separate blister bubbles: ${hintText}.`,
    "Render as clean commercial product photography with realistic molded PVC texture, clear blister reflections, neutral studio backdrop, and 8k-quality detail.",
    "No real brand logos, no copyrighted character cloning, no watermark text.",
  ].join(" ");
}

function buildJson(spec: FigureSpec) {
  const accessoryList = spec.accessories
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    action_figure_generator: {
      input_source: "user_uploaded_photo",
      conversion_rules: {
        likeness_retention: "high",
        texture_mapping: "injection-molded PVC plastic",
        articulation_style: spec.articulation,
        scale: spec.scale,
      },
      character: {
        figure_name: spec.figureName,
        vibe: spec.vibe,
        outfit_direction: spec.outfit,
      },
      packaging_specs: {
        format: "Blister pack on cardback",
        cardback_theme: spec.cardbackTheme,
        branding_style: spec.branding,
        age_label: spec.ageLabel,
        features: ["Die-cut hanging peg hole", "Safety warning logos", "Collector edition stamp"],
      },
      environment: {
        shot_type: "Commercial product photography",
        lighting: "Three-point studio lighting with realistic plastic glares",
        background: "Neutral grey studio backdrop",
      },
      dynamic_elements: {
        accessories:
          accessoryList.length > 0
            ? accessoryList
            : ["Infer from uploaded photo context", "Infer from uploaded photo context", "Infer from uploaded photo context"],
        typography: "Dynamic bold font matched to character style",
      },
      safety_constraints: {
        no_real_brand_logos: true,
        no_ip_character_clones: true,
      },
    },
  };
}

export default function ToyFigureStudio() {
  const { loadPrompt } = useChat();
  const [, setLocation] = useLocation();
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [mode, setMode] = useState<StudioMode>("form");
  const [photoName, setPhotoName] = useState("");
  const [photoFlow, setPhotoFlow] = useState<PhotoFlow>({
    targetStyle: "premium stylized realistic toy figure",
    packagingMood: "collectible neo-retro",
    accessoryHints: "headphones, camera, coffee cup",
  });
  const [tryInProvider, setTryInProvider] = useState({
    id: "nanobanana",
    label: "Nano Banana",
    url: "https://nanobanana.ai/",
  });
  const [spec, setSpec] = useState<FigureSpec>({
    figureName: "Dunamis Hero",
    vibe: "confident streetwear creator",
    outfit: "oversized hoodie, tapered cargos, high-top sneakers",
    accessories: "headphones, microphone, tablet",
    cardbackTheme: "neon gold cyber city",
    branding: "retro 90s collector toy line",
    ageLabel: "14+",
    articulation: "ball-jointed, 24 points",
    scale: "1:12 scale (6-inch)",
  });

  const generatedPrompt = useMemo(
    () => (mode === "photo" ? buildPromptFromPhoto(spec, photoFlow, photoName) : buildPrompt(spec)),
    [mode, spec, photoFlow, photoName],
  );
  const generatedJson = useMemo(() => JSON.stringify(buildJson(spec), null, 2), [spec]);
  const tryInProviders = [
    { id: "nanobanana", label: "Nano Banana", url: "https://nanobanana.ai/" },
    { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
    { id: "gemini", label: "Gemini", url: "https://gemini.google.com/" },
    { id: "claude", label: "Claude", url: "https://claude.ai/" },
    { id: "grok", label: "Grok", url: "https://grok.com/" },
  ];

  const onField =
    (field: keyof FigureSpec) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSpec((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const onPhotoField =
    (field: keyof PhotoFlow) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setPhotoFlow((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const copyText = async (value: string, message: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(message);
      window.setTimeout(() => setCopyFeedback(null), 2200);
    } catch {
      setCopyFeedback("Copy failed. Please copy manually.");
      window.setTimeout(() => setCopyFeedback(null), 2200);
    }
  };

  const sendToOptimizer = () => {
    loadPrompt(generatedPrompt);
    setLocation("/?focus=optimizer");
  };

  const handleTryIn = async (provider = tryInProvider) => {
    if (!generatedPrompt.trim()) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopyFeedback(`Prompt copied. Opening ${provider.label}...`);
      window.setTimeout(() => setCopyFeedback(null), 2200);
      window.open(provider.url, "_blank", "noopener,noreferrer");
    } catch {
      setCopyFeedback("Copy failed. Please copy manually.");
      window.setTimeout(() => setCopyFeedback(null), 2200);
    }
  };

  const onPhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setPhotoName(file?.name ?? "");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-zinc-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 space-y-8">
        <section className="rounded-xl border border-yellow-500/30 bg-black/70 p-6 shadow-lg space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/80">New Tool</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Toy Figure Studio</h1>
          <p className="text-sm text-gray-300 max-w-4xl">
            Generate collectible toy-figure prompts in two ways: fill the pro form, or upload a photo and answer 3 simple questions.
            Then copy and run in your image model.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Back to Homepage
              </Button>
            </Link>
            <Link href="/starter-packs">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                Starter Packs
              </Button>
            </Link>
            <Link href="/json-prompt-architect">
              <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                JSON Architect
              </Button>
            </Link>
            <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={sendToOptimizer}>
              Open In Optimizer
            </Button>
            <div className="w-full sm:w-auto overflow-hidden rounded-md border border-yellow-500/40 flex items-stretch">
              <Button
                variant="outline"
                className="flex-1 min-w-0 rounded-none border-0 text-yellow-200 hover:bg-yellow-500/10"
                onClick={() => void handleTryIn()}
              >
                <span className="truncate">Generate In {tryInProvider.label}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-none border-0 border-l border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-3"
                    aria-label="Choose a platform"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-black/90 text-white border-yellow-500/30 w-56">
                  {tryInProviders.map((provider) => (
                    <DropdownMenuItem
                      key={provider.id}
                      className="cursor-pointer focus:bg-yellow-500/20"
                      onClick={() => {
                        setTryInProvider(provider);
                        void handleTryIn(provider);
                      }}
                    >
                      Generate in {provider.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-yellow-500/25 bg-black/70 p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={mode === "form" ? "default" : "outline"}
                className={mode === "form" ? "bg-yellow-400 text-black hover:bg-yellow-300" : "border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"}
                onClick={() => setMode("form")}
              >
                Build From Form
              </Button>
              <Button
                variant={mode === "photo" ? "default" : "outline"}
                className={mode === "photo" ? "bg-yellow-400 text-black hover:bg-yellow-300" : "border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"}
                onClick={() => setMode("photo")}
              >
                Build From Photo
              </Button>
            </div>
            <h2 className="text-xl font-semibold text-yellow-200">
              {mode === "photo" ? "Photo To Toy Prompt Setup" : "Figure Setup"}
            </h2>
            {mode === "photo" && (
              <div className="rounded-md border border-yellow-500/20 bg-black/30 p-4 space-y-3">
                <label className="space-y-1 block">
                  <span className="text-xs text-gray-300">Upload photo (for filename reference)</span>
                  <Input type="file" accept="image/*" onChange={onPhotoUpload} className="bg-black/40 border-yellow-500/30" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-gray-300">Question 1: What style do you want?</span>
                  <Input value={photoFlow.targetStyle} onChange={onPhotoField("targetStyle")} className="bg-black/40 border-yellow-500/30" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-gray-300">Question 2: What packaging mood?</span>
                  <Input value={photoFlow.packagingMood} onChange={onPhotoField("packagingMood")} className="bg-black/40 border-yellow-500/30" />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-gray-300">Question 3: Which 3 accessories?</span>
                  <Input value={photoFlow.accessoryHints} onChange={onPhotoField("accessoryHints")} className="bg-black/40 border-yellow-500/30" />
                </label>
                <p className="text-xs text-gray-400">Selected photo: {photoName || "none yet"}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-gray-300">Figure Name</span>
                <Input value={spec.figureName} onChange={onField("figureName")} className="bg-black/40 border-yellow-500/30" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-300">Scale</span>
                <Input value={spec.scale} onChange={onField("scale")} className="bg-black/40 border-yellow-500/30" />
              </label>
            </div>
            <label className="space-y-1">
              <span className="text-xs text-gray-300">Character Vibe</span>
              <Input value={spec.vibe} onChange={onField("vibe")} className="bg-black/40 border-yellow-500/30" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-300">Outfit Direction</span>
              <Input value={spec.outfit} onChange={onField("outfit")} className="bg-black/40 border-yellow-500/30" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-300">3 Accessories (comma separated)</span>
              <Input value={spec.accessories} onChange={onField("accessories")} className="bg-black/40 border-yellow-500/30" />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-gray-300">Cardback Theme</span>
                <Input value={spec.cardbackTheme} onChange={onField("cardbackTheme")} className="bg-black/40 border-yellow-500/30" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-300">Branding Style</span>
                <Input value={spec.branding} onChange={onField("branding")} className="bg-black/40 border-yellow-500/30" />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-gray-300">Age Label</span>
                <Input value={spec.ageLabel} onChange={onField("ageLabel")} className="bg-black/40 border-yellow-500/30" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-300">Articulation Style</span>
                <Input value={spec.articulation} onChange={onField("articulation")} className="bg-black/40 border-yellow-500/30" />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-yellow-500/25 bg-black/70 p-5 space-y-4">
            <h2 className="text-xl font-semibold text-yellow-200">How To Use (Simple)</h2>
            <div className="rounded-md border border-yellow-500/20 bg-black/30 p-4 text-sm text-gray-300 space-y-2">
              <p>1. Choose mode: <span className="text-yellow-200">Build From Form</span> or <span className="text-yellow-200">Build From Photo</span>.</p>
              <p>2. Fill the fields (or photo questions) and review the generated prompt.</p>
              <p>3. Click <span className="text-yellow-200">Generate In</span> to auto-copy and open your platform.</p>
              <p>4. If needed, click <span className="text-yellow-200">Open In Optimizer</span> for refinement.</p>
            </div>
            <div className="rounded-md border border-yellow-500/20 bg-black/30 p-4 text-sm text-gray-300">
              Safety: only use photos you own or have permission to use. Avoid using real brand logos or trademarked character clones.
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-yellow-500/25 bg-black/70 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-yellow-200">Generated Prompt</h2>
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={() => void copyText(generatedPrompt, "Prompt copied.")}
              >
                Copy Prompt
              </Button>
            </div>
            <Textarea value={generatedPrompt} readOnly className="min-h-[280px] bg-black/40 border-yellow-500/30 text-white" />
          </div>

          <div className="rounded-xl border border-yellow-500/25 bg-black/70 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-yellow-200">Generated JSON</h2>
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                onClick={() => void copyText(generatedJson, "JSON copied.")}
              >
                Copy JSON
              </Button>
            </div>
            <Textarea value={generatedJson} readOnly className="min-h-[280px] bg-black/40 border-yellow-500/30 text-white font-mono text-xs" />
          </div>
        </section>

        <div className="text-xs text-gray-300 min-h-4">{copyFeedback ?? ""}</div>
      </div>
    </div>
  );
}
