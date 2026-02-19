import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useLocation } from "wouter";

type StarterPack = {
  id: string;
  title: string;
  subtitle: string;
  logoSrc?: string;
  problem: string;
  before: string;
  after: string;
  templates: string[];
  whyItWorks: string[];
  accent: string;
  platformLabel: string;
  platformUrl: string;
};

const STARTER_PACKS: StarterPack[] = [
  {
    id: "json-architect",
    title: "JSON Prompt Architect Pack",
    subtitle: "Build precision image prompts with structured JSON instead of messy paragraphs.",
    problem: "Long paragraph prompts drift. Models skip details in the middle and output becomes inconsistent.",
    before: "a stylish woman in a city at night with cool lighting and nice clothes",
    after:
      "Use structured JSON fields for subject, apparel, accessories, environment, and technical settings so every detail has a defined slot and survives generation.",
    templates: [
      "{\"subject\":{\"gender\":\"\",\"age_group\":\"\",\"hair\":\"\",\"expression\":\"\",\"skin\":\"\"},\"apparel\":{\"item\":\"\",\"color\":\"\",\"fit\":\"\",\"style\":\"\"},\"accessories\":{\"necklaces\":[],\"wristwear\":{\"right_wrist\":\"\",\"left_wrist\":\"\"},\"bag\":{\"type\":\"\",\"color\":\"\",\"texture\":\"\",\"details\":\"\"}},\"environment\":{\"location\":\"\",\"flooring\":\"\",\"background_details\":\"\"},\"technical\":{\"lighting\":\"\",\"framing\":\"\",\"vibe\":\"\",\"aspect_ratio\":\"4:5\",\"seed\":\"\"},\"negative_prompt\":\"\"}",
      "Streetwear preset: cinematic urban subject, wet asphalt reflections, neon rim light, full-body low-angle framing, high contrast mood.",
      "Luxury preset: old money styling, structured tailoring, warm interior glow, medium-close framing, elegant high-end vibe.",
    ],
    whyItWorks: [
      "Each visual detail gets a dedicated field, reducing skipped instructions.",
      "JSON improves consistency across reruns.",
      "Easier to debug and tweak than single-block prompts.",
    ],
    accent: "from-indigo-300/25 via-sky-300/15 to-cyan-200/20",
    platformLabel: "Dunamis Architect",
    platformUrl: "https://dunamiss.xyz/json-prompt-architect",
  },
  {
    id: "coloring-studio",
    title: "Coloring Studio Starter Pack",
    subtitle: "Create printable line-art prompts for kids, older kids, and adults.",
    problem: "Most image prompts produce shaded or noisy images that are bad for coloring pages.",
    before: "a lion for kids coloring page",
    after:
      "Kawaii plushie lion, very thick black outlines, wide white spaces, simple shapes, high contrast, white background --no grey, shadows, gradients, textures",
    templates: [
      "Kawaii plushie [SUBJECT], very thick black outlines, wide open white spaces, simple shapes, no shading, no textures, high contrast, white background --no grey, shadows",
      "Stylized vinyl toy [SUBJECT], bold outlines, street art aesthetic, clean vector lines, minimal hatching, high energy, white background --no gradients, realistic fur",
      "Intricate [SUBJECT] Zentangle art, highly detailed patterns, thin and thick line variation, ornate paisley and geometric fills, professional ink drawing style, white background --no shading, no colors",
    ],
    whyItWorks: [
      "Strict negative constraints stop muddy grayscale output.",
      "Age-based template tiers control complexity from easy to advanced.",
      "Works with both prompt-based generation and photo-to-line-art workflows.",
    ],
    accent: "from-rose-300/25 via-orange-300/15 to-amber-200/20",
    platformLabel: "Coloring Studio",
    platformUrl: "https://dunamiss.xyz/coloring-studio",
  },
  {
    id: "suno-v5",
    title: "Suno Song Starter Pack",
    subtitle: "From rough song idea to Suno-ready structure with fewer bad generations.",
    logoSrc: "/images/tools/Suno.png",
    problem: "Most song prompts are too vague, so the hook, structure, and genre feel inconsistent.",
    before: "make me a good song about heartbreak",
    after:
      "Modern melodic pop with emotional punch, 118 BPM, warm synth layers, clean punchy drums, expressive lead vocal. Theme: rebuilding after heartbreak. Structure: Verse 1, Chorus, Verse 2, Chorus, Bridge, Final Chorus, Outro. Chorus must be short, memorable, and repeatable.",
    templates: [
      "Genre/style: [GENRE]. Mood: [MOOD]. BPM: [BPM]. Theme/story: [TOPIC]. Vocal style: [VOICE]. Structure: Verse 1, Chorus, Verse 2, Chorus, Bridge, Final Chorus, Outro. Production notes: [KEY TEXTURES]. Keep the chorus hook simple and memorable.",
      "Write lyrics for a [GENRE] track about [TOPIC] with [MOOD] tone. Keep lines singable and natural. Add section labels: [Verse 1], [Chorus], [Verse 2], [Bridge], [Final Chorus], [Outro].",
      "Create 3 title options, then provide full lyrics and a separate style prompt for Suno. Avoid artist-name imitation, avoid filler lyrics, and keep the hook under 2 short lines.",
    ],
    whyItWorks: [
      "Suno performs better when style + structure are explicit.",
      "Short hook constraints improve replay value.",
      "Separate style prompt and lyrics reduce muddy outputs.",
    ],
    accent: "from-yellow-300/25 via-amber-300/15 to-orange-200/20",
    platformLabel: "Suno",
    platformUrl: "https://suno.com/",
  },
  {
    id: "suno-reggae-fusion",
    title: "Suno Reggae-Fusion Pack",
    subtitle: "Blend reggae roots with modern rap/pop energy without sounding generic.",
    logoSrc: "/images/tools/Suno.png",
    problem: "Single-genre reggae prompts often sound flat and repetitive.",
    before: "make a reggae rap song",
    after:
      "Reggae-fusion with modern hip-hop drums, offbeat skank guitar, deep warm bass, subtle dub FX, 96 BPM. Theme: resilience under pressure. Vocal mix: melodic rap verse + sung hook. Structure: Verse 1, Chorus, Verse 2, Chorus, Bridge, Final Chorus, Outro.",
    templates: [
      "Reggae-fusion + hip-hop crossover, [BPM] BPM. Instrument palette: offbeat guitar skank, dub delay accents, warm sub bass, modern trap-influenced drums. Theme: [TOPIC]. Vocal blend: [RAP/SUNG RATIO].",
      "Write original reggae-fusion lyrics with clear hook and chantable chorus. Keep cadence tight, no overlong bars, no recycled lines, no artist-name references.",
      "Give final output in 3 blocks: 1) Title options, 2) Full lyrics with section labels, 3) Suno style prompt with production direction.",
    ],
    whyItWorks: [
      "Fusion tags prevent generic one-dimensional reggae outputs.",
      "Instrument-level guidance improves groove identity.",
      "Sectioned output speeds up iterative Suno runs.",
    ],
    accent: "from-lime-300/25 via-emerald-300/15 to-yellow-200/20",
    platformLabel: "Suno",
    platformUrl: "https://suno.com/",
  },
  {
    id: "midjourney",
    title: "Midjourney Starter Pack",
    subtitle: "Stop wasting credits. Build cinematic prompts with proper structure.",
    logoSrc: "/images/tools/midjourney.jpg",
    problem: "Most users type broad ideas with no camera, lighting, or composition cues.",
    before: "a cool futuristic city at night",
    after:
      "futuristic cyberpunk megacity at night, neon reflections on wet pavement, cinematic wide-angle lens, volumetric fog, dramatic rim lighting, ultra-detailed architecture --ar 16:9 --v 6",
    templates: [
      "[subject], cinematic composition, dramatic lighting, volumetric atmosphere, ultra-detailed textures, sharp focus --ar 16:9",
      "full-body character design of [character], highly detailed costume, studio lighting, realistic fabric textures --ar 2:3",
      "epic fantasy environment, [location], atmospheric perspective, dynamic lighting, matte painting style --ar 21:9",
    ],
    whyItWorks: [
      "Midjourney responds best to concrete visual descriptors.",
      "Camera + lighting instructions increase consistency.",
      "Aspect ratio tokens prevent awkward framing.",
    ],
    accent: "from-amber-300/25 via-orange-300/15 to-yellow-200/20",
    platformLabel: "Midjourney",
    platformUrl: "https://www.midjourney.com/",
  },
  {
    id: "chatgpt-business",
    title: "ChatGPT Business Starter Pack",
    subtitle: "Turn vague business asks into clear, usable deliverables.",
    logoSrc: "/images/tools/chatgpt.webp",
    problem: "Most prompts miss audience, objective, and output format, so results drift.",
    before: "write me a marketing plan",
    after:
      "You are a growth strategist. Build a 90-day marketing plan for [business type] targeting [audience]. Include weekly actions, estimated effort, KPIs, and a plain-English summary for non-technical stakeholders.",
    templates: [
      "You are a [role]. Task: [goal]. Audience: [who]. Constraints: [limits]. Output format: [table/checklist/steps].",
      "Analyze this [text/data] and return: 1) key insights, 2) top risks, 3) action plan with priorities.",
      "Rewrite this for [audience] in [tone]. Keep it under [length]. Include one CTA.",
    ],
    whyItWorks: [
      "Role + audience prevents generic outputs.",
      "Constraints force useful, realistic answers.",
      "Explicit output format improves readability.",
    ],
    accent: "from-emerald-300/25 via-teal-300/15 to-lime-200/20",
    platformLabel: "ChatGPT",
    platformUrl: "https://chatgpt.com/",
  },
  {
    id: "research",
    title: "Research & Fact Check Starter Pack",
    subtitle: "Find better sources faster without drowning in noise.",
    logoSrc: "/images/tools/perplexity.webp",
    problem: "Users ask broad research questions and get shallow summaries.",
    before: "tell me about AI in education",
    after:
      "Research AI adoption in K-12 education (last 24 months). Return: top 5 trends, source links, disagreements between sources, and a practical recommendation list for school leaders.",
    templates: [
      "Research [topic] for [audience]. Scope: [timeframe/region]. Return claims with linked sources and confidence level.",
      "Compare [option A] vs [option B] on cost, risk, setup complexity, and expected ROI. Output as decision table.",
      "Summarize these 3 articles into one executive brief with key takeaways and open questions.",
    ],
    whyItWorks: [
      "Scope boundaries reduce vague results.",
      "Source-first instructions increase trust.",
      "Decision-table outputs speed up action.",
    ],
    accent: "from-cyan-300/25 via-sky-300/15 to-blue-200/20",
    platformLabel: "Perplexity",
    platformUrl: "https://www.perplexity.ai/",
  },
];

export default function AIToolFinds() {
  const { loadPrompt } = useChat();
  const [, setLocation] = useLocation();
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

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    window.setTimeout(() => setCopyFeedback(null), 1800);
  };

  const copyTemplate = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showCopyFeedback("Template copied.");
    } catch {
      showCopyFeedback("Copy failed. Please copy manually.");
    }
  };

  const optimizeInHome = (text: string) => {
    loadPrompt(text);
    setLocation("/?focus=optimizer");
  };

  const tryInProviderSite = async (text: string, provider = tryInProvider) => {
    try {
      await navigator.clipboard.writeText(text);
      showCopyFeedback(`Copied. Opening ${provider.label}...`);
      window.open(provider.url, "_blank", "noopener,noreferrer");
    } catch {
      showCopyFeedback("Copy failed. Please copy manually.");
    }
  };

  const toJsonArchitectLink = (template: string) =>
    `/json-prompt-architect?preset=${encodeURIComponent(
      template.toLowerCase().includes("streetwear")
        ? "streetwear"
        : template.toLowerCase().includes("luxury")
          ? "luxury"
          : "vintage90s",
    )}`;

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 w-full h-screen bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.30),rgba(0,0,0,0.94)_46%,rgba(0,0,0,1)_80%)]" />
      <div className="fixed inset-0 z-0 opacity-25 bg-[linear-gradient(120deg,rgba(251,191,36,0.16),rgba(146,64,14,0.08),rgba(251,191,36,0.10))]" />
      <div className="relative z-10 px-4 py-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-yellow-300/80">Dunamis</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-yellow-200">Starter Packs</h1>
            <p className="text-sm text-gray-300 max-w-3xl">
              Platform-specific prompt systems visitors can use immediately. Each pack includes
              a before/after example, ready templates, and a direct path into the optimizer.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
              Back to Homepage
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-black/60 p-5 md:p-6 shadow-lg">
          <p className="text-sm text-yellow-100">
            Build one pack properly, then duplicate the structure for other platforms. Focus beats volume.
          </p>
        </div>
        {copyFeedback && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-yellow-500/40 bg-black/90 px-4 py-2 text-[12px] text-yellow-200 shadow-lg">
            {copyFeedback}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {STARTER_PACKS.map((pack) => (
            <div key={pack.id} className="rounded-xl border border-yellow-500/25 bg-black/65 p-5 shadow-lg space-y-4">
              <div className={`rounded-lg border border-white/10 bg-gradient-to-r ${pack.accent} p-4 space-y-2`}>
                <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-100/90">Starter Pack</p>
                <div className="flex items-center gap-3">
                  {pack.logoSrc && (
                    <img
                      src={pack.logoSrc}
                      alt={`${pack.platformLabel} logo`}
                      className="h-8 w-8 rounded-md object-contain bg-black/30 p-1 border border-white/15"
                      loading="lazy"
                      onError={(event) => {
                        const target = event.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  )}
                  <h2 className="text-xl font-semibold text-yellow-100">{pack.title}</h2>
                </div>
                <p className="text-sm text-gray-100">{pack.subtitle}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Problem</p>
                <p className="text-sm text-gray-300">{pack.problem}</p>
              </div>

              <div className="space-y-2 rounded-lg border border-yellow-500/20 bg-black/40 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Before</p>
                <p className="text-sm text-gray-300">{pack.before}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80 pt-2">After</p>
                <p className="text-sm text-gray-200 break-words">{pack.after}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Templates</p>
                {pack.templates.map((template, idx) => (
                  <div key={`${pack.id}-${idx}`} className="rounded-md border border-yellow-500/20 bg-black/35 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-yellow-200">Template {idx + 1}</p>
                      <div className="flex items-center gap-2">
                        {pack.id === "json-architect" && (
                          <Link href={toJsonArchitectLink(template)}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2"
                            >
                              Use in JSON Tool
                            </Button>
                          </Link>
                        )}
                        {pack.id === "coloring-studio" && (
                          <Link href="/coloring-studio">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2"
                            >
                              Use in Coloring Studio
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 px-2"
                          onClick={() => copyTemplate(template)}
                        >
                          Copy Template
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 break-words">{template}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">Why It Works</p>
                {pack.whyItWorks.map((line, idx) => (
                  <p key={`${pack.id}-why-${idx}`} className="text-sm text-gray-300">• {line}</p>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <Button
                  className="bg-yellow-400 text-black hover:bg-yellow-300"
                  onClick={() => optimizeInHome(pack.after)}
                >
                  Optimize This Pack
                </Button>
                {pack.id === "json-architect" ? (
                  <Link href="/json-prompt-architect">
                    <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                      Open JSON Architect
                    </Button>
                  </Link>
                ) : pack.id === "coloring-studio" ? (
                  <Link href="/coloring-studio">
                    <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                      Open Coloring Studio
                    </Button>
                  </Link>
                ) : null}
                <div className="w-full sm:w-auto overflow-hidden rounded-md border border-yellow-500/40 flex items-stretch">
                  <Button
                    variant="outline"
                    className="flex-1 min-w-0 rounded-none border-0 text-yellow-200 hover:bg-yellow-500/10"
                    onClick={() => {
                      void tryInProviderSite(pack.after);
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
                            void tryInProviderSite(pack.after, provider);
                          }}
                        >
                          Try in {provider.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {pack.id.startsWith("suno-") && (
                  <a href="https://suno.com/" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                      Open Suno
                    </Button>
                  </a>
                )}
                {pack.id === "json-architect" && (
                  <Link href="/json-prompt-architect">
                    <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                      Open Tool
                    </Button>
                  </Link>
                )}
                {pack.id === "coloring-studio" && (
                  <Link href="/coloring-studio">
                    <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                      Open Tool
                    </Button>
                  </Link>
                )}
                <Link href="/frameworks">
                  <Button variant="outline" className="border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10">
                    View Frameworks
                  </Button>
                </Link>
              </div>
              <div className="rounded-md border border-yellow-500/20 bg-black/30 p-3 space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">How To Use</p>
                <p className="text-sm text-gray-300">1. Copy a template from this pack.</p>
                {pack.id === "json-architect" ? (
                  <>
                    <p className="text-sm text-gray-300">2. Click <span className="text-yellow-200">Open JSON Architect</span>.</p>
                    <p className="text-sm text-gray-300">3. Fill slots, copy JSON or converted plain prompt.</p>
                  </>
                ) : pack.id === "coloring-studio" ? (
                  <>
                    <p className="text-sm text-gray-300">2. Click <span className="text-yellow-200">Open Coloring Studio</span>.</p>
                    <p className="text-sm text-gray-300">3. Choose Photo-to-Line-Art or Starter Prompts by difficulty.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-300">2. Click <span className="text-yellow-200">Optimize This Pack</span>.</p>
                    <p className="text-sm text-gray-300">3. Paste it into the optimizer, replace placeholders, then run.</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
